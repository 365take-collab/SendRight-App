import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, findUserById, checkSubscription } from '@/lib/auth';
import { listResponseHistories } from '@/lib/supabase';

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

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromAuthHeader(request);
    if (!user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    if (!checkSubscription(user)) {
      return NextResponse.json(
        { error: '有効なサブスクリプションが必要です' },
        { status: 403 }
      );
    }

    const { searchParams } = request.nextUrl;
    const limitParam = searchParams.get('limit');
    const before = searchParams.get('before') || undefined;
    const parsedLimit = limitParam ? parseInt(limitParam, 10) : 20;
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 50) : 20;

    const responses = await listResponseHistories({
      userId: user.id,
      limit,
      before,
    });

    return NextResponse.json({ responses });
  } catch (error) {
    console.error('List response histories error:', error);
    return NextResponse.json(
      { error: '返信履歴の取得に失敗しました' },
      { status: 500 }
    );
  }
}
