日本語で返答する。

## 共通ルール
/Users/kawamuratakeshi/.shared-agent-rules/SHARED-RULES.md の内容に従うこと。

## プロジェクト固有
- プロジェクト名: sendright
- **プロダクトアイデンティティ（必須）**: SendRight は **マッチングアプリ・LINE 等の返信AI**（恋愛・メッセージ文脈）。メールマーケ自動化・BtoB ツール・「開封率・シーケンス」等の説明は**このリポジトリでは禁止**（誤認防止）。
- **ブランド**: ユーザー向け UI・メール本文・LP では **LaunchX** を主ブランドにしない。運営者表記は特商法ページ等で整合。
- 上記の詳細: `~/.cursor/rules/product-identity-guard.mdc`
- 技術スタック: Next.js 16 + TypeScript + Supabase
- メインDB: Supabase (PostgreSQL)
## Important Files

- `app/`, `lib/`, `types/`, `supabase/`, `scripts/`
- `middleware.ts`, `package.json`, `tsconfig.json`
- `QUICK_START.md`, `SETUP.md`, `TROUBLESHOOTING.md`

## Verify Work

- `npm run build`
- `npm run test`
- `npm run lint`
- repo 共通の review 観点は [`/Users/kawamuratakeshi/code_review.md`](/Users/kawamuratakeshi/code_review.md) を優先

## Done-When

- 全テストパス + lint通過

## Constraints

### Codex担当範囲
- app/api/ ... APIルート
- lib/ ... ビジネスロジック・ユーティリティ
- types/ ... 型定義
- supabase/ ... マイグレーション・RLS
- scripts/ ... 自動化スクリプト

### Codexが編集しないファイル（参照のみ可）
以下はClaude Codeの担当。Codexは読み取り参照のみ:
- app/(pages)/ ... UIコンポーネント
- *.css, *.scss ... スタイルシート
