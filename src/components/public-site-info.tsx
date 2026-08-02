import Link from "next/link";
import { Camera, Leaf, ScanSearch, ShieldCheck } from "lucide-react";
import { AccountAwareAdBanner } from "@/components/ad-banner";

export function PublicSiteInfo() {
  return <aside className="public-info">
    <div className="brand"><span className="brand-mark"><Leaf size={21} /></span>むしコレ</div>
    <p className="public-kicker">FREE INSECT IDENTIFIER</p>
    <h1>写真から、虫の名前を調べよう。</h1>
    <p className="public-lead">スマートフォンで撮影した虫をAIが解析し、名前の候補、見分けた理由、生息環境や注意点をわかりやすく表示します。</p>
    <a className="public-cta" href="#app"><Camera size={19} />無料でAI判定を試す</a>
    <div className="public-features">
      <article><ScanSearch size={22} /><div><strong>写真でAI判定</strong><p>ゲストはログインなしで1日1回無料。AIの結果は参考情報としてご利用ください。</p></div></article>
      <article><Leaf size={22} /><div><strong>自分だけの昆虫図鑑</strong><p>Googleログインすると、判定結果や撮影メモを自分の図鑑へ保存できます。</p></div></article>
      <article><ShieldCheck size={22} /><div><strong>プライバシーに配慮</strong><p>位置情報は任意で、AI判定には送信しません。人物や住所が写る写真は使用しないでください。</p></div></article>
    </div>
    <AccountAwareAdBanner />
    <nav className="site-links" aria-label="サイト情報"><Link href="/pricing">料金プラン</Link><Link href="/about">むしコレについて</Link><Link href="/privacy">プライバシー</Link><Link href="/terms">利用規約</Link><Link href="/commerce">特定商取引法に基づく表記</Link><Link href="/contact">お問い合わせ</Link></nav>
    <small className="copyright">© 2026 むしコレ</small>
  </aside>;
}
