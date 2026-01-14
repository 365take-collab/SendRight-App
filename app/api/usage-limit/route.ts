import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, findUserById, updateDailyUsageLimit, getUsageInfo } from '@/lib/auth';

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

// 使用回数制限を更新（追加課金で増やす）
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

    if (!newLimit || typeof newLimit !== 'number' || newLimit < 50) {
      return NextResponse.json(
        { error: '有効な制限値を指定してください（最低50回）' },
        { status: 400 }
      );
    }

    // Utage連携: 追加課金はUtageの決済ページにリダイレクト
    // ユーザーのプラン種別を判定（月額/年額）
    const subscriptionType = user.subscriptionType || 'monthly';
    
    // 商品IDと使用回数制限のマッピング（月額プラン用）
    const limitToProductIdMonthly: Record<number, string> = {
      100: process.env.UTAGE_PRODUCT_ID_100_MONTHLY || process.env.UTAGE_PRODUCT_ID_100 || '', // 100回/日プラン（月額）
      150: process.env.UTAGE_PRODUCT_ID_150_MONTHLY || process.env.UTAGE_PRODUCT_ID_150 || '', // 150回/日プラン（月額）
      200: process.env.UTAGE_PRODUCT_ID_200_MONTHLY || process.env.UTAGE_PRODUCT_ID_200 || '', // 200回/日プラン（月額）
      250: process.env.UTAGE_PRODUCT_ID_250_MONTHLY || process.env.UTAGE_PRODUCT_ID_250 || '', // 250回/日プラン（月額）
    };

    // 商品IDと使用回数制限のマッピング（年額プラン用）
    const limitToProductIdYearly: Record<number, string> = {
      100: process.env.UTAGE_PRODUCT_ID_100_YEARLY || '', // 100回/日プラン（年額）
      150: process.env.UTAGE_PRODUCT_ID_150_YEARLY || '', // 150回/日プラン（年額）
      200: process.env.UTAGE_PRODUCT_ID_200_YEARLY || '', // 200回/日プラン（年額）
      250: process.env.UTAGE_PRODUCT_ID_250_YEARLY || '', // 250回/日プラン（年額）
    };

    // プラン種別に応じて商品IDを選択
    const productIdMap = subscriptionType === 'yearly' ? limitToProductIdYearly : limitToProductIdMonthly;
    const productId = productIdMap[newLimit];
    
    if (!productId) {
      return NextResponse.json(
        { error: `指定された制限値に対応する${subscriptionType === 'yearly' ? '年額' : '月額'}商品が見つかりません` },
        { status: 400 }
      );
    }

    // Utageの決済ページURLを生成
    // Utageの決済ページURL形式: https://utage-system.com/checkout?product_id=XXX&email=XXX
    const utageCheckoutUrl = process.env.UTAGE_CHECKOUT_BASE_URL || 'https://utage-system.com/checkout';
    const checkoutUrl = `${utageCheckoutUrl}?product_id=${productId}&email=${encodeURIComponent(user.email)}&redirect_url=${encodeURIComponent(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/usage-limit/callback?limit=${newLimit}`)}`;

    return NextResponse.json({
      success: true,
      checkoutUrl,
      subscriptionType,
      message: `Utageの決済ページにリダイレクトします（${subscriptionType === 'yearly' ? '年額' : '月額'}プラン）`,
    });
  } catch (error) {
    console.error('Update usage limit error:', error);
    return NextResponse.json(
      { error: '使用回数制限の更新に失敗しました' },
      { status: 500 }
    );
  }
}
