import "server-only";

import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY_NOT_CONFIGURED");

  const liveModeAllowed = process.env.STRIPE_ALLOW_LIVE_MODE === "true";
  if (!liveModeAllowed && !secretKey.startsWith("sk_test_")) {
    throw new Error("STRIPE_TEST_MODE_REQUIRED");
  }

  stripeClient ??= new Stripe(secretKey, {
    appInfo: { name: "mushi-kore", version: "0.1.0" },
    maxNetworkRetries: 2,
  });
  return stripeClient;
}

export function assertStripeObjectMode(livemode: boolean) {
  if (livemode && process.env.STRIPE_ALLOW_LIVE_MODE !== "true") {
    throw new Error("STRIPE_LIVE_EVENT_REJECTED");
  }
}

