import "server-only";

import { readFileSync } from "node:fs";
import type { InsectIdentificationResult } from "@/lib/schemas";
import { insectIdentificationSchema } from "@/lib/schemas";
import { categoryConfig, type CollectionCategory } from "@/lib/categories";

export interface ImageInput { bytes: Uint8Array; mimeType: "image/jpeg" | "image/png" | "image/webp"; }
export interface InsectIdentificationProvider { identify(image: ImageInput, category: CollectionCategory): Promise<InsectIdentificationResult>; }

export function validateIdentificationResult(input: unknown): InsectIdentificationResult {
  return insectIdentificationSchema.parse(input);
}

export function identificationSystemPrompt(category: CollectionCategory) {
  const subject = categoryConfig[category].subject;
  return `あなたは日本の利用者向けの慎重な${subject}同定アシスタントです。画像を詳細に観察し、指定カテゴリ「${category}」の${subject}を同定してください。画像だけで断定せず、候補は確度順に最大3件、confidenceは0〜1で返してください。和名・英名・学名と分類は、確信がない場合に推測で細部を埋めないでください。対象の${subject}ではない、または確認できない場合はisTargetをfalseにし、commonNameJaは「${subject}を確認できませんでした」、候補は空配列にしてください。categoryは必ず「${category}」を返してください。危険性、毒性、食用可否は確定診断ではなく、触れない・食べないことを安全側の既定としてください。指定JSONスキーマ以外の文章は返さないでください。`;
}

const IDENTIFICATION_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    category: { type: "string", enum: ["insect", "fish", "flower", "animal"] },
    isTarget: { type: "boolean" },
    commonNameJa: { type: "string", description: "日本語の一般名。確認不能なら対象を確認できませんでした" },
    commonNameEn: { type: "string" },
    scientificName: { type: "string" },
    order: { type: "string" },
    family: { type: "string" },
    genus: { type: "string" },
    candidates: {
      type: "array",
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          commonNameJa: { type: "string" },
          commonNameEn: { type: "string" },
          scientificName: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 1 },
        },
        required: ["commonNameJa", "commonNameEn", "scientificName", "confidence"],
      },
    },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    appearance: { type: "string" },
    reason: { type: "string" },
    habitat: { type: "string" },
    activeSeason: { type: "string" },
    dangerLevel: { type: "string", enum: ["none", "low", "medium", "high"] },
    toxicity: { type: "string" },
    warnings: { type: "array", maxItems: 8, items: { type: "string" } },
    uncertaintyReason: { type: "string" },
  },
  required: ["category", "isTarget", "commonNameJa", "commonNameEn", "scientificName", "order", "family", "genus", "candidates", "confidence", "appearance", "reason", "habitat", "activeSeason", "dangerLevel", "toxicity", "warnings", "uncertaintyReason"],
} as const;

function getGeminiApiKey() {
  const filePath = process.env.GEMINI_API_KEY_FILE;
  const key = filePath ? readFileSync(filePath, "utf8").trim() : process.env.AI_API_KEY?.trim();
  if (!key) throw new Error("GEMINI_API_KEY_NOT_CONFIGURED");
  return key;
}

export class GeminiInsectIdentificationProvider implements InsectIdentificationProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model = "gemini-3.6-flash",
  ) {}

  async identify(image: ImageInput, category: CollectionCategory): Promise<InsectIdentificationResult> {
    if (image.bytes.byteLength === 0) throw new Error("Image is empty.");
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": this.apiKey },
      body: JSON.stringify({
        model: this.model,
        system_instruction: identificationSystemPrompt(category),
        input: [
          { type: "image", mime_type: image.mimeType, data: Buffer.from(image.bytes).toString("base64") },
          { type: "text", text: `この画像に写る${categoryConfig[category].subject}を同定し、観察できる特徴と不確実性を日本語中心で返してください。` },
        ],
        response_format: { type: "text", mime_type: "application/json", schema: IDENTIFICATION_JSON_SCHEMA },
        generation_config: { max_output_tokens: 2_048, thinking_level: "low" },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) throw new Error(`GEMINI_REQUEST_FAILED_${response.status}`);
    const interaction = await response.json() as {
      status?: string;
      steps?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
    };
    const outputText = interaction.steps
      ?.filter((step) => step.type === "model_output")
      .flatMap((step) => step.content ?? [])
      .filter((part) => part.type === "text" && typeof part.text === "string")
      .map((part) => part.text)
      .join("");
    if (interaction.status !== "completed" || !outputText) throw new Error("GEMINI_INCOMPLETE_RESPONSE");
    const result = validateIdentificationResult(JSON.parse(outputText));
    if (result.category !== category) throw new Error("GEMINI_CATEGORY_MISMATCH");
    return result;
  }
}

export class MockInsectIdentificationProvider implements InsectIdentificationProvider {
  async identify(image: ImageInput, category: CollectionCategory): Promise<InsectIdentificationResult> {
    if (image.bytes.byteLength === 0) throw new Error("Image is empty.");
    const examples: Record<CollectionCategory, Pick<InsectIdentificationResult, "commonNameJa" | "commonNameEn" | "scientificName" | "order" | "family" | "genus" | "appearance" | "reason" | "habitat" | "activeSeason">> = {
      insect: { commonNameJa: "カブトムシ", commonNameEn: "Japanese rhinoceros beetle", scientificName: "Trypoxylus dichotomus", order: "コウチュウ目", family: "コガネムシ科", genus: "カブトムシ属", appearance: "大きく湾曲した頭角と、光沢のある赤褐色の上翅が見られます。", reason: "頭部の一本角、前胸部の形、体色が特徴と一致します。", habitat: "クヌギやコナラのある雑木林、里山", activeSeason: "6月〜8月" },
      fish: { commonNameJa: "マアジ", commonNameEn: "Japanese jack mackerel", scientificName: "Trachurus japonicus", order: "アジ目", family: "アジ科", genus: "マアジ属", appearance: "銀色の体側と、側線上の硬いぜいごが見られます。", reason: "体形と側線の特徴がマアジに一致します。", habitat: "沿岸から沖合の海域", activeSeason: "通年" },
      flower: { commonNameJa: "ソメイヨシノ", commonNameEn: "Somei-yoshino cherry", scientificName: "Cerasus × yedoensis", order: "バラ目", family: "バラ科", genus: "サクラ属", appearance: "淡い紅色の5枚の花弁がまとまって咲いています。", reason: "花弁の形と花序の特徴が一致します。", habitat: "公園、街路、庭園", activeSeason: "3月〜4月" },
      animal: { commonNameJa: "ニホンリス", commonNameEn: "Japanese squirrel", scientificName: "Sciurus lis", order: "齧歯目", family: "リス科", genus: "リス属", appearance: "ふさふさした尾と褐色の体毛が見られます。", reason: "尾、耳、体形の特徴が一致します。", habitat: "本州・四国の森林", activeSeason: "通年" },
    };
    const example = examples[category];
    return validateIdentificationResult({
      category,
      isTarget: true,
      ...example,
      candidates: [
        { commonNameJa: example.commonNameJa, commonNameEn: example.commonNameEn, scientificName: example.scientificName, confidence: 0.92 },
      ],
      confidence: 0.92,
      dangerLevel: "none",
      toxicity: "人に対する毒性は知られていません。",
      warnings: ["AIによる参考判定です。正確な同定には専門家への確認が必要です。"],
      uncertaintyReason: "画像だけでは大きさや撮影地域を完全には確認できません。",
    });
  }
}

export function createIdentificationProvider(): InsectIdentificationProvider {
  const provider = process.env.AI_PROVIDER ?? "mock";
  if (provider === "mock") return new MockInsectIdentificationProvider();
  if (provider === "gemini") return new GeminiInsectIdentificationProvider(getGeminiApiKey(), process.env.AI_MODEL ?? "gemini-3.6-flash");
  throw new Error(`Unsupported AI provider: ${provider}`);
}
