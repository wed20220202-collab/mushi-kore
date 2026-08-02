import { describe, expect, it } from "vitest";
import { currentUsagePeriod, getPlan, isPlanId, SUBSCRIPTION_PLANS } from "@/lib/plans";

describe("subscription plans", () => {
  it("defines the requested monthly limits and prices", () => {
    expect(SUBSCRIPTION_PLANS.map(({ monthlyImageLimit, monthlyPriceYen }) => [monthlyImageLimit, monthlyPriceYen])).toEqual([[10, 0], [50, 100], [100, 280], [1_000, 2_500]]);
  });

  it("falls back to the free plan for unknown identifiers", () => {
    expect(isPlanId("standard")).toBe(true);
    expect(isPlanId("unknown")).toBe(false);
    expect(getPlan("unknown").id).toBe("free");
  });

  it("uses a UTC calendar month as the usage period", () => {
    expect(currentUsagePeriod(new Date("2026-08-31T23:00:00Z"))).toBe("2026-08");
  });
});
