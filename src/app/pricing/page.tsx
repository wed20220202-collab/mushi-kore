import type { Metadata } from "next";
import Link from "next/link";
import { Check, Leaf } from "lucide-react";
import { SUBSCRIPTION_PLANS } from "@/lib/plans";

export const metadata: Metadata = { title: "料金プラン", description: "むしコレの無料・有料プランと月間AI判定回数をご案内します。", alternates: { canonical: "/pricing" } };

export default function PricingPage() {
  return <main className="pricing-page">
    <Link className="brand legal-brand" href="/"><span className="brand-mark"><Leaf size={21} /></span>むしコレ</Link>
    <header className="pricing-header"><p className="public-kicker">PRICING</p><h1>使い方に合わせた料金プラン</h1><p>1回のAI判定を1枚として数え、毎月1日に利用回数をリセットします。表示価格は月額・税込予定です。</p></header>
    <section className="pricing-grid" aria-label="料金プラン一覧">
      {SUBSCRIPTION_PLANS.map((plan) => <article className={`pricing-card ${plan.id === "standard" ? "recommended" : ""}`} key={plan.id}>
        {plan.id === "standard" && <span className="recommend-label">おすすめ</span>}
        <h2>{plan.name}</h2><p>{plan.description}</p>
        <div className="plan-price"><strong>{plan.monthlyPriceYen === 0 ? "無料" : `¥${plan.monthlyPriceYen.toLocaleString("ja-JP")}`}</strong>{plan.monthlyPriceYen > 0 && <span>/ 月</span>}</div>
        <div className="plan-limit"><b>{plan.monthlyImageLimit.toLocaleString("ja-JP")}</b><span>枚 / 月</span></div>
        <ul><li><Check size={16} />写真からAI昆虫判定</li><li><Check size={16} />判定理由と候補を表示</li><li><Check size={16} />Googleログインで図鑑保存</li></ul>
        {plan.id === "free" ? <Link className="plan-button" href="/#app">無料ではじめる</Link> : <span className="plan-button disabled" aria-disabled="true">決済接続後に受付開始</span>}
      </article>)}
    </section>
    <section className="pricing-note"><h2>有料プランは決済準備中です</h2><p>料金と上限の仕組みは実装済みです。Stripeの審査・商品登録・特定商取引法に基づく表示を完了後、安全な定期決済を開始します。受付開始前に料金が変更される場合があります。</p></section>
    <nav className="site-links" aria-label="サイト情報"><Link href="/">アプリ</Link><Link href="/about">むしコレについて</Link><Link href="/privacy">プライバシー</Link><Link href="/terms">利用規約</Link><Link href="/contact">お問い合わせ</Link></nav>
  </main>;
}
