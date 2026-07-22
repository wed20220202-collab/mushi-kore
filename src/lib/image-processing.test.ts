import { describe, expect, it } from "vitest";
import { calculateCrop, formatBytes, validateImageFile } from "@/lib/image-processing";

describe("image validation", () => {
  it("accepts JPEG images", () => expect(validateImageFile(new File(["x"], "bug.jpg", { type: "image/jpeg" }))).toBeNull());
  it("rejects HEIC with a useful message", () => expect(validateImageFile(new File(["x"], "bug.heic", { type: "image/heic" }))).toContain("HEIC"));
  it("rejects unsupported files", () => expect(validateImageFile(new File(["x"], "bug.gif", { type: "image/gif" }))).toContain("JPEG"));
});

describe("crop geometry", () => {
  it("center-crops a landscape image to square", () => expect(calculateCrop(4000, 3000, 1)).toEqual({ x: 500, y: 0, width: 3000, height: 3000 }));
  it("keeps original geometry without an aspect", () => expect(calculateCrop(1200, 800, null)).toEqual({ x: 0, y: 0, width: 1200, height: 800 }));
});

it("formats image sizes", () => expect(formatBytes(1_048_576)).toBe("1.0 MB"));
