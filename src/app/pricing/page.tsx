import type { Metadata } from "next";
import Link from "next/link";
import { Check, Leaf } from "lucide-react";
import { SUBSCRIPTION_PLANS } from "@/lib/plans";
import { CheckoutButton, CustomerPortalButton } from "@/components/billing-action";

export const metadata: Metadata = { title: "料金プラン", description: "むしコレの無料・有料プランと月間AI判定回数をご案内します。", alternates: { canonical: "/pricing" } };

const testBillingEnabled = process.env.NEXT_PUBLIC_STRIPE_TEST_BILLING_ENABLED === "true";

export default function PricingPage() {
  return <main className="pricing-page">
    <Link className="brand legal-brand" href="/"><span className="brand-mark"><Leaf size={21} /></span>むしコレ</Link>
    <header className="pricing-header"><p className="public-kicker">PRICING</p><h1>使い方に合わせた料金プラン</h1><p>1回のAI判定を1枚として数え、毎月1日に利用回数をリセットします。未使用分の繰越はありません。表示価格は月額・税込です。</p></header>
    {testBillingEnabled && <section className="test-billing-notice" role="status"><b>TEST MODE</b><span>現在はオーナー限定のテスト決済です。実際の請求は発生せず、一般のお申し込みは受け付けていません。</span></section>}
    <section className="pricing-grid" aria-label="料金プラン一覧">
      {SUBSCRIPTION_PLANS.map((plan) => <article className={`pricing-card ${plan.id === "standard" ? "recommended" : ""}`} key={plan.id}>
        {plan.id === "standard" && <span className="recommend-label">おすすめ</span>}
        <h2>{plan.name}</h2><p>{plan.description}</p>
        <div className="plan-price"><strong>{plan.monthlyPriceYen === 0 ? "無料" : `¥${plan.monthlyPriceYen.toLocaleString("ja-JP")}`}</strong>{plan.monthlyPriceYen > 0 && <span>/ 月</span>}</div>
        <div className="plan-limit"><b>{plan.monthlyImageLimit.toLocaleString("ja-JP")}</b><span>枚 / 月</span></div>
        <ul><li><Check size={16} />写真からAI昆虫判定</li><li><Check size={16} />判定理由と候補を表示</li><li><Check size={16} />{plan.showsAds ? "広告表示あり" : "広告なし"}</li></ul>
        {plan.id === "free" ? <Link className="plan-button" href="/#app">無料ではじめる</Link> : <CheckoutButton planId={plan.id} />}
      </article>)}
    </section>
    <section className="pricing-note"><h2>{testBillingEnabled ? "テスト決済を検証中です" : "有料プランは準備中です"}</h2><p>決済情報はStripeが管理し、むしコレには保存されません。月額契約は解約するまで毎月自動更新されます。年額・従量課金・追加購入は現在ありません。</p>{testBillingEnabled && <CustomerPortalButton />}</section>
    <nav className="site-links" aria-label="サイト情報"><Link href="/">アプリ</Link><Link href="/about">むしコレについて</Link><Link href="/privacy">プライバシー</Link><Link href="/terms">利用規約</Link><Link href="/commerce">特定商取引法に基づく表記</Link><Link href="/contact">お問い合わせ</Link></nav>
  </main>;
}
