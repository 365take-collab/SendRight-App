import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, findUserById, verifyPassword, hashPassword } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import z from 'zod';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '現在のパスワードを入力してください'),
  newPassword: z.string().min(8, '新しいパスワードは8文字以上である必要があります'),
});

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

    const body = await request.json();
    const { currentPassword, newPassword } = changePasswordSchema.parse(body);

    const user = await findUserById(decoded.userId);
    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: '認証に失敗しました' },
        { status: 401 }
      );
    }

    const isValidPassword = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: '現在のパスワードが正しくありません' },
        { status: 401 }
      );
    }

    const newPasswordHash = await hashPassword(newPassword);
    const { error } = await supabaseAdmin
      .from('users')
      .update({ password_hash: newPasswordHash })
      .eq('id', decoded.userId);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'パスワードを変更しました',
    });
  } catch (error) {
    console.error('Change password error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'パスワード変更に失敗しました' },
      { status: 500 }
    );
  }
}
