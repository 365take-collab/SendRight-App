export interface User {
  id: string;
  email: string;
  isSubscribed: boolean;
  subscriptionExpiresAt?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export async function register(email: string, password: string): Promise<AuthResponse> {
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'サーバーエラーが発生しました' }));
      throw new Error(errorData.error || `登録に失敗しました (${response.status})`);
    }

    return response.json();
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error('ネットワークエラーが発生しました。サーバーが起動しているか確認してください。');
  }
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'ログインに失敗しました');
  }

  return response.json();
}

export async function getCurrentUser(token: string): Promise<{ user: User }> {
  const response = await fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'ユーザー情報の取得に失敗しました');
  }

  return response.json();
}

export interface AlternativeResponse {
  response: string;
  explanation: string;
}

export interface UsageInfo {
  todayCount: number;
  limit: number;
  remaining: number;
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate?: string;
  isActiveToday?: boolean;
  willExpireSoon?: boolean;
}

export interface UserStats {
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
}

export interface Badge {
  id: string;
  name: string;
  description: string;
}

// ゴール選択肢
export const GOALS = [
  { id: 'date', label: 'デートに誘いたい', icon: '🍽️' },
  { id: 'line', label: 'LINE交換したい', icon: '📱' },
  { id: 'deepen', label: '関係を深めたい', icon: '💕' },
  { id: 'second_date', label: '2回目のデートに誘いたい', icon: '🌟' },
  { id: 'keep_contact', label: '連絡を途切れさせたくない', icon: '💬' },
  { id: 'close', label: 'クロージングしたい', icon: '🔥' },
] as const;

export type GoalId = typeof GOALS[number]['id'];

// ゴール駆動型の分析結果
export interface GoalDrivenAnalysis {
  temperature: number; // 1-10
  distanceToGoal: 'close' | 'medium' | 'far';
  timing: 'now' | 'soon' | 'not_yet';
  summary: string;
}

// ゴール駆動型の次のステップ
export interface NextStep {
  condition: string;
  response: string;
}

// ゴール駆動型の追加情報
export interface GoalDrivenInfo {
  analysis: GoalDrivenAnalysis;
  strategy: string;
  nextSteps: NextStep[];
}

export interface AIResponse {
  response: string;
  explanation: string;
  alternatives?: AlternativeResponse[]; // 代替返信候補（それぞれに解説付き）
  usageInfo?: UsageInfo; // 使用回数情報
  streakInfo?: StreakInfo; // ストリーク情報
  userStats?: Partial<UserStats>; // ユーザー統計情報
  goalDriven?: GoalDrivenInfo | null; // ゴール駆動型の追加情報
}

export async function generateAIResponse(
  token: string,
  herMessage: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
  _tone?: 'casual' | 'friendly' | 'romantic' | 'playful', // 未使用（後方互換性のため残す）
  fullConversationText?: string, // 画像から抽出した会話全体のテキスト
  profileContext?: string, // 前提情報（名前、年齢、関係性など）
  goal?: GoalId // ゴール（デートに誘いたい、LINE交換したい、など）
): Promise<AIResponse> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  // 開発モードでない場合のみ認証ヘッダーを追加
  if (process.env.NEXT_PUBLIC_DEV_MODE !== 'true') {
    headers.Authorization = `Bearer ${token}`;
  }
  
  const response = await fetch('/api/generate-response', {
    method: 'POST',
    headers,
    body: JSON.stringify({ herMessage, conversationHistory, fullConversationText, profileContext, goal }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '返信の生成に失敗しました');
  }

  const data = await response.json();
  return {
    response: data.response,
    explanation: data.explanation || '',
    alternatives: data.alternatives || [],
    usageInfo: data.usageInfo, // 使用回数情報を追加
    goalDriven: data.goalDriven || null, // ゴール駆動型の追加情報
  };
}

export async function subscribe(token: string, plan: 'monthly' | 'yearly'): Promise<{ url: string }> {
  const response = await fetch('/api/stripe/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ plan }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'サブスクリプションの処理に失敗しました');
  }

  return response.json();
}

export async function getUsageLimit(token: string): Promise<{ usageInfo: UsageInfo; dailyUsageLimit: number }> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  // 開発モードでない場合のみ認証ヘッダーを追加
  if (process.env.NEXT_PUBLIC_DEV_MODE !== 'true') {
    headers.Authorization = `Bearer ${token}`;
  }
  
  const response = await fetch('/api/usage-limit', {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '使用回数情報の取得に失敗しました');
  }

  return response.json();
}

export async function extractTextFromImage(
  token: string,
  imageBase64: string
): Promise<{ 
  extractedText: string; 
  message: string; 
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  error?: string;
}> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  // 開発モードでない場合のみ認証ヘッダーを追加
  if (process.env.NEXT_PUBLIC_DEV_MODE !== 'true') {
    headers.Authorization = `Bearer ${token}`;
  }
  
  try {
    const response = await fetch('/api/extract-text', {
      method: 'POST',
      headers,
      body: JSON.stringify({ image: imageBase64 }),
    });

    // レスポンスがJSONかどうかを確認
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      // JSONではない場合（サーバーエラーなど）
      const text = await response.text();
      console.error('Non-JSON response:', text);
      
      // よくあるエラーパターンをチェック
      if (text.includes('Request Entity Too Large') || text.includes('413')) {
        return {
          extractedText: '',
          message: '',
          error: '画像サイズが大きすぎます。\n\n小さい画像を選択するか、画像の一部をトリミングしてお試しください。',
        };
      }
      
      return {
        extractedText: '',
        message: '',
        error: 'サーバーエラーが発生しました。しばらく待ってから再度お試しください。',
      };
    }

    const data = await response.json();

    if (!response.ok) {
      // エラーレスポンスでもデータを返す（エラーメッセージを含む）
      return {
        extractedText: data.extractedText || '',
        message: data.message || '',
        error: data.error || 'テキストの抽出に失敗しました',
      };
    }

    return data;
  } catch (err) {
    console.error('extractTextFromImage error:', err);
    
    // JSONパースエラーの場合
    if (err instanceof SyntaxError) {
      return {
        extractedText: '',
        message: '',
        error: '画像サイズが大きすぎる可能性があります。\n\n小さい画像を選択するか、画像の一部をトリミングしてお試しください。',
      };
    }
    
    return {
      extractedText: '',
      message: '',
      error: err instanceof Error ? err.message : 'テキストの抽出に失敗しました',
    };
  }
}

// ストリーク情報を取得
export async function getStreakInfo(token: string): Promise<StreakInfo> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (process.env.NEXT_PUBLIC_DEV_MODE !== 'true') {
    headers.Authorization = `Bearer ${token}`;
  }
  
  const response = await fetch('/api/streak', {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'ストリーク情報の取得に失敗しました');
  }

  return response.json();
}

// ユーザー統計情報を取得
export async function getUserStats(token: string): Promise<UserStats & { badgeDetails: Badge[] }> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (process.env.NEXT_PUBLIC_DEV_MODE !== 'true') {
    headers.Authorization = `Bearer ${token}`;
  }
  
  const response = await fetch('/api/stats', {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '統計情報の取得に失敗しました');
  }

  return response.json();
}

// 成功を記録（ユーザーが「良かった」評価をした時）
export async function recordSuccess(token: string): Promise<{
  successCount: number;
  successRate: number;
  newBadges: string[];
  newBadgeDetails: Badge[];
}> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (process.env.NEXT_PUBLIC_DEV_MODE !== 'true') {
    headers.Authorization = `Bearer ${token}`;
  }
  
  const response = await fetch('/api/stats', {
    method: 'POST',
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '成功の記録に失敗しました');
  }

  return response.json();
}






