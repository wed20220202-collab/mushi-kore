import type { CropMode } from "@/lib/image-processing";
import type { CollectionCategory } from "@/lib/categories";

const DATABASE_NAME = "mushi-kore-local";
const STORE_NAME = "capture-drafts";
const RECORD_IMAGE_STORE_NAME = "record-images";
const PENDING_UPLOAD_STORE_NAME = "pending-uploads";
const CURRENT_DRAFT = "current";

export interface CaptureDraft {
  category?: CollectionCategory;
  blob: Blob;
  fileName: string;
  mimeType: string;
  rotation: number;
  cropMode: CropMode;
  capturedAt: string;
  latitude: number | null;
  longitude: number | null;
  locationName: string;
  originalBytes: number;
  compressedBytes: number;
  width: number;
  height: number;
  savedAt: string;
}

export interface PendingUpload {
  recordId: string;
  blob: Blob;
  fileName: string;
  mimeType: string;
  idempotencyKey: string;
  queuedAt: string;
  attempts: number;
  lastError: string;
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 3);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
      if (!request.result.objectStoreNames.contains(RECORD_IMAGE_STORE_NAME)) request.result.createObjectStore(RECORD_IMAGE_STORE_NAME);
      if (!request.result.objectStoreNames.contains(PENDING_UPLOAD_STORE_NAME)) request.result.createObjectStore(PENDING_UPLOAD_STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function performStoreRequest<T>(storeName: string, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
  const database = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(storeName, mode);
      const request = action(transaction.objectStore(storeName));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}

export function saveCaptureDraft(draft: CaptureDraft) {
  return performStoreRequest(STORE_NAME, "readwrite", (store) => store.put(draft, CURRENT_DRAFT));
}

export function loadCaptureDraft() {
  return performStoreRequest<CaptureDraft | undefined>(STORE_NAME, "readonly", (store) => store.get(CURRENT_DRAFT));
}

export function clearCaptureDraft() {
  return performStoreRequest(STORE_NAME, "readwrite", (store) => store.delete(CURRENT_DRAFT));
}

export function saveLocalRecordImage(recordId: string, blob: Blob) {
  return performStoreRequest(RECORD_IMAGE_STORE_NAME, "readwrite", (store) => store.put(blob, recordId));
}

export function loadLocalRecordImage(recordId: string) {
  return performStoreRequest<Blob | undefined>(RECORD_IMAGE_STORE_NAME, "readonly", (store) => store.get(recordId));
}

export function deleteLocalRecordImage(recordId: string) {
  return performStoreRequest(RECORD_IMAGE_STORE_NAME, "readwrite", (store) => store.delete(recordId));
}

export function savePendingUpload(upload: PendingUpload) {
  return performStoreRequest(PENDING_UPLOAD_STORE_NAME, "readwrite", (store) => store.put(upload, upload.recordId));
}

export function listPendingUploads() {
  return performStoreRequest<PendingUpload[]>(PENDING_UPLOAD_STORE_NAME, "readonly", (store) => store.getAll());
}

export function deletePendingUpload(recordId: string) {
  return performStoreRequest(PENDING_UPLOAD_STORE_NAME, "readwrite", (store) => store.delete(recordId));
}

export async function clearPendingUploads() {
  const uploads = await listPendingUploads();
  await Promise.all(uploads.map((upload) => deleteLocalRecordImage(upload.recordId)));
  await performStoreRequest(PENDING_UPLOAD_STORE_NAME, "readwrite", (store) => store.clear());
}
