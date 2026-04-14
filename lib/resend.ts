import { Resend } from 'resend';
import { AOPUA_TEMPLATES, wrapAopuaEmail } from '@/lib/email-templates-aopua';

// Resendインスタンス（環境変数がない場合はnull）
const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'SendRight <noreply@sendright.jp>';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sendright.jp';

type StandardStepEmailType = 'welcome' | 'day1' | 'day3' | 'day7' | 'day14' | 'day30';
export type StepEmailType = StandardStepEmailType | keyof typeof AOPUA_TEMPLATES;

function getResendClient(options?: { throwOnMissing?: boolean }): Resend | null {
  if (resend && process.env.RESEND_API_KEY) {
    return resend;
  }

  const message = 'RESEND_API_KEY is not set';
  if (options?.throwOnMissing) {
    throw new Error(message);
  }

  console.warn(`${message}, skipping email send`);
  return null;
}

function buildFromEmail(fromName?: string): string {
  if (!fromName) return FROM_EMAIL;
  const match = FROM_EMAIL.match(/<([^>]+)>/);
  const email = match ? match[1] : FROM_EMAIL;
  return `${fromName} <${email}>`;
}

// ウェルカムメール送信
export async function sendWelcomeEmail(
  email: string,
  plan: 'monthly' | 'yearly',
  initialPassword?: string
) {
  const resendClient = getResendClient();
  if (!resendClient) {
    return;
  }

  const planName = plan === 'monthly' ? '月額プラン' : '年額プラン';
  
  try {
    await resendClient.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'SendRightへようこそ！',
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
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>SendRightへようこそ！</h1>
            </div>
            <div class="content">
              <p>こんにちは、</p>
              <p>SendRightへのご登録ありがとうございます！</p>
              <p>あなたの${planName}が有効になりました。今すぐAI返信生成を始めましょう。</p>
              ${initialPassword ? `
              <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="margin: 0 0 8px; font-weight: 600;">初期ログイン情報</p>
                <p style="margin: 0;">メールアドレス: ${email}</p>
                <p style="margin: 6px 0 0;">初期パスワード: <strong>${initialPassword}</strong></p>
              </div>
              <p style="font-size: 12px; color: #666;">※ログイン後、プロフィール画面でパスワードの変更を推奨します</p>
              ` : ''}
              <div style="text-align: center;">
                <a href="${BASE_URL}" class="button">SendRightを始める</a>
              </div>
              <p>何かご質問がございましたら、お気軽にお問い合わせください。</p>
              <p>それでは、素敵な会話を！</p>
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

    console.log('Welcome email sent to:', email);
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    throw error;
  }
}

// ステップメール送信
export async function sendStepEmail(
  email: string,
  emailType: StepEmailType
) {
  const resendClient = getResendClient();
  if (!resendClient) {
    return;
  }

  const standardTemplates: Record<StandardStepEmailType, { subject: string; content: string }> = {
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

  let subject = '';
  let html = '';
  let from = FROM_EMAIL;

  if (emailType in standardTemplates) {
    const template = standardTemplates[emailType as StandardStepEmailType];
    subject = template.subject;
    html = `
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
      `;
  } else if (Object.prototype.hasOwnProperty.call(AOPUA_TEMPLATES, emailType)) {
    const template = AOPUA_TEMPLATES[emailType as keyof typeof AOPUA_TEMPLATES];
    subject = template.subject;
    html = wrapAopuaEmail(template.body);
    from = buildFromEmail(template.fromName);
  } else {
    console.error(`Unknown email type: ${emailType}`);
    return;
  }

  try {
    await resendClient.emails.send({
      from,
      to: email,
      subject,
      html,
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
  const resendClient = getResendClient();
  if (!resendClient) {
    return;
  }

  const subject = `紹介${threshold}人達成！特典「${bonusName}」のご案内`;

  try {
    await resendClient.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="margin: 0 0 12px;">紹介${threshold}人達成おめでとうございます！</h2>
            <p style="margin: 0 0 12px;">特典「${bonusName}」をご用意しました。</p>
            <p style="margin: 0 0 20px;">詳細は別途ご案内します。今後ともSendRightをよろしくお願いします。</p>
            <div style="text-align: center;">
              <a href="${BASE_URL}" style="display: inline-block; background: #667eea; color: #fff; padding: 12px 28px; text-decoration: none; border-radius: 6px;">SendRightを開く</a>
            </div>
            <p style="margin-top: 30px; font-size: 12px; color: #999;">© ${new Date().getFullYear()} SendRight</p>
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
  const resendClient = getResendClient({ throwOnMissing: true });

  try {
    await resendClient.emails.send({
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
