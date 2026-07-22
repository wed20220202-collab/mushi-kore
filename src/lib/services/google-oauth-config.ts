import "server-only";

import { readFileSync } from "node:fs";

interface OAuthClientEntry {
  client_id?: string;
  client_secret?: string;
  auth_uri?: string;
  token_uri?: string;
  redirect_uris?: string[];
}

interface OAuthClientFile {
  web?: OAuthClientEntry;
  installed?: OAuthClientEntry;
}

interface DriveTokenFile {
  refresh_token?: string;
  root_folder_id?: string;
  scope?: string;
  created_at?: string;
}

export function getGoogleOAuthClientConfig() {
  const filePath = process.env.GOOGLE_DRIVE_OAUTH_CLIENT_FILE;
  if (!filePath) throw new Error("GOOGLE_DRIVE_OAUTH_CLIENT_FILE_NOT_CONFIGURED");
  const parsed = JSON.parse(readFileSync(filePath, "utf8")) as OAuthClientFile;
  const client = parsed.web ?? parsed.installed;
  if (!client?.client_id || !client.client_secret) throw new Error("INVALID_GOOGLE_OAUTH_CLIENT_FILE");
  return {
    clientId: client.client_id,
    clientSecret: client.client_secret,
    redirectUris: client.redirect_uris ?? [],
  };
}

export function getDriveTokenConfig() {
  const filePath = process.env.GOOGLE_DRIVE_OAUTH_TOKEN_FILE;
  if (!filePath) throw new Error("GOOGLE_DRIVE_OAUTH_TOKEN_FILE_NOT_CONFIGURED");
  const parsed = JSON.parse(readFileSync(filePath, "utf8")) as DriveTokenFile;
  if (!parsed.refresh_token || !parsed.root_folder_id) throw new Error("INVALID_GOOGLE_DRIVE_TOKEN_FILE");
  return {
    refreshToken: parsed.refresh_token,
    rootFolderId: parsed.root_folder_id,
    scope: parsed.scope,
  };
}

export function getDriveOAuthTokenFilePath() {
  const filePath = process.env.GOOGLE_DRIVE_OAUTH_TOKEN_FILE;
  if (!filePath) throw new Error("GOOGLE_DRIVE_OAUTH_TOKEN_FILE_NOT_CONFIGURED");
  return filePath;
}
