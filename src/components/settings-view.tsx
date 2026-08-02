"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
  ArrowLeft, Check, ChevronRight, CircleUserRound, Cloud, Database,
  LoaderCircle, LogOut, Moon, RefreshCw, ShieldCheck, Sun, Trash2,
} from "lucide-react";
import { firestore } from "@/lib/firebase/client";
import {
  clearCaptureDraft, clearPendingUploads, listPendingUploads, type PendingUpload,
} from "@/lib/capture-draft-store";
import { uploadPendingRecordImage } from "@/lib/firebase/drive-upload";
import {
  applyPreferences, defaultPreferences, loadUserPreferences, readLocalPreferences, saveUserPreferences,
  type UserPreferences,
} from "@/lib/firebase/preferences";

type Panel = "root" | "account" | "uploads" | "privacy" | "display";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

export function SettingsView({ user, onLogout, onLogin }: { user: User | null; onLogout: () => Promise<void>; onLogin: () => Promise<void> }) {
  const [panel, setPanel] = useState<Panel>("root");
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [storageBytes, setStorageBytes] = useState(0);
  const [storageLimit, setStorageLimit] = useState(524_288_000);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const refreshPending = useCallback(async () => {
    if (!globalThis.indexedDB) return;
    setPending((await listPendingUploads()).sort((a, b) => b.queuedAt.localeCompare(a.queuedAt)));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshPending();
      if (!user) {
        const local = readLocalPreferences();
        applyPreferences(local);
        setPreferences(local);
        return;
      }
      void loadUserPreferences(user.uid).then(setPreferences).catch(() => undefined);
      if (firestore) {
        void getDoc(doc(firestore, "users", user.uid)).then((snapshot) => {
          const data = snapshot.data();
          if (typeof data?.totalStorageBytes === "number") setStorageBytes(data.totalStorageBytes);
          if (typeof data?.storageLimitBytes === "number") setStorageLimit(data.storageLimitBytes);
        }).catch(() => undefined);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshPending, user]);

  async function updatePreferences(next: UserPreferences) {
    setPreferences(next);
    setMessage("");
    try {
      if (user) await saveUserPreferences(user.uid, next);
      else applyPreferences(next);
      setMessage("設定を保存しました。");
    } catch {
      setMessage("端末には保存しましたが、クラウド設定を更新できませんでした。");
    }
  }

  async function retry(upload: PendingUpload) {
    if (!user) {
      setMessage("再送するにはGoogleログインが必要です。");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await uploadPendingRecordImage(user, upload);
      setMessage("Google Driveへ保存しました。");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "再送に失敗しました。");
    } finally {
      await refreshPending();
      setBusy(false);
    }
  }

  async function retryAll() {
    if (!user || pending.length === 0) return;
    setBusy(true);
    let completed = 0;
    for (const upload of pending) {
      try {
        await uploadPendingRecordImage(user, upload);
        completed += 1;
      } catch {
        // Keep failed items in the queue for the next retry.
      }
    }
    await refreshPending();
    setMessage(`${completed}件を保存しました。${pending.length - completed ? `${pending.length - completed}件は待機中です。` : ""}`);
    setBusy(false);
  }

  async function discardPending() {
    if (!window.confirm("端末内のアップロード待ち画像をすべて削除します。図鑑情報は残りますが、画像は復元できません。よろしいですか？")) return;
    await clearPendingUploads();
    await refreshPending();
    setMessage("端末内の待機画像を削除しました。");
  }

  async function discardDraft() {
    if (!window.confirm("編集中の撮影画像を端末から削除しますか？")) return;
    await clearCaptureDraft();
    setMessage("編集中の画像を削除しました。");
  }

  const storageRatio = Math.min(100, storageLimit ? (storageBytes / storageLimit) * 100 : 0);
  const title = panel === "account" ? "プロフィール" : panel === "uploads" ? "アップロード待ち" : panel === "privacy" ? "位置情報・データ" : panel === "display" ? "表示" : "設定";

  return <main className="content settings-page">
    {panel === "root" ? <><div className="eyebrow">YOUR APP</div><h1 className="settings-title">設定</h1></> : <div className="settings-subheader"><button className="round-button" onClick={() => { setPanel("root"); setMessage(""); }} aria-label="設定へ戻る"><ArrowLeft size={20} /></button><div><span className="eyebrow">SETTINGS</span><h1>{title}</h1></div></div>}

    {panel === "root" && <>
      <section className="stat storage-card"><div className="storage-heading"><div><strong>ストレージ</strong><small>{formatBytes(storageBytes)} / {formatBytes(storageLimit)}</small></div><Database size={22} /></div><div className="progress"><span style={{ width: `${storageRatio}%` }} /></div></section>
      <div className="settings-list">
        <button className="setting" onClick={() => setPanel("account")}><span className="setting-icon"><CircleUserRound size={20} /></span><span className="setting-copy"><strong>アカウント</strong><small>プロフィール・ログアウト</small></span><ChevronRight size={18} /></button>
        <button className="setting" onClick={() => setPanel("uploads")}><span className="setting-icon"><Cloud size={20} /></span><span className="setting-copy"><strong>オフライン保存</strong><small>アップロード待ち {pending.length}件</small></span>{pending.length > 0 && <b className="count-badge">{pending.length}</b>}<ChevronRight size={18} /></button>
        <button className="setting" onClick={() => setPanel("privacy")}><span className="setting-icon"><ShieldCheck size={20} /></span><span className="setting-copy"><strong>プライバシー</strong><small>位置情報・端末データの管理</small></span><ChevronRight size={18} /></button>
        <button className="setting" onClick={() => setPanel("display")}><span className="setting-icon"><Moon size={20} /></span><span className="setting-copy"><strong>表示</strong><small>{preferences.theme === "system" ? "端末の設定に合わせる" : preferences.theme === "dark" ? "ダーク" : "ライト"}</small></span><ChevronRight size={18} /></button>
      </div>
      <a className="primary-setting-button pricing-link" href="/pricing">料金プランを見る</a>
      <p className="legal settings-version">むしコレ v0.2.0 · プライベートβ<br />画像は本人専用のGoogle Driveフォルダへ保存されます。</p>
    </>}

    {panel === "account" && <section className="settings-panel">
      <div className="profile-card"><div className="profile-avatar" style={user?.photoURL ? { backgroundImage: `url('${user.photoURL}')` } : undefined}>{user?.photoURL ? "" : (user?.displayName?.charAt(0) || "ゲ")}</div><div><strong>{user?.displayName || "ゲスト"}</strong><small>{user?.email || "ログインなしで利用中"}</small></div></div>
      <div className="settings-note">{user ? "プロフィール名と画像はGoogleアカウントから取得しています。変更はGoogleアカウント側で行ってください。" : "ログインすると判定結果を自分の図鑑とGoogle Driveへ保存できます。"}</div>
      {user ? <button className="danger-button" onClick={() => void onLogout()}><LogOut size={18} />ログアウト</button> : <button className="primary-setting-button" onClick={() => void onLogin()}>Googleでログイン</button>}
    </section>}

    {panel === "uploads" && <section className="settings-panel">
      <div className="settings-note">通信切断などでDrive保存できなかった画像だけを、この端末内に暗号化されていない状態で一時保管しています。</div>
      {pending.length === 0 ? <div className="empty-note"><Check size={30} /><strong>アップロード待ちはありません</strong><p>すべての画像が処理済みです。</p></div> : <><button className="primary-setting-button" onClick={() => void retryAll()} disabled={busy}>{busy ? <LoaderCircle className="spin" size={18} /> : <RefreshCw size={18} />}すべて再送する</button><div className="pending-list">{pending.map((upload) => <article key={upload.recordId}><div><strong>{upload.fileName}</strong><small>{formatBytes(upload.blob.size)} · {new Date(upload.queuedAt).toLocaleString("ja-JP")}<br />記録ID {upload.recordId}</small></div><button onClick={() => void retry(upload)} disabled={busy} aria-label={`${upload.fileName}を再送`}><RefreshCw size={18} /></button>{upload.lastError && <p>{upload.lastError}</p>}</article>)}</div><button className="danger-link" onClick={() => void discardPending()}><Trash2 size={17} />待機画像をすべて削除</button></>}
    </section>}

    {panel === "privacy" && <section className="settings-panel">
      <div className="preference-row"><div><strong>撮影場所を利用する</strong><small>撮影画面で許可した時だけ現在地を取得します。位置情報はAIへ送りません。</small></div><button role="switch" aria-checked={preferences.location === "ask"} className={`switch ${preferences.location === "ask" ? "on" : ""}`} onClick={() => void updatePreferences({ ...preferences, location: preferences.location === "ask" ? "never" : "ask" })}><span /></button></div>
      <div className="preference-row"><div><strong>保存後も端末に画像を残す</strong><small>オフの場合、Drive保存完了後に端末の一時画像を削除します。</small></div><button role="switch" aria-checked={preferences.keepLocalCopy} className={`switch ${preferences.keepLocalCopy ? "on" : ""}`} onClick={() => void updatePreferences({ ...preferences, keepLocalCopy: !preferences.keepLocalCopy })}><span /></button></div>
      <div className="settings-note">端末にも残す場合、ブラウザのサイトデータ削除や端末変更では画像が失われます。正式な保管先はGoogle Driveです。</div>
      <button className="secondary-setting-button" onClick={() => void discardDraft()}><Trash2 size={17} />編集中の画像を削除</button>
      {pending.length > 0 && <button className="danger-link" onClick={() => void discardPending()}><Trash2 size={17} />アップロード待ち画像を削除</button>}
    </section>}

    {panel === "display" && <section className="settings-panel">
      <div className="theme-options">{(["system", "light", "dark"] as const).map((theme) => <button key={theme} className={preferences.theme === theme ? "active" : ""} onClick={() => void updatePreferences({ ...preferences, theme })}>{theme === "system" ? <><Moon size={19} />端末に合わせる</> : theme === "light" ? <><Sun size={19} />ライト</> : <><Moon size={19} />ダーク</>}{preferences.theme === theme && <Check size={17} />}</button>)}</div>
    </section>}

    {message && <p className="form-message" role="status">{message}</p>}
  </main>;
}
