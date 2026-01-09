import { NextRequest, NextResponse } from 'next/server';
import { detectAnomalousPattern, getClientIP } from '@/lib/security';
import { verifyToken, findUserById, checkSubscription } from '@/lib/auth';

/**
 * アクセス拒否時のHTMLページを生成
 */
function getAccessDeniedHTML(message: string, showUtageOption: boolean = true, memberPageUrl?: string): string {
  // 会員ページURLを取得（環境変数から、またはデフォルト値）
  const utageMemberUrl = memberPageUrl || process.env.UTAGE_MEMBER_URL || 'https://utage-system.com/members/prUSVju86L5m/home';
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
    ${showUtageOption ? `
    <div class="highlight">
      <strong>💡 解決方法</strong><br>
      ログイン済みで課金期間中でもアクセスできない場合は、会員ページから入り直してください。
    </div>
    <div class="instruction">
      <div class="instruction-title">会員ページから入り直す方法</div>
      <ol class="instruction-steps">
        <li>会員ページにアクセスしてください</li>
        <li>会員ページから「SendRightにログイン」をクリックしてください</li>
        <li>ログイン後、このページに再度アクセスしてください</li>
      </ol>
    </div>
    ` : ''}
    <div class="button-group">
      ${showUtageOption ? `<a href="${utageMemberUrl}" target="_blank" class="button">会員ページにアクセス</a>` : ''}
      ${showUtageOption ? '<a href="#" onclick="window.history.back(); return false;" class="button button-secondary">前のページに戻る</a>' : ''}
      <a href="/" class="button">トップページに戻る</a>
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
  
  // 異常検出を実行（ログイン関連のパスは除外）
  if (!pathname.includes('/login-utage') && !pathname.includes('/auth/login-utage')) {
    const anomalyCheck = detectAnomalousPattern(userId, pathname, timestamp, clientIP);
    if (anomalyCheck.isAnomalous) {
      console.error('異常なアクセスパターンを検出:', {
        userId,
        pathname,
        ip: clientIP,
        reason: anomalyCheck.reason,
        timestamp: new Date(timestamp).toISOString(),
      });
      
      // 異常なアクセスの場合は、セッションを無効化
      response.cookies.delete('utage_access');
      response.cookies.delete('utage_access_timestamp');
      
      // 異常検出の場合は403を返す（開発環境では警告のみ）
      if (process.env.NODE_ENV === 'production') {
        return new NextResponse(getAccessDeniedHTML('異常なアクセスパターンが検出されました。会員ページから再度ログインしてください。', true), {
          status: 403,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }
    }
  }

  // ngrokの警告ページをスキップするためのヘッダーを設定
  response.headers.set('ngrok-skip-browser-warning', 'true');

  // Utageからのアクセスかチェック（すべてのページで）
  const referer = request.headers.get('referer') || request.headers.get('referrer');
  const origin = request.headers.get('origin');
  const allowedUtageDomains = [
    'utage-system.com',
    'utage.jp',
    'utage.co.jp',
  ];

  const isFromUtage = (referer && allowedUtageDomains.some(domain => referer.includes(domain))) ||
                      (origin && allowedUtageDomains.some(domain => origin.includes(domain)));

  // セッション情報をチェック（クッキーから）
  const utageSession = request.cookies.get('utage_access')?.value === 'true';
  const existingSession = request.cookies.get('utage_access_timestamp');
  const sessionTimestamp = existingSession ? parseInt(existingSession.value, 10) : null;
  const now = Date.now();
  const sessionMaxAge = 24 * 60 * 60 * 1000; // 1日
  
  // セッションが有効かチェック（セッションクッキーがあり、タイムスタンプが有効期限内）
  const isValidSession = utageSession && sessionTimestamp && (now - sessionTimestamp < sessionMaxAge);

  // Utageからのアクセスか、有効なセッション情報がある場合
  // セッションがあれば、referer/originチェックをスキップしてURLから直接アクセス可能
  const hasUtageAccess = isFromUtage || isValidSession;

  // Utageからのアクセスまたは有効なセッションがある場合、セッション情報を更新
  if (hasUtageAccess) {
    response.headers.set('x-utage-access', 'true');
    
    if (isValidSession) {
      // 有効なセッションがある場合は、セッションを延長
      response.cookies.set('utage_access', 'true', {
        maxAge: 24 * 60 * 60, // 1日
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
      
      // セッションタイムスタンプを更新（アクティビティがある場合は延長）
      response.cookies.set('utage_access_timestamp', now.toString(), {
        maxAge: 24 * 60 * 60, // 1日
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
      
      console.log('有効なセッションでアクセス:', { 
        pathname: request.nextUrl.pathname,
        sessionAge: Math.floor((now - sessionTimestamp!) / 1000 / 60) + '分',
        accessType: 'direct_url' // URLから直接アクセス
      });
    } else if (isFromUtage) {
      // Utageからの新規アクセスの場合、セッションを設定
      response.cookies.set('utage_access', 'true', {
        maxAge: 24 * 60 * 60, // 1日
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
      
      response.cookies.set('utage_access_timestamp', now.toString(), {
        maxAge: 24 * 60 * 60, // 1日
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      });
      
      console.log('Utageからの新規アクセス: セッションを設定', { 
        referer, 
        origin, 
        pathname: request.nextUrl.pathname,
        accessType: 'from_utage'
      });
    }
  } else if (utageSession && sessionTimestamp) {
    // セッションが期限切れの場合は削除
    response.cookies.delete('utage_access');
    response.cookies.delete('utage_access_timestamp');
    response.cookies.delete('userId');
    console.log('セッション期限切れ: クッキーを削除', { 
      pathname: request.nextUrl.pathname,
      sessionAge: Math.floor((now - sessionTimestamp) / 1000 / 60) + '分'
    });
  }

  // /login-utage と /auth/login-utage へのアクセスは常に許可（ログインページは誰でもアクセス可能）
  if (request.nextUrl.pathname === '/login-utage' || request.nextUrl.pathname === '/auth/login-utage') {
    console.log('ログインページへのアクセスを許可:', { 
      pathname: request.nextUrl.pathname,
      referer,
      origin
    });
    return response;
  }

  // 認証が必要なページ（メインアプリ）
  const protectedPaths = ['/', '/help', '/subscribe'];
  const isProtectedPath = protectedPaths.some(path => request.nextUrl.pathname === path);
  
  // 保護されたページへのアクセスにはトークンまたはUtageアクセスフラグが必要
  if (isProtectedPath) {
    const authToken = request.cookies.get('token')?.value;
    const hasUtageAccess = request.cookies.get('utage_access')?.value === 'true';
    
    // トークンもUtageアクセスもない場合はアクセス拒否
    if (!authToken && !hasUtageAccess) {
      console.warn('認証なしでの保護ページへのアクセスを拒否:', {
        pathname: request.nextUrl.pathname,
        hasToken: !!authToken,
        hasUtageAccess,
      });
      
      return new NextResponse(getAccessDeniedHTML('このアプリへのアクセスにはログインが必要です。メールのリンクからログインしてください。', true), {
        status: 403,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
    
    console.log('認証OK: アクセス許可', {
      pathname: request.nextUrl.pathname,
      hasToken: !!authToken,
      hasUtageAccess,
    });
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
