import "server-only";

import { isPlanId, type PlanId } from "@/lib/plans";

const PAID_PLAN_IDS = ["light", "standard", "pro"] as const satisfies readonly PlanId[];

const PRICE_ENV_BY_PLAN: Record<(typeof PAID_PLAN_IDS)[number], string> = {
  light: "STRIPE_PRICE_LIGHT",
  standard: "STRIPE_PRICE_STANDARD",
  pro: "STRIPE_PRICE_PRO",
};

export type PaidPlanId = (typeof PAID_PLAN_IDS)[number];

export function isPaidPlanId(value: unknown): value is PaidPlanId {
  return isPlanId(value) && value !== "free";
}

export function getStripePriceId(planId: PaidPlanId) {
  const environmentName = PRICE_ENV_BY_PLAN[planId];
  const priceId = process.env[environmentName]?.trim();
  if (!priceId) throw new Error(`STRIPE_PRICE_NOT_CONFIGURED:${planId}`);
  if (!priceId.startsWith("price_")) throw new Error(`STRIPE_PRICE_INVALID:${planId}`);
  return priceId;
}

export function getPlanIdForStripePrice(priceId: string): PaidPlanId | null {
  for (const planId of PAID_PLAN_IDS) {
    const configuredPriceId = process.env[PRICE_ENV_BY_PLAN[planId]]?.trim();
    if (configuredPriceId && configuredPriceId === priceId) return planId;
  }
  return null;
}

export function getAppBaseUrl() {
  const configured = process.env.APP_BASE_URL?.trim();
  if (!configured) throw new Error("APP_BASE_URL_NOT_CONFIGURED");
  const url = new URL(configured);
  const localDevelopment = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(localDevelopment && url.protocol === "http:")) {
    throw new Error("APP_BASE_URL_MUST_USE_HTTPS");
  }
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

