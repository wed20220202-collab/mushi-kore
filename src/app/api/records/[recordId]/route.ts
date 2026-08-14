import { FieldValue } from "firebase-admin/firestore";
import { adminDb, verifyBearerToken } from "@/lib/firebase/admin";
import { buildRecordSearchKeywords, recordUpdateSchema } from "@/lib/record-mutations";
import { createDriveService, isDriveConfigured } from "@/lib/services/drive";

const RECORD_ID_PATTERN = /^[a-zA-Z0-9_-]{10,80}$/;

async function ownedRecord(request: Request, recordId: string) {
  const token = await verifyBearerToken(request);
  if (!RECORD_ID_PATTERN.test(recordId)) throw new Error("INVALID_RECORD_ID");
  const database = adminDb();
  const userRef = database.doc(`users/${token.uid}`);
  const recordRef = userRef.collection("insectRecords").doc(recordId);
  const snapshot = await recordRef.get();
  if (!snapshot.exists) throw new Error("RECORD_NOT_FOUND");
  const data = snapshot.data() ?? {};
  if (data.userId !== token.uid) throw new Error("FORBIDDEN");
  return { database, userRef, recordRef, data };
}

function errorResponse(error: unknown, fallback: string) {
  const code = error instanceof Error ? error.message : "";
  if (code === "UNAUTHENTICATED") return Response.json({ error: "ログインが必要です。" }, { status: 401 });
  if (code === "FORBIDDEN") return Response.json({ error: "この記録を変更できません。" }, { status: 403 });
  if (code === "RECORD_NOT_FOUND") return Response.json({ error: "記録が見つかりません。" }, { status: 404 });
  if (code === "INVALID_RECORD_ID") return Response.json({ error: "記録IDが正しくありません。" }, { status: 400 });
  return Response.json({ error: fallback }, { status: 500 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ recordId: string }> }) {
  try {
    const { recordId } = await params;
    const { recordRef, data } = await ownedRecord(request, recordId);
    const parsed = recordUpdateSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "編集内容を確認してください。" }, { status: 400 });
    const merged = { ...data, ...parsed.data };
    const tags = Array.isArray(merged.tags) ? merged.tags.map(String) : [];
    const searchKeywords = buildRecordSearchKeywords([
      String(merged.commonNameJa ?? ""), String(merged.commonNameEn ?? ""), String(merged.scientificName ?? ""),
      String(merged.order ?? ""), String(merged.family ?? ""), String(merged.genus ?? ""), String(merged.locationName ?? ""),
    ], tags);
    await recordRef.update({ ...parsed.data, searchKeywords, updatedAt: FieldValue.serverTimestamp() });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "記録を更新できませんでした。");
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ recordId: string }> }) {
  try {
    const { recordId } = await params;
    const { database, userRef, recordRef, data } = await ownedRecord(request, recordId);
    const driveFileId = typeof data.driveFileId === "string" ? data.driveFileId : "";
    const driveFolderId = typeof data.driveFolderId === "string" ? data.driveFolderId : "";

    if (driveFileId) {
      if (!driveFolderId) return Response.json({ error: "画像の保存先を確認できないため削除を中止しました。" }, { status: 409 });
      if (!isDriveConfigured()) return Response.json({ error: "Google Driveの認証設定を確認してから再試行してください。" }, { status: 503 });
      const drive = createDriveService();
      try {
        const file = await drive.getFile(driveFileId);
        if (!file.parentIds.includes(driveFolderId)) return Response.json({ error: "画像の保存先が一致しないため削除を中止しました。" }, { status: 403 });
        if (!file.trashed) await drive.moveToTrash(driveFileId);
      } catch (error) {
        if (!(error instanceof Error && error.message === "DRIVE_FILE_NOT_FOUND")) throw error;
      }
    }

    await database.runTransaction(async (transaction) => {
      const [freshRecord, freshUser] = await Promise.all([transaction.get(recordRef), transaction.get(userRef)]);
      if (!freshRecord.exists) return;
      if (driveFileId && freshUser.exists) {
        const userData = freshUser.data() ?? {};
        transaction.update(userRef, {
          totalImageCount: Math.max(0, Number(userData.totalImageCount ?? 0) - 1),
          totalStorageBytes: Math.max(0, Number(userData.totalStorageBytes ?? 0) - Number(data.fileSize ?? 0)),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
      transaction.delete(recordRef);
    });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "記録を削除できませんでした。");
  }
}
