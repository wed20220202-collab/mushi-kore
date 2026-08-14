# むしコレ＋

スマートフォンで昆虫・魚・花・動物を撮影し、AIで種類を推定して、「むしコレ」「うおコレ」「はなコレ」「どうコレ」を育てるNext.jsアプリです。Firebaseログイン、撮影・画像編集、カテゴリ別AI判定、結果修正、図鑑登録、編集・削除、製作者Google Driveへの非公開画像保存に対応しています。既存の昆虫記録は自動的に「むしコレ」として表示されます。

## 実装済み

- スマートフォンファースト、ダークモード、キーボードフォーカス対応のUI
- ログイン、初回規約・プライバシー同意、ホーム、図鑑、検索、詳細、設定の画面遷移
- Firebase Web/Admin SDKの安全な初期化とID token検証API例
- 正確なTypeScript型、AIレスポンス/検索条件のZod schema、交換可能なAI/Drive interface
- サンプルデータ、Firestore Security Rules、複合index、単体テスト
- アーキテクチャ資料、利用規約/プライバシーポリシーひな型
- スマートフォンカメラ起動と端末画像選択、JPEG・PNG・WebP検証
- EXIF Orientationを考慮した画像読込、90度回転、中央トリミング（元画像・1:1・4:3）
- 長辺1600px、WebP品質80%優先、2MB以下への段階的圧縮と圧縮前後サイズ表示
- 任意のGeolocation取得と、拒否した場合も継続できる撮影フロー
- IndexedDBへの圧縮画像・撮影日時・位置情報・編集状態の一時保存と自動復元
- オンライン/オフライン状態、アップロード待ち件数の表示
- Firebase IDトークンの署名・issuer・audience・期限を検証する認証済みAI Route Handler
- MIME宣言だけを信用せず、JPEG・PNG・WebPのmagic bytesと2MB上限をサーバー側で再検証
- Zodで検証した構造化判定、最大3候補、信頼度、判別理由、生息環境、活動時期、安全情報
- 判定中の進捗表示、失敗時の再試行、候補の選び直し、AI再判定
- 和名・英名・学名・分類・メモ・タグを利用者が修正できる登録確認画面
- Firestoreへ `localOnly: true / uploadStatus: preparing` として登録し、画像blobはIndexedDBへ保存
- 製作者OAuthのaccess token自動更新、429/5xx時の指数バックオフ付きGoogle Driveサービス
- `むしコレ/users/user_<random>/images` の重複しないフォルダ作成と、Firestore保存済みfolder IDの親子関係検証
- Firebase ID token、所有者、magic bytes、2MB上限を再検証する認証済み画像アップロード
- 実ファイルサイズによる500枚・500MB・日30枚・毎分5回の制限、SHA-256重複検出
- idempotencyKeyによる再送制御、未完了ファイルのゴミ箱移動、`cleanup_required` operation記録
- 一般公開URLを使わない認証済み画像取得APIと、親フォルダを検証してDriveのゴミ箱へ移す削除API
- Drive保存成功後のIndexedDB一時画像削除、失敗時の端末内保持と再試行UI
- Googleプロフィール表示、確認可能なログアウト、実使用量を表示するストレージ画面
- IndexedDBのアップロード待ち一覧・個別再送・一括再送・確認付き破棄
- 位置情報の利用可否、Drive保存後の端末コピー、ライト/ダーク/端末連動表示のユーザー別設定
- GitHub Pagesだけで動作する端末内図鑑と、公式Pages Actionsによる自動デプロイworkflow

## 一部実装・未実装

- Firebase環境変数設定後はGoogle popup認証を行うが、セッションcookie化と全画面のサーバーガードはフェーズ1後半で追加する。
- 管理画面、図鑑一覧のFirestore実データ化、Service Workerによる完全なPWAオフライン処理、Playwright E2Eはフェーズ5。
- AI providerはGemini 3.6 Flashへ切替済み。画像入力、構造化JSON、Zod再検証、AI判定の回数無制限化を実装している。自動攻撃対策の短時間レート制限と、外部料金なしのUIテスト用mock providerは残す。
- HEIC/HEIFはブラウザ標準で安全に変換できない場合があるため、現時点では理由を表示して拒否する。将来は信頼できる変換ライブラリを別chunkで追加する。
- Drive連携コードと実Drive結合テストは完了済み。今後の自動テストは本番フォルダを誤操作しないよう、専用親フォルダで実施する。

## 採用技術

Next.js 16 App Router、React 19、TypeScript、Tailwind CSS 4、Firebase Authentication / Firestore / Admin SDK、Google Drive API v3、Zod、Vitest。詳細は [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) を参照してください。

## セットアップ

1. Node.js 20.9以上を用意し、`npm install`。
2. `.env.example` を `.env.local` にコピーし、必要値を設定。
3. `npm run dev` を実行して `http://localhost:3000` を開く。
4. `npm run typecheck`、`npm run lint`、`npm test`、`npm run build` で検証。

環境変数がなくても「サンプル図鑑を見てみる」からUIを確認できます。秘密鍵、refresh token、サービスアカウントJSONはcommitしないでください。

## GitHub Pages公開

GitHub Pagesは静的ホスティングのため、Firebase Admin、Gemini、Google Drive OAuthを使うRoute Handlerは実行できません。本リポジトリでは役割を明確に分けています。

- `src/`: ログイン、AI判定、Drive保存を含むサーバー版
- `pages-demo/`: 撮影、手入力登録、IndexedDB保存、検索、お気に入り、削除、バックアップ・復元、PWAオフライン利用に対応する静的版
- `.github/workflows/deploy-pages.yml`: `pages-demo/` と公開用画像をPages artifactへまとめてデプロイ

GitHubでリポジトリの **Settings → Pages → Source** を **GitHub Actions** にし、`main` へpushすると公開されます。静的版の写真・図鑑・設定はブラウザのIndexedDBとlocalStorageだけに保存され、外部サーバーへ送信しません。APIキー、Firebase Admin秘密鍵、Drive OAuth tokenも一切含めません。ブラウザのサイトデータを削除すると記録も消えるため、設定画面からJSONバックアップを定期的に書き出してください。Gemini正式判定とGoogle Drive保存を使うサーバー版は `src/` に残しています。

## Firebase設定

1. Firebase ConsoleでWebアプリを作成し、AuthenticationのGoogle providerを有効化。
2. 承認済みドメインに開発/本番ドメインを追加し、Web設定値を `NEXT_PUBLIC_FIREBASE_*` へ設定。
3. Admin SDKのproject ID、client email、private keyをサーバーsecretへ設定。ローカルではサービスアカウントJSONをリポジトリ外へ保存し、`GOOGLE_APPLICATION_CREDENTIALS=C:/安全な場所/firebase-admin.json` とする方法も使えます。private keyの改行は `\\n` 形式でも読み替えます。
4. Firestoreを作成し、`firebase deploy --only firestore:rules,firestore:indexes` で `firestore.rules` と `firestore.indexes.json` を適用。
5. 管理者はAdmin SDKから `{ admin: true }` のCustom Claimを設定し、再ログインしてtokenを更新。メール文字列比較で判定しません。

## Google Drive設定

最新の公式仕様上、サービスアカウントは保存容量を持たずファイルを所有できません。そのため個人運用は「製作者OAuth + My Drive」、Workspace運用は「サービスアカウント + 共有ドライブ」を採用します。

### 個人My Drive

1. Google Cloud ConsoleでDrive APIを有効化し、OAuth同意画面を構成する。テスト公開中は製作者Googleアカウントをテストユーザーへ追加する。
2. 「ウェブアプリケーション」のOAuth clientを作り、localhostの認可コールバックを登録する。
3. server-side OAuth flowで `access_type=offline` と `prompt=consent` を用い、製作者本人が同意してrefresh tokenを一度取得する。client secretとrefresh tokenはチャットへ貼らず、`.env.local` またはSecret Managerへ直接保存する。
4. `GOOGLE_DRIVE_ROOT_FOLDER_ID`、`GOOGLE_DRIVE_CLIENT_ID`、`GOOGLE_DRIVE_CLIENT_SECRET`、`GOOGLE_DRIVE_REFRESH_TOKEN` を設定して開発サーバーを再起動する。
5. 本アプリはrefresh tokenから短命access tokenをサーバー内で取得する。ブラウザへDrive認証情報やfile IDを保存先指定として渡さない。

`drive.file` は推奨される狭いscopeですが、そのOAuthアプリが作成または明示的に開いたファイルだけへアクセスできます。手作業で作った既存親フォルダIDをそのまま使う場合はアクセスできないことがあります。初期公開では、同じOAuthアプリで親フォルダを作成・選択して `drive.file` を使う案を優先してください。既存フォルダへ全面アクセスする `drive` scopeはrestricted scopeなので、安易に本番採用せずGoogleの検証要件を確認します。

設定が不足している間、登録済みメタデータと画像は端末内に保持され、画面に「Drive保存待ち」と再試行ボタンが表示されます。

### 共有ドライブ

Workspaceで共有ドライブを作成し、サービスアカウントを必要最小限の権限でメンバー追加します。API呼び出しではshared drive IDと `supportsAllDrives` を扱います。テストは本番とは別の親フォルダを使います。

## Firestoreデータ

`users/{uid}` の下に `insectRecords`、`settings`、`badges` を置きます。`storageUserId` は個人情報を含まないランダムID。`driveFileId`、folder ID、容量、hash、upload statusはクライアントから直接変更できず、認証済みバックエンドだけが更新します。日付は本実装でFirestore `Timestamp` を使います。

## 画像・検索方針

原画は保存せず、長辺1600px、WebP/JPEG品質80%、2MB以下へ圧縮します。一覧は圧縮済み画像を認証バックエンドから取得し、アプリ側で短期メモリキャッシュする方式を初期採用します。別サムネイルは容量とDrive API操作を増やすため初期版では作りません。検索は正規化した `searchKeywords` とcursor paginationを用い、将来は検索providerをAlgolia等へ交換できる構成にします。

## 容量・セキュリティ

初期値は500枚、500MB、日30枚、圧縮後2MB、毎分5回。サーバー実測値をtransactionで更新します。全APIでtoken、uid、record所有権、folder親子関係、MIME実体、サイズ、冪等性キーを検証し、画像は一般公開しません。Drive障害後の孤立ファイルはoperation logへ `cleanup_required` と記録し、再試行またはゴミ箱移動します。

## テストと運用

VitestでZod境界値、画像signature、画像処理、Driveフォルダの新規作成・再利用を検証済みです。後続フェーズでFirebase Emulatorによるrules/統合テスト、Playwright、専用Drive test folderを追加します。本番の親フォルダを自動テストには使いません。バックアップはFirestore exportとDrive親フォルダの管理者向け監査を組み合わせ、容量80%で警告、満杯時はupload停止と削除案内を行います。

## 採用した仮定

- 初期リリースは個人製作者でも開始できるよう製作者OAuthを既定案とし、Workspace利用時は共有ドライブへ切替可能にする。
- thumbnailは別保存せず、認証済み圧縮画像をカードサイズで表示する。
- 現在はGemini APIによる運用です。規約上18歳以上に限定し、人物・住所などの個人情報が写る画像を送らないでください。むしコレは全機能とAI判定を回数無制限で無料提供します。自動攻撃には短時間の通信制限を適用します。

## Gemini AI判定

`AI_PROVIDER=gemini` と `AI_MODEL=gemini-3.6-flash` で正式な画像判定を有効化します。APIキーはリポジトリ外の1行テキストを `GEMINI_API_KEY_FILE` で参照し、ブラウザへ公開しません。レスポンスはGeminiのStructured Outputsとアプリ側Zod schemaの両方で検証します。無料サービスへ送った画像・プロンプト・回答はGoogleの製品改善や人による確認に使われる可能性があるため、開発テスト専用です。位置情報はAI判定APIへ送信しません。
- サンプル画像はWikimedia Commonsの各ライセンスに基づく開発用素材。公開時は利用条件とクレジットを再確認する。

## 参考（公式）

- Google Drive API scopes: https://developers.google.com/workspace/drive/api/guides/api-specific-auth
- Shared drives: https://developers.google.com/workspace/drive/api/guides/about-shareddrives
- Server-side OAuth: https://developers.google.com/identity/protocols/oauth2/web-server
