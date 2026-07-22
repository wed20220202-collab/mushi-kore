import { verifyBearerToken } from "@/lib/firebase/admin";

export async function GET(request: Request) {
  try {
    const user = await verifyBearerToken(request);
    return Response.json({ uid: user.uid, name: user.name ?? null, picture: user.picture ?? null, admin: user.admin === true });
  } catch {
    return Response.json({ error: "認証が必要です。" }, { status: 401 });
  }
}
