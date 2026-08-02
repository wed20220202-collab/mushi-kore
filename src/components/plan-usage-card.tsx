"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { CreditCard } from "lucide-react";
import type { SubscriptionPlan } from "@/lib/plans";

interface PlanStatus { plan: SubscriptionPlan; usage: { used: number; limit: number; period: string; planId: string } }

export function PlanUsageCard({ user }: { user: User | null }) {
  const [status, setStatus] = useState<PlanStatus | null>(null);

  useEffect(() => {
    if (!user) return;
    let disposed = false;
    void user.getIdToken().then((token) => fetch("/api/billing/status", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }))
      .then((response) => response.ok ? response.json() as Promise<PlanStatus> : Promise.reject(new Error("PLAN_STATUS_FAILED")))
      .then((next) => { if (!disposed) setStatus(next); })
      .catch(() => undefined);
    return () => { disposed = true; };
  }, [user]);

  if (!user) return <a className="plan-usage guest" href="/pricing"><span><CreditCard size={19} /><b>ゲスト体験</b></span><small>1日1回まで · 無料プランを見る →</small></a>;
  if (!status) return null;
  const remaining = Math.max(0, status.usage.limit - status.usage.used);
  const percentage = Math.min(100, Math.round((status.usage.used / status.usage.limit) * 100));
  return <a className="plan-usage" href="/pricing"><div><span><CreditCard size={19} /><b>{status.plan.name}プラン</b></span><strong>残り {remaining}枚</strong></div><div className="progress"><span style={{ width: `${percentage}%` }} /></div><small>今月 {status.usage.used} / {status.usage.limit}枚 · プランを確認 →</small></a>;
}
