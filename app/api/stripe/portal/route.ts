import { NextRequest, NextResponse } from 'next/server';
import { requireStripe } from '@/lib/stripe';
import { getStripeBaseUrl } from '@/lib/stripe-config';
import { verifyToken, findUserById } from '@/lib/auth';

export const runtime = 'nodejs';

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
    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    if (!user.stripeCustomerId) {
      return NextResponse.json(
        { error: 'Stripe Customer IDが見つかりません' },
        { status: 400 }
      );
    }

    const stripe = requireStripe();
    const baseUrl = getStripeBaseUrl(request);

    // Customer Portal Sessionを作成
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${baseUrl}/subscribe`,
    });

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error('Customer Portal error:', error);
    return NextResponse.json(
      { error: 'Customer Portal Sessionの作成に失敗しました' },
      { status: 500 }
    );
  }
}
