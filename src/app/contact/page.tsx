import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "お問い合わせ", description: "むしコレへのお問い合わせ、不具合報告、データ削除依頼の窓口です。", alternates: { canonical: "/contact" } };

export default function ContactPage() {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  return <LegalPage title="お問い合わせ" lead="不具合報告、権利に関する連絡、アカウントデータの削除依頼を受け付けています。">
    <section><h2>連絡方法</h2>{email ? <p><a href={`mailto:${email}`}>{email}</a> までメールでご連絡ください。</p> : <p><a href="https://github.com/wed20220202-collab/mushi-kore/issues" target="_blank" rel="noreferrer">GitHubの問い合わせ窓口</a>からご連絡ください。公開したくない個人情報や画像は記載しないでください。</p>}</section>
    <section><h2>データ削除依頼</h2><p>Googleログインに使用したメールアドレス、削除を希望する内容をお知らせください。本人確認後に対応します。パスワードや秘密鍵を送らないでください。</p></section>
  </LegalPage>;
}
