import { verifyBearerToken } from "@/lib/firebase/admin";
import { getUserUsage, resolveUserPlan } from "@/lib/services/billing";

export async function GET(request: Request) {
  try {
    const token = await verifyBearerToken(request);
    const plan = await resolveUserPlan(token.uid);
    const usage = await getUserUsage(token.uid, plan);
    return Response.json({ plan, usage });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") return Response.json({ error: "ログインが必要です。" }, { status: 401 });
    return Response.json({ error: "プラン情報を取得できませんでした。" }, { status: 500 });
  }
}
