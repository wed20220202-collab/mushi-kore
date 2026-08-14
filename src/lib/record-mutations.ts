import { z } from "zod";

export const recordUpdateSchema = z.object({
  commonNameJa: z.string().trim().min(1).max(100).optional(),
  commonNameEn: z.string().trim().max(120).optional(),
  scientificName: z.string().trim().max(160).optional(),
  order: z.string().trim().max(100).optional(),
  family: z.string().trim().max(100).optional(),
  genus: z.string().trim().max(100).optional(),
  capturedAt: z.string().datetime().optional(),
  locationName: z.string().trim().max(200).optional(),
  memo: z.string().trim().max(1500).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
  favorite: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "変更内容がありません。");

export type RecordUpdate = z.infer<typeof recordUpdateSchema>;

export function buildRecordSearchKeywords(values: Array<string | undefined>, tags: string[]) {
  return [...new Set([...values, ...tags].flatMap((value) => {
    const normalized = value?.trim().toLowerCase() ?? "";
    if (!normalized) return [];
    const fragments = [normalized];
    for (let length = 2; length <= Math.min(normalized.length, 12); length += 1) fragments.push(normalized.slice(0, length));
    return fragments;
  }))];
}
