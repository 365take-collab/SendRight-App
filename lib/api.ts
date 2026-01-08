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

export interface AIResponse {
  response: string;
  explanation: string;
  alternatives?: AlternativeResponse[]; // 代替返信候補（それぞれに解説付き）
  usageInfo?: UsageInfo; // 使用回数情報
}

export async function generateAIResponse(
  token: string,
  herMessage: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
  _tone?: 'casual' | 'friendly' | 'romantic' | 'playful', // 未使用（後方互換性のため残す）
  fullConversationText?: string, // 画像から抽出した会話全体のテキスト
  profileContext?: string // 前提情報（名前、年齢、関係性など）
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
    body: JSON.stringify({ herMessage, conversationHistory, fullConversationText, profileContext }),
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
  };
}

export async function subscribe(token: string, plan: 'monthly' | 'yearly'): Promise<void> {
  const response = await fetch('/api/subscribe', {
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
  
  const response = await fetch('/api/extract-text', {
    method: 'POST',
    headers,
    body: JSON.stringify({ image: imageBase64 }),
  });

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
}






