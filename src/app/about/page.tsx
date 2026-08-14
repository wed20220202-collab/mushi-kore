import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "むしコレについて", description: "昆虫AI判定Webアプリ「むしコレ」の機能、使い方、安全上の注意をご案内します。", alternates: { canonical: "/about" } };

export default function AboutPage() {
  return <LegalPage title="むしコレについて" lead="身近な虫との出会いを、調べる楽しさと自分だけの記録へつなげるWebアプリです。">
    <section><h2>できること</h2><p>虫の写真を撮影または選択すると、AIが画像を解析し、和名・学名・分類・見分けた理由・生息環境・活動時期・注意点の候補を表示します。判定後の名前は利用者自身で修正できます。</p></section>
    <section><h2>無料ゲスト利用</h2><p>Googleログインをしなくても、ゲストとして1日1回までAI判定を試せます。ログインすると判定結果、撮影日時、任意の場所情報やメモを自分専用の図鑑へ保存できます。</p></section>
    <section><h2>正しく使うために</h2><p>AIは写真の写り方や成長段階によって誤ることがあります。毒性や危険性を含め、結果を確定診断として扱わず、不明な虫には触れないでください。希少種の位置情報を公開する機能はありません。</p></section>
    <section><h2>無料提供と広告について</h2><p>むしコレには有料プランやアプリ内課金はありません。無料提供を継続するため、審査承認後にGoogle AdSenseによる広告を掲載する場合があります。広告の有無や内容はAI判定結果に影響しません。</p></section>
  </LegalPage>;
}
