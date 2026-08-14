import { describe, expect, it } from "vitest";
import { currentUsageDay, FREE_USER_DAILY_IMAGE_LIMIT, GUEST_DAILY_IMAGE_LIMIT } from "@/lib/plans";

describe("free usage limits", () => {
  it("uses a UTC calendar day as the usage period", () => {
    expect(currentUsageDay(new Date("2026-08-31T23:00:00Z"))).toBe("2026-08-31");
  });

  it("keeps free access server-defined for guests and signed-in users", () => {
    expect(GUEST_DAILY_IMAGE_LIMIT).toBe(1);
    expect(FREE_USER_DAILY_IMAGE_LIMIT).toBe(10);
  });
});
