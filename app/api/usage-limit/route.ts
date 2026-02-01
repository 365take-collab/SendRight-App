import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, findUserById, getUsageInfo } from '@/lib/auth';
import { requireStripe } from '@/lib/stripe';

// 追加課金プランの定義
const ADDON_PLANS: Record<number, { priceEnv: string; label: string }> = {
  100: { priceEnv: 'STRIPE_PRICE_ADDON_100', label: '100回/日プラン' },
  150: { priceEnv: 'STRIPE_PRICE_ADDON_150', label: '150回/日プラン' },
  200: { priceEnv: 'STRIPE_PRICE_ADDON_200', label: '200回/日プラン' },
  250: { priceEnv: 'STRIPE_PRICE_ADDON_250', label: '250回/日プラン' },
};

// 使用回数制限を取得
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

    const usageInfo = await getUsageInfo(user.id);
    return NextResponse.json({
      usageInfo,
      dailyUsageLimit: user.dailyUsageLimit || 50,
      subscriptionType: user.subscriptionType || 'monthly',
    });
  } catch (error) {
    console.error('Get usage limit error:', error);
    return NextResponse.json(
      { error: '使用回数情報の取得に失敗しました' },
      { status: 500 }
    );
  }
}

// 使用回数制限を更新（Stripe Checkout経由で追加課金）
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { newLimit } = body;

    if (!newLimit || typeof newLimit !== 'number' || newLimit < 100) {
      return NextResponse.json(
        { error: '有効な制限値を指定してください（100, 150, 200, 250）' },
        { status: 400 }
      );
    }

    const addonPlan = ADDON_PLANS[newLimit];
    if (!addonPlan) {
      return NextResponse.json(
        { error: '指定された制限値に対応するプランが見つかりません' },
        { status: 400 }
      );
    }

    const priceId = process.env[addonPlan.priceEnv];
    if (!priceId) {
      return NextResponse.json(
        { error: `${addonPlan.label}の価格設定が見つかりません` },
        { status: 500 }
      );
    }

    const stripe = requireStripe();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://sendright.jp';

    // Stripe Checkout Sessionを作成
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        type: 'addon',
        daily_limit: String(newLimit),
        user_id: user.id,
      },
      success_url: `${baseUrl}/?upgrade_success=true&limit=${newLimit}`,
      cancel_url: `${baseUrl}/`,
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
      message: `Stripe決済ページにリダイレクトします（${addonPlan.label}）`,
    });
  } catch (error) {
    console.error('Update usage limit error:', error);
    return NextResponse.json(
      { error: '使用回数制限の更新に失敗しました' },
      { status: 500 }
    );
  }
}
