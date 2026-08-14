/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft, Camera, Check, Clock3, Crop, ImagePlus, LoaderCircle, MapPin,
  RotateCw, Save, Sparkles, Trash2, WifiOff,
} from "lucide-react";
import { clearCaptureDraft, loadCaptureDraft, saveCaptureDraft } from "@/lib/capture-draft-store";
import type { CaptureDraft } from "@/lib/capture-draft-store";
import { detectBlobImageMimeType, formatBytes, processImage, validateImageFile } from "@/lib/image-processing";
import type { CropMode, ProcessedImage } from "@/lib/image-processing";
import type { IdentificationInput } from "@/lib/identification-types";
import { readLocalPreferences } from "@/lib/firebase/preferences";
import { categoryConfig, categoryOrInsect, type CollectionCategory } from "@/lib/categories";

type CaptureStep = "choose" | "edit" | "ready";

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  locationName: string;
  status: "idle" | "loading" | "granted" | "denied";
}

const emptyLocation: LocationState = { latitude: null, longitude: null, locationName: "", status: "idle" };

export function CaptureFlow({ category, onClose, onIdentify }: { category: CollectionCategory; onClose: () => void; onIdentify: (input: IdentificationInput) => void }) {
  const categoryInfo = categoryConfig[category];
  const [step, setStep] = useState<CaptureStep>("choose");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [processed, setProcessed] = useState<ProcessedImage | null>(null);
  const [rotation, setRotation] = useState(0);
  const [cropMode, setCropMode] = useState<CropMode>("original");
  const [location, setLocation] = useState<LocationState>(emptyLocation);
  const [capturedAt, setCapturedAt] = useState(() => new Date().toISOString());
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [online, setOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);
  const [restored, setRestored] = useState(false);
  const previewUrlRef = useRef("");

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine);
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    void loadCaptureDraft().then(async (draft) => {
      if (!draft) return;
      if (categoryOrInsect(draft.category) !== category) return;
      const detectedMimeType = await detectBlobImageMimeType(draft.blob);
      if (!detectedMimeType) throw new Error("一時保存された画像形式を確認できませんでした。");
      const url = URL.createObjectURL(draft.blob);
      previewUrlRef.current = url;
      setPreviewUrl(url);
      setProcessed({
        blob: draft.blob,
        width: draft.width,
        height: draft.height,
        mimeType: detectedMimeType,
        originalBytes: draft.originalBytes,
        compressedBytes: draft.compressedBytes,
      });
      setRotation(draft.rotation);
      setCropMode(draft.cropMode);
      setCapturedAt(draft.capturedAt);
      setLocation({ latitude: draft.latitude, longitude: draft.longitude, locationName: draft.locationName, status: draft.latitude === null ? "idle" : "granted" });
      setRestored(true);
      setStep("ready");
    }).catch(() => setError("端末内の一時データを読み込めませんでした。"));
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, [category]);

  function replacePreviewUrl(blob: Blob) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const url = URL.createObjectURL(blob);
    previewUrlRef.current = url;
    setPreviewUrl(url);
  }

  function chooseFile(selected: File | undefined) {
    if (!selected) return;
    const validationError = validateImageFile(selected);
    if (validationError) { setError(validationError); return; }
    setError("");
    setFile(selected);
    setProcessed(null);
    setRotation(0);
    setCropMode("original");
    setCapturedAt(new Date(selected.lastModified || Date.now()).toISOString());
    setRestored(false);
    replacePreviewUrl(selected);
    setStep("edit");
  }

  async function saveDraft(output: ProcessedImage, nextLocation = location) {
    const draft: CaptureDraft = {
      category,
      blob: output.blob,
      fileName: file?.name ?? "restored-image.webp",
      mimeType: output.mimeType,
      rotation,
      cropMode,
      capturedAt,
      latitude: nextLocation.latitude,
      longitude: nextLocation.longitude,
      locationName: nextLocation.locationName,
      originalBytes: output.originalBytes,
      compressedBytes: output.compressedBytes,
      width: output.width,
      height: output.height,
      savedAt: new Date().toISOString(),
    };
    await saveCaptureDraft(draft);
  }

  async function processSelectedImage() {
    if (!file) return;
    setProcessing(true);
    setError("");
    try {
      const output = await processImage(file, rotation, cropMode);
      setProcessed(output);
      replacePreviewUrl(output.blob);
      await saveDraft(output);
      setStep("ready");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "画像を処理できませんでした。");
    } finally {
      setProcessing(false);
    }
  }

  function requestLocation() {
    if (readLocalPreferences().location === "never") {
      setLocation({ ...emptyLocation, status: "denied", locationName: "設定で位置情報をオフにしています" });
      return;
    }
    if (!navigator.geolocation) {
      setLocation({ ...emptyLocation, status: "denied" });
      return;
    }
    setLocation((current) => ({ ...current, status: "loading" }));
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = { latitude: position.coords.latitude, longitude: position.coords.longitude, locationName: "現在地を取得済み", status: "granted" as const };
        setLocation(next);
        if (processed) void saveDraft(processed, next);
      },
      () => setLocation({ ...emptyLocation, status: "denied" }),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  }

  async function discardDraft() {
    await clearCaptureDraft();
    setFile(null);
    setProcessed(null);
    setPreviewUrl("");
    setRestored(false);
    setLocation(emptyLocation);
    setStep("choose");
  }

  return (
    <main className="capture-flow">
      <header className="capture-header">
        <button className="round-button" onClick={onClose} aria-label="撮影を閉じる"><ArrowLeft size={21} /></button>
        <div><span className="eyebrow">NEW DISCOVERY</span><strong>{categoryInfo.subject}を記録する</strong></div>
        <span className={`network-state ${online ? "online" : "offline"}`}>{online ? <Check size={15} /> : <WifiOff size={15} />}{online ? "オンライン" : "オフライン"}</span>
      </header>

      {error && <div className="capture-error" role="alert">{error}</div>}

      {step === "choose" && (
        <section className="capture-stage choose-stage">
          <div className="camera-orbit"><Camera size={48} strokeWidth={1.5} /></div>
          <h1>どの{categoryInfo.subject}を見つけた？</h1>
          <p>{categoryInfo.subject}が画面の中央に大きく写るように、明るい場所で撮影すると判別しやすくなります。</p>
          <label className="source-button primary-source">
            <Camera size={22} />カメラで撮影
            <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" capture="environment" onChange={(event) => chooseFile(event.target.files?.[0])} />
          </label>
          <label className="source-button secondary-source">
            <ImagePlus size={22} />端末から選ぶ
            <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={(event) => chooseFile(event.target.files?.[0])} />
          </label>
          <small>JPEG・PNG・WebP / 入力20MBまで</small>
        </section>
      )}

      {step === "edit" && (
        <section className="capture-stage edit-stage">
          <div className={`edit-frame crop-${cropMode}`}>
            <img src={previewUrl} alt={`選択した${categoryInfo.subject}のプレビュー`} style={{ transform: `rotate(${rotation}deg)` }} />
            <span className="focus-corner top-left" /><span className="focus-corner top-right" /><span className="focus-corner bottom-left" /><span className="focus-corner bottom-right" />
          </div>
          <div className="edit-toolbar">
            <button onClick={() => setRotation((value) => (value + 90) % 360)}><RotateCw size={20} /><span>90°回転</span></button>
            <div className="crop-options" aria-label="トリミング比率">
              <Crop size={20} />
              {(["original", "square", "landscape"] as CropMode[]).map((mode) => <button key={mode} className={cropMode === mode ? "active" : ""} onClick={() => setCropMode(mode)}>{mode === "original" ? "元画像" : mode === "square" ? "1:1" : "4:3"}</button>)}
            </div>
          </div>
          <div className="capture-tips"><strong>中央を切り抜きます</strong><span>回転と比率を確認して「画像を整える」を押してください。</span></div>
          <button className="capture-next" onClick={processSelectedImage} disabled={processing}>{processing ? <><LoaderCircle className="spin" size={20} />圧縮しています…</> : <><Crop size={20} />画像を整える</>}</button>
          <button className="capture-secondary" onClick={() => setStep("choose")}>画像を選び直す</button>
        </section>
      )}

      {step === "ready" && processed && (
        <section className="capture-stage ready-stage">
          {restored && <div className="restored-note"><Save size={17} />前回の一時保存を復元しました</div>}
          <div className="ready-preview"><img src={previewUrl} alt="圧縮済み画像のプレビュー" /><span><Check size={17} />画像の準備完了</span></div>
          <div className="size-comparison">
            <div><small>圧縮前</small><strong>{formatBytes(processed.originalBytes)}</strong></div><span>→</span><div><small>圧縮後</small><strong>{formatBytes(processed.compressedBytes)}</strong></div>
          </div>
          <div className="capture-details">
            <div><Clock3 size={19} /><span><small>撮影日時</small><strong>{new Date(capturedAt).toLocaleString("ja-JP", { dateStyle: "medium", timeStyle: "short" })}</strong></span></div>
            <div><MapPin size={19} /><span><small>撮影場所</small><strong>{location.status === "granted" ? location.locationName : location.status === "denied" ? "取得しない（後で追加できます）" : "未取得"}</strong></span><button onClick={requestLocation} disabled={location.status === "loading"}>{location.status === "loading" ? "取得中" : location.status === "granted" ? "更新" : "取得"}</button></div>
            <div><Save size={19} /><span><small>端末内保存</small><strong>アップロード待ち 1件</strong></span><Check size={18} className="saved-check" /></div>
          </div>
          {!online && <div className="offline-explanation"><WifiOff size={18} /><span><strong>オフラインでも大丈夫</strong>通信が戻ったら、この画像から処理を再開できます。</span></div>}
          <button className="capture-next" onClick={() => onIdentify({ category, image: processed, fileName: file?.name ?? `captured-${category}.webp`, rotation, cropMode, capturedAt, latitude: location.latitude, longitude: location.longitude, locationName: location.locationName })}><Sparkles size={20} />AI判定へ進む</button>
          <button className="capture-secondary" onClick={onClose}><Save size={17} />一時保存してホームへ</button>
          <button className="capture-secondary danger-text" onClick={discardDraft}><Trash2 size={17} />この画像を破棄する</button>
          <p className="phase-note">次のフェーズで、この画像をAI判定して図鑑へ登録します。</p>
        </section>
      )}
    </main>
  );
}
