import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/firebase/admin", () => ({ adminDb: vi.fn() }));

import { hasPaidEntitlementStatus } from "@/lib/services/billing";

describe("paid entitlement statuses", () => {
  it("keeps access during Stripe's payment-recovery window", () => {
    expect(hasPaidEntitlementStatus("active")).toBe(true);
    expect(hasPaidEntitlementStatus("trialing")).toBe(true);
    expect(hasPaidEntitlementStatus("past_due")).toBe(true);
  });

  it("does not grant access for terminal or unpaid initial states", () => {
    for (const status of ["none", "incomplete", "incomplete_expired", "unpaid", "canceled", "paused"]) {
      expect(hasPaidEntitlementStatus(status)).toBe(false);
    }
  });
});

