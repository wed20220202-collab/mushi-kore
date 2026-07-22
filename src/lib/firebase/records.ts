import type { User } from "firebase/auth";
import { collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebase/client";
import { clearCaptureDraft, saveLocalRecordImage, savePendingUpload } from "@/lib/capture-draft-store";
import type { IdentificationInput } from "@/lib/identification-types";
import type { InsectIdentificationResult } from "@/lib/schemas";

function buildSearchKeywords(result: InsectIdentificationResult, locationName: string, tags: string[]) {
  const values = [result.commonNameJa, result.commonNameEn, result.scientificName, result.order, result.family, result.genus, locationName, ...tags];
  return [...new Set(values.flatMap((value) => {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return [];
    const fragments = [normalized];
    for (let length = 2; length <= Math.min(normalized.length, 12); length += 1) fragments.push(normalized.slice(0, length));
    return fragments;
  }))];
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
  await setDoc(recordRef, {
    id: recordRef.id,
    userId: user.uid,
    commonNameJa: result.commonNameJa,
    commonNameEn: result.commonNameEn,
    scientificName: result.scientificName,
    order: result.order,
    family: result.family,
    genus: result.genus,
    isInsect: result.isInsect,
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
    storedFileName: `${recordRef.id}.${input.image.mimeType === "image/webp" ? "webp" : "jpg"}`,
    mimeType: input.image.mimeType,
    width: input.image.width,
    height: input.image.height,
    fileSize: input.image.compressedBytes,
    contentHash: "",
    uploadStatus: "preparing",
    localOnly: true,
    aiModel: model,
    aiRawResult: result,
    searchKeywords: buildSearchKeywords(result, input.locationName, tags),
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
