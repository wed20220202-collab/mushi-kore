import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import { currentUsagePeriod, getPlan, isPlanId, type SubscriptionPlan } from "@/lib/plans";

const PAID_ENTITLEMENT_STATUSES = new Set(["active", "trialing", "past_due"]);

export function hasPaidEntitlementStatus(status: unknown) {
  return PAID_ENTITLEMENT_STATUSES.has(String(status));
}

export async function resolveUserPlan(uid: string): Promise<SubscriptionPlan> {
  const snapshot = await adminDb().doc(`billingCustomers/${uid}`).get();
  const data = snapshot.data();
  if (!data || !hasPaidEntitlementStatus(data.status) || !isPlanId(data.planId)) return getPlan("free");
  return getPlan(data.planId);
}

export async function getUserUsage(uid: string, plan = getPlan("free")) {
  const period = currentUsagePeriod();
  const snapshot = await adminDb().doc(`aiUsage/user_${uid}_${period}`).get();
  return { used: Number(snapshot.data()?.count ?? 0), limit: plan.monthlyImageLimit, period, planId: plan.id };
}
