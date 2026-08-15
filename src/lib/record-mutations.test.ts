import { describe, expect, it } from "vitest";
import { buildRecordSearchKeywords, recordUpdateSchema } from "@/lib/record-mutations";

describe("recordUpdateSchema", () => {
  it("accepts editable record fields", () => {
    expect(recordUpdateSchema.parse({ commonNameJa: "ナミアゲハ", favorite: true, tags: ["春", "公園"], latitude: 35.6812, longitude: 139.7671 })).toEqual({ commonNameJa: "ナミアゲハ", favorite: true, tags: ["春", "公園"], latitude: 35.6812, longitude: 139.7671 });
  });

  it("rejects coordinates outside valid ranges", () => {
    expect(recordUpdateSchema.safeParse({ latitude: 91 }).success).toBe(false);
    expect(recordUpdateSchema.safeParse({ longitude: -181 }).success).toBe(false);
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
