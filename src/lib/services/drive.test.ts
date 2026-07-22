import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { GoogleDriveOAuthService } from "@/lib/services/drive";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("GoogleDriveOAuthService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("Firestoreに保存済みの正しいフォルダIDを再利用する", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ access_token: "token", expires_in: 3600 }))
      .mockResolvedValueOnce(jsonResponse({ files: [{ id: "users-root", mimeType: "application/vnd.google-apps.folder", parents: ["app-root"] }] }))
      .mockResolvedValueOnce(jsonResponse({ id: "user-folder", mimeType: "application/vnd.google-apps.folder", parents: ["users-root"], trashed: false }))
      .mockResolvedValueOnce(jsonResponse({ id: "images-folder", mimeType: "application/vnd.google-apps.folder", parents: ["user-folder"], trashed: false }));

    const service = new GoogleDriveOAuthService("app-root", "client", "secret", "refresh");
    await expect(service.ensureUserFolders("user_12345678901234567890", { user: "user-folder", images: "images-folder" }))
      .resolves.toEqual({ userFolderId: "user-folder", imageFolderId: "images-folder" });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
  });

  it("未作成の場合だけusers・ユーザー・imagesフォルダを作る", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ access_token: "token", expires_in: 3600 }))
      .mockResolvedValueOnce(jsonResponse({ files: [] }))
      .mockResolvedValueOnce(jsonResponse({ id: "users-root", mimeType: "application/vnd.google-apps.folder", parents: ["app-root"] }))
      .mockResolvedValueOnce(jsonResponse({ files: [] }))
      .mockResolvedValueOnce(jsonResponse({ id: "user-folder", mimeType: "application/vnd.google-apps.folder", parents: ["users-root"] }))
      .mockResolvedValueOnce(jsonResponse({ files: [] }))
      .mockResolvedValueOnce(jsonResponse({ id: "images-folder", mimeType: "application/vnd.google-apps.folder", parents: ["user-folder"] }));

    const service = new GoogleDriveOAuthService("app-root", "client", "secret", "refresh");
    await expect(service.ensureUserFolders("user_12345678901234567890"))
      .resolves.toEqual({ userFolderId: "user-folder", imageFolderId: "images-folder" });

    const folderCreates = fetchMock.mock.calls.filter(([url, init]) => String(url).includes("/drive/v3/files?") && init?.method === "POST");
    expect(folderCreates).toHaveLength(3);
  });

  it("推測しやすい短いstorageUserIdを拒否する", async () => {
    const service = new GoogleDriveOAuthService("app-root", "client", "secret", "refresh");
    await expect(service.ensureUserFolders("user_short")).rejects.toThrow("INVALID_STORAGE_USER_ID");
  });
});
