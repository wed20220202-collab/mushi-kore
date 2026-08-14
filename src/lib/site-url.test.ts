import { describe, expect, it } from "vitest";
import { getSiteUrl } from "@/lib/site-url";

describe("getSiteUrl", () => {
  it("normalizes valid web URLs", () => {
    expect(getSiteUrl("https://example.com/path")).toBe("https://example.com");
  });

  it("falls back for redacted or unsupported values", () => {
    expect(getSiteUrl("[SENSITIVE]")).toBe("https://mushi-kore.vercel.app");
    expect(getSiteUrl("javascript:alert(1)")).toBe("https://mushi-kore.vercel.app");
  });
});
