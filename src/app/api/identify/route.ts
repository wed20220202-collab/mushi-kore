import { FieldValue } from "firebase-admin/firestore";
import { createHmac } from "node:crypto";
import { adminDb, verifyBearerToken } from "@/lib/firebase/admin";
import { hasValidImageSignature } from "@/lib/image-signature";
import { currentUsagePeriod, GUEST_DAILY_IMAGE_LIMIT } from "@/lib/plans";
import { createIdentificationProvider } from "@/lib/services/ai";
import { resolveUserPlan } from "@/lib/services/billing";

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

async function consumeQuota(subject: string, period: string, limit: number, accountType: "guest" | "user", planId: string) {
  const usageRef = adminDb().doc(`aiUsage/${subject}_${period}`);
  return adminDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(usageRef);
    const count = Number(snapshot.data()?.count ?? 0);
    if (count >= limit) throw new Error("AI_USAGE_LIMIT");
    transaction.set(usageRef, {
      subject,
      accountType,
      planId,
      period,
      count: count + 1,
      lastUsedAt: FieldValue.serverTimestamp(),
      ...(snapshot.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    }, { merge: true });
    return count + 1;
  });
}

async function resolveRequester(request: Request) {
  if (request.headers.get("authorization")) {
    const token = await verifyBearerToken(request);
    const plan = await resolveUserPlan(token.uid);
    return {
      subject: `user_${token.uid}`,
      accountType: "user" as const,
      planId: plan.id,
      quotaPeriod: currentUsagePeriod(),
      quotaLimit: plan.monthlyImageLimit,
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
    planId: "guest",
    quotaPeriod: new Date().toISOString().slice(0, 10),
    quotaLimit: GUEST_DAILY_IMAGE_LIMIT,
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
    const used = await consumeQuota(requester.subject, requester.quotaPeriod, requester.quotaLimit, requester.accountType, requester.planId);
    const provider = createIdentificationProvider();
    const result = await provider.identify({ bytes, mimeType: image.type as "image/jpeg" | "image/png" | "image/webp" });
    return Response.json({ result, model: process.env.AI_MODEL ?? "mushi-kore-demo-v1", demo: (process.env.AI_PROVIDER ?? "mock") === "mock", usage: { used, limit: requester.quotaLimit, period: requester.quotaPeriod, planId: requester.planId } });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") return Response.json({ error: "ログインが必要です。" }, { status: 401 });
    if (error instanceof Error && error.message === "AI_USAGE_LIMIT") return Response.json({ error: "現在のプランのAI判定上限に達しました。料金プランをご確認ください。" }, { status: 429 });
    if (error instanceof Error && error.message === "GUEST_ACCESS_NOT_CONFIGURED") return Response.json({ error: "ゲスト判定は現在準備中です。Googleログイン後にお試しください。" }, { status: 503 });
    return Response.json({ error: "AI判定を完了できませんでした。時間をおいて再試行してください。" }, { status: 500 });
  }
}
