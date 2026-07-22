import { FieldValue } from "firebase-admin/firestore";
import { adminDb, verifyBearerToken } from "@/lib/firebase/admin";
import { createDriveService, isDriveConfigured } from "@/lib/services/drive";

export async function DELETE(request: Request, { params }: { params: Promise<{ recordId: string }> }) {
  try {
    const token = await verifyBearerToken(request);
    if (!isDriveConfigured()) return Response.json({ error: "Google Driveの認証設定が未完了です。" }, { status: 503 });
    const { recordId } = await params;
    const database = adminDb();
    const userRef = database.doc(`users/${token.uid}`);
    const recordRef = userRef.collection("insectRecords").doc(recordId);
    const record = await recordRef.get();
    if (!record.exists) return Response.json({ error: "記録が見つかりません。" }, { status: 404 });
    const data = record.data() ?? {};
    if (data.userId !== token.uid) return Response.json({ error: "この画像を削除できません。" }, { status: 403 });
    if (typeof data.driveFileId !== "string" || typeof data.driveFolderId !== "string") return Response.json({ ok: true, alreadyDeleted: true });
    await recordRef.update({ uploadStatus: "deleting", updatedAt: FieldValue.serverTimestamp() });
    const drive = createDriveService();
    if (!await drive.verifyParent(data.driveFileId, data.driveFolderId)) {
      await recordRef.update({ uploadStatus: "delete_failed", updatedAt: FieldValue.serverTimestamp() });
      return Response.json({ error: "画像の保存先が一致しません。" }, { status: 403 });
    }
    await drive.moveToTrash(data.driveFileId);
    await database.runTransaction(async (transaction) => {
      transaction.update(recordRef, { driveFileId: null, driveFolderId: null, uploadStatus: "deleted", updatedAt: FieldValue.serverTimestamp() });
      transaction.update(userRef, { totalImageCount: FieldValue.increment(-1), totalStorageBytes: FieldValue.increment(-Number(data.fileSize ?? 0)), updatedAt: FieldValue.serverTimestamp() });
    });
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") return Response.json({ error: "ログインが必要です。" }, { status: 401 });
    return Response.json({ error: "画像を削除できませんでした。" }, { status: 500 });
  }
}
