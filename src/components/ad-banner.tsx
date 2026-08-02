"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";

declare global {
  interface Window { adsbygoogle?: Record<string, unknown>[]; }
}

export function AdBanner({ slot = process.env.NEXT_PUBLIC_ADSENSE_SLOT }: { slot?: string }) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

  useEffect(() => {
    if (!client || !slot) return;
    const scriptId = "google-adsense";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
      document.head.appendChild(script);
    }
    try {
      (window.adsbygoogle = window.adsbygoogle ?? []).push({});
    } catch {
      // Ad blockers and unapproved sites can prevent AdSense initialization.
    }
  }, [client, slot]);

  if (!client || !slot) return null;
  return <aside className="ad-banner" aria-label="広告"><span>広告</span><ins className="adsbygoogle" style={{ display: "block" }} data-ad-client={client} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true" /></aside>;
}

export function AccountAwareAdBanner() {
  const [showAds, setShowAds] = useState<boolean | null>(firebaseAuth ? null : true);

  useEffect(() => {
    if (!firebaseAuth) return;
    let disposed = false;
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      if (!user) {
        if (!disposed) setShowAds(true);
        return;
      }
      if (!disposed) setShowAds(null);
      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/billing/status", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        const payload = await response.json() as { adsEnabled?: boolean };
        if (!disposed) setShowAds(response.ok ? payload.adsEnabled === true : false);
      } catch {
        if (!disposed) setShowAds(false);
      }
    });
    return () => {
      disposed = true;
      unsubscribe();
    };
  }, []);

  return showAds ? <AdBanner /> : null;
}
