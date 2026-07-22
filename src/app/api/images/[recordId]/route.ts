import { adminDb, verifyBearerToken } from "@/lib/firebase/admin";
import { createDriveService, isDriveConfigured } from "@/lib/services/drive";

export async function GET(request: Request, { params }: { params: Promise<{ recordId: string }> }) {
  try {
    const token = await verifyBearerToken(request);
    if (!isDriveConfigured()) return Response.json({ error: "Google Driveの認証設定が未完了です。" }, { status: 503 });
    const { recordId } = await params;
    const record = await adminDb().doc(`users/${token.uid}/insectRecords/${recordId}`).get();
    if (!record.exists) return Response.json({ error: "画像が見つかりません。" }, { status: 404 });
    const data = record.data() ?? {};
    if (data.userId !== token.uid && token.admin !== true) return Response.json({ error: "この画像へアクセスできません。" }, { status: 403 });
    if (typeof data.driveFileId !== "string" || typeof data.driveFolderId !== "string") return Response.json({ error: "画像はアップロード待ちです。" }, { status: 409 });
    const drive = createDriveService();
    if (!await drive.verifyParent(data.driveFileId, data.driveFolderId)) return Response.json({ error: "画像の保存先を確認できません。" }, { status: 403 });
    const image = await drive.download(data.driveFileId);
    return new Response(Uint8Array.from(image.bytes), { headers: { "Content-Type": image.mimeType, "Content-Disposition": "inline", "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") return Response.json({ error: "ログインが必要です。" }, { status: 401 });
    return Response.json({ error: "画像を表示できませんでした。" }, { status: 500 });
  }
}
