const JPEG = [0xff, 0xd8, 0xff];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

export type SupportedImageMimeType = "image/jpeg" | "image/png" | "image/webp";

export function detectImageMimeType(bytes: Uint8Array): SupportedImageMimeType | null {
  if (startsWith(bytes, JPEG)) return "image/jpeg";
  if (startsWith(bytes, PNG)) return "image/png";
  if (String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}

export function hasValidImageSignature(bytes: Uint8Array, mimeType: string) {
  return detectImageMimeType(bytes) === mimeType;
}
