import { NextRequest, NextResponse } from 'next/server';
import { detectAnomalousPattern, getClientIP } from '@/lib/security';
import { verifyToken, findUserById, checkSubscription } from '@/lib/auth';

/**
 * アクセス拒否時のHTMLページを生成
 */
function getAccessDeniedHTML(message: string, showLoginOption: boolean = true): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>アクセスできません - SendRight</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      color: #333;
    }
    .container {
      background: white;
      border-radius: 16px;
      padding: 48px;
      max-width: 500px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      text-align: center;
    }
    .icon {
      font-size: 64px;
      margin-bottom: 24px;
    }
    h1 {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 16px;
      color: #1a1a1a;
    }
    .message {
      font-size: 16px;
      color: #666;
      margin-bottom: 32px;
      line-height: 1.6;
    }
    .instruction {
      background: #f5f5f5;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 32px;
      text-align: left;
    }
    .instruction-title {
      font-size: 14px;
      font-weight: 600;
      color: #333;
      margin-bottom: 12px;
    }
    .instruction-steps {
      list-style: none;
      padding: 0;
    }
    .instruction-steps li {
      font-size: 14px;
      color: #666;
      margin-bottom: 8px;
      padding-left: 24px;
      position: relative;
    }
    .instruction-steps li:before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #667eea;
      font-weight: bold;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 14px 32px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: 16px;
      transition: transform 0.2s, box-shadow 0.2s;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      margin: 8px;
    }
    .button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
    }
    .button:active {
      transform: translateY(0);
    }
    .button-secondary {
      background: #f5f5f5;
      color: #333;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .button-secondary:hover {
      background: #e5e5e5;
    }
    .button-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 24px;
    }
    .footer {
      margin-top: 32px;
      font-size: 12px;
      color: #999;
    }
    .highlight {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 12px;
      margin: 16px 0;
      border-radius: 4px;
      font-size: 14px;
      color: #856404;
      text-align: left;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">🔒</div>
    <h1>アクセスできません</h1>
    <p class="message">${message}</p>
    ${showLoginOption ? `
    <div class="highlight">
      <strong>💡 解決方法</strong><br>
      ログインしてからアクセスしてください。
    </div>
    ` : ''}
    <div class="button-group">
      ${showLoginOption ? '<a href="/login" class="button">ログインする</a>' : ''}
      ${showLoginOption ? '<a href="/subscribe" class="button button-secondary">会員登録する</a>' : ''}
      <a href="/" class="button button-secondary">トップページに戻る</a>
    </div>
    <div class="footer">
      お手数をおかけして申し訳ございません
    </div>
  </div>
</body>
</html>`;
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // 開発環境では全ての認証をスキップ
  if (process.env.NODE_ENV === 'development') {
    return response;
  }
  
  // 異常検出のための情報を取得
  const clientIP = getClientIP(request.headers);
  const userId = request.cookies.get('userId')?.value || 'anonymous';
  const pathname = request.nextUrl.pathname;
  const timestamp = Date.now();
  
  // 異常検出を実行
  const anomalyCheck = detectAnomalousPattern(userId, pathname, timestamp, clientIP);
  if (anomalyCheck.isAnomalous) {
    console.error('異常なアクセスパターンを検出:', {
      userId,
      pathname,
      ip: clientIP,
      reason: anomalyCheck.reason,
      timestamp: new Date(timestamp).toISOString(),
    });
    
    // 異常検出の場合は403を返す（開発環境では警告のみ）
    if (process.env.NODE_ENV === 'production') {
      return new NextResponse(getAccessDeniedHTML('異常なアクセスパターンが検出されました。再度ログインしてください。', true), {
        status: 403,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
  }

  // ngrokの警告ページをスキップするためのヘッダーを設定
  response.headers.set('ngrok-skip-browser-warning', 'true');

  // 公開ページは誰でもアクセス可能
  const publicPaths = ['/', '/login', '/subscribe', '/purchase-complete'];
  const isPublicPath = publicPaths.some(path => request.nextUrl.pathname === path);
  
  if (isPublicPath) {
    console.log('公開ページへのアクセスを許可:', request.nextUrl.pathname);
    return response;
  }
  
  // それ以外の保護されたページ（/helpなど）
  const protectedPaths = ['/help', '/mypage'];
  const isProtectedPath = protectedPaths.some(path => request.nextUrl.pathname === path);
  
  // 保護されたページへのアクセスにはトークンが必要
  if (isProtectedPath) {
    const authToken = request.cookies.get('token')?.value;
    
    // トークンがない場合はアクセス拒否
    if (!authToken) {
      console.warn('認証なしでの保護ページへのアクセスを拒否:', {
        pathname: request.nextUrl.pathname,
        hasToken: !!authToken,
      });
      
      return new NextResponse(getAccessDeniedHTML('このページへのアクセスにはログインが必要です。', true), {
        status: 403,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
    
    console.log('認証OK: アクセス許可', {
      pathname: request.nextUrl.pathname,
      hasToken: !!authToken,
    });
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
