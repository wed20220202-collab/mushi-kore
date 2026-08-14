import type { User } from "firebase/auth";
import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, Timestamp } from "firebase/firestore";
import { firestore } from "@/lib/firebase/client";
import { clearCaptureDraft, deleteLocalRecordImage, deletePendingUpload, loadLocalRecordImage, saveLocalRecordImage, savePendingUpload } from "@/lib/capture-draft-store";
import type { IdentificationInput } from "@/lib/identification-types";
import { buildRecordSearchKeywords, type RecordUpdate } from "@/lib/record-mutations";
import type { InsectIdentificationResult } from "@/lib/schemas";
import type { InsectRecord, UploadStatus } from "@/lib/types";
import { categoryConfig, categoryOrInsect } from "@/lib/categories";

function timestampToIso(value: unknown) {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  return typeof value === "string" ? value : new Date().toISOString();
}

function toInsectRecord(id: string, data: Record<string, unknown>): InsectRecord {
  return {
    id,
    userId: String(data.userId ?? ""),
    category: categoryOrInsect(data.category),
    commonNameJa: String(data.commonNameJa ?? "名前未設定"),
    commonNameEn: String(data.commonNameEn ?? ""),
    scientificName: String(data.scientificName ?? ""),
    order: String(data.order ?? ""),
    family: String(data.family ?? ""),
    genus: String(data.genus ?? ""),
    isInsect: data.isInsect !== false,
    isTarget: typeof data.isTarget === "boolean" ? data.isTarget : data.isInsect !== false,
    candidates: Array.isArray(data.candidates) ? data.candidates as InsectRecord["candidates"] : [],
    confidence: Number(data.confidence ?? 0),
    identificationReason: String(data.identificationReason ?? ""),
    description: String(data.description ?? ""),
    habitat: String(data.habitat ?? ""),
    activeSeason: String(data.activeSeason ?? ""),
    dangerLevel: ["low", "medium", "high"].includes(String(data.dangerLevel)) ? data.dangerLevel as InsectRecord["dangerLevel"] : "none",
    warnings: Array.isArray(data.warnings) ? data.warnings.map(String) : [],
    capturedAt: timestampToIso(data.capturedAt),
    locationName: String(data.locationName ?? "位置情報なし"),
    latitude: typeof data.latitude === "number" ? data.latitude : null,
    longitude: typeof data.longitude === "number" ? data.longitude : null,
    memo: String(data.memo ?? ""),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    favorite: data.favorite === true,
    driveFileId: String(data.driveFileId ?? ""),
    driveFolderId: String(data.driveFolderId ?? ""),
    originalFileName: String(data.originalFileName ?? ""),
    storedFileName: String(data.storedFileName ?? ""),
    mimeType: ["image/png", "image/webp"].includes(String(data.mimeType)) ? data.mimeType as InsectRecord["mimeType"] : "image/jpeg",
    width: Number(data.width ?? 0),
    height: Number(data.height ?? 0),
    fileSize: Number(data.fileSize ?? 0),
    contentHash: String(data.contentHash ?? ""),
    uploadStatus: String(data.uploadStatus ?? "preparing") as UploadStatus,
    aiModel: String(data.aiModel ?? ""),
    aiRawResult: typeof data.aiRawResult === "object" && data.aiRawResult ? data.aiRawResult as Record<string, unknown> : {},
    searchKeywords: Array.isArray(data.searchKeywords) ? data.searchKeywords.map(String) : [],
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
    imageUrl: "",
  };
}

export function subscribeUserRecords(uid: string, onRecords: (records: InsectRecord[]) => void, onError: (error: Error) => void) {
  if (!firestore) {
    onRecords([]);
    return () => undefined;
  }
  const recordsQuery = query(collection(firestore, "users", uid, "insectRecords"), orderBy("createdAt", "desc"));
  return onSnapshot(recordsQuery, (snapshot) => {
    onRecords(snapshot.docs.map((record) => toInsectRecord(record.id, record.data())));
  }, (reason) => onError(reason));
}

export async function loadRecordImageUrl(user: User, recordId: string) {
  const localImage = await loadLocalRecordImage(recordId);
  if (localImage) return URL.createObjectURL(localImage);
  const token = await user.getIdToken();
  const response = await fetch(`/api/images/${encodeURIComponent(recordId)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) return "";
  return URL.createObjectURL(await response.blob());
}

export async function registerLocalIdentification(
  user: User,
  input: IdentificationInput,
  result: InsectIdentificationResult,
  model: string,
  memo: string,
  tags: string[],
  idempotencyKey: string,
) {
  if (!firestore) throw new Error("Firestore is not configured.");
  const recordRef = doc(collection(firestore, "users", user.uid, "insectRecords"));
  const storedExtension = input.image.mimeType === "image/webp" ? "webp" : input.image.mimeType === "image/png" ? "png" : "jpg";
  await setDoc(recordRef, {
    id: recordRef.id,
    userId: user.uid,
    category: input.category,
    commonNameJa: result.commonNameJa,
    commonNameEn: result.commonNameEn,
    scientificName: result.scientificName,
    order: result.order,
    family: result.family,
    genus: result.genus,
    isInsect: input.category === "insect" ? result.isTarget : false,
    isTarget: result.isTarget,
    candidates: result.candidates,
    confidence: result.confidence,
    identificationReason: result.reason,
    description: result.appearance,
    habitat: result.habitat,
    activeSeason: result.activeSeason,
    dangerLevel: result.dangerLevel,
    warnings: result.warnings,
    capturedAt: input.capturedAt,
    locationName: input.locationName,
    latitude: input.latitude,
    longitude: input.longitude,
    memo,
    tags,
    favorite: false,
    driveFileId: null,
    driveFolderId: null,
    originalFileName: input.fileName,
    storedFileName: `${recordRef.id}.${storedExtension}`,
    mimeType: input.image.mimeType,
    width: input.image.width,
    height: input.image.height,
    fileSize: input.image.compressedBytes,
    contentHash: "",
    uploadStatus: "preparing",
    localOnly: true,
    aiModel: model,
    aiRawResult: result,
    searchKeywords: buildRecordSearchKeywords([result.commonNameJa, result.commonNameEn, result.scientificName, result.order, result.family, result.genus, input.locationName, categoryConfig[input.category].label], tags),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await saveLocalRecordImage(recordRef.id, input.image.blob);
  await savePendingUpload({
    recordId: recordRef.id,
    blob: input.image.blob,
    fileName: input.fileName,
    mimeType: input.image.mimeType,
    idempotencyKey,
    queuedAt: new Date().toISOString(),
    attempts: 0,
    lastError: "",
  });
  await clearCaptureDraft();
  return recordRef.id;
}

async function authenticatedRecordRequest(user: User, recordId: string, init: RequestInit) {
  const token = await user.getIdToken();
  const response = await fetch(`/api/records/${encodeURIComponent(recordId)}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...init.headers },
  });
  const payload = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(payload.error || "図鑑の記録を変更できませんでした。");
}

export async function updateUserRecord(user: User, recordId: string, update: RecordUpdate) {
  await authenticatedRecordRequest(user, recordId, { method: "PATCH", body: JSON.stringify(update) });
}

export async function deleteUserRecord(user: User, recordId: string) {
  await authenticatedRecordRequest(user, recordId, { method: "DELETE" });
  await Promise.allSettled([deleteLocalRecordImage(recordId), deletePendingUpload(recordId)]);
}
