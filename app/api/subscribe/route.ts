import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, findUserById, updateUserSubscription } from '@/lib/auth';
import { z } from 'zod';

const subscribeSchema = z.object({
  plan: z.enum(['monthly', 'yearly']),
});

export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json();
    const { plan } = subscribeSchema.parse(body);

    // Calculate expiration date
    const expiresAt = new Date();
    if (plan === 'monthly') {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    } else {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }

    // Update subscription
    await updateUserSubscription(user.id, true, expiresAt);

    // In production, integrate with payment provider (Stripe, etc.)
    // For now, we'll just update the subscription status

    return NextResponse.json({
      message: 'サブスクリプションが有効になりました',
      subscription: {
        isSubscribed: true,
        expiresAt: expiresAt.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'サブスクリプションの処理に失敗しました' },
      { status: 500 }
    );
  }
}

















