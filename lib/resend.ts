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

  const loginSection = initialPassword
    ? `
      <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h3 style="margin: 0 0 10px 0; color: #856404;">ログイン情報</h3>
        <p style="margin: 5px 0;"><strong>メールアドレス:</strong> ${email}</p>
        <p style="margin: 5px 0;"><strong>初期パスワード:</strong> <code style="background: #f8f9fa; padding: 2px 8px; border-radius: 4px; font-size: 16px; letter-spacing: 1px;">${initialPassword}</code></p>
        <p style="margin: 10px 0 0 0; font-size: 13px; color: #856404;">※ セキュリティのため、ログイン後にパスワードを変更することをお勧めします。</p>
      </div>
    `
    : '';

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'SendRightへようこそ！ ログイン情報のお知らせ',
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
              <p>あなたの${planName}が有効になりました。</p>
              ${loginSection}
              <div style="text-align: center;">
                <a href="${BASE_URL}/login" class="button">SendRightにログインする</a>
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
