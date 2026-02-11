import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, findUserById, checkSubscription } from '@/lib/auth';
import { createResponseFeedback, findResponseHistoryById } from '@/lib/supabase';
import { ingestSuccessPatternFromFeedback } from '@/lib/success-patterns';
import { z } from 'zod';

const feedbackSchema = z.object({
  responseId: z.string().min(1, 'responseIdが必要です'),
  rating: z.enum(['good', 'bad']),
  reason: z.string().optional(),
  tags: z.array(z.string()).optional(),
  goalAchieved: z.boolean().optional(),
});

async function getUserFromAuthHeader(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);

  if (token.startsWith('email-')) {
    const userId = token.substring(6);
    return await findUserById(userId);
  }

  const decoded = verifyToken(token);
  if (!decoded) return null;
  return await findUserById(decoded.userId);
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromAuthHeader(request);
    if (!user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    if (!checkSubscription(user)) {
      return NextResponse.json(
        { error: '有効なサブスクリプションが必要です' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { responseId, rating, reason, tags, goalAchieved } = feedbackSchema.parse(body);

    const history = await findResponseHistoryById(responseId, user.id);
    if (!history) {
      return NextResponse.json(
        { error: '返信履歴が見つかりません' },
        { status: 404 }
      );
    }

    await createResponseFeedback({
      userId: user.id,
      responseId,
      rating,
      reason,
      tags,
      goalAchieved,
    });

    if (rating === 'good') {
      // Best-effort: pattern化に失敗してもフィードバック自体は成功扱い
      try {
        await ingestSuccessPatternFromFeedback({
          userId: user.id,
          history,
          feedback: { rating, reason, tags, goalAchieved },
        });
      } catch (e) {
        console.error('Success pattern ingest error:', e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || '入力が正しくありません' },
        { status: 400 }
      );
    }
    console.error('Submit response feedback error:', error);
    return NextResponse.json(
      { error: 'フィードバックの送信に失敗しました' },
      { status: 500 }
    );
  }
}
