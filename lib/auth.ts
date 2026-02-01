import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import * as db from './supabase';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// ========================================
// 型定義（後方互換性のため維持）
// ========================================

export interface User {
  id: string;
  email: string;
  passwordHash?: string;
  isSubscribed: boolean;
  subscriptionExpiresAt?: Date;
  stripeCustomerId?: string;
  isUtageUser: boolean;
  dailyUsageLimit: number;
  subscriptionType?: 'free' | 'basic' | 'pro' | 'premium' | 'monthly' | 'yearly';
  currentStreak: number;
  longestStreak: number;
  lastActiveDate?: string;
  badges: string[];
  totalUsageCount: number;
  successCount: number;
  level: number;
  createdAt: Date;
}

export interface UsageRecord {
  userId: string;
  date: string;
  count: number;
}

// ========================================
// プラン設定
// ========================================

export const PLAN_LIMITS = {
  free: 3,
  basic: 10,
  pro: 50,
  premium: 9999,
  monthly: 50,
  yearly: 50,
} as const;

export const DEFAULT_DAILY_USAGE_LIMIT = PLAN_LIMITS.pro; // 課金ユーザーのみなのでproがデフォルト

// ========================================
// バッジ定義
// ========================================

export const BADGES = {
  FIRST_USE: { id: 'first_use', name: '🎯 初使用', description: '初めてAIアドバイスを使った' },
  STREAK_3: { id: 'streak_3', name: '🔥 3日連続', description: '3日連続で使用' },
  STREAK_7: { id: 'streak_7', name: '🔥 1週間継続', description: '7日連続で使用' },
  STREAK_30: { id: 'streak_30', name: '🏅 1ヶ月マスター', description: '30日連続で使用' },
  STREAK_100: { id: 'streak_100', name: '👑 レジェンド', description: '100日連続で使用' },
  USAGE_10: { id: 'usage_10', name: '📊 10回達成', description: '10回使用' },
  USAGE_50: { id: 'usage_50', name: '📊 50回達成', description: '50回使用' },
  USAGE_100: { id: 'usage_100', name: '💯 100回達成', description: '100回使用' },
  USAGE_500: { id: 'usage_500', name: '🚀 500回達成', description: '500回使用' },
  SUCCESS_RATE_50: { id: 'success_rate_50', name: '📈 成功率50%', description: '成功率が50%を超えた' },
  FIRST_SUCCESS: { id: 'first_success', name: '🎉 初成功', description: '初めて「良かった」評価をした' },
} as const;

// ========================================
// ヘルパー関数
// ========================================

// ランダムな初期パスワードを生成（英数字8文字）
export function generateInitialPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export function calculateLevel(totalUsageCount: number): number {
  if (totalUsageCount >= 1000) return 10;
  if (totalUsageCount >= 500) return 9;
  if (totalUsageCount >= 300) return 8;
  if (totalUsageCount >= 200) return 7;
  if (totalUsageCount >= 100) return 6;
  if (totalUsageCount >= 50) return 5;
  if (totalUsageCount >= 30) return 4;
  if (totalUsageCount >= 15) return 3;
  if (totalUsageCount >= 5) return 2;
  return 1;
}

export function getLevelName(level: number): string {
  const names = ['', '初心者', 'ルーキー', 'アマチュア', 'セミプロ', 'プロ', 'エキスパート', 'マスター', 'グランドマスター', 'レジェンド', '神'];
  return names[level] || '神';
}

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function getYesterdayDateString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

// DbUser → User 変換
function dbUserToUser(dbUser: db.DbUser): User {
  return {
    id: dbUser.id,
    email: dbUser.email,
    passwordHash: dbUser.password_hash || undefined,
    isSubscribed: dbUser.is_subscribed,
    stripeCustomerId: dbUser.stripe_customer_id || undefined,
    isUtageUser: dbUser.is_utage_user,
    dailyUsageLimit: dbUser.daily_usage_limit,
    subscriptionType: dbUser.subscription_type as User['subscriptionType'],
    currentStreak: dbUser.current_streak,
    longestStreak: dbUser.longest_streak,
    lastActiveDate: dbUser.last_active_date || undefined,
    badges: dbUser.badges,
    totalUsageCount: dbUser.total_usage_count,
    successCount: dbUser.success_count,
    level: dbUser.level,
    createdAt: new Date(dbUser.created_at),
  };
}

// ========================================
// 認証関連
// ========================================

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

// ========================================
// ユーザー関連（Supabase版）
// ========================================

export async function createUser(email: string, password?: string): Promise<User> {
  const passwordHash = password ? await hashPassword(password) : undefined;

  const dbUser = await db.createUser({
    email,
    password_hash: passwordHash || null,
    is_subscribed: false,
    is_utage_user: false,
    daily_usage_limit: DEFAULT_DAILY_USAGE_LIMIT,
    subscription_type: 'free',
    current_streak: 0,
    longest_streak: 0,
    badges: [],
    total_usage_count: 0,
    success_count: 0,
    level: 1,
  });

  if (!dbUser) {
    throw new Error('Failed to create user');
  }

  return dbUserToUser(dbUser);
}

export async function createOrUpdateUserFromUtage(
  email: string,
  stripeCustomerId: string,
  isSubscribed: boolean = true,
  subscriptionType?: 'free' | 'basic' | 'pro' | 'premium' | 'monthly' | 'yearly'
): Promise<User> {
  const planType = subscriptionType || (isSubscribed ? 'pro' : 'free');
  const usageLimit = PLAN_LIMITS[planType as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.pro;

  // 既存ユーザーを検索
  const existingUser = await db.findUserByEmail(email);

  if (existingUser) {
    // 既存ユーザーを更新
    const updated = await db.updateUser(existingUser.id, {
      stripe_customer_id: stripeCustomerId,
      is_subscribed: isSubscribed,
      is_utage_user: true,
      subscription_type: planType,
      daily_usage_limit: usageLimit,
    });
    return dbUserToUser(updated || existingUser);
  } else {
    // 新規ユーザーを作成
    const newUser = await db.createUser({
      email,
      stripe_customer_id: stripeCustomerId,
      is_subscribed: isSubscribed,
      is_utage_user: true,
      subscription_type: planType,
      daily_usage_limit: usageLimit,
      current_streak: 0,
      longest_streak: 0,
      badges: [],
      total_usage_count: 0,
      success_count: 0,
      level: 1,
    });

    if (!newUser) {
      throw new Error('Failed to create user');
    }

    return dbUserToUser(newUser);
  }
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const dbUser = await db.findUserByEmail(email);
  return dbUser ? dbUserToUser(dbUser) : undefined;
}

export async function findUserById(id: string): Promise<User | undefined> {
  const dbUser = await db.findUserById(id);
  return dbUser ? dbUserToUser(dbUser) : undefined;
}

export async function updateUserSubscription(
  userId: string,
  isSubscribed: boolean,
  expiresAt?: Date
): Promise<void> {
  await db.updateUser(userId, {
    is_subscribed: isSubscribed,
  });
}

export function checkSubscription(user: User): boolean {
  if (!user.isSubscribed) return false;
  if (user.subscriptionExpiresAt && user.subscriptionExpiresAt < new Date()) {
    return false;
  }
  return true;
}

// ========================================
// 使用回数関連（Supabase版）
// ========================================

export async function getTodayUsageCount(userId: string): Promise<number> {
  return db.getTodayUsageCount(userId);
}

export async function incrementUsageCount(userId: string): Promise<number> {
  return db.incrementUsageCount(userId);
}

export async function canUseService(userId: string): Promise<{ canUse: boolean; remaining: number; limit: number }> {
  return db.canUseService(userId);
}

export async function getUsageInfo(userId: string): Promise<{ todayCount: number; limit: number; remaining: number }> {
  return db.getUsageInfo(userId);
}

export async function updateDailyUsageLimit(userId: string, newLimit: number): Promise<boolean> {
  const result = await db.updateUser(userId, { daily_usage_limit: newLimit });
  return !!result;
}

export async function decrementUsageCount(userId: string): Promise<void> {
  // Supabase版では実装省略（必要に応じて追加）
  console.warn('decrementUsageCount is not implemented for Supabase');
}

// ========================================
// ストリーク関連（Supabase版）
// ========================================

export async function updateStreak(userId: string): Promise<{
  currentStreak: number;
  longestStreak: number;
  newBadges: string[];
  streakContinued: boolean;
}> {
  const user = await db.findUserById(userId);
  if (!user) {
    return { currentStreak: 0, longestStreak: 0, newBadges: [], streakContinued: false };
  }

  const today = getTodayDateString();
  const yesterday = getYesterdayDateString();
  const newBadges: string[] = [];
  let streakContinued = false;
  let newStreak = user.current_streak;

  if (user.last_active_date === today) {
    return {
      currentStreak: user.current_streak,
      longestStreak: user.longest_streak,
      newBadges: [],
      streakContinued: true,
    };
  }

  if (user.last_active_date === yesterday) {
    newStreak = user.current_streak + 1;
    streakContinued = true;
  } else if (!user.last_active_date) {
    newStreak = 1;
    streakContinued = true;
  } else {
    newStreak = 1;
    streakContinued = false;
  }

  const newLongestStreak = Math.max(user.longest_streak, newStreak);

  // バッジチェック
  const currentBadges = user.badges || [];
  const streakBadges = [
    { threshold: 3, badge: BADGES.STREAK_3 },
    { threshold: 7, badge: BADGES.STREAK_7 },
    { threshold: 30, badge: BADGES.STREAK_30 },
    { threshold: 100, badge: BADGES.STREAK_100 },
  ];

  for (const { threshold, badge } of streakBadges) {
    if (newStreak >= threshold && !currentBadges.includes(badge.id)) {
      newBadges.push(badge.id);
    }
  }

  // DB更新
  await db.updateUser(userId, {
    current_streak: newStreak,
    longest_streak: newLongestStreak,
    last_active_date: today,
    badges: [...currentBadges, ...newBadges],
  });

  return {
    currentStreak: newStreak,
    longestStreak: newLongestStreak,
    newBadges,
    streakContinued,
  };
}

export async function getStreakInfo(userId: string): Promise<{
  currentStreak: number;
  longestStreak: number;
  lastActiveDate?: string;
  isActiveToday: boolean;
  willExpireSoon: boolean;
}> {
  const user = await db.findUserById(userId);
  if (!user) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      isActiveToday: false,
      willExpireSoon: false,
    };
  }

  const today = getTodayDateString();
  const yesterday = getYesterdayDateString();
  const isActiveToday = user.last_active_date === today;
  const willExpireSoon = user.last_active_date === yesterday && !isActiveToday && user.current_streak > 0;

  return {
    currentStreak: user.current_streak,
    longestStreak: user.longest_streak,
    lastActiveDate: user.last_active_date || undefined,
    isActiveToday,
    willExpireSoon,
  };
}

// ========================================
// 統計・バッジ関連（Supabase版）
// ========================================

export async function recordUsage(userId: string): Promise<{
  totalUsageCount: number;
  level: number;
  newBadges: string[];
}> {
  const user = await db.findUserById(userId);
  if (!user) {
    return { totalUsageCount: 0, level: 1, newBadges: [] };
  }

  const newBadges: string[] = [];
  const newTotalUsageCount = user.total_usage_count + 1;
  const newLevel = calculateLevel(newTotalUsageCount);
  const currentBadges = user.badges || [];

  // バッジチェック
  if (newTotalUsageCount === 1 && !currentBadges.includes(BADGES.FIRST_USE.id)) {
    newBadges.push(BADGES.FIRST_USE.id);
  }

  const usageBadges = [
    { threshold: 10, badge: BADGES.USAGE_10 },
    { threshold: 50, badge: BADGES.USAGE_50 },
    { threshold: 100, badge: BADGES.USAGE_100 },
    { threshold: 500, badge: BADGES.USAGE_500 },
  ];

  for (const { threshold, badge } of usageBadges) {
    if (newTotalUsageCount >= threshold && !currentBadges.includes(badge.id)) {
      newBadges.push(badge.id);
    }
  }

  // DB更新
  await db.updateUser(userId, {
    total_usage_count: newTotalUsageCount,
    level: newLevel,
    badges: [...currentBadges, ...newBadges],
  });

  return {
    totalUsageCount: newTotalUsageCount,
    level: newLevel,
    newBadges,
  };
}

export async function recordSuccess(userId: string): Promise<{
  successCount: number;
  successRate: number;
  newBadges: string[];
}> {
  const user = await db.findUserById(userId);
  if (!user) {
    return { successCount: 0, successRate: 0, newBadges: [] };
  }

  const newBadges: string[] = [];
  const newSuccessCount = user.success_count + 1;
  const successRate = user.total_usage_count > 0
    ? Math.round((newSuccessCount / user.total_usage_count) * 100)
    : 0;
  const currentBadges = user.badges || [];

  if (newSuccessCount === 1 && !currentBadges.includes(BADGES.FIRST_SUCCESS.id)) {
    newBadges.push(BADGES.FIRST_SUCCESS.id);
  }

  if (successRate >= 50 && user.total_usage_count >= 10 && !currentBadges.includes(BADGES.SUCCESS_RATE_50.id)) {
    newBadges.push(BADGES.SUCCESS_RATE_50.id);
  }

  await db.updateUser(userId, {
    success_count: newSuccessCount,
    badges: [...currentBadges, ...newBadges],
  });

  return {
    successCount: newSuccessCount,
    successRate,
    newBadges,
  };
}

export async function getUserStats(userId: string): Promise<{
  totalUsageCount: number;
  successCount: number;
  successRate: number;
  level: number;
  levelName: string;
  badges: string[];
  currentStreak: number;
  longestStreak: number;
  subscriptionType: string;
  dailyUsageLimit: number;
  todayUsageCount: number;
  todayRemaining: number;
} | null> {
  const user = await db.findUserById(userId);
  if (!user) return null;

  const todayUsageCount = await db.getTodayUsageCount(userId);
  const successRate = user.total_usage_count > 0
    ? Math.round((user.success_count / user.total_usage_count) * 100)
    : 0;

  return {
    totalUsageCount: user.total_usage_count,
    successCount: user.success_count,
    successRate,
    level: user.level,
    levelName: getLevelName(user.level),
    badges: user.badges,
    currentStreak: user.current_streak,
    longestStreak: user.longest_streak,
    subscriptionType: user.subscription_type,
    dailyUsageLimit: user.daily_usage_limit,
    todayUsageCount,
    todayRemaining: Math.max(0, user.daily_usage_limit - todayUsageCount),
  };
}

export async function upgradePlan(
  userId: string,
  newPlan: 'basic' | 'pro' | 'premium'
): Promise<boolean> {
  const result = await db.updateUser(userId, {
    subscription_type: newPlan,
    daily_usage_limit: PLAN_LIMITS[newPlan],
    is_subscribed: true,
  });
  return !!result;
}

export async function downgradePlan(userId: string): Promise<boolean> {
  const result = await db.updateUser(userId, {
    subscription_type: 'free',
    daily_usage_limit: PLAN_LIMITS.free,
    is_subscribed: false,
  });
  return !!result;
}
