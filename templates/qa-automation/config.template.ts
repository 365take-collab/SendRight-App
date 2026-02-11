/**
 * QA設定テンプレート
 * TODO: プロジェクトに合わせてエンドポイント一覧とテストユーザー情報を書き換え
 */
import 'dotenv/config';

export interface EndpointConfig {
  method: 'GET' | 'POST';
  path: string;
  needsAuth: boolean;
  expectedStatus: number;
  maxResponseMs: number;
  body?: Record<string, unknown>;
  label: string;
}

export const QA_CONFIG = {
  // TODO: プロジェクトのURLに変更
  baseUrl: process.env.QA_BASE_URL || 'https://your-app.example.com',

  // TODO: テストユーザー情報を設定
  testUser: {
    email: process.env.QA_TEST_EMAIL || 'test@example.com',
    password: process.env.QA_TEST_PASSWORD || '',
  },

  slack: {
    webhookUrl: process.env.SLACK_WEBHOOK_URL_BUGS || '',
  },

  healthCheck: {
    // TODO: プロジェクトのAPIエンドポイントに変更
    endpoints: [
      {
        method: 'POST' as const,
        path: '/api/auth/login',
        needsAuth: false,
        expectedStatus: 200,
        maxResponseMs: 3000,
        label: 'ログイン',
      },
      // TODO: 追加エンドポイントをここに定義
    ] satisfies EndpointConfig[],
  },

  responseTime: {
    thresholdMultiplier: 2,
    baselineFile: new URL('../data/baselines.json', import.meta.url).pathname,
  },
} as const;
