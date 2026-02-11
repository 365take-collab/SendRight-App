import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, findUserById, getStreakInfo, updateStreak, BADGES } from '@/lib/auth';

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

// ストリーク情報を取得
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromAuthHeader(request);
    if (!user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const streakInfo = await getStreakInfo(user.id);
    
    return NextResponse.json(streakInfo);
  } catch (error) {
    console.error('Get streak error:', error);
    return NextResponse.json(
      { error: 'ストリーク情報の取得に失敗しました' },
      { status: 500 }
    );
  }
}

// ストリークを更新（使用時に呼び出される）
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromAuthHeader(request);
    if (!user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const result = await updateStreak(user.id);
    
    // 新しいバッジの詳細情報を追加
    const newBadgeDetails = result.newBadges.map(badgeId => {
      const badge = Object.values(BADGES).find(b => b.id === badgeId);
      return badge || { id: badgeId, name: badgeId, description: '' };
    });

    return NextResponse.json({
      ...result,
      newBadgeDetails,
    });
  } catch (error) {
    console.error('Update streak error:', error);
    return NextResponse.json(
      { error: 'ストリークの更新に失敗しました' },
      { status: 500 }
    );
  }
}
