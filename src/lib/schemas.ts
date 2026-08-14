import { z } from "zod";

export const collectionCategorySchema = z.enum(["insect", "fish", "flower", "animal"]);

export const identificationCandidateSchema = z.object({
  commonNameJa: z.string().min(1).max(100),
  commonNameEn: z.string().max(120),
  scientificName: z.string().max(160),
  confidence: z.number().min(0).max(1),
});

export const insectIdentificationSchema = z.object({
  category: collectionCategorySchema,
  isTarget: z.boolean(),
  commonNameJa: z.string().min(1).max(100),
  commonNameEn: z.string().max(120),
  scientificName: z.string().max(160),
  order: z.string().max(100),
  family: z.string().max(100),
  genus: z.string().max(100),
  candidates: z.array(identificationCandidateSchema).max(3),
  confidence: z.number().min(0).max(1),
  appearance: z.string().max(1000),
  reason: z.string().max(1500),
  habitat: z.string().max(1000),
  activeSeason: z.string().max(200),
  dangerLevel: z.enum(["none", "low", "medium", "high"]),
  toxicity: z.string().max(600),
  warnings: z.array(z.string().max(400)).max(8),
  uncertaintyReason: z.string().max(1000),
});

export type InsectIdentificationResult = z.infer<typeof insectIdentificationSchema>;

export const searchQuerySchema = z.object({
  q: z.string().trim().max(100).default(""),
  favorite: z.boolean().optional(),
  dangerLevel: z.enum(["none", "low", "medium", "high"]).optional(),
  minConfidence: z.number().min(0).max(1).optional(),
  cursor: z.string().max(200).optional(),
  limit: z.number().int().min(1).max(50).default(20),
});
