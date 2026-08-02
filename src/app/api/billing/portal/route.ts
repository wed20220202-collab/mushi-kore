import { adminDb, verifyBearerToken } from "@/lib/firebase/admin";
import { getAppBaseUrl } from "@/lib/stripe/config";
import { assertStripeCustomerOwnership } from "@/lib/stripe/customer";
import { getStripe } from "@/lib/stripe/server";
import { assertTestBillingAccess } from "@/lib/stripe/test-access";

export async function POST(request: Request) {
  try {
    const token = await verifyBearerToken(request);
    assertTestBillingAccess(token);
    const snapshot = await adminDb().doc(`billingCustomers/${token.uid}`).get();
    const customerId = snapshot.data()?.stripeCustomerId;
    if (typeof customerId !== "string" || !customerId.startsWith("cus_")) {
      return Response.json({ error: "管理できる契約がまだありません。", code: "NO_BILLING_CUSTOMER" }, { status: 409 });
    }
    await assertStripeCustomerOwnership(token.uid, customerId);
    const configuration = process.env.STRIPE_PORTAL_CONFIGURATION_ID?.trim();
    if (!configuration?.startsWith("bpc_")) throw new Error("STRIPE_PORTAL_CONFIGURATION_NOT_CONFIGURED");
    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      configuration,
      return_url: `${getAppBaseUrl()}/pricing`,
    });
    return Response.json({ url: session.url });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") return Response.json({ error: "ログインが必要です。" }, { status: 401 });
    if (error instanceof Error && error.message === "STRIPE_TEST_OWNER_REQUIRED") return Response.json({ error: "テスト決済はオーナー限定です。" }, { status: 403 });
    if (error instanceof Error && error.message.startsWith("STRIPE_TEST_")) return Response.json({ error: "テスト決済は現在無効です。" }, { status: 503 });
    console.error("Stripe Customer Portal session creation failed", error instanceof Error ? error.message : error);
    return Response.json({ error: "契約管理画面を開けませんでした。時間をおいて再試行してください。" }, { status: 503 });
  }
}
