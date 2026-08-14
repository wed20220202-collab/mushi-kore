import { describe, expect, it } from "vitest";
import { buildRecordSearchKeywords, recordUpdateSchema } from "@/lib/record-mutations";

describe("recordUpdateSchema", () => {
  it("accepts editable record fields", () => {
    expect(recordUpdateSchema.parse({ commonNameJa: "ナミアゲハ", favorite: true, tags: ["春", "公園"] })).toEqual({ commonNameJa: "ナミアゲハ", favorite: true, tags: ["春", "公園"] });
  });

  it("rejects protected and empty updates", () => {
    expect(() => recordUpdateSchema.parse({})).toThrow();
    expect(() => recordUpdateSchema.parse({ driveFileId: "secret" })).toThrow();
  });
});

describe("buildRecordSearchKeywords", () => {
  it("normalizes, expands, and deduplicates searchable values", () => {
    const keywords = buildRecordSearchKeywords([" カブトムシ ", "Trypoxylus dichotomus"], ["夏", "夏"]);
    expect(keywords).toContain("カブトムシ");
    expect(keywords).toContain("try");
    expect(keywords.filter((value) => value === "夏")).toHaveLength(1);
  });
});
