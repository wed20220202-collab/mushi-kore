import { describe, expect, it } from "vitest";
import { insectIdentificationSchema, searchQuerySchema } from "@/lib/schemas";

describe("insectIdentificationSchema", () => {
  it("accepts a valid structured result", () => {
    const parsed = insectIdentificationSchema.parse({
      category:"insect", isTarget:true, commonNameJa:"カブトムシ", commonNameEn:"Japanese rhinoceros beetle", scientificName:"Trypoxylus dichotomus", order:"コウチュウ目", family:"コガネムシ科", genus:"Trypoxylus",
      candidates:[], confidence:.91, appearance:"頭角", reason:"特徴が一致", habitat:"雑木林", activeSeason:"夏", dangerLevel:"none", toxicity:"なし", warnings:[], uncertaintyReason:"",
    });
    expect(parsed.confidence).toBe(.91);
  });
  it("rejects confidence outside 0 to 1", () => {
    const result = insectIdentificationSchema.safeParse({ category:"insect", isTarget:true, commonNameJa:"虫", commonNameEn:"", scientificName:"", order:"", family:"", genus:"", candidates:[], confidence:1.2, appearance:"", reason:"", habitat:"", activeSeason:"", dangerLevel:"none", toxicity:"", warnings:[], uncertaintyReason:"" });
    expect(result.success).toBe(false);
  });
});

describe("searchQuerySchema", () => {
  it("applies safe pagination defaults", () => expect(searchQuerySchema.parse({}).limit).toBe(20));
  it("rejects excessive page sizes", () => expect(searchQuerySchema.safeParse({ limit:500 }).success).toBe(false));
});
