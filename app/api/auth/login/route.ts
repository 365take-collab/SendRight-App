import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail, verifyPassword } from '@/lib/auth';
import { generateToken } from '@/lib/auth';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードを入力してください'),
});

export async function POST(request: NextRequest) {
  // 通常のログイン機能は無効化（Utageからのアクセスのみ許可）
  return NextResponse.json(
    { error: 'このログイン方法は利用できません。Utageの会員サイトからアクセスしてください。' },
    { status: 403 }
  );
}

















