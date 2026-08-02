import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { assertTestBillingAccess } from "@/lib/stripe/test-access";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("owner-only Stripe test billing gate", () => {
  it("allows only an admin while test billing is enabled and live mode is closed", () => {
    process.env.STRIPE_TEST_BILLING_ENABLED = "true";
    process.env.STRIPE_ALLOW_LIVE_MODE = "false";
    expect(() => assertTestBillingAccess({ admin: true })).not.toThrow();
    expect(() => assertTestBillingAccess({ admin: false })).toThrow("STRIPE_TEST_OWNER_REQUIRED");
  });

  it("fails closed when disabled or the live-mode latch is open", () => {
    process.env.STRIPE_TEST_BILLING_ENABLED = "false";
    expect(() => assertTestBillingAccess({ admin: true })).toThrow("STRIPE_TEST_BILLING_DISABLED");
    process.env.STRIPE_TEST_BILLING_ENABLED = "true";
    process.env.STRIPE_ALLOW_LIVE_MODE = "true";
    expect(() => assertTestBillingAccess({ admin: true })).toThrow("STRIPE_TEST_MODE_SAFETY_LATCH_OPEN");
  });
});

