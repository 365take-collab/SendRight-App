日本語で返答する。

## 共通ルール
/Users/kawamuratakeshi/.shared-agent-rules/SHARED-RULES.md の内容に従うこと。

## プロジェクト固有
- プロジェクト名: sendright
- 技術スタック: Next.js 16 + TypeScript + Supabase
- メインDB: Supabase (PostgreSQL)

## Repo Layout

- .cursor-review-count
- .env.local
- .git/
- .gitignore
- .next/
- .vercel/
- NEXT_STEPS.md
- OPENAI_CREDIT_GUIDE.md
- QUICK_START.md
- README.md
- REGISTER_TROUBLESHOOTING.md
- SCALING_PLAN.md
- SETUP.md
- TROUBLESHOOTING.md
- app/
- lib/
- marketing/
- middleware.ts
- next-env.d.ts
- next.config.js
- node_modules/
- package-lock.json
- package.json
- postcss.config.js
- public/
- scripts/
- src/
- supabase/
- tailwind.config.js
- templates/
- tsconfig.json
- tsconfig.tsbuildinfo
- types/
- ⓪ CXレベルデザイン設計.md
- ❹ コピー戦略&ブリーフ.md
- ❺ ファネル&メールシーケンス設計.md
- セールス&プロモーション.md
- マーケティングファネル設計書.md

## Build / Test / Lint Commands

- build: npm run build
- test: npm run test
- lint: npm run lint
- typecheck: # TODO: 手動設定要

## Review guidelines

### Scope: blocking issues only
- Do NOT flag naming, formatting, missing comments, or stylistic preferences
- Only flag issues that cause security vulnerabilities, data loss, or production outages

### Prohibited patterns (always flag)
- Hardcoded return values (dictionary/map lookup instead of real logic)
- Stub implementations (returning null, empty arrays, or placeholder data)
- Test-only branches (if/switch handling only known test case values)
- Excessive type casting (`as any`, `as never`, `as unknown`)
- Committed `it.skip()` or `it.only()`
- Assertion removal or weakening
- Coverage threshold reduction
- Adding `continue-on-error: true`

### Security checks (always flag)
- Missing input validation (SQL injection, XSS, command injection)
- Missing authentication or authorization checks
- Hardcoded secrets (API keys, tokens, passwords)
- Missing Supabase RLS policies on new tables

### Project conventions (flag if violated)
- Import paths must use `@/` prefix (TypeScript/Next.js projects)
- API endpoints must apply authentication middleware
- Type definitions must match between API and frontend
- Python projects: type hints required on public functions

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
