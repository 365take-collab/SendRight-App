/**
 * SendRight E2Eスモークテスト
 * Playwrightでブラウザ操作し、主要機能の動作を確認。
 *
 * 実行: npm run smoke-test
 */
import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.QA_TEST_EMAIL || 'qa-test@sendright.jp';
const TEST_PASSWORD = process.env.QA_TEST_PASSWORD || '';

test.describe('SendRight スモークテスト', () => {
  test.beforeEach(async ({ page }) => {
    // テストパスワード必須チェック
    if (!TEST_PASSWORD) {
      throw new Error('QA_TEST_PASSWORD 環境変数が設定されていません');
    }

    // ログイン
    await page.goto('/login');
    await page.fill('#email', TEST_EMAIL);
    await page.fill('#password', TEST_PASSWORD);
    await page.click('button[type="submit"]');

    // ダッシュボードへのリダイレクトを待つ
    await page.waitForURL('/', { timeout: 15000 });
  });

  test('ログイン後ダッシュボードが表示される', async ({ page }) => {
    // ダッシュボードの主要要素が存在することを確認
    await expect(page.locator('body')).toBeVisible();
    // ローカルストレージにトークンが保存されていることを確認
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
  });

  test('ヘルプページが表示される', async ({ page }) => {
    await page.goto('/help');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    // 403でないことを確認
    const content = await page.content();
    expect(content).not.toContain('アクセスが拒否されました');
  });

  test('サブスクライブページが表示される', async ({ page }) => {
    await page.goto('/subscribe');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('API: ユーザー情報取得が成功する', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();

    const response = await page.request.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.user).toBeTruthy();
    expect(body.user.email).toBe(TEST_EMAIL);
  });

  test('API: 使用回数制限取得が成功する', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    const response = await page.request.get('/api/usage-limit', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.usageInfo).toBeTruthy();
  });

  test('API: 統計情報取得が成功する', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));

    const response = await page.request.get('/api/stats', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.status()).toBe(200);
  });
});
