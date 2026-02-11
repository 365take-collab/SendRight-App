import { config } from 'dotenv';
config({ path: new URL('../../../.env.local', import.meta.url).pathname });

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
  baseUrl: process.env.QA_BASE_URL || 'https://app.sendright.jp',
  testUser: {
    email: process.env.QA_TEST_EMAIL || 'master-test@launchx.jp',
    password: process.env.QA_TEST_PASSWORD || '',
  },
  slack: {
    webhookUrl: process.env.SLACK_WEBHOOK_URL_BUGS || '',
  },
  healthCheck: {
    endpoints: [
      {
        method: 'POST' as const,
        path: '/api/auth/login',
        needsAuth: false,
        expectedStatus: 200,
        maxResponseMs: 3000,
        label: 'ログイン',
      },
      {
        method: 'GET' as const,
        path: '/api/auth/me',
        needsAuth: true,
        expectedStatus: 200,
        maxResponseMs: 2000,
        label: 'ユーザー情報取得',
      },
      {
        method: 'GET' as const,
        path: '/api/usage-limit',
        needsAuth: true,
        expectedStatus: 200,
        maxResponseMs: 2000,
        label: '使用回数制限',
      },
      {
        method: 'GET' as const,
        path: '/api/stats',
        needsAuth: true,
        expectedStatus: 200,
        maxResponseMs: 2000,
        label: '統計情報',
      },
    ] satisfies EndpointConfig[],
  },
  responseTime: {
    thresholdMultiplier: 2,
    baselineFile: new URL('../data/baselines.json', import.meta.url).pathname,
  },
} as const;
