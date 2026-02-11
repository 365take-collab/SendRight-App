import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, findUserById, checkSubscription, canUseService, incrementUsageCount, getUsageInfo, decrementUsageCount, updateStreak, recordUsage } from '@/lib/auth';
import { generateResponse, generateGoalDrivenResponse, GOALS, getAiProviderInfo } from '@/lib/ai';
import { checkRateLimit, detectAnomalousPattern, RATE_LIMIT_MAX_REQUESTS } from '@/lib/security';
import { createResponseHistory } from '@/lib/supabase';
import { findSimilarSuccessPatterns } from '@/lib/success-patterns';
import { z } from 'zod';

const TONE_PRESETS = ['default', 'casual', 'gentle', 'direct', 'playful', 'polite'] as const;

const generateSchema = z.object({
  herMessage: z.string().min(1, 'メッセージを入力してください'),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional(),
  fullConversationText: z.string().optional(), // 画像から抽出した会話全体のテキスト
  profileContext: z.string().optional(), // 前提情報（名前、年齢、関係性など）
  goal: z.string().optional(), // ゴール（デートに誘いたい、LINE交換したい、など）
  tone: z.enum(TONE_PRESETS).optional(), // 返信トーン
});

export async function POST(request: NextRequest) {
  try {
    // 開発環境では認証をスキップ
    const isDevMode = process.env.DEV_MODE === 'true' ||
                      request.nextUrl.hostname === 'localhost' ||
                      request.nextUrl.hostname.includes('ngrok');

    let user: Awaited<ReturnType<typeof findUserById>> | null = null;

    // 開発環境では認証をスキップ
    if (isDevMode) {
      user = {
        id: 'dev-user',
        email: 'dev@example.com',
        isSubscribed: true,
        subscriptionType: 'pro' as const,
        dailyUsageLimit: 999999,
        currentStreak: 0,
        longestStreak: 0,
        badges: [],
        totalUsageCount: 0,
        successCount: 0,
        level: 1,
        createdAt: new Date(),
      };
    } else {
      const authHeader = request.headers.get('authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: '認証が必要です' },
          { status: 401 }
        );
      }

      const token = authHeader.substring(7);

      if (token.startsWith('email-')) {
        const userId = token.substring(6);
        user = await findUserById(userId);
      } else {
        const decoded = verifyToken(token);
        if (!decoded) {
          return NextResponse.json(
            { error: '無効なトークンです' },
            { status: 401 }
          );
        }
        user = await findUserById(decoded.userId);
      }

      if (!user) {
        return NextResponse.json(
          { error: 'ユーザーが見つかりません' },
          { status: 404 }
        );
      }

      if (!checkSubscription(user)) {
        return NextResponse.json(
          { error: '有効なサブスクリプションが必要です。' },
          { status: 403 }
        );
      }

      const usageCheck = await canUseService(user.id);
      if (!usageCheck.canUse) {
        const usageInfo = await getUsageInfo(user.id);
        return NextResponse.json(
          { 
            error: `1日の使用回数制限（${usageInfo.limit}回）に達しました。明日またお試しください。`,
            usageInfo 
          },
          { status: 429 }
        );
      }

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

      const anomalyResult = detectAnomalousPattern(user.id, request.nextUrl.pathname, Date.now());
      if (anomalyResult.isAnomalous) {
        console.warn('異常なアクセスパターンを検出:', { userId: user.id, path: request.nextUrl.pathname, reason: anomalyResult.reason });
        return NextResponse.json(
          { error: '異常なアクセスパターンが検出されました' },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const { herMessage, conversationHistory, fullConversationText, profileContext, goal, tone } = generateSchema.parse(body);
    
    if (!isDevMode && user) {
      await incrementUsageCount(user.id);
    }

    // 類似の成功パターン（過去の高評価）を取得してプロンプトに注入
    const successPatternsForPrompt = (!isDevMode && user)
      ? (await findSimilarSuccessPatterns({
          userId: user.id,
          query: [
            `相手: ${herMessage}`,
            fullConversationText ? `会話: ${fullConversationText}` : null,
            profileContext ? `前提: ${profileContext}` : null,
            goal ? `ゴール: ${goal}` : null,
            tone ? `トーン: ${tone}` : null,
          ].filter(Boolean).join('\n'),
          limit: 3,
        })).map((p) => ({
          taskText: p.taskText,
          response: p.response,
          reason: p.knowledge.reason ?? null,
          tags: p.knowledge.tags ?? null,
        }))
      : [];

    // Generate AI response
    let result;
    let goalDrivenResult = null;
    let usageInfo = null;
    let streakInfo = null;
    let newBadges: string[] = [];
    let userStats = null;
    let responseId: string | null = null;
    
    try {
      // ゴールが指定されている場合はゴール駆動型のレスポンスを生成
      if (goal && GOALS.some(g => g.id === goal)) {
        goalDrivenResult = await generateGoalDrivenResponse({
          herMessage,
          conversationHistory,
          fullConversationText,
          profileContext,
          goal,
          tone,
          successPatterns: successPatternsForPrompt,
        });
        // 通常のレスポンス形式に変換（互換性のため）
        result = {
          response: goalDrivenResult.currentMessage,
          explanation: goalDrivenResult.explanation,
          alternatives: [],
        };
      } else {
        // 通常のレスポンス生成
        result = await generateResponse({
          herMessage,
          conversationHistory,
          fullConversationText,
          profileContext,
          tone,
          successPatterns: successPatternsForPrompt,
        });
      }

      if (!isDevMode && user) {
        const providerInfo = getAiProviderInfo();
        const history = await createResponseHistory({
          userId: user.id,
          herMessage,
          response: result.response,
          explanation: result.explanation,
          alternatives: result.alternatives || [],
          conversationHistory,
          fullConversationText,
          profileContext,
          goal,
          tone,
          responseType: goalDrivenResult ? 'goal-driven' : 'standard',
          aiProvider: providerInfo.provider,
          aiModel: providerInfo.model,
          metadata: goalDrivenResult ? {
            analysis: goalDrivenResult.analysis,
            strategy: goalDrivenResult.strategy,
            nextSteps: goalDrivenResult.nextSteps,
          } : {},
        });
        responseId = history?.id || null;
      }

      if (!isDevMode && user) {
        const streakResult = await updateStreak(user.id);
        const usageResult = await recordUsage(user.id);

        const allNewBadges = [...streakResult.newBadges, ...usageResult.newBadges];
        if (allNewBadges.length > 0) {
          console.log(`User ${user.id} earned new badges:`, allNewBadges);
        }
      }

      // 使用回数情報・ストリーク・統計を取得（開発環境ではスキップ）
      if (!isDevMode && user) {
        const refreshedUser = await findUserById(user.id);
        if (refreshedUser) {
          usageInfo = await getUsageInfo(refreshedUser.id);

          // ストリーク情報
          streakInfo = {
            currentStreak: refreshedUser.currentStreak || 0,
            longestStreak: refreshedUser.longestStreak || 0,
          };

          // ユーザー統計
          userStats = {
            totalUsageCount: refreshedUser.totalUsageCount || 0,
            level: refreshedUser.level || 1,
            badges: refreshedUser.badges || [],
          };
        }
      }
    } catch (error) {
      // AI生成に失敗した場合、使用回数をロールバック（開発環境ではスキップ）
      // ただし、レートリミットエラーの場合は使用回数をカウントしない（ユーザーに優しい）
      const isRateLimitError = error instanceof Error && 
                               (error.message.includes('レートリミット') || 
                                error.message.includes('rate limit') ||
                                error.message.includes('Rate limit'));
      
      if (!isDevMode && !isRateLimitError && user) {
        // 使用回数を1減らす（ロールバック）
        await decrementUsageCount(user.id);
      }
      throw error;
    }

    return NextResponse.json({ 
      response: result.response,
      explanation: result.explanation,
      alternatives: result.alternatives,
      responseId: responseId ?? null,
      usageInfo, // 使用回数情報を返す
      streakInfo, // ストリーク情報を返す
      userStats, // ユーザー統計情報を返す
      // ゴール駆動型の場合、追加情報を返す
      goalDriven: goalDrivenResult ? {
        analysis: goalDrivenResult.analysis,
        strategy: goalDrivenResult.strategy,
        nextSteps: goalDrivenResult.nextSteps,
      } : null,
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
