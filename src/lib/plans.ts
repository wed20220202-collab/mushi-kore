export const PLAN_IDS = ["free", "light", "standard", "pro"] as const;
export type PlanId = (typeof PLAN_IDS)[number];
export const GUEST_DAILY_IMAGE_LIMIT = 1;

export interface SubscriptionPlan {
  id: PlanId;
  name: string;
  monthlyImageLimit: number;
  monthlyPriceYen: number;
  showsAds: boolean;
  description: string;
}

export const SUBSCRIPTION_PLANS: readonly SubscriptionPlan[] = [
  { id: "free", name: "無料", monthlyImageLimit: 10, monthlyPriceYen: 0, showsAds: true, description: "まずは気軽に虫を調べたい方へ" },
  { id: "light", name: "ライト", monthlyImageLimit: 50, monthlyPriceYen: 300, showsAds: false, description: "週末の観察や散歩のおともに" },
  { id: "standard", name: "スタンダード", monthlyImageLimit: 100, monthlyPriceYen: 500, showsAds: false, description: "継続的に昆虫図鑑を育てたい方へ" },
  { id: "pro", name: "プロ", monthlyImageLimit: 1_000, monthlyPriceYen: 4_500, showsAds: false, description: "調査・教育・大量観察に" },
] as const;

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && (PLAN_IDS as readonly string[]).includes(value);
}

export function getPlan(planId: unknown): SubscriptionPlan {
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === planId) ?? SUBSCRIPTION_PLANS[0];
}

export function currentUsagePeriod(date = new Date()) {
  return date.toISOString().slice(0, 7);
}
