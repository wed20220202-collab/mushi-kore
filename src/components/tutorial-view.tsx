"use client";

import Image from "next/image";
import { BookOpen, Camera, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useState } from "react";

const tutorialSteps = [
  {
    image: "/tutorial/capture.webp",
    alt: "身近な生きものをスマートフォンで撮影している様子",
    eyebrow: "STEP 1 · CAPTURE",
    title: "図鑑を選んで、撮影",
    description: "むし・魚・花・動物から図鑑を選び、カメラを開くか端末の写真を選びます。対象が中央に大きく写ると判定しやすくなります。",
    icon: Camera,
  },
  {
    image: "/tutorial/identify.webp",
    alt: "スマートフォンの写真をAIが解析し、種類の候補を表示している様子",
    eyebrow: "STEP 2 · IDENTIFY",
    title: "AIが種類の候補を判定",
    description: "Geminiが写真の特徴を調べ、最大3件の候補と確信度を表示します。結果を確認して、必要なら名前やメモを直せます。",
    icon: Sparkles,
  },
  {
    image: "/tutorial/collect.webp",
    alt: "撮影した生きものがスマートフォンの自分専用図鑑に並んでいる様子",
    eyebrow: "STEP 3 · COLLECT",
    title: "発見を自分の図鑑へ",
    description: "写真・撮影日・場所・メモをまとめてカテゴリ別に保存。図鑑と検索から、これまでの発見をいつでも振り返れます。",
    icon: BookOpen,
  },
] as const;

interface TutorialViewProps {
  displayName: string;
  onComplete: () => Promise<void>;
}

export function TutorialView({ displayName, onComplete }: TutorialViewProps) {
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const step = tutorialSteps[index];
  const Icon = step.icon;
  const isLast = index === tutorialSteps.length - 1;

  async function finish() {
    if (saving) return;
    setSaving(true);
    try {
      await onComplete();
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="tutorial">
      <div className="tutorial-topbar">
        <div className="brand"><span className="brand-mark"><BookOpen size={20} /></span>むしコレ＋</div>
        {!isLast && <button className="tutorial-skip" onClick={finish} disabled={saving}>スキップ</button>}
      </div>

      <div className="tutorial-intro">
        <span className="eyebrow">WELCOME, {displayName}</span>
        <h1>むしコレ＋の使い方</h1>
      </div>

      <section className="tutorial-card" aria-live="polite">
        <div className="tutorial-image">
          <Image
            src={step.image}
            alt={step.alt}
            fill
            sizes="(max-width: 699px) 100vw, 500px"
            loading={index === 0 ? "eager" : "lazy"}
            style={{ objectFit: "cover" }}
          />
          <span className="tutorial-step-icon"><Icon size={21} /></span>
        </div>
        <div className="tutorial-copy">
          <span className="eyebrow">{step.eyebrow}</span>
          <h2>{step.title}</h2>
          <p>{step.description}</p>
        </div>
      </section>

      <div className="tutorial-dots" aria-label={`${tutorialSteps.length}ページ中${index + 1}ページ`}>
        {tutorialSteps.map((item, dotIndex) => (
          <span key={item.eyebrow} className={dotIndex === index ? "active" : ""} />
        ))}
      </div>

      <div className="tutorial-actions">
        {index > 0 && (
          <button className="tutorial-back" onClick={() => setIndex((value) => value - 1)} aria-label="前の説明へ">
            <ChevronLeft size={20} />戻る
          </button>
        )}
        <button
          className="tutorial-next"
          onClick={isLast ? finish : () => setIndex((value) => value + 1)}
          disabled={saving}
        >
          {isLast ? (saving ? "準備しています…" : "図鑑をはじめる") : "次へ"}
          {!isLast && <ChevronRight size={20} />}
        </button>
      </div>
      <p className="tutorial-privacy">人物や住所など、個人情報が写った写真は使用しないでください。</p>
    </main>
  );
}
