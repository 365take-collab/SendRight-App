import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase設定
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// サーバーサイド用クライアント（service_roleキーを使用）
// ビルド時は環境変数がないためnullになる可能性がある
let supabase: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
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

export const supabaseAdmin = {
  from: (...args: Parameters<SupabaseClient['from']>) => getSupabaseClient().from(...args),
};

// ========================================
// 型定義
// ========================================

export interface DbUser {
  id: string;
  email: string;
  password_hash: string | null;
  stripe_customer_id: string | null;
  referral_code: string | null;
  is_subscribed: boolean;
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

export async function decrementUsageCount(userId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  const { data: existing } = await getSupabaseClient()
    .from('usage_records')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .single();

  if (!existing) {
    return;
  }

  const newCount = Math.max(0, (existing.count || 0) - 1);
  if (newCount === 0) {
    await getSupabaseClient()
      .from('usage_records')
      .delete()
      .eq('id', existing.id);
  } else {
    await getSupabaseClient()
      .from('usage_records')
      .update({ count: newCount })
      .eq('id', existing.id);
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
// AI返信履歴関連
// ========================================

export interface DbResponseHistory {
  id: string;
  user_id: string;
  her_message: string;
  response: string;
  explanation: string | null;
  alternatives: any[] | null;
  conversation_history: any[] | null;
  full_conversation_text: string | null;
  profile_context: string | null;
  goal: string | null;
  tone: string | null;
  response_type: string | null;
  ai_provider: string | null;
  ai_model: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

export async function createResponseHistory(input: {
  userId: string;
  herMessage: string;
  response: string;
  explanation?: string;
  alternatives?: any[];
  conversationHistory?: any[];
  fullConversationText?: string;
  profileContext?: string;
  goal?: string;
  tone?: string;
  responseType?: string;
  aiProvider?: string;
  aiModel?: string;
  metadata?: Record<string, any>;
}): Promise<DbResponseHistory | null> {
  const { data, error } = await getSupabaseClient()
    .from('response_histories')
    .insert([{
      user_id: input.userId,
      her_message: input.herMessage,
      response: input.response,
      explanation: input.explanation || null,
      alternatives: input.alternatives || [],
      conversation_history: input.conversationHistory || null,
      full_conversation_text: input.fullConversationText || null,
      profile_context: input.profileContext || null,
      goal: input.goal || null,
      tone: input.tone || null,
      response_type: input.responseType || null,
      ai_provider: input.aiProvider || null,
      ai_model: input.aiModel || null,
      metadata: input.metadata || {},
    }])
    .select()
    .single();

  if (error || !data) {
    console.error('Error creating response history:', error);
    return null;
  }
  return data as DbResponseHistory;
}

export async function listResponseHistories(input: {
  userId: string;
  limit?: number;
  before?: string;
}): Promise<DbResponseHistory[]> {
  let query = getSupabaseClient()
    .from('response_histories')
    .select('*')
    .eq('user_id', input.userId)
    .order('created_at', { ascending: false })
    .limit(input.limit || 20);

  if (input.before) {
    query = query.lt('created_at', input.before);
  }

  const { data, error } = await query;
  if (error || !data) {
    console.error('Error listing response histories:', error);
    return [];
  }
  return data as DbResponseHistory[];
}

export async function findResponseHistoryById(
  id: string,
  userId: string
): Promise<DbResponseHistory | null> {
  const { data, error } = await getSupabaseClient()
    .from('response_histories')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }
  return data as DbResponseHistory;
}

// ========================================
// 返信フィードバック関連
// ========================================

export interface DbResponseFeedback {
  id: string;
  user_id: string;
  response_id: string;
  rating: string;
  reason: string | null;
  tags: string[] | null;
  goal_achieved: boolean | null;
  created_at: string;
}

export async function createResponseFeedback(input: {
  userId: string;
  responseId: string;
  rating: string;
  reason?: string;
  tags?: string[];
  goalAchieved?: boolean;
}): Promise<DbResponseFeedback | null> {
  const { data, error } = await getSupabaseClient()
    .from('response_feedback')
    .insert([{
      user_id: input.userId,
      response_id: input.responseId,
      rating: input.rating,
      reason: input.reason || null,
      tags: input.tags || null,
      goal_achieved: typeof input.goalAchieved === 'boolean' ? input.goalAchieved : null,
    }])
    .select()
    .single();

  if (error || !data) {
    if (error?.code === '23505') {
      return null;
    }
    console.error('Error creating response feedback:', error);
    return null;
  }
  return data as DbResponseFeedback;
}

export async function findResponseFeedback(
  responseId: string,
  userId: string
): Promise<DbResponseFeedback | null> {
  const { data, error } = await getSupabaseClient()
    .from('response_feedback')
    .select('*')
    .eq('response_id', responseId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }
  return data as DbResponseFeedback;
}

// ========================================
// 成功パターンDB（高評価セッションのナレッジ化）
// ========================================

export interface DbSuccessPattern {
  id: string;
  user_id: string;
  response_id: string;
  task_text: string;
  her_message: string;
  response: string;
  knowledge: Record<string, any> | null;
  created_at: string;
}

export async function createSuccessPattern(input: {
  userId: string;
  responseId: string;
  taskText: string;
  herMessage: string;
  response: string;
  knowledge: Record<string, any>;
}): Promise<DbSuccessPattern | null> {
  const { data, error } = await getSupabaseClient()
    .from('success_patterns')
    .insert([{
      user_id: input.userId,
      response_id: input.responseId,
      task_text: input.taskText,
      her_message: input.herMessage,
      response: input.response,
      knowledge: input.knowledge,
    }])
    .select()
    .single();

  if (error || !data) {
    // Duplicate (user_id, response_id) -> ignore
    if (error?.code === '23505') return null;
    console.error('Error creating success pattern:', error);
    return null;
  }
  return data as DbSuccessPattern;
}

export async function listSuccessPatternsForUser(input: {
  userId: string;
  limit?: number;
}): Promise<DbSuccessPattern[]> {
  const { data, error } = await getSupabaseClient()
    .from('success_patterns')
    .select('*')
    .eq('user_id', input.userId)
    .order('created_at', { ascending: false })
    .limit(input.limit || 50);

  if (error || !data) {
    console.error('Error listing success patterns:', error);
    return [];
  }
  return data as DbSuccessPattern[];
}

// ========================================
// Stripe webhook冪等性
// ========================================

export async function recordStripeWebhookEvent(input: {
  eventId: string;
  eventType: string;
  stripeCreatedAt?: string;
}): Promise<{ created: boolean }> {
  const { error } = await getSupabaseClient()
    .from('stripe_webhook_events')
    .insert([{
      event_id: input.eventId,
      event_type: input.eventType,
      stripe_created_at: input.stripeCreatedAt || null,
      status: 'processing',
    }]);

  if (error) {
    if (error.code === '23505') {
      return { created: false };
    }
    console.error('Error recording stripe webhook event:', error);
    throw error;
  }

  return { created: true };
}

export async function markStripeWebhookEventProcessed(eventId: string, status: 'processed' | 'ignored' = 'processed') {
  const { error } = await getSupabaseClient()
    .from('stripe_webhook_events')
    .update({
      status,
      processed_at: new Date().toISOString(),
      last_error: null,
    })
    .eq('event_id', eventId);

  if (error) {
    console.error('Error updating stripe webhook event:', error);
  }
}

export async function markStripeWebhookEventFailed(eventId: string, errorMessage: string) {
  const trimmedError = errorMessage.length > 1000 ? `${errorMessage.slice(0, 1000)}...` : errorMessage;
  const { error } = await getSupabaseClient()
    .from('stripe_webhook_events')
    .update({
      status: 'failed',
      processed_at: new Date().toISOString(),
      last_error: trimmedError,
    })
    .eq('event_id', eventId);

  if (error) {
    console.error('Error updating stripe webhook event failure:', error);
  }
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
export async function grantReferralReward(referredEmail: string): Promise<{ success: boolean; reward?: number; freeMonths?: number }> {
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
      .select('referral_count, referral_free_months')
      .eq('email', referral.referrer_email)
      .single();

    if (referrerError || !referrer) {
      return { success: false };
    }

    const oldReferralCount = referrer.referral_count || 0;
    const newReferralCount = oldReferralCount + 1;
    
    // 報酬計算（1人紹介につき1ヶ月無料、最大12ヶ月）
    const newFreeMonths = Math.min(newReferralCount, 12);

    // 紹介者を更新
    await getSupabaseClient()
      .from('users')
      .update({
        referral_count: newReferralCount,
        referral_free_months: newFreeMonths,
      })
      .eq('email', referral.referrer_email);

    // 紹介履歴を更新
    await getSupabaseClient()
      .from('sendright_referrals')
      .update({
        status: 'converted',
        converted_at: new Date().toISOString(),
      })
      .eq('id', referral.id);

    // 🎉 紹介特典メールを自動送信（3人、5人、10人達成時）
    const bonusResult = await sendReferralBonusViaResend(
      referral.referrer_email,
      newReferralCount,
      oldReferralCount
    );

    if (bonusResult.sent) {
      console.log(`Referral bonus email sent for threshold ${bonusResult.threshold}`);
    }

    return { success: true, freeMonths: newFreeMonths };
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

// ========================================
// 紹介特典メール送信（Resend経由）
// ========================================

const REFERRAL_BONUS_THRESHOLDS: Record<number, string> = {
  3: 'モテるLINEテクニック集',
  5: 'デート成功率3倍マニュアル',
  10: '1時間オンライン恋愛コンサル',
};

// 紹介特典メールをResendで送信
async function sendReferralBonusViaResend(
  email: string,
  newReferralCount: number,
  oldReferralCount: number
): Promise<{ sent: boolean; threshold?: number }> {
  const { sendReferralBonusEmail } = await import('@/lib/resend');
  const thresholds = [3, 5, 10];

  for (const threshold of thresholds) {
    if (newReferralCount >= threshold && oldReferralCount < threshold) {
      const bonusName = REFERRAL_BONUS_THRESHOLDS[threshold];
      if (!bonusName) continue;

      try {
        // 既に送信済みかチェック
        const { data: existingBonus } = await getSupabaseClient()
          .from('sendright_referral_bonuses')
          .select('id')
          .eq('user_email', email)
          .eq('bonus_type', `bonus_${threshold}`)
          .single();

        if (existingBonus) {
          console.log(`Already sent bonus_${threshold} to ${email}`);
          continue;
        }

        // Resendでメール送信
        await sendReferralBonusEmail(email, threshold, bonusName);

        // 送信履歴を記録
        await getSupabaseClient()
          .from('sendright_referral_bonuses')
          .insert({
            user_email: email,
            bonus_type: `bonus_${threshold}`,
            bonus_name: bonusName,
            delivery_method: 'resend',
          });

        console.log(`Sent referral bonus (${threshold}) to ${email} via Resend`);
        return { sent: true, threshold };
      } catch (error) {
        console.error(`Error sending referral bonus for ${email} at threshold ${threshold}:`, error);
      }
    }
  }

  return { sent: false };
}
