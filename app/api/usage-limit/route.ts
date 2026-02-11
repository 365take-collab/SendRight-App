import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, findUserById, getUsageInfo } from '@/lib/auth';

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

// 使用回数制限を取得
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromAuthHeader(request);
    if (!user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
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
    const user = await getUserFromAuthHeader(request);
    if (!user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
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

    return NextResponse.json(
      { error: '追加課金は現在停止中です。運営にお問い合わせください。' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Update usage limit error:', error);
    return NextResponse.json(
      { error: '使用回数制限の更新に失敗しました' },
      { status: 500 }
    );
  }
}
