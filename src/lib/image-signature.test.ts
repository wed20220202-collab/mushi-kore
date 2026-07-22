import { describe, expect, it } from "vitest";
import { hasValidImageSignature } from "@/lib/image-signature";

describe("image signatures", () => {
  it("accepts JPEG magic bytes", () => expect(hasValidImageSignature(new Uint8Array([0xff, 0xd8, 0xff, 0x00]), "image/jpeg")).toBe(true));
  it("rejects a spoofed JPEG", () => expect(hasValidImageSignature(new TextEncoder().encode("not an image"), "image/jpeg")).toBe(false));
  it("accepts WebP RIFF signatures", () => expect(hasValidImageSignature(new TextEncoder().encode("RIFF0000WEBP"), "image/webp")).toBe(true));
});
