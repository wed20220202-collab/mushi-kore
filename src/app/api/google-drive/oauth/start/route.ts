import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getGoogleOAuthClientConfig } from "@/lib/services/google-oauth-config";

const DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const STATE_COOKIE = "mushi_drive_oauth_state";

function assertLocalSetupRequest(request: Request) {
  const hostname = new URL(request.url).hostname;
  if (process.env.NODE_ENV === "production" || (hostname !== "127.0.0.1" && hostname !== "localhost")) {
    throw new Error("LOCAL_SETUP_ONLY");
  }
}

export async function GET(request: Request) {
  try {
    assertLocalSetupRequest(request);
    const { clientId, redirectUris } = getGoogleOAuthClientConfig();
    const redirectUri = process.env.GOOGLE_DRIVE_OAUTH_REDIRECT_URI;
    if (!redirectUri || !redirectUris.includes(redirectUri)) throw new Error("OAUTH_REDIRECT_URI_MISMATCH");
    const state = randomBytes(32).toString("base64url");
    const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authorizationUrl.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: DRIVE_FILE_SCOPE,
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      state,
    }).toString();
    const response = NextResponse.redirect(authorizationUrl);
    response.cookies.set(STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 10 * 60,
      path: "/api/google-drive/oauth",
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return Response.json({ error: "Google Drive OAuthを開始できませんでした。" }, { status: 400 });
  }
}
