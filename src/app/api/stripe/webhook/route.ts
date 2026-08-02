import { getStripe } from "@/lib/stripe/server";
import { processStripeWebhookEvent } from "@/lib/stripe/webhook";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!signature || !webhookSecret) return Response.json({ error: "Webhook is not configured." }, { status: 400 });

  let event;
  try {
    // Signature verification requires the exact, unparsed request body.
    const payload = await request.text();
    event = getStripe().webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error("Stripe webhook signature verification failed", error instanceof Error ? error.message : error);
    return Response.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  try {
    const result = await processStripeWebhookEvent(event);
    return Response.json({ received: true, ...result });
  } catch (error) {
    console.error("Stripe webhook processing failed", event.id, event.type, error instanceof Error ? error.message : error);
    return Response.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}

