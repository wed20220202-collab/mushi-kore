import Link from "next/link";
export default function NotFound() { return <main className="phone-shell" style={{ display:"grid", placeItems:"center", padding:30, textAlign:"center" }}><div><LeafMark /><h1>道に迷ったようです</h1><p style={{ color:"var(--muted)" }}>このページは見つかりませんでした。</p><Link href="/" className="capture">図鑑へ戻る</Link></div></main>; }
function LeafMark(){ return <div className="brand-mark" style={{ margin:"0 auto", fontSize:20 }}>404</div>; }
