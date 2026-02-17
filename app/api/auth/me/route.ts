import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, findUserById, checkSubscription } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
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

    const hasActiveSubscription = checkSubscription(user);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        isSubscribed: hasActiveSubscription,
        subscriptionExpiresAt: user.subscriptionExpiresAt,
        subscriptionType: user.subscriptionType,
        referralCode: user.referralCode,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: '認証の確認に失敗しました' },
      { status: 500 }
    );
  }
}
















