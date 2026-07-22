import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getDriveOAuthTokenFilePath, getGoogleOAuthClientConfig } from "@/lib/services/google-oauth-config";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
const STATE_COOKIE = "mushi_drive_oauth_state";

function assertLocalSetupRequest(request: Request) {
  const hostname = new URL(request.url).hostname;
  if (process.env.NODE_ENV === "production" || (hostname !== "127.0.0.1" && hostname !== "localhost")) {
    throw new Error("LOCAL_SETUP_ONLY");
  }
}

async function exchangeCode(code: string, redirectUri: string) {
  const { clientId, clientSecret } = getGoogleOAuthClientConfig();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri, grant_type: "authorization_code" }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("OAUTH_CODE_EXCHANGE_FAILED");
  const payload = await response.json() as { access_token?: string; refresh_token?: string; scope?: string };
  if (!payload.access_token || !payload.refresh_token) throw new Error("OAUTH_REFRESH_TOKEN_MISSING");
  return { accessToken: payload.access_token, refreshToken: payload.refresh_token, scope: payload.scope };
}

async function ensureAppRoot(accessToken: string) {
  const query = encodeURIComponent(`trashed = false and mimeType = '${FOLDER_MIME_TYPE}' and appProperties has { key='mushiKoreRole' and value='appRoot' }`);
  const listResponse = await fetch(`${DRIVE_API}/files?q=${query}&fields=files(id,name)&pageSize=10&spaces=drive`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!listResponse.ok) throw new Error("DRIVE_ROOT_SEARCH_FAILED");
  const list = await listResponse.json() as { files?: Array<{ id?: string }> };
  const existingId = list.files?.find((file) => file.id)?.id;
  if (existingId) return existingId;
  const createResponse = await fetch(`${DRIVE_API}/files?fields=id`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "むしコレ", mimeType: FOLDER_MIME_TYPE, parents: ["root"], appProperties: { mushiKoreRole: "appRoot" } }),
    cache: "no-store",
  });
  if (!createResponse.ok) throw new Error("DRIVE_ROOT_CREATE_FAILED");
  const created = await createResponse.json() as { id?: string };
  if (!created.id) throw new Error("DRIVE_ROOT_CREATE_FAILED");
  return created.id;
}

async function saveTokenFile(refreshToken: string, rootFolderId: string, scope?: string) {
  const filePath = getDriveOAuthTokenFilePath();
  const temporaryPath = `${filePath}.tmp`;
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(temporaryPath, `${JSON.stringify({ refresh_token: refreshToken, root_folder_id: rootFolderId, scope, created_at: new Date().toISOString() }, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporaryPath, filePath);
}

function resultPage(title: string, message: string, success: boolean) {
  return new NextResponse(`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title><body style="font-family:system-ui;background:#eef3e8;color:#183a2b;display:grid;place-items:center;min-height:100vh;margin:0"><main style="background:white;padding:32px;border-radius:20px;max-width:520px;box-shadow:0 16px 50px #183a2b22"><h1>${title}</h1><p>${message}</p><a href="/" style="color:#276749;font-weight:700">むしコレへ戻る</a></main></body></html>`, {
    status: success ? 200 : 400,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function GET(request: NextRequest) {
  let response: NextResponse;
  try {
    assertLocalSetupRequest(request);
    const expectedState = request.cookies.get(STATE_COOKIE)?.value;
    const state = request.nextUrl.searchParams.get("state");
    const code = request.nextUrl.searchParams.get("code");
    if (!expectedState || !state || state !== expectedState || !code) throw new Error("INVALID_OAUTH_CALLBACK");
    const redirectUri = process.env.GOOGLE_DRIVE_OAUTH_REDIRECT_URI;
    if (!redirectUri) throw new Error("OAUTH_REDIRECT_URI_MISSING");
    const tokens = await exchangeCode(code, redirectUri);
    const rootFolderId = await ensureAppRoot(tokens.accessToken);
    await saveTokenFile(tokens.refreshToken, rootFolderId, tokens.scope);
    response = resultPage("Google Drive連携完了", "アプリ専用の「むしコレ」フォルダを作成し、安全な限定権限で接続しました。", true);
  } catch {
    response = resultPage("Google Drive連携に失敗しました", "認可をやり直してください。秘密情報は保存されていません。", false);
  }
  response.cookies.set(STATE_COOKIE, "", { httpOnly: true, sameSite: "lax", maxAge: 0, path: "/api/google-drive/oauth" });
  return response;
}
