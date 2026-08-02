import "server-only";

export interface BillingTokenClaims {
  admin?: boolean;
}

export function assertTestBillingAccess(token: BillingTokenClaims) {
  if (process.env.STRIPE_TEST_BILLING_ENABLED !== "true") throw new Error("STRIPE_TEST_BILLING_DISABLED");
  if (process.env.STRIPE_ALLOW_LIVE_MODE === "true") throw new Error("STRIPE_TEST_MODE_SAFETY_LATCH_OPEN");
  if (token.admin !== true) throw new Error("STRIPE_TEST_OWNER_REQUIRED");
}

