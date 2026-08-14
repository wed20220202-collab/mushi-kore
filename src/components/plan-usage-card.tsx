import type { User } from "firebase/auth";
import { Sparkles } from "lucide-react";
import { FREE_USER_DAILY_IMAGE_LIMIT, GUEST_DAILY_IMAGE_LIMIT } from "@/lib/plans";

export function PlanUsageCard({ user }: { user: User | null }) {
  if (!user) return <a className="plan-usage guest" href="/pricing"><span><Sparkles size={19} /><b>無料ゲスト体験</b></span><small>1日{GUEST_DAILY_IMAGE_LIMIT}回 · 登録不要 →</small></a>;
  return <a className="plan-usage" href="/pricing"><div><span><Sparkles size={19} /><b>完全無料</b></span><strong>課金なし</strong></div><small>ログインユーザーは1日{FREE_USER_DAILY_IMAGE_LIMIT}回 · 全機能を無料で利用できます →</small></a>;
}
