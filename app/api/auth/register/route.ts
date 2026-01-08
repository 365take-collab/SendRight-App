import { NextRequest, NextResponse } from 'next/server';
import { createUser, findUserByEmail } from '@/lib/auth';
import { generateToken } from '@/lib/auth';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(6, 'パスワードは6文字以上である必要があります'),
});

export async function POST(request: NextRequest) {
  // 通常の登録機能は無効化（Utageからのアクセスのみ許可）
  return NextResponse.json(
    { error: 'この登録方法は利用できません。Utageの会員サイトからアクセスしてください。' },
    { status: 403 }
  );
}

















