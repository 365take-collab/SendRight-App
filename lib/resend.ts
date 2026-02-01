import { Resend } from 'resend';

// Resendインスタンス（環境変数がない場合はnull）
const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'SendRight <noreply@sendright.jp>';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sendright.jp';

// ウェルカムメール送信（初期パスワード付き）
export async function sendWelcomeEmail(email: string, plan: 'monthly' | 'yearly', initialPassword?: string) {
  if (!resend || !process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not set, skipping email send');
    return;
  }

  const planName = plan === 'monthly' ? '月額プラン' : '年額プラン';

  // トライアル終了日（7日後）
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 7);
  const trialEndStr = `${trialEnd.getMonth() + 1}月${trialEnd.getDate()}日`;

  const loginSection = initialPassword
    ? `
      <div style="background: #1a1a2e; border-radius: 8px; padding: 24px; margin: 24px 0;">
        <h3 style="margin: 0 0 12px 0; color: #667eea; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">ログイン情報</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #999; font-size: 13px; width: 120px;">メールアドレス</td>
            <td style="padding: 8px 0; color: #fff; font-size: 15px;">${email}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #999; font-size: 13px;">パスワード</td>
            <td style="padding: 8px 0;"><code style="background: #667eea; color: #fff; padding: 4px 12px; border-radius: 4px; font-size: 16px; letter-spacing: 2px;">${initialPassword}</code></td>
          </tr>
        </table>
      </div>
    `
    : '';

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: initialPassword
        ? '【ログイン情報】SendRightの準備ができました'
        : `SendRight ${planName}が有効になりました`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background: #0f0f1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; line-height: 1.6; color: #e0e0e0;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">

            <!-- ヘッダー -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0 0 8px 0; font-size: 28px; color: #fff; font-weight: 700;">準備完了</h1>
              <p style="margin: 0; font-size: 15px; color: rgba(255,255,255,0.85);">あと10秒で、返信に悩む時間が消えます</p>
            </div>

            <!-- メインコンテンツ -->
            <div style="background: #16162a; padding: 32px; border-radius: 0 0 12px 12px;">

              <p style="margin: 0 0 16px 0; font-size: 15px; color: #ccc;">
                ${planName}（7日間無料トライアル付き）が有効になりました。
              </p>

              <!-- ログイン情報 -->
              ${loginSection}

              <!-- CTA -->
              <div style="text-align: center; margin: 28px 0;">
                <a href="${BASE_URL}/login" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; padding: 16px 48px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">今すぐ最初の返信を生成する</a>
              </div>

              <!-- 3ステップガイド -->
              <div style="margin: 32px 0 24px 0;">
                <h3 style="margin: 0 0 16px 0; font-size: 15px; color: #667eea; font-weight: 600;">最初にやること（1分で完了）</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px 12px; vertical-align: top; width: 36px;">
                      <div style="background: #667eea; color: #fff; width: 28px; height: 28px; border-radius: 50%; text-align: center; line-height: 28px; font-size: 13px; font-weight: 700;">1</div>
                    </td>
                    <td style="padding: 10px 0; color: #ccc; font-size: 14px;">
                      <strong style="color: #fff;">ログイン</strong><br>上のボタンからログインしてください
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 12px; vertical-align: top;">
                      <div style="background: #667eea; color: #fff; width: 28px; height: 28px; border-radius: 50%; text-align: center; line-height: 28px; font-size: 13px; font-weight: 700;">2</div>
                    </td>
                    <td style="padding: 10px 0; color: #ccc; font-size: 14px;">
                      <strong style="color: #fff;">相手のメッセージを入力</strong><br>テキスト入力、音声入力、スクショ画像の3つの方法で入力できます
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 12px; vertical-align: top;">
                      <div style="background: #667eea; color: #fff; width: 28px; height: 28px; border-radius: 50%; text-align: center; line-height: 28px; font-size: 13px; font-weight: 700;">3</div>
                    </td>
                    <td style="padding: 10px 0; color: #ccc; font-size: 14px;">
                      <strong style="color: #fff;">3つの返信候補から選ぶ</strong><br>AIが最適な返信を3つ提案。なぜ効果的か解説付き
                    </td>
                  </tr>
                </table>
              </div>

              <!-- トライアル期限リマインダー -->
              <div style="background: rgba(102, 126, 234, 0.1); border: 1px solid rgba(102, 126, 234, 0.3); border-radius: 8px; padding: 16px; margin: 24px 0; text-align: center;">
                <p style="margin: 0; font-size: 13px; color: #999;">
                  無料トライアル期間: <strong style="color: #667eea;">${trialEndStr}まで</strong><br>
                  期間中は1日50回まで使い放題です
                </p>
              </div>

              <p style="margin: 24px 0 0 0; font-size: 13px; color: #666;">
                ご不明点があれば、このメールに返信してください。<br>
                SendRightチーム
              </p>
            </div>

            <!-- フッター -->
            <div style="text-align: center; margin-top: 24px; padding: 0 20px;">
              <p style="margin: 0; font-size: 11px; color: #444;">&copy; ${new Date().getFullYear()} SendRight. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log('Welcome email sent to:', email);
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    throw error;
  }
}

// ステップメール送信
export async function sendStepEmail(
  email: string,
  emailType: 'welcome' | 'day1' | 'day3' | 'day7' | 'day14' | 'day30'
) {
  if (!resend || !process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not set, skipping email send');
    return;
  }

  const emailTemplates: Record<string, { subject: string; content: string }> = {
    welcome: {
      subject: 'SendRightへようこそ！',
      content: `
        <p>こんにちは、</p>
        <p>SendRightへのご登録ありがとうございます！</p>
        <p>AI返信生成を始めて、素敵な会話を始めましょう。</p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${BASE_URL}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">SendRightを始める</a>
        </div>
      `,
    },
    day1: {
      subject: 'SendRightを使い始めて1日目',
      content: `
        <p>こんにちは、</p>
        <p>SendRightを使い始めて1日が経ちました。</p>
        <p>使い方はいかがですか？何かご質問があれば、お気軽にお問い合わせください。</p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${BASE_URL}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">SendRightを使う</a>
        </div>
      `,
    },
    day3: {
      subject: 'SendRightを使い始めて3日目',
      content: `
        <p>こんにちは、</p>
        <p>SendRightを使い始めて3日が経ちました。</p>
        <p>AI返信生成のコツがつかめてきましたか？</p>
        <p>より効果的な使い方のヒントをお届けします。</p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${BASE_URL}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">SendRightを使う</a>
        </div>
      `,
    },
    day7: {
      subject: 'SendRightを使い始めて1週間',
      content: `
        <p>こんにちは、</p>
        <p>SendRightを使い始めて1週間が経ちました。</p>
        <p>AI返信生成に慣れてきましたか？</p>
        <p>さらに効果的な使い方を学びましょう。</p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${BASE_URL}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">SendRightを使う</a>
        </div>
      `,
    },
    day14: {
      subject: 'SendRightを使い始めて2週間',
      content: `
        <p>こんにちは、</p>
        <p>SendRightを使い始めて2週間が経ちました。</p>
        <p>AI返信生成の効果を実感できていますか？</p>
        <p>さらなる上達のためのヒントをお届けします。</p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${BASE_URL}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">SendRightを使う</a>
        </div>
      `,
    },
    day30: {
      subject: 'SendRightを使い始めて1ヶ月',
      content: `
        <p>こんにちは、</p>
        <p>SendRightを使い始めて1ヶ月が経ちました。</p>
        <p>AI返信生成の効果を実感できていますか？</p>
        <p>これからもSendRightをよろしくお願いします。</p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${BASE_URL}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">SendRightを使う</a>
        </div>
      `,
    },
  };

  const template = emailTemplates[emailType];
  if (!template) {
    console.error(`Unknown email type: ${emailType}`);
    return;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: template.subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>SendRight</h1>
            </div>
            <div class="content">
              ${template.content}
              <p>SendRightチーム</p>
            </div>
            <div class="footer">
              <p>このメールは自動送信されています。</p>
              <p>© ${new Date().getFullYear()} SendRight. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log(`Step email sent (${emailType}) to:`, email);
  } catch (error) {
    console.error(`Failed to send step email (${emailType}):`, error);
    throw error;
  }
}

// 紹介特典メール送信
export async function sendReferralBonusEmail(
  email: string,
  threshold: number,
  bonusName: string
) {
  if (!resend || !process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not set, skipping referral bonus email');
    return;
  }

  const thresholdMessages: Record<number, { emoji: string; description: string }> = {
    3: {
      emoji: '🎉',
      description: 'LINEで使えるモテテクニックを厳選してまとめました。今日から実践できる内容です。',
    },
    5: {
      emoji: '🔥',
      description: 'デートの成功率を劇的に上げるノウハウを詰め込みました。次のデートから使えます。',
    },
    10: {
      emoji: '👑',
      description: 'あなた専用の恋愛コンサルをご用意しました。個別にアドバイスいたします。',
    },
  };

  const msg = thresholdMessages[threshold] || { emoji: '🎁', description: '特典をお届けします。' };

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `${msg.emoji} 紹介${threshold}人達成！「${bonusName}」をプレゼント`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background: #0f0f1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; line-height: 1.6; color: #e0e0e0;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">

            <!-- ヘッダー -->
            <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <div style="font-size: 48px; margin-bottom: 8px;">${msg.emoji}</div>
              <h1 style="margin: 0 0 8px 0; font-size: 24px; color: #fff; font-weight: 700;">紹介${threshold}人達成おめでとう！</h1>
              <p style="margin: 0; font-size: 15px; color: rgba(255,255,255,0.9);">特典をお届けします</p>
            </div>

            <!-- メインコンテンツ -->
            <div style="background: #16162a; padding: 32px; border-radius: 0 0 12px 12px;">

              <p style="margin: 0 0 20px 0; font-size: 15px; color: #ccc;">
                SendRightの紹介プログラムで<strong style="color: #f5576c;">${threshold}人</strong>の紹介を達成しました！
              </p>

              <!-- 特典ボックス -->
              <div style="background: linear-gradient(135deg, rgba(245, 87, 108, 0.15) 0%, rgba(240, 147, 251, 0.15) 100%); border: 1px solid rgba(245, 87, 108, 0.3); border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
                <p style="margin: 0 0 8px 0; font-size: 12px; color: #f093fb; text-transform: uppercase; letter-spacing: 2px;">YOUR BONUS</p>
                <h2 style="margin: 0 0 12px 0; font-size: 22px; color: #fff; font-weight: 700;">${bonusName}</h2>
                <p style="margin: 0; font-size: 14px; color: #ccc;">${msg.description}</p>
              </div>

              <p style="margin: 20px 0; font-size: 14px; color: #999;">
                特典の詳細は別途メールでお送りします。お届けまで少々お待ちください。
              </p>

              <!-- CTA -->
              <div style="text-align: center; margin: 28px 0;">
                <a href="${BASE_URL}" style="display: inline-block; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: #fff; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 600;">SendRightを使う</a>
              </div>

              <!-- 次の目標 -->
              ${threshold < 10 ? `
              <div style="background: rgba(102, 126, 234, 0.1); border: 1px solid rgba(102, 126, 234, 0.3); border-radius: 8px; padding: 16px; margin: 24px 0; text-align: center;">
                <p style="margin: 0; font-size: 13px; color: #999;">
                  次の目標: <strong style="color: #667eea;">${threshold === 3 ? '5人' : '10人'}達成</strong>でさらに豪華な特典が！
                </p>
              </div>
              ` : ''}

              <p style="margin: 24px 0 0 0; font-size: 13px; color: #666;">
                紹介を続けて、さらにお得に使いましょう！<br>
                SendRightチーム
              </p>
            </div>

            <!-- フッター -->
            <div style="text-align: center; margin-top: 24px; padding: 0 20px;">
              <p style="margin: 0; font-size: 11px; color: #444;">&copy; ${new Date().getFullYear()} SendRight. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log(`Referral bonus email sent to ${email} for threshold ${threshold}`);
  } catch (error) {
    console.error(`Failed to send referral bonus email to ${email}:`, error);
    throw error;
  }
}

// 解約メール送信
export async function sendCancellationEmail(email: string) {
  if (!resend || !process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not set, skipping email send');
    return;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'SendRightのサブスクリプション解約について',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f5f5f5; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #ffffff; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>サブスクリプション解約のお知らせ</h1>
            </div>
            <div class="content">
              <p>こんにちは、</p>
              <p>SendRightのサブスクリプションが解約されました。</p>
              <p>またのご利用をお待ちしております。いつでも再開できますので、お気軽にご連絡ください。</p>
              <div style="text-align: center;">
                <a href="${BASE_URL}/subscribe" class="button">再開する</a>
              </div>
              <p>ご利用ありがとうございました。</p>
              <p>SendRightチーム</p>
            </div>
            <div class="footer">
              <p>このメールは自動送信されています。</p>
              <p>© ${new Date().getFullYear()} SendRight. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log('Cancellation email sent to:', email);
  } catch (error) {
    console.error('Failed to send cancellation email:', error);
    throw error;
  }
}
