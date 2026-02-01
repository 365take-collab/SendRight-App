import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail, createUser, validateReferralCode, recordReferral } from '@/lib/supabase';

// 無料プランの制限
const FREE_PLAN_DAILY_LIMIT = 3;

// レート制限用のメモリキャッシュ（本番ではRedisを使用推奨）
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1分
const RATE_LIMIT_MAX = 5; // 1分あたり5回まで

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  record.count++;
  return true;
}

// メールアドレスのバリデーション（厳格版）
function isValidEmail(email: string): boolean {
  // 基本的なメールアドレス形式チェック
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) return false;
  
  // 長さチェック
  if (email.length > 254) return false;
  
  // 一時的なメールアドレスドメインをブロック（オプション）
  const blockedDomains = ['tempmail.com', 'throwaway.email', '10minutemail.com'];
  const domain = email.split('@')[1]?.toLowerCase();
  if (blockedDomains.includes(domain)) return false;
  
  return true;
}

export async function POST(req: NextRequest) {
  try {
    // IPアドレスを取得（レート制限用）
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
               req.headers.get('x-real-ip') || 
               'unknown';
    
    // レート制限チェック
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: '登録リクエストが多すぎます。1分後に再度お試しください。' },
        { status: 429 }
      );
    }

    const { email, referralCode } = await req.json();

    // メールアドレスのバリデーション
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: '有効なメールアドレスを入力してください' },
        { status: 400 }
      );
    }
    
    // メールアドレスを正規化（小文字に変換）
    const normalizedEmail = email.toLowerCase().trim();

    // 既存ユーザーをチェック（正規化されたメールアドレスを使用）
    const existingUser = await findUserByEmail(normalizedEmail);

    if (existingUser) {
      // 既存ユーザーの場合、使用回数情報を返す
      return NextResponse.json({
        success: true,
        isNew: false,
        user: {
          id: existingUser.id,
          email: existingUser.email,
          isSubscribed: existingUser.is_subscribed,
          dailyUsageLimit: existingUser.daily_usage_limit,
        },
        message: 'おかえりなさい！',
      });
    }

    // 新規ユーザーを作成（無料プラン）
    const newUser = await createUser({
      email: normalizedEmail,
      is_subscribed: false, // 無料プラン
      subscription_type: 'free',
      daily_usage_limit: FREE_PLAN_DAILY_LIMIT, // 1日3回まで
      current_streak: 0,
      longest_streak: 0,
      total_usage_count: 0,
      success_count: 0,
      level: 1,
      badges: [],
    });

    if (!newUser) {
      return NextResponse.json(
        { error: '登録に失敗しました。もう一度お試しください。' },
        { status: 500 }
      );
    }

    // 紹介コードがある場合、紹介を記録
    let referralMessage = '';
    if (referralCode) {
      const validation = await validateReferralCode(referralCode);
      if (validation.valid && validation.referrerEmail) {
        const recorded = await recordReferral(
          validation.referrerEmail,
          normalizedEmail,
          referralCode
        );
        if (recorded) {
          referralMessage = '紹介特典でトライアル期間が14日間に延長されました！';
        }
      }
    }

    return NextResponse.json({
      success: true,
      isNew: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        isSubscribed: newUser.is_subscribed,
        dailyUsageLimit: newUser.daily_usage_limit,
      },
      message: referralMessage || 'メールアドレスを登録しました！1日3回まで無料でお使いいただけます。',
      isReferred: !!referralMessage,
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: '登録に失敗しました' },
      { status: 500 }
    );
  }
}
