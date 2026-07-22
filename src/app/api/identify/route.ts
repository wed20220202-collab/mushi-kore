import { FieldValue } from "firebase-admin/firestore";
import { adminDb, verifyBearerToken } from "@/lib/firebase/admin";
import { hasValidImageSignature } from "@/lib/image-signature";
import { createIdentificationProvider } from "@/lib/services/ai";

const MAX_AI_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const minuteBuckets = new Map<string, number[]>();

function checkMinuteRate(uid: string) {
  const now = Date.now();
  const recent = (minuteBuckets.get(uid) ?? []).filter((timestamp) => timestamp > now - 60_000);
  const limit = Number(process.env.AI_RATE_LIMIT_PER_MINUTE ?? 3);
  if (recent.length >= limit) return false;
  recent.push(now);
  minuteBuckets.set(uid, recent);
  return true;
}

async function consumeDailyQuota(uid: string) {
  const date = new Date().toISOString().slice(0, 10);
  const limit = Number(process.env.MAX_DAILY_AI_IDENTIFICATIONS ?? 10);
  const usageRef = adminDb().doc(`aiUsage/${uid}_${date}`);
  await adminDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(usageRef);
    const count = Number(snapshot.data()?.count ?? 0);
    if (count >= limit) throw new Error("AI_DAILY_LIMIT");
    transaction.set(usageRef, {
      uid,
      date,
      count: count + 1,
      lastUsedAt: FieldValue.serverTimestamp(),
      ...(snapshot.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    }, { merge: true });
  });
}

export async function POST(request: Request) {
  try {
    const token = await verifyBearerToken(request);
    if (!checkMinuteRate(token.uid)) return Response.json({ error: "短時間のAI判定回数が上限に達しました。1分ほど待ってください。" }, { status: 429 });
    const formData = await request.formData();
    const image = formData.get("image");
    if (!(image instanceof File)) return Response.json({ error: "画像が必要です。" }, { status: 400 });
    if (!ALLOWED_MIME_TYPES.has(image.type)) return Response.json({ error: "対応していない画像形式です。" }, { status: 415 });
    if (image.size === 0 || image.size > MAX_AI_IMAGE_BYTES) return Response.json({ error: "画像は2MB以下にしてください。" }, { status: 413 });
    const bytes = new Uint8Array(await image.arrayBuffer());
    if (!hasValidImageSignature(bytes, image.type)) return Response.json({ error: "画像データを確認できませんでした。" }, { status: 415 });
    await consumeDailyQuota(token.uid);
    const provider = createIdentificationProvider();
    const result = await provider.identify({ bytes, mimeType: image.type as "image/jpeg" | "image/png" | "image/webp" });
    return Response.json({ result, model: process.env.AI_MODEL ?? "mushi-kore-demo-v1", demo: (process.env.AI_PROVIDER ?? "mock") === "mock" });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") return Response.json({ error: "ログインが必要です。" }, { status: 401 });
    if (error instanceof Error && error.message === "AI_DAILY_LIMIT") return Response.json({ error: "本日のAI判定上限に達しました。明日もう一度お試しください。" }, { status: 429 });
    return Response.json({ error: "AI判定を完了できませんでした。時間をおいて再試行してください。" }, { status: 500 });
  }
}
