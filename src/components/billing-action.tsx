"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import type { PlanId } from "@/lib/plans";
import { firebaseAuth } from "@/lib/firebase/client";

type PaidPlanId = Exclude<PlanId, "free">;

async function openBillingSession(path: string, body?: Record<string, unknown>) {
  const user = firebaseAuth?.currentUser;
  if (!user) throw new Error("ログインが必要です。");
  const token = await user.getIdToken();
  const response = await fetch(path, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json() as { url?: string; error?: string };
  if (!response.ok || !payload.url) throw new Error(payload.error || "請求画面を開けませんでした。");
  window.location.assign(payload.url);
}

function useBillingUser() {
  const [user, setUser] = useState<User | null>(firebaseAuth?.currentUser ?? null);
  useEffect(() => firebaseAuth ? onAuthStateChanged(firebaseAuth, setUser) : undefined, []);
  return user;
}

function useTestBillingOwner(user: User | null) {
  const [ownerUid, setOwnerUid] = useState<string | null>(null);
  const testBillingEnabled = process.env.NEXT_PUBLIC_STRIPE_TEST_BILLING_ENABLED === "true";
  useEffect(() => {
    let disposed = false;
    if (!user || !testBillingEnabled) return;
    void user.getIdTokenResult().then((result) => {
      if (!disposed) setOwnerUid(result.claims.admin === true ? user.uid : null);
    }).catch(() => { if (!disposed) setOwnerUid(null); });
    return () => { disposed = true; };
  }, [testBillingEnabled, user]);
  return Boolean(user && testBillingEnabled && ownerUid === user.uid);
}

export function CheckoutButton({ planId }: { planId: PaidPlanId }) {
  const user = useBillingUser();
  const testOwner = useTestBillingOwner(user);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function startCheckout() {
    if (!user) {
      window.location.assign("/#app");
      return;
    }
    if (!testOwner) return;
    setBusy(true);
    setError("");
    try {
      await openBillingSession("/api/billing/checkout", { planId, requestId: crypto.randomUUID() });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "決済画面を開けませんでした。");
      setBusy(false);
    }
  }

  return <>
    <button className="plan-button" type="button" onClick={startCheckout} disabled={busy || (Boolean(user) && !testOwner)}>
      {busy ? "テスト決済を準備中…" : !user ? "ログインして確認" : testOwner ? "テスト決済を試す" : "テスト決済（オーナー限定）"}
    </button>
    {error && <small className="billing-error" role="alert">{error}</small>}
  </>;
}

export function CustomerPortalButton() {
  const user = useBillingUser();
  const testOwner = useTestBillingOwner(user);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function openPortal() {
    if (!user) {
      window.location.assign("/#app");
      return;
    }
    if (!testOwner) return;
    setBusy(true);
    setError("");
    try {
      await openBillingSession("/api/billing/portal");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "契約管理画面を開けませんでした。");
      setBusy(false);
    }
  }

  return <div className="billing-portal-action">
    <button className="plan-button" type="button" onClick={openPortal} disabled={busy || (Boolean(user) && !testOwner)}>
      {busy ? "テスト契約を確認中…" : !user ? "ログインして確認" : testOwner ? "テスト契約を管理" : "テスト契約（オーナー限定）"}
    </button>
    {error && <small className="billing-error" role="alert">{error}</small>}
  </div>;
}
