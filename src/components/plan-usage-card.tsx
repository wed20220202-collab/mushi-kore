import type { User } from "firebase/auth";
import { Sparkles } from "lucide-react";

export function PlanUsageCard({ user }: { user: User | null }) {
  if (!user) return <a className="plan-usage guest" href="/pricing"><span><Sparkles size={19} /><b>無料ゲスト利用</b></span><small>AI判定 回数無制限 · 登録不要 →</small></a>;
  return <a className="plan-usage" href="/pricing"><div><span><Sparkles size={19} /><b>完全無料</b></span><strong>回数無制限</strong></div><small>AI判定を何度でも利用できます · 課金なし →</small></a>;
}
