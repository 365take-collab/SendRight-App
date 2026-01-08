# 🚀 クイックスタートガイド

## ✅ 現在の状態

- ✅ Node.jsとnpmがインストール済み
- ✅ 依存関係がインストール済み
- ✅ 開発サーバーが起動中
- ⚠️ OpenAI APIキーの設定が必要

## 🔑 次のステップ：OpenAI APIキーの設定

### 1. OpenAI APIキーを取得

1. **https://platform.openai.com/** にアクセス
2. アカウントを作成（まだの場合）またはログイン
3. 右上のプロフィールアイコン → **「API keys」** をクリック
4. **「Create new secret key」** をクリック
5. キー名を入力（例: "LINE-DM-Assistant"）
6. **生成されたキーをコピー**（⚠️ このキーは一度しか表示されません！）

### 2. クレジットを追加

1. 左メニューの **「Billing」** を選択
2. **「Add payment method」** でクレジットカードを登録
3. 最低$5程度のクレジットを追加

### 3. .env.localファイルを編集

以下のコマンドでファイルを開いて編集：

```bash
cd /Users/kawamuratakeshi/Cursor/sendright
open -e .env.local
```

または、テキストエディタで直接開く：
- ファイルパス: `/Users/kawamuratakeshi/Cursor/sendright/.env.local`

**編集内容：**
```
OPENAI_API_KEY=ここに取得したAPIキーを貼り付け
JWT_SECRET=my_secret_key_12345_change_in_production
```

⚠️ **重要**: `OPENAI_API_KEY=`の後に、取得したAPIキーを貼り付けてください

### 4. サーバーを再起動

`.env.local`を編集した後、開発サーバーを再起動：

1. 現在動いているサーバーを停止（ターミナルで `Ctrl + C`）
2. 再度起動：

```bash
cd /Users/kawamuratakeshi/Cursor/sendright
npm run dev
```

## 🌐 ブラウザでアクセス

サーバーが起動したら、ブラウザで以下を開いてください：

**http://localhost:3000**

## 📱 使い方

1. **新規登録**
   - ブラウザで http://localhost:3000/login を開く
   - メールアドレスとパスワードを入力して登録

2. **会員登録（サブスクリプション）**
   - ログイン後、会員登録ページに移動
   - 月額または年額プランを選択（現在はデモ版）

3. **返信生成**
   - ホームページで女性からのメッセージを入力（またはスクリーンショットをアップロード）
   - 「返信を生成」ボタンをクリック
   - AIが即座に返信を提案します！

## ❓ トラブルシューティング

### エラー: "OPENAI_API_KEY is not defined"
→ `.env.local`ファイルが正しく編集されているか確認してください

### エラー: "APIキーを確認してください"
→ OpenAI APIキーが正しいか、クレジットが残っているか確認してください

### サーバーが起動しない
→ ターミナルで以下のコマンドを実行：

```bash
cd /Users/kawamuratakeshi/Cursor/sendright
npm run dev
```

## 🎉 完了！

これで準備完了です。LINEやDMでの返信に困ったら、このアプリを使ってみてください！

