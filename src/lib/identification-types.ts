import type { CropMode, ProcessedImage } from "@/lib/image-processing";
import type { CollectionCategory } from "@/lib/categories";

export interface IdentificationInput {
  category: CollectionCategory;
  image: ProcessedImage;
  fileName: string;
  rotation: number;
  cropMode: CropMode;
  capturedAt: string;
  latitude: number | null;
  longitude: number | null;
  locationName: string;
}
