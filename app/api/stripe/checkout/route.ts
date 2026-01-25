import { NextRequest, NextResponse } from 'next/server';
import { requireStripe } from '@/lib/stripe';
import { verifyToken, findUserById } from '@/lib/auth';
import { z } from 'zod';

const checkoutSchema = z.object({
  plan: z.enum(['monthly', 'yearly']),
});

// Stripe Price IDs（環境変数から取得）
// テスト環境用のPrice IDも設定可能（STRIPE_PRICE_MONTHLY_TEST, STRIPE_PRICE_YEARLY_TEST）
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

    // 認証チェック（オプション - トークンがあれば既存ユーザーとして処理）
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
          
          // 既存のStripe Customerがあれば使用
          if (user.stripeCustomerId) {
            customerId = user.stripeCustomerId;
          } else {
            // 新規Stripe Customer作成
            const customer = await stripe.customers.create({
              email: user.email,
              metadata: {
                userId: user.id,
              },
            });
            customerId = customer.id;
          }
        }
      }
    }

    // Checkout Sessionを作成
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://app.sendright.jp';
    
    // セッション作成オプション
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
      // 7日間無料トライアル
      subscription_data: {
        trial_period_days: 7,
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

    // 既存顧客がいる場合は紐付け、いない場合はメールアドレスを収集
    if (customerId) {
      sessionOptions.customer = customerId;
    } else {
      // 新規顧客の場合、Checkoutでメールアドレスを収集
      sessionOptions.customer_creation = 'always';
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

    return NextResponse.json(
      { error: 'Checkout Sessionの作成に失敗しました' },
      { status: 500 }
    );
  }
}
