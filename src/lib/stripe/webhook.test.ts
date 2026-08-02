import { afterEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/firebase/admin", () => ({ adminDb: vi.fn() }));
vi.mock("@/lib/stripe/server", () => ({ assertStripeObjectMode: vi.fn(), getStripe: vi.fn() }));
vi.mock("@/lib/stripe/customer", () => ({ stripeCustomerId: (customer: string | { id: string }) => typeof customer === "string" ? customer : customer.id }));

import { subscriptionProjection } from "@/lib/stripe/webhook";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

function subscriptionWithPrices(...priceIds: string[]) {
  return {
    id: "sub_test",
    customer: "cus_test",
    status: "active",
    cancel_at_period_end: false,
    items: {
      data: priceIds.map((id) => ({ price: { id }, current_period_end: 1_800_000_000 })),
    },
  } as unknown as Stripe.Subscription;
}

describe("Stripe subscription entitlement projection", () => {
  it("maps one allowlisted Price to an internal plan", () => {
    process.env.STRIPE_PRICE_LIGHT = "price_light_test";
    expect(subscriptionProjection(subscriptionWithPrices("price_light_test"))).toMatchObject({
      planId: "light",
      stripePriceId: "price_light_test",
      stripeConfigurationError: null,
    });
  });

  it("fails closed for an unknown Price or multiple subscription items", () => {
    expect(subscriptionProjection(subscriptionWithPrices("price_unknown"))).toMatchObject({
      planId: null,
      stripeConfigurationError: "UNKNOWN_PRICE",
    });
    expect(subscriptionProjection(subscriptionWithPrices("price_a", "price_b"))).toMatchObject({
      planId: null,
      stripePriceId: null,
      stripeConfigurationError: "UNEXPECTED_ITEM_COUNT",
    });
  });
});

