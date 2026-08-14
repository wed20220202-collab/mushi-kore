/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import {
  ArrowLeft, Check, ChevronRight, CircleAlert, Edit3, Leaf, LoaderCircle,
  MapPin, RefreshCw, ShieldAlert, Sparkles,
} from "lucide-react";
import type { IdentificationInput } from "@/lib/identification-types";
import { insectIdentificationSchema } from "@/lib/schemas";
import type { InsectIdentificationResult } from "@/lib/schemas";
import { registerLocalIdentification } from "@/lib/firebase/records";
import { uploadRecordImage } from "@/lib/firebase/drive-upload";

type FlowStatus = "review" | "analyzing" | "result" | "confirm" | "saving" | "success" | "error";

export function IdentificationFlow({ input, user, onBack, onComplete, onLogin }: { input: IdentificationInput; user: User | null; onBack: () => void; onComplete: () => void; onLogin: () => Promise<void> }) {
  const [status, setStatus] = useState<FlowStatus>("review");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<InsectIdentificationResult | null>(null);
  const [model, setModel] = useState("");
  const [demo, setDemo] = useState(false);
  const [error, setError] = useState("");
  const [memo, setMemo] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [recordId, setRecordId] = useState("");
  const [driveState, setDriveState] = useState<"idle" | "uploading" | "completed" | "pending">("idle");
  const [driveMessage, setDriveMessage] = useState("");
  const [idempotencyKey] = useState(() => crypto.randomUUID().replaceAll("-", ""));
  const [previewUrl] = useState(() => URL.createObjectURL(input.image.blob));

  useEffect(() => () => URL.revokeObjectURL(previewUrl), [previewUrl]);

  async function identify() {
    setStatus("analyzing");
    setError("");
    setProgress(8);
    const timer = window.setInterval(() => setProgress((value) => Math.min(88, value + Math.max(2, Math.round((90 - value) / 6)))), 240);
    try {
      const formData = new FormData();
      formData.append("image", new File([input.image.blob], input.fileName, { type: input.image.mimeType }));
      const headers: HeadersInit = {};
      if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`;
      const response = await fetch("/api/identify", { method: "POST", headers, body: formData });
      const payload: unknown = await response.json();
      if (!response.ok || typeof payload !== "object" || payload === null || !("result" in payload)) {
        const message = typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string" ? payload.error : "AI判定を完了できませんでした。";
        throw new Error(message);
      }
      const parsed = insectIdentificationSchema.parse(payload.result);
      setProgress(100);
      setResult(parsed);
      setModel("model" in payload && typeof payload.model === "string" ? payload.model : "unknown");
      setDemo("demo" in payload && payload.demo === true);
      setStatus("result");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AI判定を完了できませんでした。");
      setStatus("error");
    } finally {
      window.clearInterval(timer);
    }
  }

  async function register() {
    if (!result || !user) return;
    setStatus("saving");
    setError("");
    try {
      const tags = tagsText.split(/[、,\s]+/).map((tag) => tag.trim()).filter(Boolean).slice(0, 10);
      const id = await registerLocalIdentification(user, input, result, model, memo.trim(), tags, idempotencyKey);
      setRecordId(id);
      setStatus("success");
      void uploadToDrive(id);
    } catch {
      setError("図鑑情報を保存できませんでした。通信状況を確認して再試行してください。");
      setStatus("confirm");
    }
  }

  async function uploadToDrive(id = recordId) {
    if (!id || !user) return;
    setDriveState("uploading");
    setDriveMessage("");
    try {
      await uploadRecordImage(user, input, id, idempotencyKey);
      setDriveState("completed");
    } catch (reason) {
      setDriveState("pending");
      setDriveMessage(reason instanceof Error ? reason.message : "Google Driveへの保存を再試行できます。");
    }
  }

  function updateResult<K extends keyof InsectIdentificationResult>(key: K, value: InsectIdentificationResult[K]) {
    setResult((current) => current ? { ...current, [key]: value } : current);
  }

  return (
    <main className="identify-flow">
      <header className="capture-header">
        <button className="round-button" onClick={onBack} aria-label="AI判定を閉じる"><ArrowLeft size={21} /></button>
        <div><span className="eyebrow">AI IDENTIFICATION</span><strong>AIで虫を調べる</strong></div>
        <span className="ai-chip"><Sparkles size={14} />AI</span>
      </header>

      {status === "review" && <section className="identify-stage identify-review">
        <div className="identify-photo"><img src={previewUrl} alt="AI判定する虫" /></div>
        <div className="eyebrow">READY TO IDENTIFY</div><h1>この虫を調べますか？</h1>
        <p>圧縮済み画像をGemini APIへ送信します。個人情報が写った画像を使用しないでください。判定は参考情報であり、確定診断ではありません。</p>
        <div className="identify-summary"><span><MapPin size={18} />{input.locationName || "位置情報なし"}</span><span>{input.image.width} × {input.image.height}px</span></div>
        <button className="capture-next" onClick={identify}><Sparkles size={20} />AI判定を開始</button>
        <button className="capture-secondary" onClick={onBack}>画像編集へ戻る</button>
      </section>}

      {status === "analyzing" && <section className="identify-stage analyzing-stage">
        <div className="scan-photo"><img src={previewUrl} alt="AIが判定中の虫" /><span className="scan-line" /></div>
        <div className="ai-orbit"><Sparkles size={30} /><span /><span /></div>
        <h1>虫の特徴を調べています</h1><p>翅の模様や体の形、色をひとつずつ確認中です。</p>
        <div className="ai-progress"><span style={{ width: `${progress}%` }} /></div><strong className="progress-number">{progress}%</strong>
        <div className="analysis-steps"><span className={progress > 15 ? "done" : "active"}><Check size={15} />画像の品質を確認</span><span className={progress > 45 ? "done" : "active"}><Check size={15} />外見の特徴を抽出</span><span className={progress > 75 ? "done" : "active"}><LoaderCircle size={15} />候補を比較</span></div>
      </section>}

      {status === "error" && <section className="identify-stage centered-stage"><div className="error-orbit"><CircleAlert size={38} /></div><h1>判定できませんでした</h1><p>{error}</p><button className="capture-next" onClick={identify}><RefreshCw size={19} />もう一度試す</button><button className="capture-secondary" onClick={onBack}>画像を確認する</button></section>}

      {status === "result" && result && <section className="identify-stage result-stage">
        <div className="result-hero"><img src={previewUrl} alt="判定した虫" /><span className="result-confidence"><Sparkles size={15} />{Math.round(result.confidence * 100)}% 一致</span></div>
        {demo && <div className="demo-notice"><CircleAlert size={17} /><span><strong>デモ判定です</strong>実AI API接続後に画像ごとの判定へ切り替わります。</span></div>}
        {!demo && <div className="demo-notice"><Sparkles size={17} /><span><strong>Gemini正式判定</strong>画像を解析した結果です。確信度と候補を確認し、必要に応じて修正してください。</span></div>}
        {!result.isInsect ? <div className="not-insect"><h1>虫を確認できませんでした</h1><p>虫が大きく写った別の画像で再試行してください。</p></div> : <>
          <div className="result-heading"><div><span className="eyebrow">TOP MATCH</span><h1>{result.commonNameJa}</h1><i>{result.scientificName}</i></div><button onClick={() => document.querySelector<HTMLInputElement>("#commonNameJa")?.focus()} aria-label="判定結果を編集"><Edit3 size={19} /></button></div>
          <div className="taxonomy-row"><span>{result.order}</span><ChevronRight size={14} /><span>{result.family}</span><ChevronRight size={14} /><span>{result.genus}</span></div>
          <div className="result-panel"><h2>判別した理由</h2><p>{result.reason}</p></div>
          <div className="result-panel"><h2>特徴と生息環境</h2><p>{result.appearance}</p><p>{result.habitat} · {result.activeSeason}</p></div>
          <div className="warning-panel"><ShieldAlert size={20} /><div><strong>安全について</strong><p>{result.toxicity} AI判定は医療的・生物学的な確定診断ではありません。</p></div></div>
          <h2 className="subheading">ほかの候補</h2><div className="candidate-list">{result.candidates.slice(1).map((candidate) => <button key={candidate.scientificName} onClick={() => setResult({ ...result, commonNameJa: candidate.commonNameJa, commonNameEn: candidate.commonNameEn, scientificName: candidate.scientificName, confidence: candidate.confidence })}><span><strong>{candidate.commonNameJa}</strong><i>{candidate.scientificName}</i></span><b>{Math.round(candidate.confidence * 100)}%</b></button>)}</div>
          {user ? <button className="capture-next" onClick={() => setStatus("confirm")}><Check size={20} />内容を確認して登録</button> : <div className="guest-result"><strong>判定結果を図鑑へ残しますか？</strong><p>Googleログインすると、この結果を自分の図鑑とGoogle Driveへ保存できます。</p><button className="capture-next" onClick={() => void onLogin()}>Googleでログインして保存</button><button className="capture-secondary" onClick={onComplete}>保存せずホームへ戻る</button></div>}
          <button className="capture-secondary" onClick={identify}><RefreshCw size={17} />AIで再判定する</button>
        </>}
      </section>}

      {(status === "confirm" || status === "saving") && result && <section className="identify-stage confirm-stage">
        <div className="eyebrow">CHECK & EDIT</div><h1>図鑑へ登録する内容</h1><p>AIの結果は自由に修正できます。</p>
        <div className="confirm-photo"><img src={previewUrl} alt="登録する虫" /></div>
        <div className="form-grid">
          <label>和名<input id="commonNameJa" value={result.commonNameJa} onChange={(event) => updateResult("commonNameJa", event.target.value)} required /></label>
          <label>英名<input value={result.commonNameEn} onChange={(event) => updateResult("commonNameEn", event.target.value)} /></label>
          <label className="full">学名<input value={result.scientificName} onChange={(event) => updateResult("scientificName", event.target.value)} /></label>
          <label>目<input value={result.order} onChange={(event) => updateResult("order", event.target.value)} /></label>
          <label>科<input value={result.family} onChange={(event) => updateResult("family", event.target.value)} /></label>
          <label className="full">撮影場所<input value={input.locationName} readOnly placeholder="位置情報なし" /></label>
          <label className="full">メモ<textarea value={memo} onChange={(event) => setMemo(event.target.value)} placeholder="見つけたときの様子など" /></label>
          <label className="full">タグ<input value={tagsText} onChange={(event) => setTagsText(event.target.value)} placeholder="夏、雑木林、夜（カンマ区切り）" /></label>
        </div>
        {error && <div className="capture-error" role="alert">{error}</div>}
        <button className="capture-next" onClick={register} disabled={status === "saving" || !result.commonNameJa.trim()}>{status === "saving" ? <><LoaderCircle className="spin" size={19} />登録しています…</> : <><Leaf size={19} />図鑑へ登録する</>}</button>
        <button className="capture-secondary" onClick={() => setStatus("result")} disabled={status === "saving"}>判定結果へ戻る</button>
      </section>}

      {status === "success" && <section className="identify-stage centered-stage success-stage"><div className="success-orbit"><Check size={42} /></div><span className="eyebrow">NEW DISCOVERY SAVED</span><h1>図鑑に登録しました！</h1><p>{driveState === "completed" ? "画像も非公開Google Driveへ安全に保存されました。" : driveState === "uploading" ? "図鑑情報を保存しました。画像をGoogle Driveへ送信しています。" : "図鑑情報と画像を端末内へ保存しました。Drive設定後に再送できます。"}</p><div className={`drive-upload-state state-${driveState}`}>{driveState === "completed" ? <><Check size={18} />Google Drive保存完了</> : driveState === "uploading" ? <><LoaderCircle className="spin" size={18} />Google Driveへ保存中</> : <><CircleAlert size={18} />アップロード待ち</>}</div>{driveMessage && <small className="drive-message">{driveMessage}</small>}<div className="record-id">記録ID · {recordId}</div>{driveState === "pending" && <button className="capture-secondary" onClick={() => uploadToDrive()}><RefreshCw size={17} />Drive保存を再試行</button>}<button className="capture-next" onClick={onComplete}><Leaf size={20} />ホームへ戻る</button></section>}
    </main>
  );
}
