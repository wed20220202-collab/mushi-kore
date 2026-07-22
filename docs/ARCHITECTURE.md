# むしコレ アーキテクチャ

## 構成

```text
スマートフォン (Next.js / React)
  ├─ Firebase Authentication (Googleログイン)
  ├─ IndexedDB (未送信の画像・入力だけ)
  └─ Firebase ID token
        ↓
Next.js Route Handlers / server services
  ├─ Firebase Admin: ID token検証・Firestore
  ├─ AI provider interface: 構造化判定
  └─ DriveService: 非公開画像の保存・取得・ゴミ箱移動
        ↓
Firestore (メタデータ) + Google Drive (圧縮済み画像)
```

Route Handlerは公開HTTPエンドポイントとして扱い、各ハンドラーでIDトークンと所有権を検証する。UIからDrive APIやAI APIを直接呼ばない。

## Google Drive認証方式の判断

| 方式 | 長所 | 制約 | 判断 |
|---|---|---|---|
| 製作者のOAuth + My Drive | 個人Googleアカウントで導入可能。ファイル所有者が明確 | refresh token失効、所有者容量、OAuth同意/検証への対応が必要 | 個人運用の推奨 |
| サービスアカウント + 共有ドライブ | 組織所有で運用が安定。個人のtokenに依存しない | Google Workspaceと共有ドライブの契約・権限が必要 | Workspace運用の推奨 |
| サービスアカウント単独のMy Drive | サーバー実装は単純 | サービスアカウントは容量を持たず、ファイルを所有できない | 不採用 |
| Cloud Storage | アプリ向けblob保存、権限・ライフサイクル・配信が扱いやすい | 今回の「製作者Driveへ保存」という指定から外れる | 要件変更時の第一候補 |

個人OAuthでは `access_type=offline` で取得したrefresh tokenをSecret Manager等へ保存する。最小権限の `drive.file` を優先し、親フォルダも同じOAuthクライアントで作成して、そのIDを環境変数へ設定する。既存の手作業作成フォルダへ広範にアクセスするためだけにrestrictedな `drive` scopeを安易に採用しない。

## フォルダ構造

```text
むしコレ (GOOGLE_DRIVE_ROOT_FOLDER_ID)
└─ users
   └─ user_<推測困難なランダムID>
      └─ images
```

フォルダ名に氏名・メール等を含めない。FirestoreのfolderIdを正式参照とし、作成はトランザクション/ロックと冪等性キーで重複防止する。

## 画面遷移

```text
ログイン → 規約/プライバシー同意 → ホーム
  ├─ 撮影 → 確認/編集 → AI判定 → 結果修正 → 登録確認 → 詳細
  ├─ 図鑑 → 種類別/検索 → 詳細 → 編集/削除/再判定
  ├─ 設定 → 容量/プライバシー/退会
  └─ 管理者claimあり → 管理ダッシュボード
```

## サーバー処理

- アップロード: token検証 → ユーザー/上限取得 → MIME実体検証 → 圧縮/hash → 重複/冪等性確認 → Drive → Firestore transaction → 集計更新。
- 表示: token検証 → record取得 → uid一致またはadmin claim → fileId/親フォルダ一致 → Drive取得 → `private, no-store`。
- 削除: token/所有権/親フォルダ確認 → `deleting` → Driveをゴミ箱へ → Firestore/集計更新。完全削除は通常行わない。
- AI: provider interface → 構造化JSON → Zod → 低信頼度表現。医療・生物学的確定診断ではない。

## フェーズ

1. 基盤、UI、Firebase Auth接続点、ルール、サンプル図鑑、詳細、検索。
2. カメラ、回転/トリミング/圧縮、位置情報、IndexedDB。
3. AI provider、Zod検証、結果修正、登録。
4. Drive OAuth/共有ドライブ、upload/display/delete、状態管理、孤立ファイル。
5. 管理、上限/レート、PWA強化、障害復旧、E2E/結合テスト、運用文書。
