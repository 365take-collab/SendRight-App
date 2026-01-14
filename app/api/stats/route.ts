import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, findUserById, getUserStats, recordSuccess, BADGES } from '@/lib/auth';

// ユーザー統計情報を取得
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

    const stats = await getUserStats(user.id);
    if (!stats) {
      return NextResponse.json(
        { error: '統計情報の取得に失敗しました' },
        { status: 500 }
      );
    }

    // バッジの詳細情報を追加
    const badgeDetails = stats.badges.map(badgeId => {
      const badge = Object.values(BADGES).find(b => b.id === badgeId);
      return badge || { id: badgeId, name: badgeId, description: '' };
    });

    return NextResponse.json({
      ...stats,
      badgeDetails,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return NextResponse.json(
      { error: '統計情報の取得に失敗しました' },
      { status: 500 }
    );
  }
}

// 成功を記録（ユーザーが「良かった」評価をした時）
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

    const result = await recordSuccess(user.id);
    
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
    console.error('Record success error:', error);
    return NextResponse.json(
      { error: '成功の記録に失敗しました' },
      { status: 500 }
    );
  }
}
