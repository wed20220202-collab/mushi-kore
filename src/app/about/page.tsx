import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "むしコレ＋について", description: "昆虫・魚・花・動物のAI判定Webアプリ「むしコレ＋」をご案内します。", alternates: { canonical: "/about" } };

export default function AboutPage() {
  return <LegalPage title="むしコレ＋について" lead="身近な昆虫・魚・花・動物との出会いを、調べる楽しさと自分だけの記録へつなげるWebアプリです。">
    <section><h2>できること</h2><p>むしコレ・うおコレ・はなコレ・どうコレから図鑑を選び、写真を撮影または選択すると、AIが和名・学名・分類・見分けた理由・生息環境・活動時期・注意点の候補を表示します。判定後の名前は利用者自身で修正できます。</p></section>
    <section><h2>ゲスト利用と図鑑</h2><p>GoogleログインをしなくてもAI判定を利用できます。ログインすると判定結果、撮影日時、任意の場所情報やメモを自分専用の図鑑へ保存し、後から編集・削除できます。</p></section>
    <section><h2>正しく使うために</h2><p>AIは写真の写り方や成長段階によって誤ることがあります。毒性・危険性・食用可否を含め、結果を確定診断として扱わず、不明な生物や植物には触れたり食べたりしないでください。希少種の位置情報を公開する機能はありません。</p></section>
  </LegalPage>;
}
