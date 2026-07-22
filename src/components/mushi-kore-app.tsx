"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import {
  BookOpen, Camera, Compass,
  Heart, Home, Leaf, MapPin, Search, Settings,
  Sparkles, Sun, X, Zap,
} from "lucide-react";
import { sampleRecords } from "@/lib/sample-data";
import type { InsectRecord } from "@/lib/types";
import { firebaseAuth, googleProvider, isFirebaseConfigured } from "@/lib/firebase/client";
import { acceptPolicies, initializeUserProfile } from "@/lib/firebase/users";
import { CaptureFlow } from "@/components/capture-flow";
import { IdentificationFlow } from "@/components/identification-flow";
import type { IdentificationInput } from "@/lib/identification-types";
import { SettingsView } from "@/components/settings-view";
import { applyPreferences, readLocalPreferences } from "@/lib/firebase/preferences";

type Tab = "home" | "collection" | "search" | "settings" | "capture" | "identify";

const AUTH_STATE_TIMEOUT_MS = 8_000;
const PROFILE_TIMEOUT_MS = 10_000;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, code: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(code)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function InsectPhoto({ record, className = "insect-photo" }: { record: InsectRecord; className?: string }) {
  return <div className={className} style={{ backgroundImage: `linear-gradient(180deg,transparent 55%,rgba(5,18,13,.34)),url('${record.imageUrl}')` }} />;
}

function RecordCard({ record, compact = false, onOpen }: { record: InsectRecord; compact?: boolean; onOpen: () => void }) {
  if (compact) {
    return (
      <button className="grid-card" onClick={onOpen} aria-label={`${record.commonNameJa}の詳細を見る`}>
        <InsectPhoto record={record} />
        <div className="card-body">
          <h3>{record.commonNameJa}</h3>
          <div className="latin">{record.scientificName}</div>
        </div>
      </button>
    );
  }
  return (
    <article className="insect-card">
      <div className="insect-photo" style={{ backgroundImage: `linear-gradient(180deg,transparent 55%,rgba(5,18,13,.34)),url('${record.imageUrl}')` }}>
        <span className="confidence"><Sparkles size={13} aria-hidden /> AI {Math.round(record.confidence * 100)}%</span>
        <span className="favorite" aria-label={record.favorite ? "お気に入り" : "お気に入りではありません"}><Heart size={18} fill={record.favorite ? "currentColor" : "none"} /></span>
      </div>
      <button className="card-body" onClick={onOpen} style={{ width: "100%", border: 0, background: "transparent", textAlign: "left" }}>
        <h3>{record.commonNameJa}</h3>
        <div className="latin">{record.scientificName}</div>
        <div className="meta"><span><MapPin size={14} />{record.locationName.split("・")[1]}</span><span><Sun size={14} />{new Date(record.capturedAt).toLocaleDateString("ja-JP", { month:"short", day:"numeric" })}</span></div>
      </button>
    </article>
  );
}

function Header({ user }: { user: User | null }) {
  const initial = user?.displayName?.trim().charAt(0) || "み";
  return (
    <header className="app-header">
      <div className="brand"><span className="brand-mark"><Leaf size={21} /></span>むしコレ</div>
      <div
        className="avatar"
        aria-label={user?.displayName || "デモユーザー"}
        style={user?.photoURL ? { backgroundImage: `url('${user.photoURL}')`, backgroundSize: "cover" } : undefined}
      >{user?.photoURL ? "" : initial}</div>
    </header>
  );
}

function HomeView({ openRecord, goCollection, goCapture }: { openRecord: (r: InsectRecord) => void; goCollection: () => void; goCapture: () => void }) {
  return (
    <main className="content">
      <div className="eyebrow">GOOD AFTERNOON</div>
      <h2 style={{ margin: "5px 0 14px", fontSize: "1.3rem" }}>こんにちは、みどりさん</h2>
      <section className="hero">
        <div className="eyebrow" style={{ color: "var(--lime)" }}>TODAY&apos;S FIELD NOTE</div>
        <h1>見つけた虫が、<br />わたしの図鑑になる。</h1>
        <p>カメラを向けるだけ。AIと一緒に、今日の小さな発見を記録しよう。</p>
        <button className="capture" onClick={goCapture}><Camera size={20} />虫を撮影する</button>
      </section>
      <div className="stats">
        <div className="stat"><div className="stat-top"><span className="eyebrow">SPECIES</span><Leaf size={18} /></div><strong>12</strong><small>見つけた種類</small></div>
        <div className="stat"><div className="stat-top"><span className="eyebrow">RECORDS</span><Compass size={18} /></div><strong>28</strong><small>これまでの発見</small></div>
      </div>
      <div className="section-title"><h2>最近の発見</h2><button className="text-button" onClick={goCollection}>すべて見る →</button></div>
      <div className="cards">{sampleRecords.map((r) => <RecordCard key={r.id} record={r} onOpen={() => openRecord(r)} />)}</div>
      <div className="section-title"><h2>今月の図鑑</h2><span className="eyebrow">7月</span></div>
      <section className="stat" style={{ padding: 20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}><div><strong style={{ fontFamily:"inherit", fontSize:"1rem", margin:0 }}>夏の虫を探索中</strong><small style={{ display:"block", marginTop:4 }}>8種類 / 20種類</small></div><div className="brand-mark" style={{ background:"#e4eadb", color:"var(--leaf)" }}><Zap size={19} /></div></div>
        <div className="progress"><span style={{ width:"40%" }} /></div>
      </section>
    </main>
  );
}

function CollectionView({ openRecord }: { openRecord: (r: InsectRecord) => void }) {
  const [filter, setFilter] = useState("すべて");
  const records = filter === "お気に入り" ? sampleRecords.filter((r) => r.favorite) : sampleRecords;
  return (
    <main className="content">
      <div className="eyebrow">MY FIELD GUIDE</div><h1 style={{ margin:"5px 0 20px", fontSize:"2rem", letterSpacing:"-.06em" }}>わたしの図鑑</h1>
      <div className="search-box"><Search size={19} /><input aria-label="図鑑を検索" placeholder="虫の名前や場所で検索" /></div>
      <div className="chips">{["すべて","お気に入り","コウチュウ目","チョウ目","判定未確定"].map((c) => <button key={c} className={`chip ${filter===c?"active":""}`} onClick={() => setFilter(c)}>{c}</button>)}</div>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}><strong>{records.length}件の記録</strong><button className="text-button">新しい順 ▾</button></div>
      <div className="grid">{records.map((r) => <RecordCard key={r.id} record={r} compact onOpen={() => openRecord(r)} />)}</div>
    </main>
  );
}

function SearchView({ openRecord }: { openRecord: (r: InsectRecord) => void }) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sampleRecords;
    return sampleRecords.filter((r) => [r.commonNameJa,r.commonNameEn,r.scientificName,r.order,r.family,r.locationName,r.memo,...r.tags].join(" ").toLowerCase().includes(q));
  }, [query]);
  return (
    <main className="content"><div className="eyebrow">DISCOVER AGAIN</div><h1 style={{ margin:"5px 0 20px", fontSize:"2rem", letterSpacing:"-.06em" }}>発見をさがす</h1>
      <div className="search-box"><Search size={19} /><input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="記録を検索" placeholder="カブトムシ、鎌倉、夏…" /></div>
      <div className="chips"><button className="chip active">すべて</button><button className="chip">撮影場所</button><button className="chip">タグ</button><button className="chip">信頼度 80%以上</button></div>
      {results.length ? <div className="grid">{results.map((r) => <RecordCard key={r.id} record={r} compact onOpen={() => openRecord(r)} />)}</div> : <div className="empty-note"><Search size={28} style={{ margin:"0 auto 10px" }} /><strong>該当する記録がありません</strong><p>名前や場所を変えて試してください。</p></div>}
    </main>
  );
}

function Detail({ record, close }: { record: InsectRecord; close: () => void }) {
  return <div className="detail-overlay" role="dialog" aria-modal="true" aria-label={`${record.commonNameJa}の詳細`} onClick={(e) => e.target===e.currentTarget && close()}>
    <article className="detail">
      <div className="detail-hero" style={{ backgroundImage:`linear-gradient(180deg,transparent 60%,rgba(4,17,13,.5)),url('${record.imageUrl}')` }}><button className="close" onClick={close} aria-label="閉じる"><X size={22} /></button></div>
      <div className="detail-content"><div className="eyebrow">IDENTIFIED · AI {Math.round(record.confidence*100)}%</div><h2>{record.commonNameJa}</h2><div className="latin">{record.commonNameEn} · {record.scientificName}</div>
        <div className="badge-row"><span className="badge">{record.order}</span><span className="badge">{record.family}</span>{record.tags.map((t) => <span className="badge" key={t}>#{t}</span>)}</div>
        <div className="info-panel"><h3>この虫について</h3><p>{record.description}</p></div>
        <div className="info-panel"><h3>AIの判別理由</h3><p>{record.identificationReason}<br /><small>※ AIの判定は確定診断ではありません。</small></p></div>
        <div className="info-panel"><h3>発見メモ</h3><p><MapPin size={14} style={{ display:"inline", marginRight:6 }} />{record.locationName}<br />{new Date(record.capturedAt).toLocaleString("ja-JP")}<br /><br />{record.memo}</p></div>
      </div>
    </article>
  </div>;
}

function BottomNav({ tab, setTab }: { tab: Tab; setTab: (tab: Tab) => void }) {
  return <nav className="bottom-nav" aria-label="メインナビゲーション">
    <button className={`nav-item ${tab==="home"?"active":""}`} onClick={() => setTab("home")}><Home size={21} /><span>ホーム</span></button>
    <button className={`nav-item ${tab==="search"?"active":""}`} onClick={() => setTab("search")}><Search size={21} /><span>検索</span></button>
    <button className={`nav-item ${tab==="capture"?"active":""}`} aria-label="虫を撮影する" onClick={() => setTab("capture")}><span className="nav-capture"><Camera size={27} /></span><span>撮影</span></button>
    <button className={`nav-item ${tab==="collection"?"active":""}`} onClick={() => setTab("collection")}><BookOpen size={21} /><span>図鑑</span></button>
    <button className={`nav-item ${tab==="settings"?"active":""}`} onClick={() => setTab("settings")}><Settings size={21} /><span>設定</span></button>
  </nav>;
}

export function MushiKoreApp() {
  const [stage, setStage] = useState<"login" | "consent" | "app">("login");
  const [loginError, setLoginError] = useState("");
  const [authReady, setAuthReady] = useState(!firebaseAuth);
  const [user, setUser] = useState<User | null>(null);
  const [tab, setTab] = useState<Tab>("home");
  const [selected, setSelected] = useState<InsectRecord | null>(null);
  const [identificationInput, setIdentificationInput] = useState<IdentificationInput | null>(null);

  useEffect(() => applyPreferences(readLocalPreferences()), []);

  useEffect(() => {
    if (!firebaseAuth) {
      return;
    }
    let disposed = false;
    const authTimeout = setTimeout(() => {
      if (disposed) return;
      setLoginError("ログイン状態の確認に時間がかかっています。再読み込みしてもう一度お試しください。");
      setStage("login");
      setAuthReady(true);
    }, AUTH_STATE_TIMEOUT_MS);
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (currentUser) => {
      clearTimeout(authTimeout);
      if (disposed) return;
      setUser(currentUser);
      if (!currentUser) {
        setStage("login");
        setAuthReady(true);
        return;
      }
      try {
        const profile = await withTimeout(initializeUserProfile(currentUser), PROFILE_TIMEOUT_MS, "PROFILE_TIMEOUT");
        if (disposed) return;
        setStage(profile.consentRequired ? "consent" : "app");
      } catch (error) {
        if (disposed) return;
        setLoginError(error instanceof Error && error.message === "PROFILE_TIMEOUT"
          ? "ユーザー情報の読み込みがタイムアウトしました。通信状況を確認して再読み込みしてください。"
          : "ユーザー情報を読み込めませんでした。Firestoreのルールを確認してください。");
        setStage("login");
      } finally {
        if (!disposed) setAuthReady(true);
      }
    }, () => {
      clearTimeout(authTimeout);
      if (disposed) return;
      setLoginError("ログイン状態を確認できませんでした。再読み込みしてもう一度お試しください。");
      setStage("login");
      setAuthReady(true);
    });
    return () => {
      disposed = true;
      clearTimeout(authTimeout);
      unsubscribe();
    };
  }, []);

  async function login() {
    setLoginError("");
    if (!isFirebaseConfigured || !firebaseAuth) { setStage("consent"); return; }
    try { await signInWithPopup(firebaseAuth, googleProvider); }
    catch { setLoginError("ログインを完了できませんでした。もう一度お試しください。"); }
  }
  async function acceptAndContinue() {
    const box = document.querySelector<HTMLInputElement>("#consent");
    if (!box?.checked) return;
    try {
      if (user) await acceptPolicies(user.uid);
      setStage("app");
    } catch {
      setLoginError("同意内容を保存できませんでした。通信状況を確認してください。");
    }
  }
  async function logout() {
    if (!firebaseAuth) return;
    await signOut(firebaseAuth);
    setSelected(null);
    setIdentificationInput(null);
    setTab("home");
    setStage("login");
  }
  if (!authReady) return <div className="phone-shell"><main className="empty-note" style={{ paddingTop: "45dvh" }}>ログイン状態を確認しています…</main></div>;
  if (stage === "login") return <div className="phone-shell"><section className="login-card"><div><div className="brand"><span className="brand-mark"><Leaf size={21} /></span>むしコレ</div><h1>森の記憶を、<br />ポケットに。</h1><p>撮る。知る。集める。<br />AIと育てる、あなただけの昆虫図鑑。</p></div><div>{loginError&&<p role="alert" style={{ color:"#ffd8c8" }}>{loginError}</p>}<button className="google-button" onClick={login}><span style={{ fontSize:"1.2rem", fontWeight:900, color:"#4285f4" }}>G</span>Googleでログイン</button><button className="demo-button" onClick={() => setStage("app")}>サンプル図鑑を見てみる</button><p className="legal">ログイン後に利用規約とプライバシーポリシーをご確認いただきます。認証情報が未設定の場合、ログインボタンも確認用デモとして動作します。</p></div></section></div>;
  if (stage === "consent") return <div className="phone-shell"><main className="content" style={{ paddingTop:50 }}><div className="brand"><span className="brand-mark"><Leaf size={21} /></span>むしコレ</div><div className="eyebrow" style={{ marginTop:60 }}>BEFORE WE START</div><h1 style={{ fontSize:"2rem", letterSpacing:"-.05em" }}>安心して図鑑を育てるために</h1><div className="info-panel"><h3>利用規約</h3><p>Gemini APIの開発テストは18歳以上の方だけが利用できます。AI判定は確定診断ではありません。</p></div><div className="info-panel"><h3>プライバシー</h3><p>画像は製作者管理の非公開Google Driveへ保存され、判定時は無料版Gemini APIへ送信されます。送信内容がGoogleのサービス改善や人による確認に使われる可能性があるため、人物・住所などの個人情報が写る画像は使用しないでください。位置情報はAIへ送りません。</p></div><label style={{ display:"flex", gap:10, marginTop:22, lineHeight:1.6 }}><input type="checkbox" required id="consent" />18歳以上であり、利用規約とプライバシーポリシーに同意します</label><button className="capture" style={{ width:"100%", justifyContent:"center", marginTop:24 }} onClick={acceptAndContinue}>同意してはじめる</button></main></div>;
  if (tab === "identify" && identificationInput && user) return <div className="phone-shell"><IdentificationFlow input={identificationInput} user={user} onBack={() => setTab("capture")} onComplete={() => { setIdentificationInput(null); setTab("home"); }} /></div>;
  if (tab === "capture") return <div className="phone-shell"><CaptureFlow onClose={() => setTab("home")} onIdentify={(input) => { if (!user) { setLoginError("AI判定にはGoogleログインが必要です。"); setStage("login"); setTab("home"); return; } setIdentificationInput(input); setTab("identify"); }} /></div>;
  return <div className="phone-shell"><Header user={user} />{tab==="home"&&<HomeView openRecord={setSelected} goCollection={() => setTab("collection")} goCapture={() => setTab("capture")} />}{tab==="collection"&&<CollectionView openRecord={setSelected} />}{tab==="search"&&<SearchView openRecord={setSelected} />}{tab==="settings"&&<SettingsView user={user} onLogout={logout} />}<BottomNav tab={tab} setTab={setTab} />{selected&&<Detail record={selected} close={() => setSelected(null)} />}</div>;
}
