import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, findUserById, checkSubscription, canUseService, incrementUsageCount, getUsageInfo, decrementUsageCount } from '@/lib/auth';
import { generateResponse } from '@/lib/ai';
import { checkRateLimit, verifyRequestSignature, verifyRequestIntegrity, checkIPWhitelist, detectAnomalousPattern, RATE_LIMIT_MAX_REQUESTS } from '@/lib/security';
import { z } from 'zod';

const generateSchema = z.object({
  herMessage: z.string().min(1, 'メッセージを入力してください'),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional(),
  fullConversationText: z.string().optional(), // 画像から抽出した会話全体のテキスト
  profileContext: z.string().optional(), // 前提情報（名前、年齢、関係性など）
});

export async function POST(request: NextRequest) {
  try {
    // 開発環境では認証をスキップ
    const isDevMode = process.env.DEV_MODE === 'true' ||
                      request.nextUrl.hostname === 'localhost' ||
                      request.nextUrl.hostname.includes('ngrok');

    // 本番環境でのみUtageからのアクセスのみを許可
    if (!isDevMode) {
      const referer = request.headers.get('referer') || request.headers.get('referrer');
      const origin = request.headers.get('origin');
      const allowedUtageDomains = [
        'utage-system.com',
        'utage.jp',
        'utage.co.jp',
      ];

      const isFromUtage = (referer && allowedUtageDomains.some(domain => referer.includes(domain))) ||
                          (origin && allowedUtageDomains.some(domain => origin.includes(domain)));

      // Utage以外からのアクセスを拒否（Utageからのアクセスのみ許可）
      if (!isFromUtage) {
        console.warn('Utage以外からのAPIアクセスを拒否:', { referer, origin, hostname: request.nextUrl.hostname });
        return NextResponse.json(
          { error: 'このAPIへのアクセスはUtageからのみ許可されています' },
          { status: 403 }
        );
      }

      // IPアドレスのホワイトリストをチェック（開発環境ではスキップ）
      const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                       request.headers.get('x-real-ip') || 
                       request.ip || 
                       'unknown';
      
      if (!checkIPWhitelist(clientIP)) {
        console.warn('IPホワイトリストに含まれていないIPからのアクセスを拒否:', { ip: clientIP });
        return NextResponse.json(
          { error: 'このIPアドレスからのアクセスは許可されていません' },
          { status: 403 }
        );
      }
    }
    
    if (!isDevMode) {
      // Check authentication
      const authHeader = request.headers.get('authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: '認証が必要です' },
          { status: 401 }
        );
      }

      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      if (!decoded) {
        return NextResponse.json(
          { error: '無効なトークンです' },
          { status: 401 }
        );
      }

      const user = await findUserById(decoded.userId);
      if (!user) {
        return NextResponse.json(
          { error: 'ユーザーが見つかりません' },
          { status: 404 }
        );
      }

      // Utageからのログインで作成されたユーザーのみ許可
      if (!user.isUtageUser) {
        console.warn('Utage以外からのログインで作成されたユーザーのアクセスを拒否:', { userId: user.id, email: user.email });
        return NextResponse.json(
          { error: 'このアプリへのアクセスはUtageからのログインのみ許可されています' },
          { status: 403 }
        );
      }

      // Check subscription
      const hasActiveSubscription = checkSubscription(user);
      if (!hasActiveSubscription) {
        return NextResponse.json(
          { error: 'この機能を使用するには有効なサブスクリプションが必要です' },
          { status: 403 }
        );
      }

      // Check daily usage limit (1日50回まで - Groq API制限を考慮)
      // AI生成前に使用回数をチェック（確実に制限を適用）
      const usageCheck = canUseService(user.id);
      if (!usageCheck.canUse) {
        const usageInfo = getUsageInfo(user.id);
        return NextResponse.json(
          { 
            error: `1日の使用回数制限（${usageInfo.limit}回）に達しました。明日またお試しください。`,
            usageInfo 
          },
          { status: 429 }
        );
      }

      // レート制限をチェック（1分間に3回まで - Groq API制限を考慮）
      const rateLimit = checkRateLimit(user.id);
      if (!rateLimit.allowed) {
        const resetTime = new Date(rateLimit.resetAt).toISOString();
        return NextResponse.json(
          { 
            error: `レート制限に達しました。${resetTime}までお待ちください。`,
            rateLimit: {
              remaining: rateLimit.remaining,
              resetAt: resetTime,
            }
          },
          { 
            status: 429,
            headers: {
              'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
              'X-RateLimit-Remaining': rateLimit.remaining.toString(),
              'X-RateLimit-Reset': rateLimit.resetAt.toString(),
            }
          }
        );
      }

      // 異常なアクセスパターンを検出
      if (detectAnomalousPattern(user.id, request.nextUrl.pathname, Date.now())) {
        console.warn('異常なアクセスパターンを検出:', { userId: user.id, path: request.nextUrl.pathname });
        return NextResponse.json(
          { error: '異常なアクセスパターンが検出されました' },
          { status: 403 }
        );
      }

      // 使用回数を事前にカウント（AI生成前に）
      // これにより、コピー&ペーストや開発者ツールでの直接呼び出しでも確実にカウントされる
      incrementUsageCount(user.id);
    }

    // リクエストボディを取得（署名検証のため、文字列として保持）
    const rawBody = await request.text();
    const body = JSON.parse(rawBody);

    // リクエストの署名を検証（オプション、Utage側で署名を送信する場合）
    const signature = request.headers.get('x-utage-signature');
    const timestamp = request.headers.get('x-utage-timestamp');
    const contentHash = request.headers.get('x-content-hash');

    if (signature && timestamp) {
      if (!verifyRequestSignature(rawBody, signature, timestamp)) {
        console.warn('リクエストの署名検証に失敗:', { signature, timestamp });
        return NextResponse.json(
          { error: 'リクエストの署名が無効です' },
          { status: 403 }
        );
      }
    }

    // リクエストの整合性をチェック（オプション）
    if (contentHash) {
      if (!verifyRequestIntegrity(rawBody, contentHash)) {
        console.warn('リクエストの整合性チェックに失敗:', { contentHash });
        return NextResponse.json(
          { error: 'リクエストの整合性が確認できませんでした' },
          { status: 403 }
        );
      }
    }
    const { herMessage, conversationHistory, fullConversationText, profileContext } = generateSchema.parse(body);

    // Generate AI response
    let result;
    let usageInfo = null;
    
    try {
      result = await generateResponse({
        herMessage,
        conversationHistory,
        fullConversationText, // 画像から抽出した会話全体のテキストを渡す
        profileContext, // 前提情報を渡す
      });

      // 使用回数情報を取得（開発環境ではスキップ）
      if (!isDevMode) {
        const authHeader = request.headers.get('authorization');
        if (authHeader?.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          const decoded = verifyToken(token);
          if (decoded) {
            const user = await findUserById(decoded.userId);
            if (user) {
              usageInfo = getUsageInfo(user.id);
            }
          }
        }
      }
    } catch (error) {
      // AI生成に失敗した場合、使用回数をロールバック（開発環境ではスキップ）
      // ただし、レートリミットエラーの場合は使用回数をカウントしない（ユーザーに優しい）
      const isRateLimitError = error instanceof Error && 
                               (error.message.includes('レートリミット') || 
                                error.message.includes('rate limit') ||
                                error.message.includes('Rate limit'));
      
      if (!isDevMode && !isRateLimitError) {
        const authHeader = request.headers.get('authorization');
        if (authHeader?.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          const decoded = verifyToken(token);
          if (decoded) {
            const user = await findUserById(decoded.userId);
            if (user) {
              // 使用回数を1減らす（ロールバック）
              decrementUsageCount(user.id);
            }
          }
        }
      }
      throw error;
    }

    return NextResponse.json({ 
      response: result.response,
      explanation: result.explanation,
      alternatives: result.alternatives,
      usageInfo, // 使用回数情報を返す
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error('Generate response error:', error);
    
    // レートリミットエラーの場合は429ステータスを返す
    const errorMessage = error instanceof Error ? error.message : '返信の生成に失敗しました';
    const isRateLimitError = errorMessage.includes('レートリミット') || 
                             errorMessage.includes('rate limit') ||
                             errorMessage.includes('Rate limit');
    
    return NextResponse.json(
      { 
        error: errorMessage,
        isRateLimit: isRateLimitError,
        retryAfter: isRateLimitError ? 120 : undefined // 2分後にリトライ可能
      },
      { 
        status: isRateLimitError ? 429 : 500,
        headers: isRateLimitError ? {
          'Retry-After': '120' // 2分後にリトライ可能
        } : {}
      }
    );
  }
}






