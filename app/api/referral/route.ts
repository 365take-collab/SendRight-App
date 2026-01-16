import { NextRequest, NextResponse } from 'next/server';
import {
  getReferralCode,
  validateReferralCode,
  getReferralHistory,
  generateReferralLink,
} from '@/lib/supabase';

// GET: 紹介コード・リンク・履歴を取得
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  try {
    // 紹介コードを取得（なければ生成）
    const referralCode = await getReferralCode(email);

    if (!referralCode) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 紹介リンクを生成
    const referralLink = generateReferralLink(referralCode);

    // 紹介履歴を取得
    const { referrals, totalCount, currentDiscount } = await getReferralHistory(email);

    // 次の割引を計算
    const nextDiscount = calculateNextDiscount(totalCount);

    return NextResponse.json({
      referralCode,
      referralLink,
      referralCount: totalCount,
      currentDiscount,
      nextDiscount,
      referrals,
    });
  } catch (error) {
    console.error('Error fetching referral data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: 紹介コードを検証
export async function POST(request: NextRequest) {
  try {
    const { referralCode } = await request.json();

    if (!referralCode) {
      return NextResponse.json({ valid: false, error: 'Referral code is required' }, { status: 400 });
    }

    const validation = await validateReferralCode(referralCode);

    return NextResponse.json(validation);
  } catch (error) {
    console.error('Error validating referral code:', error);
    return NextResponse.json({ valid: false, error: 'Internal server error' }, { status: 500 });
  }
}

// 次の割引を計算
function calculateNextDiscount(currentCount: number): { referralsNeeded: number; discount: number } | null {
  if (currentCount >= 5) return null; // 既に最大
  if (currentCount >= 3) return { referralsNeeded: 5 - currentCount, discount: 100 };
  if (currentCount >= 2) return { referralsNeeded: 3 - currentCount, discount: 50 };
  if (currentCount >= 1) return { referralsNeeded: 2 - currentCount, discount: 20 };
  return { referralsNeeded: 1, discount: 10 };
}
