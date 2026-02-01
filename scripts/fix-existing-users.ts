/**
 * 既存ユーザーのパスワード未設定を修正するスクリプト
 *
 * 使い方:
 *   npx tsx scripts/fix-existing-users.ts
 *
 * 環境変数が必要:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY
 *
 * やること:
 *   1. password_hash が NULL のユーザーを全件取得
 *   2. 各ユーザーに初期パスワードを生成
 *   3. password_hash をDBに保存
 *   4. ログイン情報メールを送信
 */

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import bcrypt from 'bcryptjs';

// 環境変数チェック
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendApiKey = process.env.RESEND_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const resend = resendApiKey ? new Resend(resendApiKey) : null;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'SendRight <noreply@sendright.jp>';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sendright.jp';

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function main() {
  // password_hash が NULL の有料ユーザーを取得
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, is_subscribed, subscription_type')
    .is('password_hash', null)
    .eq('is_subscribed', true);

  if (error) {
    console.error('Failed to fetch users:', error);
    process.exit(1);
  }

  if (!users || users.length === 0) {
    console.log('パスワード未設定の有料ユーザーは見つかりませんでした。');
    return;
  }

  console.log(`${users.length}人のパスワード未設定ユーザーが見つかりました。`);

  for (const user of users) {
    const password = generatePassword();
    const hash = await bcrypt.hash(password, 10);

    // DBを更新
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: hash })
      .eq('id', user.id);

    if (updateError) {
      console.error(`Failed to update user ${user.email}:`, updateError);
      continue;
    }

    // メール送信
    if (resend) {
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: user.email,
          subject: '【重要】SendRight ログイン情報のお知らせ',
          html: `
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                  <h1>SendRight ログイン情報</h1>
                </div>
                <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                  <p>いつもSendRightをご利用いただきありがとうございます。</p>
                  <p>ログイン情報の設定に不備があり、ご不便をおかけいたしました。お詫び申し上げます。</p>
                  <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <h3 style="margin: 0 0 10px 0; color: #856404;">ログイン情報</h3>
                    <p style="margin: 5px 0;"><strong>メールアドレス:</strong> ${user.email}</p>
                    <p style="margin: 5px 0;"><strong>パスワード:</strong> <code style="background: #f8f9fa; padding: 2px 8px; border-radius: 4px; font-size: 16px; letter-spacing: 1px;">${password}</code></p>
                  </div>
                  <div style="text-align: center;">
                    <a href="${BASE_URL}/login" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">SendRightにログインする</a>
                  </div>
                  <p style="margin-top: 20px;">ご不明な点がございましたら、お気軽にお問い合わせください。</p>
                  <p>SendRightチーム</p>
                </div>
              </div>
            </body>
            </html>
          `,
        });
        console.log(`✅ ${user.email}: パスワード設定 + メール送信完了`);
      } catch (emailError) {
        console.error(`❌ ${user.email}: メール送信失敗:`, emailError);
        console.log(`  → パスワードは設定済み: ${password}`);
      }
    } else {
      console.log(`⚠️ ${user.email}: パスワード設定完了（RESEND_API_KEY未設定のためメール未送信）`);
      console.log(`  → 手動でパスワードを伝えてください: ${password}`);
    }
  }

  console.log('\n完了しました。');
}

main().catch(console.error);
