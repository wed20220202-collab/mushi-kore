import { describe, expect, it } from "vitest";
import { currentUsagePeriod, getPlan, GUEST_DAILY_IMAGE_LIMIT, isPlanId, SUBSCRIPTION_PLANS } from "@/lib/plans";

describe("subscription plans", () => {
  it("defines the requested monthly limits and prices", () => {
    expect(SUBSCRIPTION_PLANS.map(({ monthlyImageLimit, monthlyPriceYen }) => [monthlyImageLimit, monthlyPriceYen])).toEqual([[10, 0], [50, 300], [100, 500], [1_000, 4_500]]);
  });

  it("shows ads only on the free plan", () => {
    expect(SUBSCRIPTION_PLANS.map(({ id, showsAds }) => [id, showsAds])).toEqual([
      ["free", true], ["light", false], ["standard", false], ["pro", false],
    ]);
  });

  it("falls back to the free plan for unknown identifiers", () => {
    expect(isPlanId("standard")).toBe(true);
    expect(isPlanId("unknown")).toBe(false);
    expect(getPlan("unknown").id).toBe("free");
  });

  it("uses a UTC calendar month as the usage period", () => {
    expect(currentUsagePeriod(new Date("2026-08-31T23:00:00Z"))).toBe("2026-08");
  });

  it("keeps the acquisition guest path at one server-defined use per day", () => {
    expect(GUEST_DAILY_IMAGE_LIMIT).toBe(1);
  });
});
