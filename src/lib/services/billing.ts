import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import { currentUsagePeriod, getPlan, isPlanId, type SubscriptionPlan } from "@/lib/plans";

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);

export async function resolveUserPlan(uid: string): Promise<SubscriptionPlan> {
  const snapshot = await adminDb().doc(`billingCustomers/${uid}`).get();
  const data = snapshot.data();
  if (!data || !ACTIVE_SUBSCRIPTION_STATUSES.has(String(data.status)) || !isPlanId(data.planId)) return getPlan("free");
  return getPlan(data.planId);
}

export async function getUserUsage(uid: string, plan = getPlan("free")) {
  const period = currentUsagePeriod();
  const snapshot = await adminDb().doc(`aiUsage/user_${uid}_${period}`).get();
  return { used: Number(snapshot.data()?.count ?? 0), limit: plan.monthlyImageLimit, period, planId: plan.id };
}
