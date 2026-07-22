export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_INPUT_BYTES = 20 * 1024 * 1024;
export const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 40_000_000;

export type CropMode = "original" | "square" | "landscape";

export interface ProcessedImage {
  blob: Blob;
  width: number;
  height: number;
  mimeType: "image/webp" | "image/jpeg";
  originalBytes: number;
  compressedBytes: number;
}

export function validateImageFile(file: File): string | null {
  if (["image/heic", "image/heif"].includes(file.type.toLowerCase()) || /\.hei[cf]$/i.test(file.name)) {
    return "この端末ではHEICを安全に変換できません。カメラ設定をJPEGにするか、JPEG・PNG・WebPを選択してください。";
  }
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    return "JPEG・PNG・WebP形式の画像を選択してください。";
  }
  if (file.size > MAX_INPUT_BYTES) return "画像が大きすぎます。20MB以下の画像を選択してください。";
  return null;
}

export function calculateCrop(width: number, height: number, aspect: number | null) {
  if (!aspect) return { x: 0, y: 0, width, height };
  const current = width / height;
  if (current > aspect) {
    const cropWidth = height * aspect;
    return { x: (width - cropWidth) / 2, y: 0, width: cropWidth, height };
  }
  const cropHeight = width / aspect;
  return { x: 0, y: (height - cropHeight) / 2, width, height: cropHeight };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

async function drawCompressed(
  bitmap: ImageBitmap,
  rotation: number,
  cropMode: CropMode,
  maxDimension: number,
  quality: number,
) {
  const turns = ((rotation / 90) % 4 + 4) % 4;
  const requestedAspect = cropMode === "square" ? 1 : cropMode === "landscape" ? 4 / 3 : null;
  const sourceAspect = requestedAspect && turns % 2 === 1 ? 1 / requestedAspect : requestedAspect;
  const crop = calculateCrop(bitmap.width, bitmap.height, sourceAspect);
  const rotatedWidth = turns % 2 === 1 ? crop.height : crop.width;
  const rotatedHeight = turns % 2 === 1 ? crop.width : crop.height;
  const scale = Math.min(1, maxDimension / Math.max(rotatedWidth, rotatedHeight));
  const outputWidth = Math.max(1, Math.round(rotatedWidth * scale));
  const outputHeight = Math.max(1, Math.round(rotatedHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("画像編集を開始できませんでした。");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  if (turns === 1) {
    context.translate(outputWidth, 0);
    context.rotate(Math.PI / 2);
    context.drawImage(bitmap, crop.x, crop.y, crop.width, crop.height, 0, 0, outputHeight, outputWidth);
  } else if (turns === 2) {
    context.translate(outputWidth, outputHeight);
    context.rotate(Math.PI);
    context.drawImage(bitmap, crop.x, crop.y, crop.width, crop.height, 0, 0, outputWidth, outputHeight);
  } else if (turns === 3) {
    context.translate(0, outputHeight);
    context.rotate(-Math.PI / 2);
    context.drawImage(bitmap, crop.x, crop.y, crop.width, crop.height, 0, 0, outputHeight, outputWidth);
  } else {
    context.drawImage(bitmap, crop.x, crop.y, crop.width, crop.height, 0, 0, outputWidth, outputHeight);
  }

  let blob = await canvasToBlob(canvas, "image/webp", quality);
  let mimeType: ProcessedImage["mimeType"] = "image/webp";
  if (!blob) {
    blob = await canvasToBlob(canvas, "image/jpeg", quality);
    mimeType = "image/jpeg";
  }
  if (!blob) throw new Error("画像を圧縮できませんでした。");
  return { blob, width: outputWidth, height: outputHeight, mimeType };
}

export async function processImage(file: File, rotation: number, cropMode: CropMode): Promise<ProcessedImage> {
  const validationError = validateImageFile(file);
  if (validationError) throw new Error(validationError);
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    if (bitmap.width * bitmap.height > MAX_IMAGE_PIXELS) throw new Error("画像の画素数が大きすぎます。40メガピクセル以下の画像を選択してください。");
    let maxDimension = 1600;
    let quality = 0.8;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const output = await drawCompressed(bitmap, rotation, cropMode, maxDimension, quality);
      if (output.blob.size <= MAX_OUTPUT_BYTES) {
        return { ...output, originalBytes: file.size, compressedBytes: output.blob.size };
      }
      maxDimension = Math.max(900, Math.round(maxDimension * 0.85));
      quality = Math.max(0.6, quality - 0.05);
    }
    throw new Error("2MB以下へ圧縮できませんでした。別の画像を選択してください。");
  } finally {
    bitmap.close();
  }
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
