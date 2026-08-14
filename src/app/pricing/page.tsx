import type { Metadata } from "next";
import Link from "next/link";
import { Check, Leaf } from "lucide-react";

export const metadata: Metadata = { title: "無料利用について", description: "むしコレは課金なしで全機能を利用できます。", alternates: { canonical: "/pricing" } };

export default function PricingPage() {
  return <main className="pricing-page">
    <Link className="brand legal-brand" href="/"><span className="brand-mark"><Leaf size={21} /></span>むしコレ</Link>
    <header className="pricing-header"><p className="public-kicker">FREE ACCESS</p><h1>むしコレは、すべて無料です</h1><p>月額料金、定期契約、アプリ内購入はありません。Googleログインすると、AI判定結果や撮影メモを自分専用の図鑑へ保存できます。</p></header>
    <section className="pricing-grid free-only" aria-label="無料利用の内容">
      <article className="pricing-card recommended">
        <span className="recommend-label">完全無料</span>
        <h2>むしコレ 無料利用</h2><p>昆虫観察に必要な機能を、料金なしでご利用いただけます。</p>
        <div className="plan-price"><strong>¥0</strong><span>ずっと無料</span></div>
        <div className="plan-limit"><b>∞</b><span>AI判定 回数無制限</span></div>
        <ul><li><Check size={16} />写真からAI昆虫判定</li><li><Check size={16} />判定理由と候補を表示</li><li><Check size={16} />自分専用の昆虫図鑑へ保存</li><li><Check size={16} />位置情報・メモ・プロフィール機能</li></ul>
        <Link className="plan-button" href="/#app">無料ではじめる</Link>
      </article>
    </section>
    <section className="pricing-note"><h2>課金・回数制限はありません</h2><p>ゲストでもGoogleログイン後でも、AI判定を無料で何度でも利用できます。短時間の自動的な大量アクセスには、サービス保護のため一時的な通信制限を行う場合があります。</p></section>
    <nav className="site-links" aria-label="サイト情報"><Link href="/">アプリ</Link><Link href="/about">むしコレについて</Link><Link href="/privacy">プライバシー</Link><Link href="/terms">利用規約</Link><Link href="/contact">お問い合わせ</Link></nav>
  </main>;
}
