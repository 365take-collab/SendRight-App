import { QA_CONFIG } from './config.js';

let cachedToken: string | null = null;

export async function getTestUserToken(): Promise<string> {
  if (cachedToken) return cachedToken;

  const { baseUrl, testUser } = QA_CONFIG;

  if (!testUser.password) {
    throw new Error('QA_TEST_PASSWORD 環境変数が設定されていません');
  }

  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testUser.email, password: testUser.password }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`テストユーザー認証失敗 (${res.status}): ${body}`);
  }

  const data = await res.json();
  if (!data.token) {
    throw new Error('テストユーザー認証レスポンスにtokenがありません');
  }

  cachedToken = data.token;
  return data.token;
}

export function clearTokenCache(): void {
  cachedToken = null;
}
