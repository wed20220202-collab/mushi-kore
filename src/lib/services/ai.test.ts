import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { collectionCategories } from "@/lib/categories";
import { identificationSystemPrompt, MockInsectIdentificationProvider } from "@/lib/services/ai";

describe("multi-category identification", () => {
  it.each(collectionCategories)("returns a valid %s result", async (category) => {
    const provider = new MockInsectIdentificationProvider();
    const result = await provider.identify({ bytes: new Uint8Array([1]), mimeType: "image/jpeg" }, category);
    expect(result.category).toBe(category);
    expect(result.isTarget).toBe(true);
    expect(result.commonNameJa.length).toBeGreaterThan(0);
  });

  it.each(collectionCategories)("pins the requested %s category in the prompt", (category) => {
    const prompt = identificationSystemPrompt(category);
    expect(prompt).toContain(`categoryは必ず「${category}」`);
  });
});
