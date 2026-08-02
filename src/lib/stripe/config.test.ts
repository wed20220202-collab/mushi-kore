import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getAppBaseUrl, getPlanIdForStripePrice, getStripePriceId, isPaidPlanId } from "@/lib/stripe/config";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("Stripe billing configuration", () => {
  it("only accepts paid internal plan identifiers", () => {
    expect(isPaidPlanId("light")).toBe(true);
    expect(isPaidPlanId("free")).toBe(false);
    expect(isPaidPlanId("made-up")).toBe(false);
  });

  it("maps only server-configured Price IDs", () => {
    process.env.STRIPE_PRICE_LIGHT = "price_light_test";
    process.env.STRIPE_PRICE_STANDARD = "price_standard_test";
    expect(getStripePriceId("light")).toBe("price_light_test");
    expect(getPlanIdForStripePrice("price_standard_test")).toBe("standard");
    expect(getPlanIdForStripePrice("price_attacker_controlled")).toBeNull();
  });

  it("rejects a non-HTTPS public base URL", () => {
    process.env.APP_BASE_URL = "http://mushi-kore.example";
    expect(() => getAppBaseUrl()).toThrow("APP_BASE_URL_MUST_USE_HTTPS");
    process.env.APP_BASE_URL = "http://localhost:3000/path";
    expect(getAppBaseUrl()).toBe("http://localhost:3000");
  });
});

