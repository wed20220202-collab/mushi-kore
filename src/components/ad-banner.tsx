"use client";

import { useEffect } from "react";

declare global {
  interface Window { adsbygoogle?: Record<string, unknown>[]; }
}

export function AdBanner({ slot = process.env.NEXT_PUBLIC_ADSENSE_SLOT }: { slot?: string }) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

  useEffect(() => {
    if (!client || !slot) return;
    try {
      (window.adsbygoogle = window.adsbygoogle ?? []).push({});
    } catch {
      // Ad blockers and unapproved sites can prevent AdSense initialization.
    }
  }, [client, slot]);

  if (!client || !slot) return null;
  return <aside className="ad-banner" aria-label="広告"><span>広告</span><ins className="adsbygoogle" style={{ display: "block" }} data-ad-client={client} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true" /></aside>;
}
