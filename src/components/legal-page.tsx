import Link from "next/link";
import { Leaf } from "lucide-react";

export function LegalPage({ title, lead, children }: { title: string; lead: string; children: React.ReactNode }) {
  return <main className="legal-page">
    <Link className="brand legal-brand" href="/"><span className="brand-mark"><Leaf size={21} /></span>むしコレ</Link>
    <article><p className="public-kicker">MUSHI KORE</p><h1>{title}</h1><p className="legal-lead">{lead}</p>{children}<p className="legal-updated">制定・最終更新：2026年8月2日</p></article>
    <nav className="site-links" aria-label="サイト情報"><Link href="/">アプリ</Link><Link href="/about">むしコレについて</Link><Link href="/privacy">プライバシー</Link><Link href="/terms">利用規約</Link><Link href="/contact">お問い合わせ</Link></nav>
  </main>;
}
