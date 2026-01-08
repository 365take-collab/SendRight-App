import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, findUserById, updateDailyUsageLimit, getUsageInfo } from '@/lib/auth';

// Utageの決済完了後のコールバック
// Utageの決済完了後、このURLにリダイレクトされる
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const email = searchParams.get('email');
    const token = searchParams.get('token');

    if (!email || !token) {
      return NextResponse.redirect(new URL('/?error=invalid_callback', request.url));
    }

    // トークンを検証
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.redirect(new URL('/?error=invalid_token', request.url));
    }

    const user = await findUserById(decoded.userId);
    if (!user || user.email !== email) {
      return NextResponse.redirect(new URL('/?error=user_not_found', request.url));
    }

    // 使用回数制限を更新
    const success = updateDailyUsageLimit(user.id, limit);
    if (!success) {
      return NextResponse.redirect(new URL('/?error=update_failed', request.url));
    }

    // 成功ページにリダイレクト
    return NextResponse.redirect(new URL(`/?upgrade_success=true&limit=${limit}`, request.url));
  } catch (error) {
    console.error('Usage limit callback error:', error);
    return NextResponse.redirect(new URL('/?error=callback_error', request.url));
  }
}
