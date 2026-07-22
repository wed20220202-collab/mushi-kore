import type { User } from "firebase/auth";
import type { IdentificationInput } from "@/lib/identification-types";
import { deleteLocalRecordImage, deletePendingUpload, savePendingUpload, type PendingUpload } from "@/lib/capture-draft-store";
import { readLocalPreferences } from "@/lib/firebase/preferences";

export interface DriveUploadResult { ok: true; driveFileId: string; fileSize?: number; }

export async function uploadRecordImage(user: User, input: IdentificationInput, recordId: string, idempotencyKey: string): Promise<DriveUploadResult> {
  return uploadPendingRecordImage(user, {
    recordId,
    blob: input.image.blob,
    fileName: input.fileName,
    mimeType: input.image.mimeType,
    idempotencyKey,
    queuedAt: new Date().toISOString(),
    attempts: 0,
    lastError: "",
  });
}

export async function uploadPendingRecordImage(user: User, upload: PendingUpload): Promise<DriveUploadResult> {
  const token = await user.getIdToken();
  const formData = new FormData();
  formData.append("recordId", upload.recordId);
  formData.append("idempotencyKey", upload.idempotencyKey);
  formData.append("image", new File([upload.blob], upload.fileName, { type: upload.mimeType }));
  try {
    const response = await fetch("/api/drive/upload", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
    const payload = await response.json() as { ok?: boolean; driveFileId?: string; fileSize?: number; error?: string; code?: string };
    if (!response.ok || payload.ok !== true || !payload.driveFileId) {
      const error = new Error(payload.error ?? "Google Driveへ保存できませんでした。");
      error.name = payload.code ?? "DRIVE_UPLOAD_FAILED";
      throw error;
    }
    const cleanup = [deletePendingUpload(upload.recordId)];
    if (!readLocalPreferences().keepLocalCopy) cleanup.push(deleteLocalRecordImage(upload.recordId));
    await Promise.all(cleanup);
    return { ok: true, driveFileId: payload.driveFileId, fileSize: payload.fileSize };
  } catch (reason) {
    await savePendingUpload({
      ...upload,
      attempts: upload.attempts + 1,
      lastError: reason instanceof Error ? reason.message : "Google Driveへの保存に失敗しました。",
    });
    throw reason;
  }
}
