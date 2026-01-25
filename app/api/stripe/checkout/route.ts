import { NextRequest, NextResponse } from 'next/server';
import { requireStripe } from '@/lib/stripe';
import { verifyToken, findUserById } from '@/lib/auth';
import { z } from 'zod';

const checkoutSchema = z.object({
  plan: z.enum(['monthly', 'yearly']),
});

// Stripe Price IDs（環境変数から取得）
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const isTestMode = STRIPE_SECRET_KEY.startsWith('sk_test_');

const STRIPE_PRICE_MONTHLY = isTestMode 
  ? (process.env.STRIPE_PRICE_MONTHLY_TEST || process.env.STRIPE_PRICE_MONTHLY || 'price_1ShWEK3F2rtCunnnqVQRiLAd')
  : (process.env.STRIPE_PRICE_MONTHLY || 'price_1ShWEK3F2rtCunnnqVQRiLAd');

const STRIPE_PRICE_YEARLY = isTestMode
  ? (process.env.STRIPE_PRICE_YEARLY_TEST || process.env.STRIPE_PRICE_YEARLY || 'price_1ShWEk3F2rtCunnnkSn8wg2I')
  : (process.env.STRIPE_PRICE_YEARLY || 'price_1ShWEk3F2rtCunnnkSn8wg2I');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { plan } = checkoutSchema.parse(body);

    // Stripeインスタンスを取得
    const stripe = requireStripe();

    // Price IDを選択
    const priceId = plan === 'monthly' ? STRIPE_PRICE_MONTHLY : STRIPE_PRICE_YEARLY;

    // 認証チェック（オプション）
    const authHeader = request.headers.get('authorization');
    let customerId: string | undefined;
    let userId: string | undefined;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      
      if (decoded) {
        const user = await findUserById(decoded.userId);
        if (user) {
          userId = user.id;
          customerId = user.stripeCustomerId || undefined;
        }
      }
    }

    // Checkout Sessionを作成
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://app.sendright.jp';
    
    // Checkout Session作成
    const sessionOptions: any = {
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
      subscription_data: {
        metadata: {
          plan: plan,
          ...(userId && { userId }),
        },
      },
      metadata: {
        plan: plan,
        ...(userId && { userId }),
      },
    };

    // 試用期間を設定（7日間）
    sessionOptions.subscription_data.trial_period_days = 7;

    // 既存顧客がいる場合は紐付け
    if (customerId) {
      sessionOptions.customer = customerId;
    }

    const session = await stripe.checkout.sessions.create(sessionOptions);

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

    // Stripeエラーの詳細をログ出力
    let errorMessage = 'Checkout Sessionの作成に失敗しました';
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      errorMessage = error.message;
      
      // Stripe APIエラーの場合、詳細情報を取得
      if ('type' in error && 'code' in error) {
        const stripeError = error as any;
        errorMessage = `Stripe Error: ${stripeError.type} - ${stripeError.message || stripeError.code}`;
        console.error('Stripe error details:', JSON.stringify(stripeError, null, 2));
      }
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
