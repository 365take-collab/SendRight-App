import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase設定
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// サーバーサイド用クライアント（service_roleキーを使用）
// ビルド時は環境変数がないためnullになる可能性がある
let supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables are not set');
    }
    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return supabase;
}

// ========================================
// 型定義
// ========================================

export interface DbUser {
  id: string;
  email: string;
  stripe_customer_id: string | null;
  is_subscribed: boolean;
  is_utage_user: boolean;
  subscription_type: string;
  daily_usage_limit: number;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  total_usage_count: number;
  success_count: number;
  level: number;
  badges: string[];
  created_at: string;
  updated_at: string;
}

export interface DbUsageRecord {
  id: string;
  user_id: string;
  date: string;
  count: number;
  created_at: string;
}

export interface DbBanRecord {
  id: string;
  user_id: string;
  reason: string | null;
  banned_at: string;
  expires_at: string | null;
}

// ========================================
// ユーザー関連
// ========================================

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  const { data, error } = await getSupabaseClient()
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !data) return null;
  return data as DbUser;
}

export async function findUserById(id: string): Promise<DbUser | null> {
  const { data, error } = await getSupabaseClient()
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data as DbUser;
}

export async function createUser(userData: Partial<DbUser>): Promise<DbUser | null> {
  const { data, error } = await getSupabaseClient()
    .from('users')
    .insert([userData])
    .select()
    .single();

  if (error) {
    console.error('Error creating user:', error);
    return null;
  }
  return data as DbUser;
}

export async function updateUser(id: string, updates: Partial<DbUser>): Promise<DbUser | null> {
  const { data, error } = await getSupabaseClient()
    .from('users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating user:', error);
    return null;
  }
  return data as DbUser;
}

// ========================================
// 使用回数関連
// ========================================

export async function getTodayUsageCount(userId: string): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await getSupabaseClient()
    .from('usage_records')
    .select('count')
    .eq('user_id', userId)
    .eq('date', today)
    .single();

  if (error || !data) return 0;
  return data.count;
}

export async function incrementUsageCount(userId: string): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  
  // まず既存レコードを確認
  const { data: existing } = await getSupabaseClient()
    .from('usage_records')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .single();

  if (existing) {
    // 既存レコードを更新
    const newCount = existing.count + 1;
    await getSupabaseClient()
      .from('usage_records')
      .update({ count: newCount })
      .eq('id', existing.id);
    return newCount;
  } else {
    // 新規レコードを作成
    await getSupabaseClient()
      .from('usage_records')
      .insert([{ user_id: userId, date: today, count: 1 }]);
    return 1;
  }
}

export async function getUsageInfo(userId: string): Promise<{ todayCount: number; limit: number; remaining: number }> {
  const user = await findUserById(userId);
  const limit = user?.daily_usage_limit || 50;
  const todayCount = await getTodayUsageCount(userId);
  const remaining = Math.max(0, limit - todayCount);

  return { todayCount, limit, remaining };
}

export async function canUseService(userId: string): Promise<{ canUse: boolean; remaining: number; limit: number }> {
  const user = await findUserById(userId);
  const limit = user?.daily_usage_limit || 50;
  const todayCount = await getTodayUsageCount(userId);
  const remaining = Math.max(0, limit - todayCount);
  const canUse = todayCount < limit;

  return { canUse, remaining, limit };
}

// ========================================
// BAN関連
// ========================================

export async function isUserBanned(userId: string): Promise<boolean> {
  const { data, error } = await getSupabaseClient()
    .from('ban_list')
    .select('*')
    .eq('user_id', userId)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .single();

  return !error && !!data;
}

export async function banUser(userId: string, reason: string, expiresAt?: Date): Promise<void> {
  await getSupabaseClient()
    .from('ban_list')
    .insert([{
      user_id: userId,
      reason,
      expires_at: expiresAt?.toISOString() || null,
    }]);
}

export async function unbanUser(userId: string): Promise<void> {
  await getSupabaseClient()
    .from('ban_list')
    .delete()
    .eq('user_id', userId);
}

// ========================================
// ストリーク関連
// ========================================

export async function updateStreak(userId: string): Promise<{ currentStreak: number; longestStreak: number; isNewDay: boolean }> {
  const user = await findUserById(userId);
  if (!user) {
    return { currentStreak: 0, longestStreak: 0, isNewDay: false };
  }

  const today = new Date().toISOString().split('T')[0];
  const lastActiveDate = user.last_active_date;

  let newStreak = user.current_streak;
  let isNewDay = false;

  if (!lastActiveDate) {
    // 初回アクティブ
    newStreak = 1;
    isNewDay = true;
  } else if (lastActiveDate === today) {
    // 同じ日 - 何もしない
    isNewDay = false;
  } else {
    const lastDate = new Date(lastActiveDate);
    const todayDate = new Date(today);
    const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      // 連続日
      newStreak = user.current_streak + 1;
      isNewDay = true;
    } else {
      // ストリーク切れ
      newStreak = 1;
      isNewDay = true;
    }
  }

  const newLongestStreak = Math.max(user.longest_streak, newStreak);

  if (isNewDay) {
    await updateUser(userId, {
      current_streak: newStreak,
      longest_streak: newLongestStreak,
      last_active_date: today,
    });
  }

  return {
    currentStreak: newStreak,
    longestStreak: newLongestStreak,
    isNewDay,
  };
}

// ========================================
// 統計関連
// ========================================

export async function recordUsage(userId: string): Promise<{ totalUsageCount: number; level: number; newBadges: string[] }> {
  const user = await findUserById(userId);
  if (!user) {
    return { totalUsageCount: 0, level: 1, newBadges: [] };
  }

  const newTotalUsageCount = user.total_usage_count + 1;
  const newLevel = Math.floor(newTotalUsageCount / 50) + 1;
  
  // バッジ判定
  const newBadges: string[] = [];
  const currentBadges = user.badges || [];

  // 使用回数バッジ
  if (newTotalUsageCount >= 1 && !currentBadges.includes('first_use')) {
    newBadges.push('first_use');
  }
  if (newTotalUsageCount >= 10 && !currentBadges.includes('usage_10')) {
    newBadges.push('usage_10');
  }
  if (newTotalUsageCount >= 50 && !currentBadges.includes('usage_50')) {
    newBadges.push('usage_50');
  }
  if (newTotalUsageCount >= 100 && !currentBadges.includes('usage_100')) {
    newBadges.push('usage_100');
  }

  const updatedBadges = [...currentBadges, ...newBadges];

  await updateUser(userId, {
    total_usage_count: newTotalUsageCount,
    level: newLevel,
    badges: updatedBadges,
  });

  return {
    totalUsageCount: newTotalUsageCount,
    level: newLevel,
    newBadges,
  };
}

// ========================================
// 紹介システム関連
// ========================================

export interface DbReferral {
  id: string;
  referrer_email: string;
  referred_email: string;
  referral_code: string;
  status: string;
  reward_percent: number;
  created_at: string;
  converted_at: string | null;
  notes: string | null;
}

// 紹介コード生成（完全ランダム8文字）
function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 紹介コードを取得（なければ生成）
export async function getReferralCode(email: string): Promise<string | null> {
  const user = await findUserByEmail(email);
  if (!user) return null;

  // 既に紹介コードがあればそれを返す
  if ((user as any).referral_code) {
    return (user as any).referral_code;
  }

  // なければ生成して保存
  const newCode = generateReferralCode();
  await getSupabaseClient()
    .from('users')
    .update({ referral_code: newCode })
    .eq('email', email);

  return newCode;
}

// 紹介コードが有効かチェック
export async function validateReferralCode(code: string): Promise<{ valid: boolean; referrerEmail?: string }> {
  const { data, error } = await getSupabaseClient()
    .from('users')
    .select('email')
    .eq('referral_code', code)
    .single();

  if (error || !data) {
    return { valid: false };
  }

  return { valid: true, referrerEmail: data.email };
}

// 紹介を記録（新規登録時に呼ぶ）
export async function recordReferral(referrerEmail: string, referredEmail: string, referralCode: string): Promise<boolean> {
  try {
    // 紹介履歴を保存
    const { error: insertError } = await getSupabaseClient()
      .from('sendright_referrals')
      .insert([{
        referrer_email: referrerEmail,
        referred_email: referredEmail,
        referral_code: referralCode,
        status: 'registered',
      }]);

    if (insertError) {
      console.error('Error recording referral:', insertError);
      return false;
    }

    // 紹介された人の referred_by を更新
    await getSupabaseClient()
      .from('users')
      .update({ referred_by: referralCode })
      .eq('email', referredEmail);

    return true;
  } catch (error) {
    console.error('Error in recordReferral:', error);
    return false;
  }
}

// 紹介報酬を付与（有料転換時に呼ぶ）
export async function grantReferralReward(referredEmail: string): Promise<{ success: boolean; reward?: number }> {
  try {
    // 紹介履歴を取得
    const { data: referral, error: refError } = await getSupabaseClient()
      .from('sendright_referrals')
      .select('*')
      .eq('referred_email', referredEmail)
      .eq('status', 'registered')
      .single();

    if (refError || !referral) {
      // 紹介経由ではない
      return { success: false };
    }

    // 紹介者の紹介数を更新
    const { data: referrer, error: referrerError } = await getSupabaseClient()
      .from('users')
      .select('referral_count, referral_discount_percent')
      .eq('email', referral.referrer_email)
      .single();

    if (referrerError || !referrer) {
      return { success: false };
    }

    const newReferralCount = (referrer.referral_count || 0) + 1;
    
    // 報酬計算（1人=10%, 2人=20%, 3人=50%, 5人=100%）
    let newDiscount = 10;
    if (newReferralCount >= 5) {
      newDiscount = 100;
    } else if (newReferralCount >= 3) {
      newDiscount = 50;
    } else if (newReferralCount >= 2) {
      newDiscount = 20;
    }

    // 紹介者を更新
    await getSupabaseClient()
      .from('users')
      .update({
        referral_count: newReferralCount,
        referral_discount_percent: newDiscount,
      })
      .eq('email', referral.referrer_email);

    // 紹介履歴を更新
    await getSupabaseClient()
      .from('sendright_referrals')
      .update({
        status: 'converted',
        converted_at: new Date().toISOString(),
        reward_percent: newDiscount,
      })
      .eq('id', referral.id);

    return { success: true, reward: newDiscount };
  } catch (error) {
    console.error('Error in grantReferralReward:', error);
    return { success: false };
  }
}

// 紹介履歴を取得
export async function getReferralHistory(email: string): Promise<{ referrals: DbReferral[]; totalCount: number; currentDiscount: number }> {
  const { data: referrals, error } = await getSupabaseClient()
    .from('sendright_referrals')
    .select('*')
    .eq('referrer_email', email)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching referral history:', error);
    return { referrals: [], totalCount: 0, currentDiscount: 0 };
  }

  const { data: user } = await getSupabaseClient()
    .from('users')
    .select('referral_count, referral_discount_percent')
    .eq('email', email)
    .single();

  return {
    referrals: referrals || [],
    totalCount: user?.referral_count || 0,
    currentDiscount: user?.referral_discount_percent || 0,
  };
}

// 紹介リンクを生成
export function generateReferralLink(referralCode: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://sendright.jp';
  return `${baseUrl}?ref=${referralCode}`;
}
