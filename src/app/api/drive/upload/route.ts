import { FieldValue } from "firebase-admin/firestore";
import { adminDb, verifyBearerToken } from "@/lib/firebase/admin";
import { createDriveService, isDriveConfigured } from "@/lib/services/drive";
import { hasValidImageSignature } from "@/lib/image-signature";

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_IMAGES = Number(process.env.MAX_IMAGES_PER_USER ?? 500);
const MAX_STORAGE_BYTES = Number(process.env.MAX_STORAGE_BYTES_PER_USER ?? 524_288_000);
const MAX_DAILY_UPLOADS = Number(process.env.MAX_DAILY_UPLOADS_PER_USER ?? 30);
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const minuteBuckets = new Map<string, number[]>();

function checkMinuteRate(uid: string) {
  const now = Date.now();
  const recent = (minuteBuckets.get(uid) ?? []).filter((timestamp) => timestamp > now - 60_000);
  const limit = Number(process.env.UPLOAD_RATE_LIMIT_PER_MINUTE ?? 5);
  if (recent.length >= limit) return false;
  recent.push(now);
  minuteBuckets.set(uid, recent);
  return true;
}

async function sha256(bytes: Uint8Array) {
  const hash = await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes));
  return [...new Uint8Array(hash)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function safeFileName(recordId: string, mimeType: string) {
  return `${recordId}.${mimeType === "image/webp" ? "webp" : mimeType === "image/png" ? "png" : "jpg"}`;
}

export async function POST(request: Request) {
  try {
    const token = await verifyBearerToken(request);
    if (!isDriveConfigured()) return Response.json({ error: "Google Driveの認証設定が未完了です。", code: "DRIVE_NOT_CONFIGURED" }, { status: 503 });
    if (!checkMinuteRate(token.uid)) return Response.json({ error: "短時間のアップロード回数が上限に達しました。", code: "RATE_LIMITED" }, { status: 429 });

    const formData = await request.formData();
    const image = formData.get("image");
    const recordId = formData.get("recordId");
    const idempotencyKey = formData.get("idempotencyKey");
    if (!(image instanceof File) || typeof recordId !== "string" || typeof idempotencyKey !== "string") return Response.json({ error: "必要な情報が不足しています。" }, { status: 400 });
    if (!/^[a-zA-Z0-9_-]{10,80}$/.test(recordId) || !/^[a-zA-Z0-9_-]{16,100}$/.test(idempotencyKey)) return Response.json({ error: "不正なリクエストです。" }, { status: 400 });
    if (!ALLOWED_MIME_TYPES.has(image.type)) return Response.json({ error: "対応していない画像形式です。" }, { status: 415 });
    if (image.size === 0 || image.size > MAX_FILE_BYTES) return Response.json({ error: "画像は2MB以下にしてください。" }, { status: 413 });
    const bytes = new Uint8Array(await image.arrayBuffer());
    if (!hasValidImageSignature(bytes, image.type)) return Response.json({ error: "画像データを確認できませんでした。" }, { status: 415 });

    const database = adminDb();
    const userRef = database.doc(`users/${token.uid}`);
    const recordRef = userRef.collection("insectRecords").doc(recordId);
    const operationRef = database.doc(`operations/${token.uid}_${idempotencyKey}`);
    const [userSnapshot, recordSnapshot, operationSnapshot] = await Promise.all([userRef.get(), recordRef.get(), operationRef.get()]);
    if (!userSnapshot.exists || !recordSnapshot.exists) return Response.json({ error: "登録情報が見つかりません。" }, { status: 404 });
    const userData = userSnapshot.data() ?? {};
    const recordData = recordSnapshot.data() ?? {};
    const operationData = operationSnapshot.data() ?? {};
    if (recordData.userId !== token.uid) return Response.json({ error: "この画像へアクセスできません。" }, { status: 403 });
    if (typeof userData.storageUserId !== "string") return Response.json({ error: "保存先ユーザー情報が不正です。", code: "INVALID_STORAGE_USER" }, { status: 409 });
    if (userData.uploadSuspended === true) return Response.json({ error: "現在アップロードは停止されています。", code: "UPLOAD_SUSPENDED" }, { status: 403 });
    if (operationData.status === "completed") return Response.json({ ok: true, recordId, driveFileId: operationData.driveFileId, idempotent: true });
    if (operationData.status === "uploaded" && recordData.uploadStatus === "completed" && recordData.driveFileId === operationData.driveFileId) {
      await operationRef.update({ status: "completed", updatedAt: FieldValue.serverTimestamp() });
      return Response.json({ ok: true, recordId, driveFileId: operationData.driveFileId, idempotent: true });
    }
    if ((userData.totalImageCount ?? 0) >= (userData.imageCountLimit ?? MAX_IMAGES)) return Response.json({ error: "画像枚数の上限に達しました。", code: "IMAGE_LIMIT" }, { status: 409 });
    if ((userData.totalStorageBytes ?? 0) + bytes.byteLength > (userData.storageLimitBytes ?? MAX_STORAGE_BYTES)) return Response.json({ error: "保存容量の上限に達しました。", code: "STORAGE_LIMIT" }, { status: 409 });
    const today = new Date().toISOString().slice(0, 10);
    const dailyCount = userData.lastUploadDate === today ? Number(userData.dailyUploadCount ?? 0) : 0;
    if (dailyCount >= MAX_DAILY_UPLOADS) return Response.json({ error: "本日のアップロード上限に達しました。", code: "DAILY_LIMIT" }, { status: 429 });

    const contentHash = await sha256(bytes);
    const duplicate = await userRef.collection("insectRecords").where("contentHash", "==", contentHash).limit(1).get();
    if (!duplicate.empty && duplicate.docs[0].id !== recordId) return Response.json({ error: "同じ画像はすでに登録されています。", code: "DUPLICATE_IMAGE", recordId: duplicate.docs[0].id }, { status: 409 });

    const drive = createDriveService();
    if (operationData.status === "uploaded" && typeof operationData.driveFileId === "string") {
      try {
        await drive.moveToTrash(operationData.driveFileId);
      } catch {
        await operationRef.update({ status: "cleanup_required", failureReason: "PREVIOUS_UPLOAD_CLEANUP_FAILED", updatedAt: FieldValue.serverTimestamp() });
        return Response.json({ error: "前回の未完了ファイルを整理できませんでした。時間をおいて再試行してください。", code: "CLEANUP_REQUIRED" }, { status: 503 });
      }
    }
    await operationRef.set({ uid: token.uid, recordId, idempotencyKey, status: "preparing", driveFileId: null, failureReason: null, createdAt: operationData.createdAt ?? FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    const folders = await drive.ensureUserFolders(userData.storageUserId, { user: userData.driveFolderId, images: userData.driveImageFolderId });
    await userRef.update({ driveFolderId: folders.userFolderId, driveImageFolderId: folders.imageFolderId, updatedAt: FieldValue.serverTimestamp() });
    const driveFile = await drive.upload({ bytes, mimeType: image.type, fileName: safeFileName(recordId, image.type), parentFolderId: folders.imageFolderId, appProperties: { mushiKoreRecordId: recordId, storageUserId: userData.storageUserId, contentHash } });
    await operationRef.update({ status: "uploaded", driveFileId: driveFile.id, updatedAt: FieldValue.serverTimestamp() });

    try {
      await database.runTransaction(async (transaction) => {
        const freshUser = await transaction.get(userRef);
        const freshRecord = await transaction.get(recordRef);
        if (!freshUser.exists || !freshRecord.exists || freshRecord.data()?.userId !== token.uid) throw new Error("OWNERSHIP_CHANGED");
        const latest = freshUser.data() ?? {};
        const latestDailyCount = latest.lastUploadDate === today ? Number(latest.dailyUploadCount ?? 0) : 0;
        if ((latest.totalImageCount ?? 0) >= (latest.imageCountLimit ?? MAX_IMAGES) || (latest.totalStorageBytes ?? 0) + driveFile.size > (latest.storageLimitBytes ?? MAX_STORAGE_BYTES) || latestDailyCount >= MAX_DAILY_UPLOADS) throw new Error("LIMIT_CHANGED");
        transaction.update(recordRef, { driveFileId: driveFile.id, driveFolderId: folders.imageFolderId, storedFileName: driveFile.name, mimeType: driveFile.mimeType, fileSize: driveFile.size, contentHash, uploadStatus: "completed", localOnly: false, updatedAt: FieldValue.serverTimestamp() });
        transaction.update(userRef, { totalImageCount: FieldValue.increment(1), totalStorageBytes: FieldValue.increment(driveFile.size), dailyUploadCount: latestDailyCount + 1, lastUploadDate: today, updatedAt: FieldValue.serverTimestamp() });
      });
      await operationRef.update({ status: "completed", updatedAt: FieldValue.serverTimestamp() });
    } catch {
      await operationRef.update({ status: "cleanup_required", failureReason: "FIRESTORE_FINALIZE_FAILED", updatedAt: FieldValue.serverTimestamp() });
      await drive.moveToTrash(driveFile.id).catch(() => undefined);
      return Response.json({ error: "図鑑登録の確定に失敗しました。再試行できます。", code: "FINALIZE_FAILED" }, { status: 500 });
    }
    return Response.json({ ok: true, recordId, driveFileId: driveFile.id, fileSize: driveFile.size });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") return Response.json({ error: "ログインが必要です。" }, { status: 401 });
    return Response.json({ error: "画像をGoogle Driveへ保存できませんでした。", code: "UPLOAD_FAILED" }, { status: 500 });
  }
}
