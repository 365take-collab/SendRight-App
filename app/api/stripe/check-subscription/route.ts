import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, findUserById } from '@/lib/auth';
import { checkSubscriptionStatus } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
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
    if (!user || !user.stripeCustomerId) {
      return NextResponse.json(
        { error: 'ユーザーまたはStripe顧客IDが見つかりません' },
        { status: 404 }
      );
    }

    // Stripeのサブスクリプション状態を確認
    const status = await checkSubscriptionStatus(user.stripeCustomerId);

    return NextResponse.json({
      isActive: status.isActive,
      subscription: status.subscription,
    });
  } catch (error) {
    console.error('Error checking subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
