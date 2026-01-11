import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface User {
  id: string;
  email: string;
  passwordHash?: string; // Utage連携の場合はパスワードなし
  isSubscribed: boolean;
  subscriptionExpiresAt?: Date;
  stripeCustomerId?: string; // Stripe顧客ID
  isUtageUser: boolean; // Utageからのログインで作成されたユーザーかどうか
  dailyUsageLimit: number; // 1日の使用回数制限（デフォルト50、追加課金で増やせる）
  subscriptionType?: 'free' | 'basic' | 'pro' | 'premium' | 'monthly' | 'yearly'; // サブスクリプションの種別
  // ストリーク関連
  currentStreak: number; // 現在の連続使用日数
  longestStreak: number; // 過去最長の連続使用日数
  lastActiveDate?: string; // 最後にアクティブだった日付（YYYY-MM-DD）
  // バッジ関連
  badges: string[]; // 獲得済みバッジのIDリスト
  // 統計関連
  totalUsageCount: number; // 総使用回数
  successCount: number; // 成功した返信の数（ユーザーが「良かった」と評価した数）
  level: number; // ユーザーレベル
  createdAt: Date;
}

export interface UsageRecord {
  userId: string;
  date: string; // YYYY-MM-DD形式
  count: number;
}

// In-memory database (replace with real database in production)
let users: User[] = [];
let usageRecords: UsageRecord[] = [];

// ==============================================
// プラン別の使用回数制限（フリーミアムモデル）
// ==============================================
// 無料プラン: 1日3回（永久無料、価値を体験させる）
// ベーシック: 1日10回（月額3,980円）
// プロ: 1日50回（月額6,980円、現行プラン）
// プレミアム: 無制限（月額14,800円）

export const PLAN_LIMITS = {
  free: 3,        // 無料プラン: 1日3回
  basic: 10,      // ベーシック: 1日10回
  pro: 50,        // プロ: 1日50回（現行のデフォルト）
  premium: 9999,  // プレミアム: 実質無制限
  // 後方互換性のため
  monthly: 50,    // 月額プラン（プロ相当）
  yearly: 50,     // 年額プラン（プロ相当）
} as const;

export const DEFAULT_DAILY_USAGE_LIMIT = PLAN_LIMITS.free; // 無料プランがデフォルト

// ==============================================
// バッジ定義
// ==============================================
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

// レベル計算（総使用回数に基づく）
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

// レベル名を取得
export function getLevelName(level: number): string {
  const names = [
    '', // 0は使わない
    '初心者',
    'ルーキー',
    'アマチュア',
    'セミプロ',
    'プロ',
    'エキスパート',
    'マスター',
    'グランドマスター',
    'レジェンド',
    '神',
  ];
  return names[level] || '神';
}

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
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded;
  } catch {
    return null;
  }
}

export async function createUser(email: string, password?: string): Promise<User> {
  const passwordHash = password ? await hashPassword(password) : undefined;
  const user: User = {
    id: Date.now().toString(),
    email,
    passwordHash,
    isSubscribed: false,
    isUtageUser: false, // 通常のログインで作成されたユーザー
    dailyUsageLimit: DEFAULT_DAILY_USAGE_LIMIT, // 無料プランがデフォルト
    subscriptionType: 'free', // 無料プランから開始
    // ストリーク関連の初期化
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: undefined,
    // バッジ関連
    badges: [],
    // 統計関連
    totalUsageCount: 0,
    successCount: 0,
    level: 1,
    createdAt: new Date(),
  };
  users.push(user);
  return user;
}

export async function createOrUpdateUserFromUtage(
  email: string,
  stripeCustomerId: string,
  isSubscribed: boolean = true,
  subscriptionType?: 'free' | 'basic' | 'pro' | 'premium' | 'monthly' | 'yearly'
): Promise<User> {
  // 既存ユーザーを検索
  let user = users.find(u => u.email === email);
  
  // プランに応じた使用回数制限を設定
  const planType = subscriptionType || (isSubscribed ? 'pro' : 'free');
  const usageLimit = PLAN_LIMITS[planType as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.pro;
  
  if (user) {
    // 既存ユーザーの情報を更新
    user.stripeCustomerId = stripeCustomerId;
    user.isSubscribed = isSubscribed;
    user.isUtageUser = true; // Utageユーザーとしてマーク
    user.subscriptionType = planType;
    user.dailyUsageLimit = usageLimit;
    
    // ストリーク・統計関連のプロパティがない場合は初期化（後方互換性）
    if (user.currentStreak === undefined) user.currentStreak = 0;
    if (user.longestStreak === undefined) user.longestStreak = 0;
    if (user.badges === undefined) user.badges = [];
    if (user.totalUsageCount === undefined) user.totalUsageCount = 0;
    if (user.successCount === undefined) user.successCount = 0;
    if (user.level === undefined) user.level = 1;
    
    return user;
  } else {
    // 新規ユーザーを作成
    const newUser: User = {
      id: Date.now().toString(),
      email,
      isSubscribed,
      stripeCustomerId,
      isUtageUser: true, // Utageからのログインで作成されたユーザー
      dailyUsageLimit: usageLimit,
      subscriptionType: planType,
      // ストリーク関連の初期化
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: undefined,
      // バッジ関連
      badges: [],
      // 統計関連
      totalUsageCount: 0,
      successCount: 0,
      level: 1,
      createdAt: new Date(),
    };
    users.push(newUser);
    return newUser;
  }
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const user = users.find(u => u.email === email);
  // 既存ユーザーにisUtageUserプロパティがない場合は、デフォルトでfalseを設定（後方互換性のため）
  if (user && !('isUtageUser' in user)) {
    (user as any).isUtageUser = false;
  }
  return user;
}

export async function findUserById(id: string): Promise<User | undefined> {
  const user = users.find(u => u.id === id);
  // 既存ユーザーにisUtageUserプロパティがない場合は、デフォルトでfalseを設定（後方互換性のため）
  if (user && !('isUtageUser' in user)) {
    (user as any).isUtageUser = false;
  }
  return user;
}

export async function updateUserSubscription(
  userId: string,
  isSubscribed: boolean,
  expiresAt?: Date
): Promise<void> {
  const user = users.find(u => u.id === userId);
  if (user) {
    user.isSubscribed = isSubscribed;
    user.subscriptionExpiresAt = expiresAt;
  }
}

export function checkSubscription(user: User): boolean {
  if (!user.isSubscribed) return false;
  if (user.subscriptionExpiresAt && user.subscriptionExpiresAt < new Date()) {
    return false;
  }
  return true;
}

// 今日の日付を取得（YYYY-MM-DD形式）
function getTodayDateString(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

// ユーザーの今日の使用回数を取得
export function getTodayUsageCount(userId: string): number {
  const today = getTodayDateString();
  const record = usageRecords.find(r => r.userId === userId && r.date === today);
  return record ? record.count : 0;
}

// ユーザーの使用回数を増やす
export function incrementUsageCount(userId: string): number {
  const today = getTodayDateString();
  let record = usageRecords.find(r => r.userId === userId && r.date === today);
  
  if (!record) {
    record = {
      userId,
      date: today,
      count: 0,
    };
    usageRecords.push(record);
  }
  
  record.count++;
  return record.count;
}

// ユーザーが使用可能かチェック（ユーザーごとの制限を考慮）
export function canUseService(userId: string): { canUse: boolean; remaining: number; limit: number } {
  const user = users.find(u => u.id === userId);
  const userLimit = user?.dailyUsageLimit || DEFAULT_DAILY_USAGE_LIMIT;
  const todayCount = getTodayUsageCount(userId);
  const remaining = Math.max(0, userLimit - todayCount);
  const canUse = todayCount < userLimit;
  
  return {
    canUse,
    remaining,
    limit: userLimit,
  };
}

// 使用回数情報を取得
export function getUsageInfo(userId: string): { todayCount: number; limit: number; remaining: number } {
  const user = users.find(u => u.id === userId);
  const userLimit = user?.dailyUsageLimit || DEFAULT_DAILY_USAGE_LIMIT;
  const todayCount = getTodayUsageCount(userId);
  const remaining = Math.max(0, userLimit - todayCount);
  
  return {
    todayCount,
    limit: userLimit,
    remaining,
  };
}

// ユーザーの使用回数制限を更新（追加課金で増やす）
export function updateDailyUsageLimit(userId: string, newLimit: number): boolean {
  const user = users.find(u => u.id === userId);
  if (!user) {
    return false;
  }
  user.dailyUsageLimit = newLimit;
  return true;
}

// 使用回数を減らす（ロールバック用）
export function decrementUsageCount(userId: string): void {
  const today = getTodayDateString();
  const record = usageRecords.find(r => r.userId === userId && r.date === today);
  if (record && record.count > 0) {
    record.count--;
  }
}

// ==============================================
// ストリーク関連の関数
// ==============================================

// ストリークを更新（使用時に呼び出す）
export function updateStreak(userId: string): { 
  currentStreak: number; 
  longestStreak: number; 
  newBadges: string[];
  streakContinued: boolean;
} {
  const user = users.find(u => u.id === userId);
  if (!user) {
    return { currentStreak: 0, longestStreak: 0, newBadges: [], streakContinued: false };
  }
  
  const today = getTodayDateString();
  const yesterday = getYesterdayDateString();
  const newBadges: string[] = [];
  let streakContinued = false;
  
  // 今日既にアクティブな場合は何もしない
  if (user.lastActiveDate === today) {
    return { 
      currentStreak: user.currentStreak, 
      longestStreak: user.longestStreak, 
      newBadges: [],
      streakContinued: true 
    };
  }
  
  // ストリークの更新
  if (user.lastActiveDate === yesterday) {
    // 昨日もアクティブだった → ストリーク継続
    user.currentStreak = (user.currentStreak || 0) + 1;
    streakContinued = true;
  } else if (!user.lastActiveDate) {
    // 初めての使用
    user.currentStreak = 1;
    streakContinued = true;
  } else {
    // ストリーク途切れ → リセット
    user.currentStreak = 1;
    streakContinued = false;
  }
  
  // 最長ストリークの更新
  if (user.currentStreak > (user.longestStreak || 0)) {
    user.longestStreak = user.currentStreak;
  }
  
  // 最終アクティブ日を更新
  user.lastActiveDate = today;
  
  // ストリークバッジのチェック
  const streakBadges = [
    { threshold: 3, badge: BADGES.STREAK_3 },
    { threshold: 7, badge: BADGES.STREAK_7 },
    { threshold: 30, badge: BADGES.STREAK_30 },
    { threshold: 100, badge: BADGES.STREAK_100 },
  ];
  
  for (const { threshold, badge } of streakBadges) {
    if (user.currentStreak >= threshold && !user.badges.includes(badge.id)) {
      user.badges.push(badge.id);
      newBadges.push(badge.id);
    }
  }
  
  return { 
    currentStreak: user.currentStreak, 
    longestStreak: user.longestStreak, 
    newBadges,
    streakContinued 
  };
}

// 昨日の日付を取得
function getYesterdayDateString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

// ストリーク情報を取得
export function getStreakInfo(userId: string): {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate?: string;
  isActiveToday: boolean;
  willExpireSoon: boolean; // 今日使わないとストリークが切れる
} {
  const user = users.find(u => u.id === userId);
  if (!user) {
    return { 
      currentStreak: 0, 
      longestStreak: 0, 
      isActiveToday: false,
      willExpireSoon: false 
    };
  }
  
  const today = getTodayDateString();
  const yesterday = getYesterdayDateString();
  const isActiveToday = user.lastActiveDate === today;
  const willExpireSoon = user.lastActiveDate === yesterday && !isActiveToday && user.currentStreak > 0;
  
  return {
    currentStreak: user.currentStreak || 0,
    longestStreak: user.longestStreak || 0,
    lastActiveDate: user.lastActiveDate,
    isActiveToday,
    willExpireSoon,
  };
}

// ==============================================
// 統計・バッジ関連の関数
// ==============================================

// 使用回数を記録し、バッジをチェック
export function recordUsage(userId: string): {
  totalUsageCount: number;
  level: number;
  newBadges: string[];
} {
  const user = users.find(u => u.id === userId);
  if (!user) {
    return { totalUsageCount: 0, level: 1, newBadges: [] };
  }
  
  const newBadges: string[] = [];
  
  // 総使用回数を増やす
  user.totalUsageCount = (user.totalUsageCount || 0) + 1;
  
  // レベルを計算
  const newLevel = calculateLevel(user.totalUsageCount);
  user.level = newLevel;
  
  // 初使用バッジ
  if (user.totalUsageCount === 1 && !user.badges.includes(BADGES.FIRST_USE.id)) {
    user.badges.push(BADGES.FIRST_USE.id);
    newBadges.push(BADGES.FIRST_USE.id);
  }
  
  // 使用回数バッジのチェック
  const usageBadges = [
    { threshold: 10, badge: BADGES.USAGE_10 },
    { threshold: 50, badge: BADGES.USAGE_50 },
    { threshold: 100, badge: BADGES.USAGE_100 },
    { threshold: 500, badge: BADGES.USAGE_500 },
  ];
  
  for (const { threshold, badge } of usageBadges) {
    if (user.totalUsageCount >= threshold && !user.badges.includes(badge.id)) {
      user.badges.push(badge.id);
      newBadges.push(badge.id);
    }
  }
  
  return {
    totalUsageCount: user.totalUsageCount,
    level: user.level,
    newBadges,
  };
}

// 成功を記録（ユーザーが「良かった」評価をした時）
export function recordSuccess(userId: string): {
  successCount: number;
  successRate: number;
  newBadges: string[];
} {
  const user = users.find(u => u.id === userId);
  if (!user) {
    return { successCount: 0, successRate: 0, newBadges: [] };
  }
  
  const newBadges: string[] = [];
  
  // 成功回数を増やす
  user.successCount = (user.successCount || 0) + 1;
  
  // 成功率を計算
  const successRate = user.totalUsageCount > 0 
    ? Math.round((user.successCount / user.totalUsageCount) * 100) 
    : 0;
  
  // 初成功バッジ
  if (user.successCount === 1 && !user.badges.includes(BADGES.FIRST_SUCCESS.id)) {
    user.badges.push(BADGES.FIRST_SUCCESS.id);
    newBadges.push(BADGES.FIRST_SUCCESS.id);
  }
  
  // 成功率バッジ
  if (successRate >= 50 && user.totalUsageCount >= 10 && !user.badges.includes(BADGES.SUCCESS_RATE_50.id)) {
    user.badges.push(BADGES.SUCCESS_RATE_50.id);
    newBadges.push(BADGES.SUCCESS_RATE_50.id);
  }
  
  return {
    successCount: user.successCount,
    successRate,
    newBadges,
  };
}

// ユーザーの全統計情報を取得
export function getUserStats(userId: string): {
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
} | null {
  const user = users.find(u => u.id === userId);
  if (!user) return null;
  
  const todayUsageCount = getTodayUsageCount(userId);
  const successRate = user.totalUsageCount > 0 
    ? Math.round((user.successCount / user.totalUsageCount) * 100) 
    : 0;
  
  return {
    totalUsageCount: user.totalUsageCount || 0,
    successCount: user.successCount || 0,
    successRate,
    level: user.level || 1,
    levelName: getLevelName(user.level || 1),
    badges: user.badges || [],
    currentStreak: user.currentStreak || 0,
    longestStreak: user.longestStreak || 0,
    subscriptionType: user.subscriptionType || 'free',
    dailyUsageLimit: user.dailyUsageLimit || DEFAULT_DAILY_USAGE_LIMIT,
    todayUsageCount,
    todayRemaining: Math.max(0, (user.dailyUsageLimit || DEFAULT_DAILY_USAGE_LIMIT) - todayUsageCount),
  };
}

// プランをアップグレード
export function upgradePlan(
  userId: string, 
  newPlan: 'basic' | 'pro' | 'premium'
): boolean {
  const user = users.find(u => u.id === userId);
  if (!user) return false;
  
  user.subscriptionType = newPlan;
  user.dailyUsageLimit = PLAN_LIMITS[newPlan];
  user.isSubscribed = true;
  
  return true;
}

// プランをダウングレード（解約時）
export function downgradePlan(userId: string): boolean {
  const user = users.find(u => u.id === userId);
  if (!user) return false;
  
  user.subscriptionType = 'free';
  user.dailyUsageLimit = PLAN_LIMITS.free;
  user.isSubscribed = false;
  
  return true;
}

















