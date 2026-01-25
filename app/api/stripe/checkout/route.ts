import { NextRequest, NextResponse } from 'next/server';
import { requireStripe } from '@/lib/stripe';
import { verifyToken, findUserById } from '@/lib/auth';
import { z } from 'zod';

const checkoutSchema = z.object({
  plan: z.enum(['monthly', 'yearly']),
});

// Stripe Price IDs（環境変数から取得）
const STRIPE_PRICE_MONTHLY = process.env.STRIPE_PRICE_MONTHLY || 'price_1ShWEK3F2rtCunnnqVQRiLAd';
const STRIPE_PRICE_YEARLY = process.env.STRIPE_PRICE_YEARLY || 'price_1ShWEk3F2rtCunnnkSn8wg2I';

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

    const body = await request.json();
    const { plan } = checkoutSchema.parse(body);

    // Stripeインスタンスを取得
    const stripe = requireStripe();

    // Price IDを選択
    const priceId = plan === 'monthly' ? STRIPE_PRICE_MONTHLY : STRIPE_PRICE_YEARLY;

    // Stripe Customerを作成または取得
    let customerId = user.stripeCustomerId;
    
    if (!customerId) {
      // 新規Stripe Customer作成
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id,
        },
      });
      customerId = customer.id;
    }

    // Checkout Sessionを作成
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://sendright.jp';
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/purchase-complete?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/subscribe?canceled=true`,
      metadata: {
        userId: user.id,
        plan: plan,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          plan: plan,
        },
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Stripe Checkout error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Checkout Sessionの作成に失敗しました' },
      { status: 500 }
    );
  }
}
