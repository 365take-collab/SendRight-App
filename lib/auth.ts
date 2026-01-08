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
  subscriptionType?: 'monthly' | 'yearly'; // サブスクリプションの種別（月額/年額）
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

// 1日の使用回数制限（デフォルト値）
// Groq APIの無料プラン制限（1日5,000-10,000リクエスト）を考慮
// 100人を想定: 50回/ユーザー × 100人 = 5,000回/日（安全）
// 将来的に数万人になった場合は、Groq APIの有料プランまたは複数APIキーのローテーションが必要
export const DEFAULT_DAILY_USAGE_LIMIT = 50; // デフォルトは1日50回まで（Groq API制限を考慮）

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
    dailyUsageLimit: DEFAULT_DAILY_USAGE_LIMIT, // デフォルトは50回
    createdAt: new Date(),
  };
  users.push(user);
  return user;
}

export async function createOrUpdateUserFromUtage(
  email: string,
  stripeCustomerId: string,
  isSubscribed: boolean = true,
  subscriptionType?: 'monthly' | 'yearly'
): Promise<User> {
  // 既存ユーザーを検索
  let user = users.find(u => u.email === email);
  
  if (user) {
    // 既存ユーザーの情報を更新
    user.stripeCustomerId = stripeCustomerId;
    user.isSubscribed = isSubscribed;
    user.isUtageUser = true; // Utageユーザーとしてマーク
    if (subscriptionType) {
      user.subscriptionType = subscriptionType;
    }
    // dailyUsageLimitが設定されていない場合はデフォルト値を設定（後方互換性のため）
    if (!user.dailyUsageLimit) {
      user.dailyUsageLimit = DEFAULT_DAILY_USAGE_LIMIT;
    }
    return user;
  } else {
    // 新規ユーザーを作成
    const newUser: User = {
      id: Date.now().toString(),
      email,
      isSubscribed,
      stripeCustomerId,
      isUtageUser: true, // Utageからのログインで作成されたユーザー
      dailyUsageLimit: DEFAULT_DAILY_USAGE_LIMIT, // デフォルトは50回
      subscriptionType: subscriptionType || 'monthly', // デフォルトは月額
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

















