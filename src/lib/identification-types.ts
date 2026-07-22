import type { CropMode, ProcessedImage } from "@/lib/image-processing";

export interface IdentificationInput {
  image: ProcessedImage;
  fileName: string;
  rotation: number;
  cropMode: CropMode;
  capturedAt: string;
  latitude: number | null;
  longitude: number | null;
  locationName: string;
}
