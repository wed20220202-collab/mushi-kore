export const collectionCategories = ["insect", "fish", "flower", "animal"] as const;

export type CollectionCategory = (typeof collectionCategories)[number];

export const categoryConfig: Record<CollectionCategory, {
  label: string;
  shortLabel: string;
  brand: string;
  subject: string;
  subjectPlural: string;
  accent: string;
  emoji: string;
}> = {
  insect: { label: "昆虫", shortLabel: "むし", brand: "むしコレ", subject: "虫", subjectPlural: "虫たち", accent: "#d9ef9f", emoji: "🐞" },
  fish: { label: "魚", shortLabel: "うお", brand: "うおコレ", subject: "魚", subjectPlural: "魚たち", accent: "#a8dcf0", emoji: "🐟" },
  flower: { label: "花", shortLabel: "はな", brand: "はなコレ", subject: "花", subjectPlural: "花々", accent: "#f2bfd3", emoji: "🌸" },
  animal: { label: "動物", shortLabel: "どう", brand: "どうコレ", subject: "動物", subjectPlural: "動物たち", accent: "#e8c59d", emoji: "🐾" },
};

export function isCollectionCategory(value: unknown): value is CollectionCategory {
  return typeof value === "string" && collectionCategories.includes(value as CollectionCategory);
}

export function categoryOrInsect(value: unknown): CollectionCategory {
  return isCollectionCategory(value) ? value : "insect";
}
