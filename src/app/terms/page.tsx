import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "利用規約", description: "自然AI判定Webアプリ「むしコレ＋」の利用条件です。", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return <LegalPage title="利用規約" lead="むしコレ＋をご利用になる前に、以下の条件をご確認ください。">
    <section><h2>利用条件</h2><p>本サービスは18歳以上の方を対象とします。利用者は、本規約とプライバシーポリシーへ同意したうえで利用するものとします。</p></section>
    <section><h2>AI判定の性質</h2><p>判定結果は参考情報であり、種の同定、毒性、食用可否、安全性、医療・衛生上の判断を保証するものではありません。危険が疑われる生物や植物には触れたり食べたりせず、必要に応じて専門家や公的機関へ相談してください。</p></section>
    <section><h2>禁止事項</h2><p>第三者の権利を侵害する画像の送信、個人情報を含む画像の送信、自動操作による大量利用、利用上限の回避、サービスや外部APIへの妨害、不正アクセス、法令または公序良俗に反する行為を禁止します。</p></section>
    <section><h2>利用制限と変更</h2><p>機能や保存容量は運営状況や外部サービスの制約に応じて変更できます。不正利用や運営上の必要がある場合、予告なく利用制限・停止を行うことがあります。</p></section>
    <section><h2>利用条件</h2><p>自動操作による短時間の大量アクセスには、サービス保護のため一時的な通信制限を行う場合があります。機能や保存容量は、安定運用や外部サービスの制約に応じて変更する場合があります。</p></section>
    <section><h2>広告</h2><p>サービス運営のため、Google AdSense等による広告を掲載する場合があります。広告の有無や内容はAI判定結果に影響しません。</p></section>
    <section><h2>免責</h2><p>本サービスは現状有姿で提供されます。AIの誤判定、データ消失、外部サービスの障害、利用者の行動により生じた損害について、法令で認められる範囲で責任を負いません。</p></section>
  </LegalPage>;
}
