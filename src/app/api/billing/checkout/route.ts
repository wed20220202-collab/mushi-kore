import { verifyBearerToken } from "@/lib/firebase/admin";
import { getAppBaseUrl, getStripePriceId, isPaidPlanId } from "@/lib/stripe/config";
import { ensureStripeCustomer } from "@/lib/stripe/customer";
import { getStripe } from "@/lib/stripe/server";
import { assertTestBillingAccess } from "@/lib/stripe/test-access";

const ACTIVE_OR_RECOVERABLE_STATUSES = new Set(["active", "trialing", "past_due", "unpaid", "incomplete", "paused"]);

export async function POST(request: Request) {
  try {
    const token = await verifyBearerToken(request);
    assertTestBillingAccess(token);
    const body = await request.json() as { planId?: unknown; requestId?: unknown };
    if (!isPaidPlanId(body.planId)) return Response.json({ error: "有効な有料プランを選択してください。" }, { status: 400 });
    if (typeof body.requestId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.requestId)) {
      return Response.json({ error: "リクエストを確認できませんでした。" }, { status: 400 });
    }

    const stripe = getStripe();
    const customerId = await ensureStripeCustomer(token.uid);
    const subscriptions = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 10 });
    if (subscriptions.data.some((subscription) => ACTIVE_OR_RECOVERABLE_STATUSES.has(subscription.status))) {
      return Response.json({ error: "既存の契約はStripeの契約管理画面から変更してください。", code: "ALREADY_SUBSCRIBED" }, { status: 409 });
    }

    const baseUrl = getAppBaseUrl();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: token.uid,
      line_items: [{ price: getStripePriceId(body.planId), quantity: 1 }],
      metadata: { firebaseUid: token.uid, planId: body.planId },
      subscription_data: { metadata: { firebaseUid: token.uid, planId: body.planId } },
      custom_text: { submit: { message: "TEST MODE：実際の請求は発生しません。月額契約・繰越なしのテストです。" } },
      success_url: `${baseUrl}/pricing?checkout=success`,
      cancel_url: `${baseUrl}/pricing?checkout=canceled`,
    }, {
      idempotencyKey: `mushi-kore-checkout-${token.uid}-${body.requestId}`,
    });
    if (!session.url) throw new Error("STRIPE_CHECKOUT_URL_MISSING");
    return Response.json({ url: session.url });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") return Response.json({ error: "ログインが必要です。" }, { status: 401 });
    if (error instanceof Error && error.message === "STRIPE_TEST_OWNER_REQUIRED") return Response.json({ error: "テスト決済はオーナー限定です。" }, { status: 403 });
    if (error instanceof Error && error.message.startsWith("STRIPE_TEST_")) return Response.json({ error: "テスト決済は現在無効です。" }, { status: 503 });
    if (error instanceof SyntaxError) return Response.json({ error: "リクエスト形式が正しくありません。" }, { status: 400 });
    console.error("Stripe Checkout Session creation failed", error instanceof Error ? error.message : error);
    return Response.json({ error: "決済画面を開始できませんでした。時間をおいて再試行してください。" }, { status: 503 });
  }
}
