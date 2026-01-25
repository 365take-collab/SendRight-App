# Stripe移行ガイド

## ✅ 完了した作業

1. ✅ Stripe Checkout Session API作成
2. ✅ Stripe Webhook ハンドラー実装
3. ✅ Customer Portal API実装
4. ✅ Resendメール送信ライブラリ作成
5. ✅ 購読ページをStripe Checkout連携に更新
6. ✅ ステップメール用Supabaseスキーマ追加
7. ✅ UTAGE決済関連コード削除

## 📋 環境変数設定

`.env.local`ファイルに以下を追加してください：

```env
# Stripe設定（必須）
STRIPE_SECRET_KEY=sk_live_xxx...
STRIPE_PUBLISHABLE_KEY=pk_live_xxx...
STRIPE_WEBHOOK_SECRET=whsec_xxx...
STRIPE_PRICE_MONTHLY=price_1ShWEK3F2rtCunnnqVQRiLAd
STRIPE_PRICE_YEARLY=price_1ShWEk3F2rtCunnnkSn8wg2I

# Resend設定（必須）
RESEND_API_KEY=re_xxx...
RESEND_FROM_EMAIL=SendRight <noreply@sendright.jp>

# ベースURL（必須）
NEXT_PUBLIC_BASE_URL=https://sendright.jp

# Vercel Cron設定（ステップメール用、オプション）
CRON_SECRET=your-random-secret-key-here
```

## 🗑️ 削除すべき環境変数（UTAGE関連）

以下の環境変数は削除してください：

```env
# 削除すべき環境変数
UTAGE_WEBHOOK_SECRET=...
UTAGE_PRODUCT_ID_100_MONTHLY=...
UTAGE_PRODUCT_ID_150_MONTHLY=...
UTAGE_PRODUCT_ID_200_MONTHLY=...
UTAGE_PRODUCT_ID_250_MONTHLY=...
UTAGE_PRODUCT_ID_100_YEARLY=...
UTAGE_PRODUCT_ID_150_YEARLY=...
UTAGE_PRODUCT_ID_200_YEARLY=...
UTAGE_PRODUCT_ID_250_YEARLY=...
UTAGE_CHECKOUT_BASE_URL=...
UTAGE_MEMBER_URL=...
NEXT_PUBLIC_UTAGE_CHECKOUT_URL=...
NEXT_PUBLIC_UTAGE_UPSELL_URL=...
NEXT_PUBLIC_UTAGE_DISCOUNT_URL=...
NEXT_PUBLIC_UTAGE_CANCEL_URL=...
NEXT_PUBLIC_UTAGE_BASIC_URL=...
```

## 🗄️ Supabaseスキーマ実行

以下のSQLをSupabaseダッシュボードで実行してください：

1. **ステップメール用スキーマ**:
   ```bash
   supabase/email_schedules_schema.sql
   ```

## 🔄 Vercel Cron設定（ステップメール用）

`vercel.json`に以下を追加してください：

```json
{
  "crons": [
    {
      "path": "/api/emails/send-scheduled",
      "schedule": "0 9 * * *"
    }
  ]
}
```

または、Vercelダッシュボードで：
1. Settings → Cron Jobs
2. Add Cron Job
3. Path: `/api/emails/send-scheduled`
4. Schedule: `0 9 * * *` (毎日9時)

## 🧪 テスト手順

1. **Stripe Checkoutテスト**:
   - `/subscribe`ページにアクセス
   - プランを選択して「今すぐ登録」をクリック
   - Stripe Checkoutページが表示されることを確認

2. **Webhookテスト**:
   - StripeダッシュボードでテストWebhookを送信
   - ユーザーが作成/更新されることを確認

3. **Customer Portalテスト**:
   - ログイン後、`/subscribe`ページで「プラン管理」をクリック
   - Customer Portalが表示されることを確認

4. **メール送信テスト**:
   - 決済完了後、ウェルカムメールが送信されることを確認
   - Resendダッシュボードで送信履歴を確認

## 📝 注意事項

- **既存ユーザー**: `is_utage_user`フラグは後方互換性のため残していますが、新規ユーザーは`false`になります
- **紹介システム**: UTAGE連携は残していますが、後でResendに移行できます
- **ステップメール**: Vercel Cronが設定されるまで、手動で`/api/emails/send-scheduled`を呼び出す必要があります

## 🚀 デプロイ後の確認

1. Stripe WebhookのURLを本番環境のURLに更新
2. Resendのドメイン認証が完了していることを確認
3. Vercel Cronが設定されていることを確認
4. 環境変数が正しく設定されていることを確認
