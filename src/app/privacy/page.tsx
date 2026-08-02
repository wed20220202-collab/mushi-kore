import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "プライバシーポリシー", description: "むしコレが扱う画像、アカウント情報、位置情報、広告Cookie等について説明します。", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return <LegalPage title="プライバシーポリシー" lead="むしコレで扱う情報と、その目的・保存先について説明します。">
    <section><h2>取得・利用する情報</h2><p>Googleログインを利用する場合は表示名、メールアドレス、プロフィール画像、利用者IDを取得します。撮影画像、判定結果、撮影日時、メモ、タグ、利用者が許可した場合のみ位置情報を取り扱います。</p></section>
    <section><h2>AI判定と画像</h2><p>判定対象の画像はGoogle Gemini APIへ送信されます。位置情報はAIへ送信しません。人物、住所、車両番号などの個人情報が写る画像は使用しないでください。ログイン利用者が登録した画像は、運営者が管理する非公開Google Drive領域と利用端末内へ保存される場合があります。</p></section>
    <section><h2>不正利用防止</h2><p>AI APIの過剰利用を防ぐため、ゲスト利用では接続元情報とブラウザ情報を秘密鍵で不可逆に変換した識別子、および日ごとの利用回数を保存します。生のIPアドレスを利用回数記録には保存しません。</p></section>
    <section><h2>外部サービス</h2><p>本サービスはVercel、Firebase、Google認証、Google Drive、Gemini APIを利用します。広告掲載開始後はGoogle AdSenseがCookieや端末情報等を広告配信・測定・不正防止に利用する場合があります。各サービスでの取扱いは各社の規約とポリシーにも従います。</p></section>
    <section><h2>広告と同意管理</h2><p>AdSense開始時は、対象地域の利用者にGoogleの認定同意管理機能を表示します。広告のパーソナライズ設定は表示される同意画面から管理できます。</p></section>
    <section><h2>保管・削除・お問い合わせ</h2><p>端末内の一時画像は設定画面から削除できます。アカウント関連データの開示・削除依頼はお問い合わせページからご連絡ください。法令対応、不正防止、紛争対応に必要な期間を除き、不要になった情報は合理的な期間内に削除します。</p></section>
  </LegalPage>;
}
