import { NextRequest, NextResponse } from 'next/server';
import { createOrUpdateUserFromUtage, generateToken } from '@/lib/auth';
import { checkSubscriptionStatus, getCustomerByEmail } from '@/lib/stripe';
import crypto from 'crypto';

// ワンタイムトークンの管理（インメモリ）
// 本番環境では、Redisなどの共有キャッシュを使用することを推奨
const usedTokens = new Map<string, number>(); // tokenHash -> timestamp

// トークンのハッシュを計算
function getTokenHash(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// レート制限の管理（インメモリ）
// 本番環境では、Redisなどの共有キャッシュを使用することを推奨
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// レート制限をチェック
function checkRateLimit(identifier: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);
  
  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs });
    return true;
  }
  
  if (record.count >= maxRequests) {
    return false;
  }
  
  record.count++;
  return true;
}

// 定数時間比較（タイミングアタック対策）
function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// メールアドレスをマスク
function maskEmail(email: string): string {
  if (!email || email.length < 3) return '***';
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const maskedLocal = local.substring(0, 2) + '***';
  return `${maskedLocal}@${domain}`;
}

// メールアドレスの形式を検証
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

export async function POST(request: NextRequest) {
  try {
    // リクエスト元を確認
    const referer = request.headers.get('referer') || request.headers.get('referrer');
    const origin = request.headers.get('origin');
    const hostname = request.nextUrl.hostname;
    
    // 許可するドメイン
    const allowedUtageDomains = [
      'utage-system.com',
      'utage.jp',
      'utage.co.jp',
    ];
    const allowedAppDomains = [
      'app.sendright.jp',
      'sendright.jp',
    ];

    // Utageからのアクセスかチェック
    const isFromUtage = (referer && allowedUtageDomains.some(domain => referer.includes(domain))) ||
                        (origin && allowedUtageDomains.some(domain => origin.includes(domain)));
    
    // アプリ自身からのアクセスかチェック（ログインページからのAPI呼び出し）
    const isFromApp = (referer && allowedAppDomains.some(domain => referer.includes(domain))) ||
                      (origin && allowedAppDomains.some(domain => origin.includes(domain)));

    // 開発環境では、ngrok経由のアクセスを許可
    const isDevMode = process.env.DEV_MODE === 'true' || process.env.NODE_ENV === 'development';
    const isNgrok = hostname.includes('ngrok-free.app') || 
                    hostname.includes('ngrok.io') ||
                    hostname === 'localhost';
    
    if (isDevMode && isNgrok) {
      // 開発環境でngrok経由の場合は許可（refererがない場合でも）
      console.log('開発環境: /api/auth/utage-loginへのngrok経由アクセスを許可:', { 
        hostname,
        referer,
        origin
      });
    } else if (!isFromUtage && !isFromApp) {
      // Utageまたはアプリ以外からのアクセスは拒否
      console.warn('許可されていないアクセスを拒否:', { referer, origin, hostname });
      return NextResponse.json(
        { error: 'このAPIへのアクセスは許可されていません' },
        { status: 403 }
      );
    }

    const { email, customerId, token } = await request.json();

    // emailは必須、tokenはオプション（Utage経由のログインではURLパラメータのemailのみ使用）
    if (!email) {
      const isDevelopment = process.env.NODE_ENV === 'development' || process.env.DEV_MODE === 'true';
      return NextResponse.json(
        { error: isDevelopment ? 'Email is required' : 'Authentication failed' },
        { status: 400 }
      );
    }

    // メールアドレスの形式を検証
    if (!isValidEmail(email)) {
      const isDevelopment = process.env.NODE_ENV === 'development' || process.env.DEV_MODE === 'true';
      return NextResponse.json(
        { error: isDevelopment ? 'Invalid email format' : 'Authentication failed' },
        { status: 400 }
      );
    }

    // レート制限をチェック
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const rateLimitKey = `login:${clientIp}`;
    const maxRequests = 10; // 1分間に10回まで
    const windowMs = 60 * 1000; // 1分
    
    if (!checkRateLimit(rateLimitKey, maxRequests, windowMs)) {
      console.warn('Rate limit exceeded:', maskEmail(email), { clientIp });
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // トークンの検証（tokenがある場合のみ）
    // Utage経由のログインではtokenがない場合もある（メールアドレスのみで認証）
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.DEV_MODE === 'true';
    const now = Date.now();
    
    if (token) {
      try {
        let tokenData: { email: string; timestamp: number };
        
        // まず、base64デコードを試行
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        
        try {
          // 形式1: { data: "...", signature: "..." } 形式（本番環境用）
          const parsed = JSON.parse(decoded);
          if (parsed.data && parsed.signature) {
            // 開発環境では、署名チェックをスキップ
            if (!isDevelopment) {
              // 本番環境では、HMAC署名の検証を厳密に行う
              const secret = process.env.UTAGE_TOKEN_SECRET || 'your-secret-key';
              const expectedSignature = crypto
                .createHmac('sha256', secret)
                .update(parsed.data)
                .digest('hex');
              
              if (!constantTimeEquals(parsed.signature, expectedSignature)) {
                console.warn('Invalid token signature:', maskEmail(email), {
                  received: parsed.signature.substring(0, 20) + '...',
                });
                return NextResponse.json(
                  { error: isDevelopment ? 'Invalid token' : 'Authentication failed' },
                  { status: 401 }
                );
              }
            }
            
            // dataフィールドからトークンデータを取得
            tokenData = JSON.parse(parsed.data);
          } else {
            // 形式2: { email: "...", timestamp: ... } 形式（開発環境用の簡易形式）
            tokenData = parsed;
          }
        } catch (parseError) {
          // base64デコード後のJSONパースに失敗した場合
          console.error('Failed to parse token:', maskEmail(email));
          return NextResponse.json(
            { error: isDevelopment ? 'Invalid token format' : 'Authentication failed' },
            { status: 401 }
          );
        }

        // トークンの有効期限を確認（開発環境では24時間、本番環境では5分）
        const maxAge = isDevelopment ? 24 * 60 * 60 * 1000 : 5 * 60 * 1000;
        const tokenAge = now - tokenData.timestamp;

        if (tokenAge > maxAge) {
          console.warn('Token expired:', maskEmail(email), { tokenAge, maxAge });
          return NextResponse.json(
            { error: isDevelopment ? 'Token expired' : 'Authentication failed' },
            { status: 401 }
          );
        }

        // メールアドレスの一致を確認
        if (tokenData.email !== email) {
          console.warn('Email mismatch:', { 
            provided: maskEmail(email), 
            token: maskEmail(tokenData.email) 
          });
          return NextResponse.json(
            { error: isDevelopment ? 'Email mismatch' : 'Authentication failed' },
            { status: 401 }
          );
        }
        
        console.log('Token verification passed:', maskEmail(email), {
          isDevelopment,
          tokenFormat: tokenData.email ? 'simple' : 'signed',
        });
        
        // ワンタイムトークンの検証：使用済みかどうかを確認
        const tokenHash = getTokenHash(token);
        const usedAt = usedTokens.get(tokenHash);
        
        if (usedAt) {
          // 24時間以上経過したトークンは削除
          const tokenMaxAge = 24 * 60 * 60 * 1000; // 24時間
          if (now - usedAt > tokenMaxAge) {
            usedTokens.delete(tokenHash);
          } else {
            console.warn('Token already used:', maskEmail(email), { tokenHash: tokenHash.substring(0, 16) + '...' });
            return NextResponse.json(
              { error: isDevelopment ? 'Token already used. Please generate a new link from Utage.' : 'Authentication failed' },
              { status: 401 }
            );
          }
        }
        
        // トークンを使用済みとしてマーク（ワンタイムトークン）
        usedTokens.set(tokenHash, now);
        console.log('Token marked as used:', maskEmail(email), { tokenHash: tokenHash.substring(0, 16) + '...' });
        
        // メモリリークを防ぐため、古いトークンハッシュを定期的にクリア
        if (usedTokens.size > 1000) {
          const tokenMaxAge = 24 * 60 * 60 * 1000; // 24時間
          const tokensToDelete: string[] = [];
          usedTokens.forEach((timestamp, hash) => {
            if (now - timestamp > tokenMaxAge) {
              tokensToDelete.push(hash);
            }
          });
          tokensToDelete.forEach(hash => usedTokens.delete(hash));
        }
      } catch (error) {
        console.error('Token verification failed:', maskEmail(email));
        return NextResponse.json(
          { error: isDevelopment ? 'Invalid token format' : 'Authentication failed' },
          { status: 401 }
        );
      }
    } else {
      // tokenがない場合（Utage経由のメールアドレスのみでのログイン）
      // セキュリティはリファラーチェックとレート制限で担保
      console.log('Utage email-only login:', maskEmail(email), {
        referer: request.headers.get('referer'),
        origin: request.headers.get('origin'),
      });
    }

    // Stripe顧客IDを取得
    let stripeCustomerId = customerId;
    let subscriptionStatus = { isActive: false };

    if (isDevelopment) {
      // 開発環境: サブスクリプション確認をスキップ
      subscriptionStatus = { isActive: true };
      // ダミーの顧客IDを設定
      if (!stripeCustomerId) {
        stripeCustomerId = `dev_customer_${Date.now()}`;
      }
    } else {
      // 本番環境: Stripeでサブスクリプション状態を確認
      if (!stripeCustomerId) {
        const customer = await getCustomerByEmail(email);
        if (!customer) {
          return NextResponse.json(
            { error: 'Stripe customer not found' },
            { status: 404 }
          );
        }
        stripeCustomerId = customer.id;
      }

      // Stripeのサブスクリプション状態を確認
      subscriptionStatus = await checkSubscriptionStatus(stripeCustomerId);
      if (!subscriptionStatus.isActive) {
        return NextResponse.json(
          { error: 'Subscription is not active' },
          { status: 403 }
        );
      }
    }

    // ユーザーを作成または更新
    const user = await createOrUpdateUserFromUtage(
      email,
      stripeCustomerId,
      subscriptionStatus.isActive
    );

    // トークンを生成
    const authToken = generateToken(user.id);

    // レスポンスを作成
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        isSubscribed: user.isSubscribed,
      },
      token: authToken,
    });

    // セッションクッキーを設定（ログイン成功時）
    const now = Date.now();
    response.cookies.set('utage_access', 'true', {
      maxAge: 24 * 60 * 60, // 1日
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    
    // セッションタイムスタンプを保存
    response.cookies.set('utage_access_timestamp', now.toString(), {
      maxAge: 24 * 60 * 60, // 1日
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    
    // ユーザーIDをクッキーに保存（異常検出用）
    response.cookies.set('userId', user.id, {
      maxAge: 24 * 60 * 60, // 1日
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    
    // プラン情報をクッキーに保存（有料会員かどうかを判定するため）
    response.cookies.set('user_plan', user.isSubscribed ? 'premium' : 'free', {
      maxAge: 24 * 60 * 60, // 1日
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    console.log('ログイン成功: セッションクッキーを設定', {
      userId: user.id,
      email: maskEmail(email),
      isSubscribed: user.isSubscribed,
    });

    return response;
  } catch (error) {
    console.error('Utage login error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Login failed' },
      { status: 500 }
    );
  }
}
