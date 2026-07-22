import "server-only";

import { getDriveTokenConfig, getGoogleOAuthClientConfig } from "@/lib/services/google-oauth-config";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

export interface DriveUploadInput {
  bytes: Uint8Array;
  mimeType: string;
  fileName: string;
  parentFolderId: string;
  appProperties?: Record<string, string>;
}

export interface DriveFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  parentIds: string[];
  trashed?: boolean;
}

export interface DriveService {
  ensureUserFolders(storageUserId: string, knownFolderIds?: { user?: string | null; images?: string | null }): Promise<{ userFolderId: string; imageFolderId: string }>;
  upload(input: DriveUploadInput): Promise<DriveFile>;
  download(fileId: string): Promise<{ bytes: Uint8Array; mimeType: string }>;
  getFile(fileId: string): Promise<DriveFile>;
  moveToTrash(fileId: string): Promise<void>;
  verifyParent(fileId: string, expectedParentId: string): Promise<boolean>;
}

interface GoogleDriveFileResponse {
  id: string;
  name?: string;
  size?: string;
  mimeType?: string;
  parents?: string[];
  trashed?: boolean;
}

interface GoogleDriveListResponse { files?: GoogleDriveFileResponse[]; }

function escapeQueryValue(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

function normalizeFile(file: GoogleDriveFileResponse): DriveFile {
  return { id: file.id, name: file.name ?? "", size: Number(file.size ?? 0), mimeType: file.mimeType ?? "application/octet-stream", parentIds: file.parents ?? [], trashed: file.trashed };
}

function retryDelay(attempt: number) {
  return Math.min(8_000, 400 * 2 ** attempt) + Math.floor(Math.random() * 200);
}

export class GoogleDriveOAuthService implements DriveService {
  private accessToken = "";
  private accessTokenExpiresAt = 0;

  constructor(
    private readonly rootFolderId: string,
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly refreshToken: string,
  ) {}

  private async getAccessToken() {
    if (this.accessToken && Date.now() < this.accessTokenExpiresAt - 60_000) return this.accessToken;
    const body = new URLSearchParams({ client_id: this.clientId, client_secret: this.clientSecret, refresh_token: this.refreshToken, grant_type: "refresh_token" });
    const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body, cache: "no-store" });
    if (!response.ok) throw new Error("DRIVE_OAUTH_REFRESH_FAILED");
    const payload = await response.json() as { access_token?: string; expires_in?: number };
    if (!payload.access_token) throw new Error("DRIVE_OAUTH_REFRESH_FAILED");
    this.accessToken = payload.access_token;
    this.accessTokenExpiresAt = Date.now() + (payload.expires_in ?? 3600) * 1000;
    return this.accessToken;
  }

  private async request(url: string, init: RequestInit = {}, attempt = 0): Promise<Response> {
    const token = await this.getAccessToken();
    const response = await fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` }, cache: "no-store" });
    if ((response.status === 429 || response.status >= 500) && attempt < 4) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay(attempt)));
      return this.request(url, init, attempt + 1);
    }
    if (response.status === 401 && attempt === 0) {
      this.accessToken = "";
      return this.request(url, init, attempt + 1);
    }
    return response;
  }

  async getFile(fileId: string) {
    const response = await this.request(`${DRIVE_API}/files/${encodeURIComponent(fileId)}?fields=id,name,size,mimeType,parents,trashed&supportsAllDrives=true`);
    if (!response.ok) throw new Error(response.status === 404 ? "DRIVE_FILE_NOT_FOUND" : "DRIVE_METADATA_FAILED");
    return normalizeFile(await response.json() as GoogleDriveFileResponse);
  }

  private async validateKnownFolder(folderId: string | null | undefined, expectedParentId: string) {
    if (!folderId) return null;
    try {
      const folder = await this.getFile(folderId);
      if (folder.mimeType === FOLDER_MIME_TYPE && folder.parentIds.includes(expectedParentId) && !folder.trashed) return folder.id;
    } catch {
      return null;
    }
    return null;
  }

  private async findFolder(parentId: string, role: string, storageUserId?: string) {
    const clauses = [
      `'${escapeQueryValue(parentId)}' in parents`,
      "trashed = false",
      `mimeType = '${FOLDER_MIME_TYPE}'`,
      `appProperties has { key='mushiKoreRole' and value='${escapeQueryValue(role)}' }`,
    ];
    if (storageUserId) clauses.push(`appProperties has { key='storageUserId' and value='${escapeQueryValue(storageUserId)}' }`);
    const query = encodeURIComponent(clauses.join(" and "));
    const response = await this.request(`${DRIVE_API}/files?q=${query}&fields=files(id,name,size,mimeType,parents,trashed)&pageSize=10&spaces=drive&includeItemsFromAllDrives=true&supportsAllDrives=true`);
    if (!response.ok) throw new Error("DRIVE_FOLDER_SEARCH_FAILED");
    const data = await response.json() as GoogleDriveListResponse;
    return data.files?.[0] ? normalizeFile(data.files[0]) : null;
  }

  private async createFolder(name: string, parentId: string, appProperties: Record<string, string>) {
    const response = await this.request(`${DRIVE_API}/files?fields=id,name,mimeType,parents,trashed&supportsAllDrives=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, mimeType: FOLDER_MIME_TYPE, parents: [parentId], appProperties }),
    });
    if (!response.ok) throw new Error("DRIVE_FOLDER_CREATE_FAILED");
    return normalizeFile(await response.json() as GoogleDriveFileResponse);
  }

  private async ensureFolder(name: string, parentId: string, role: string, storageUserId?: string) {
    const existing = await this.findFolder(parentId, role, storageUserId);
    if (existing) return existing.id;
    return (await this.createFolder(name, parentId, { mushiKoreRole: role, ...(storageUserId ? { storageUserId } : {}) })).id;
  }

  async ensureUserFolders(storageUserId: string, knownFolderIds: { user?: string | null; images?: string | null } = {}) {
    if (!/^user_[a-zA-Z0-9_-]{20,64}$/.test(storageUserId)) throw new Error("INVALID_STORAGE_USER_ID");
    const usersRootId = await this.ensureFolder("users", this.rootFolderId, "usersRoot");
    const knownUserFolder = await this.validateKnownFolder(knownFolderIds.user, usersRootId);
    const userFolderId = knownUserFolder ?? await this.ensureFolder(storageUserId, usersRootId, "userRoot", storageUserId);
    const knownImageFolder = await this.validateKnownFolder(knownFolderIds.images, userFolderId);
    const imageFolderId = knownImageFolder ?? await this.ensureFolder("images", userFolderId, "images", storageUserId);
    return { userFolderId, imageFolderId };
  }

  async upload(input: DriveUploadInput) {
    const form = new FormData();
    form.append("metadata", new Blob([JSON.stringify({ name: input.fileName, parents: [input.parentFolderId], appProperties: input.appProperties ?? {} })], { type: "application/json" }));
    form.append("file", new Blob([Uint8Array.from(input.bytes)], { type: input.mimeType }), input.fileName);
    const response = await this.request(`${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id,name,size,mimeType,parents,trashed&supportsAllDrives=true`, { method: "POST", body: form });
    if (!response.ok) throw new Error("DRIVE_UPLOAD_FAILED");
    return normalizeFile(await response.json() as GoogleDriveFileResponse);
  }

  async download(fileId: string) {
    const metadata = await this.getFile(fileId);
    const response = await this.request(`${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`);
    if (!response.ok) throw new Error("DRIVE_DOWNLOAD_FAILED");
    return { bytes: new Uint8Array(await response.arrayBuffer()), mimeType: metadata.mimeType };
  }

  async moveToTrash(fileId: string) {
    const response = await this.request(`${DRIVE_API}/files/${encodeURIComponent(fileId)}?supportsAllDrives=true`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trashed: true }) });
    if (!response.ok) throw new Error("DRIVE_TRASH_FAILED");
  }

  async verifyParent(fileId: string, expectedParentId: string) {
    const file = await this.getFile(fileId);
    return !file.trashed && file.parentIds.includes(expectedParentId);
  }
}

let driveService: DriveService | null = null;

export function isDriveConfigured() {
  try {
    const client = getGoogleOAuthClientConfig();
    const token = getDriveTokenConfig();
    return Boolean(client.clientId && client.clientSecret && token.refreshToken && token.rootFolderId);
  } catch {
    return Boolean(process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID && process.env.GOOGLE_DRIVE_CLIENT_ID && process.env.GOOGLE_DRIVE_CLIENT_SECRET && process.env.GOOGLE_DRIVE_REFRESH_TOKEN);
  }
}

export function createDriveService(): DriveService {
  if (driveService) return driveService;
  let rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  let clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  let clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  let refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
  try {
    const client = getGoogleOAuthClientConfig();
    const token = getDriveTokenConfig();
    rootFolderId = token.rootFolderId;
    clientId = client.clientId;
    clientSecret = client.clientSecret;
    refreshToken = token.refreshToken;
  } catch {
    // Environment variables remain available for hosted secret managers.
  }
  if (!rootFolderId || !clientId || !clientSecret || !refreshToken) throw new Error("GOOGLE_DRIVE_NOT_CONFIGURED");
  driveService = new GoogleDriveOAuthService(rootFolderId, clientId, clientSecret, refreshToken);
  return driveService;
}
