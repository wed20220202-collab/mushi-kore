import { describe, expect, it } from "vitest";
import { detectImageMimeType, hasValidImageSignature } from "@/lib/image-signature";

describe("image signatures", () => {
  it("accepts JPEG magic bytes", () => expect(hasValidImageSignature(new Uint8Array([0xff, 0xd8, 0xff, 0x00]), "image/jpeg")).toBe(true));
  it("rejects a spoofed JPEG", () => expect(hasValidImageSignature(new TextEncoder().encode("not an image"), "image/jpeg")).toBe(false));
  it("accepts WebP RIFF signatures", () => expect(hasValidImageSignature(new TextEncoder().encode("RIFF0000WEBP"), "image/webp")).toBe(true));
  it("detects the encoded type instead of trusting the declared MIME type", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(detectImageMimeType(png)).toBe("image/png");
    expect(hasValidImageSignature(png, "image/webp")).toBe(false);
  });
  it("returns null for unsupported bytes", () => expect(detectImageMimeType(new TextEncoder().encode("GIF89a"))).toBeNull());
});
