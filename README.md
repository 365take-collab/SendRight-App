# Send Right

AIがLINEやDMでの女性との会話の返信を即座に提案する会員制Webアプリケーションです。

## 機能

- 🔐 **会員認証システム**: メールアドレスとパスワードによる登録・ログイン
- 👑 **サブスクリプション管理**: 月額・年額プランの会員制サービス
- 🤖 **AI返信生成**: Groq API（無料）またはOpenAI APIを使用した自然な返信の自動生成
- 📸 **画像からのテキスト抽出**: スクリーンショットから自動的にメッセージを抽出
- 📱 **レスポンシブデザイン**: モバイル・デスクトップ対応の美しいUI

## 技術スタック

- **フロントエンド**: Next.js 14, React, TypeScript, Tailwind CSS
- **バックエンド**: Next.js API Routes
- **認証**: JWT (JSON Web Token)
- **AI**: Groq API（無料プランあり）またはOpenAI API
- **パスワードハッシュ**: bcryptjs

## セットアップ

### 1. 依存関係のインストール

```bash
cd sendright
npm install
```

### 2. 環境変数の設定

`.env.example`を`.env.local`にコピーし、必要な値を設定してください：

```bash
cp .env.example .env.local
```

`.env.local`ファイルを編集：

```env
# Groq API（完全無料・推奨）- 返信生成に使用
GROQ_API_KEY=your_groq_api_key_here

# OpenAI API（画像抽出のみ使用・オプション）
# 画像抽出機能を使う場合のみ設定してください
# 返信生成はGroq API（無料）を使用するため、画像抽出を使わない場合は設定不要です
# OPENAI_API_KEY=your_openai_api_key_here  ← 画像抽出機能を使う場合のみ設定

JWT_SECRET=your_jwt_secret_here_change_this_in_production

# Utage会員ページURL（アクセス拒否時のリンクに使用）
UTAGE_MEMBER_URL=https://utage-system.com/member
```

**💡 完全無料で使う方法**: 
- `GROQ_API_KEY`のみを設定すれば、**返信生成機能を完全無料**で利用できます（クレジットカード不要）
- Groq APIキーは https://console.groq.com/ で取得できます
- **画像抽出機能を使わない場合**は、`OPENAI_API_KEY`は設定不要です（テキスト入力で返信生成が可能）

**📸 画像抽出機能を使う場合**:
- `OPENAI_API_KEY`を設定すると、画像からメッセージを自動抽出できます
- 画像抽出のみOpenAI Vision APIを使用（返信生成はGroq API（無料）のまま）
- 画像抽出の使用頻度は低いため、コストは最小限です

**⚠️ 注意**: Groq APIの無料プランにはレートリミットがあります。レートリミットに達した場合は、しばらく待ってから再試行してください。

### 3. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## 使用方法

1. **新規登録**: `/login`ページでアカウントを作成
2. **会員登録**: `/subscribe`ページで月額または年額プランに登録
3. **返信生成**: ホームページで女性からのメッセージを入力（またはスクリーンショットをアップロード）して返信を生成

## プロジェクト構造

```
sendright/
├── app/
│   ├── api/              # API エンドポイント
│   │   ├── auth/         # 認証関連API
│   │   ├── generate-response/  # AI返信生成API
│   │   └── subscribe/    # サブスクリプションAPI
│   ├── login/            # ログインページ
│   ├── subscribe/        # 会員登録ページ
│   ├── layout.tsx        # レイアウト
│   ├── page.tsx          # ホームページ
│   └── globals.css       # グローバルスタイル
├── lib/
│   ├── auth.ts           # 認証ユーティリティ
│   ├── ai.ts             # AI返信生成ロジック
│   └── api.ts            # フロントエンドAPIクライアント
└── package.json
```

## API エンドポイント

### 認証

- `POST /api/auth/register` - 新規ユーザー登録
- `POST /api/auth/login` - ログイン
- `GET /api/auth/me` - 現在のユーザー情報取得

### AI返信生成

- `POST /api/generate-response` - AI返信の生成（会員限定）

### サブスクリプション

- `POST /api/subscribe` - サブスクリプション登録

## 本番環境へのデプロイ

### 必要な追加実装

1. **データベース**: 現在はメモリ内にデータを保存しています。本番環境では以下のいずれかを使用してください：
   - PostgreSQL + Prisma
   - MongoDB
   - Supabase
   - Firebase

2. **決済処理**: サブスクリプション機能に実際の決済処理を統合：
   - Stripe
   - PayPal
   - 日本の決済サービス（Stripe Japan等）

3. **セキュリティ**:
   - HTTPSの強制
   - CORS設定の適切な設定
   - レート制限の実装
   - 入力値の検証強化

4. **環境変数**: 本番環境で安全に環境変数を管理：
   - Vercel Environment Variables
   - AWS Secrets Manager
   - その他のシークレット管理サービス

## 注意事項

- 現在の実装では、ユーザーデータはメモリ内に保存されており、サーバー再起動で失われます
- 決済処理は実装されていません（デモ版）
- Groq APIキー（無料）またはOpenAI APIキーが必要です
- 本番環境では適切なセキュリティ対策を実装してください

## ライセンス

このプロジェクトは個人利用・商用利用ともに自由に使用できます。

## サポート

問題や質問がある場合は、GitHubのIssuesで報告してください。






