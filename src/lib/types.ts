export type UploadStatus = "preparing" | "compressing" | "identifying" | "uploading" | "uploaded" | "saving" | "completed" | "failed" | "cleanup_required";

export interface IdentificationCandidate {
  commonNameJa: string;
  scientificName: string;
  confidence: number;
}

export interface InsectRecord {
  id: string;
  userId: string;
  commonNameJa: string;
  commonNameEn: string;
  scientificName: string;
  order: string;
  family: string;
  genus: string;
  isInsect: boolean;
  candidates: IdentificationCandidate[];
  confidence: number;
  identificationReason: string;
  description: string;
  habitat: string;
  activeSeason: string;
  dangerLevel: "none" | "low" | "medium" | "high";
  warnings: string[];
  capturedAt: string;
  locationName: string;
  latitude: number | null;
  longitude: number | null;
  memo: string;
  tags: string[];
  favorite: boolean;
  driveFileId: string;
  driveFolderId: string;
  originalFileName: string;
  storedFileName: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  width: number;
  height: number;
  fileSize: number;
  contentHash: string;
  uploadStatus: UploadStatus;
  aiModel: string;
  aiRawResult: Record<string, unknown>;
  searchKeywords: string[];
  createdAt: string;
  updatedAt: string;
  imageUrl: string;
}
