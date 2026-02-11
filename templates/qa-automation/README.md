# QA自動化テンプレート

新しいプロジェクトにQA自動化を導入するためのテンプレート。

## 導入手順

### 1. 依存関係追加

```bash
npm install -D @playwright/test tsx
npx playwright install chromium
```

### 2. ファイルコピー

```
templates/qa-automation/ の中身を対象プロジェクトにコピー:

scripts/qa/lib/config.ts          → エンドポイント一覧を書き換え
scripts/qa/lib/slack-reporter.ts  → そのまま使える
scripts/qa/lib/response-tracker.ts → そのまま使える
scripts/qa/lib/auth-helper.ts     → 認証方式に合わせて書き換え
scripts/qa/health-check.ts        → そのまま使える
scripts/qa/post-deploy-smoke.ts   → エンドポイントを書き換え
lib/slack.ts                      → そのまま使える
app/error.tsx                     → UIデザインを合わせる
app/api/report-error/route.ts     → そのまま使える
playwright.config.ts              → baseURLを書き換え
```

### 3. 環境変数設定

```
SLACK_WEBHOOK_URL_BUGS=   # Slackバグ検知チャンネルのWebhook URL
QA_TEST_PASSWORD=         # テストユーザーのパスワード
QA_BASE_URL=              # テスト対象URL（省略時はconfigのデフォルト）
QA_TEST_EMAIL=            # テストユーザーのメール（省略時はconfigのデフォルト）
```

### 4. package.json スクリプト追加

```json
"health-check": "npx tsx scripts/qa/health-check.ts",
"smoke-test": "npx playwright test scripts/qa/smoke-test.ts",
"screenshot-test": "npx playwright test scripts/qa/screenshot-test.ts",
"post-deploy-smoke": "npx tsx scripts/qa/post-deploy-smoke.ts"
```

### 5. カスタマイズ必須箇所

- `scripts/qa/lib/config.ts`: エンドポイント一覧、テストユーザー情報
- `scripts/qa/lib/auth-helper.ts`: 認証方式（JWT, session, etc.）
- `scripts/qa/smoke-test.ts`: UI操作フロー（プロジェクト固有）
- `scripts/qa/screenshot-test.ts`: 対象画面（プロジェクト固有）

### 6. cron設定（macOS）

LaunchAgentsにplistを配置して15分おき実行:

```bash
launchctl load ~/Library/LaunchAgents/com.launchx.PROJECT-health-check.plist
```

## ファイル分類

| ファイル | 汎用/固有 | 横展開時の変更 |
|---------|----------|-------------|
| lib/slack.ts | 汎用 | 環境変数名のみ |
| slack-reporter.ts | 汎用 | なし |
| response-tracker.ts | 汎用 | なし |
| config.ts | テンプレート | エンドポイント、認証 |
| auth-helper.ts | 固有 | 認証方式全体 |
| health-check.ts | テンプレート | config依存 |
| smoke-test.ts | 固有 | UI操作全体 |
| error.tsx | テンプレート | UIデザイン |
