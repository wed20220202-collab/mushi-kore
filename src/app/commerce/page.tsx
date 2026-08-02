import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "特定商取引法に基づく表記", description: "むしコレ有料プランの販売条件です。", alternates: { canonical: "/commerce" } };

export default function CommercePage() {
  return <LegalPage title="特定商取引法に基づく表記" lead="有料プランの一般受付開始前に、以下の条件と事業者情報を最終確認してください。">
    <section><h2>販売事業者・責任者・所在地・電話番号</h2><p>消費者から請求があった場合、申込みの意思決定に先立って十分な時間的余裕を確保できるよう、遅滞なく電子メールで開示します。お問い合わせページからご請求ください。</p></section>
    <section><h2>販売価格</h2><p>ライト：月額300円、スタンダード：月額500円、プロ：月額4,500円。いずれも税込です。年額プラン、従量課金、利用枠の追加購入はありません。</p></section>
    <section><h2>代金の支払時期・方法</h2><p>Stripeが提供する決済方法で、申込時に初回分を支払い、その後は解約まで毎月の契約更新日に自動決済します。現在「TEST MODE」と表示される画面は検証専用で、実際の請求は発生しません。</p></section>
    <section><h2>サービスの提供時期・内容</h2><p>決済完了をStripeから確認後、選択した月間AI判定枠を利用できます。ライトは月50回、スタンダードは月100回、プロは月1,000回です。利用枠は毎月1日に更新し、未使用分は繰り越しません。</p></section>
    <section><h2>解約・契約変更</h2><p>Stripeの契約管理画面からいつでも解約・契約変更を申請できます。解約は表示された契約期間の終了時に効力を生じ、それまでは利用できます。既に支払われた期間の利用料金は、法令上必要な場合を除き日割り返金しません。</p></section>
    <section><h2>動作環境・その他の負担</h2><p>最新版の主要ブラウザとインターネット接続が必要です。通信料金は利用者の負担です。サービスの性質上、物品の送料はありません。</p></section>
  </LegalPage>;
}
