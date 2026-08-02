import { FieldValue } from "firebase-admin/firestore";
import { createHmac } from "node:crypto";
import { adminDb, verifyBearerToken } from "@/lib/firebase/admin";
import { hasValidImageSignature } from "@/lib/image-signature";
import { createIdentificationProvider } from "@/lib/services/ai";

const MAX_AI_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const minuteBuckets = new Map<string, number[]>();

function checkMinuteRate(subject: string, limit: number) {
  const now = Date.now();
  const recent = (minuteBuckets.get(subject) ?? []).filter((timestamp) => timestamp > now - 60_000);
  if (recent.length >= limit) return false;
  recent.push(now);
  minuteBuckets.set(subject, recent);
  return true;
}

async function consumeDailyQuota(subject: string, limit: number, accountType: "guest" | "user") {
  const date = new Date().toISOString().slice(0, 10);
  const usageRef = adminDb().doc(`aiUsage/${subject}_${date}`);
  await adminDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(usageRef);
    const count = Number(snapshot.data()?.count ?? 0);
    if (count >= limit) throw new Error("AI_DAILY_LIMIT");
    transaction.set(usageRef, {
      subject,
      accountType,
      date,
      count: count + 1,
      lastUsedAt: FieldValue.serverTimestamp(),
      ...(snapshot.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    }, { merge: true });
  });
}

async function resolveRequester(request: Request) {
  if (request.headers.get("authorization")) {
    const token = await verifyBearerToken(request);
    return {
      subject: `user_${token.uid}`,
      accountType: "user" as const,
      dailyLimit: Number(process.env.MAX_DAILY_AI_IDENTIFICATIONS ?? 10),
      minuteLimit: Number(process.env.AI_RATE_LIMIT_PER_MINUTE ?? 3),
    };
  }

  const forwardedFor = request.headers.get("x-vercel-forwarded-for")
    ?? request.headers.get("x-forwarded-for")
    ?? request.headers.get("x-real-ip")
    ?? "unknown";
  const clientAddress = forwardedFor.split(",")[0]?.trim() || "unknown";
  const userAgent = request.headers.get("user-agent") ?? "unknown";
  const secret = process.env.AI_GUEST_QUOTA_SECRET
    ?? process.env.FIREBASE_ADMIN_PRIVATE_KEY
    ?? process.env.AI_API_KEY;
  if (!secret) throw new Error("GUEST_ACCESS_NOT_CONFIGURED");
  const hash = createHmac("sha256", secret).update(`${clientAddress}\n${userAgent}`).digest("hex").slice(0, 32);
  return {
    subject: `guest_${hash}`,
    accountType: "guest" as const,
    dailyLimit: Number(process.env.MAX_DAILY_GUEST_AI_IDENTIFICATIONS ?? 1),
    minuteLimit: 1,
  };
}

export async function POST(request: Request) {
  try {
    const requester = await resolveRequester(request);
    if (!checkMinuteRate(requester.subject, requester.minuteLimit)) return Response.json({ error: "短時間のAI判定回数が上限に達しました。1分ほど待ってください。" }, { status: 429 });
    const formData = await request.formData();
    const image = formData.get("image");
    if (!(image instanceof File)) return Response.json({ error: "画像が必要です。" }, { status: 400 });
    if (!ALLOWED_MIME_TYPES.has(image.type)) return Response.json({ error: "対応していない画像形式です。" }, { status: 415 });
    if (image.size === 0 || image.size > MAX_AI_IMAGE_BYTES) return Response.json({ error: "画像は2MB以下にしてください。" }, { status: 413 });
    const bytes = new Uint8Array(await image.arrayBuffer());
    if (!hasValidImageSignature(bytes, image.type)) return Response.json({ error: "画像データを確認できませんでした。" }, { status: 415 });
    await consumeDailyQuota(requester.subject, requester.dailyLimit, requester.accountType);
    const provider = createIdentificationProvider();
    const result = await provider.identify({ bytes, mimeType: image.type as "image/jpeg" | "image/png" | "image/webp" });
    return Response.json({ result, model: process.env.AI_MODEL ?? "mushi-kore-demo-v1", demo: (process.env.AI_PROVIDER ?? "mock") === "mock" });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") return Response.json({ error: "ログインが必要です。" }, { status: 401 });
    if (error instanceof Error && error.message === "AI_DAILY_LIMIT") return Response.json({ error: "本日のAI判定上限に達しました。明日もう一度お試しください。" }, { status: 429 });
    if (error instanceof Error && error.message === "GUEST_ACCESS_NOT_CONFIGURED") return Response.json({ error: "ゲスト判定は現在準備中です。Googleログイン後にお試しください。" }, { status: 503 });
    return Response.json({ error: "AI判定を完了できませんでした。時間をおいて再試行してください。" }, { status: 500 });
  }
}
