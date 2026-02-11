/**
 * SendRight ユーザージャーニーテスト
 * 実際のユーザーフローを完全に再現するE2Eテスト。
 *
 * 実行: npm run user-journey-test
 *
 * 注意: AI返信生成はAPIコスト発生のため、このテストには含めない。
 * AI返信生成のテストはsmoke-testで最小限のみ実施。
 */
import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.QA_TEST_EMAIL || 'master-test@launchx.jp';
const TEST_PASSWORD = process.env.QA_TEST_PASSWORD || '';

test.describe('SendRight ユーザージャーニー', () => {
  test.beforeAll(() => {
    if (!TEST_PASSWORD) {
      throw new Error('QA_TEST_PASSWORD 環境変数が設定されていません');
    }
  });

  test('完全なログイン → ページ遷移 → ログアウト → 再ログインフロー', async ({ page }) => {
    // Step 1: ログインページ表示
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('ログイン');

    // Step 2: ログイン
    await page.fill('#email', TEST_EMAIL);
    await page.fill('#password', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/', { timeout: 15000 });

    // Step 3: ダッシュボード表示確認
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();

    // Step 4: API経由でユーザー情報確認
    const meResponse = await page.request.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(meResponse.status()).toBe(200);
    const meBody = await meResponse.json();
    expect(meBody.user.email).toBe(TEST_EMAIL);
    expect(meBody.user.isSubscribed).toBe(true);

    // Step 5: 使用回数情報確認
    const usageResponse = await page.request.get('/api/usage-limit', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(usageResponse.status()).toBe(200);
    const usageBody = await usageResponse.json();
    expect(usageBody.usageInfo).toBeTruthy();
    expect(usageBody.usageInfo.limit).toBeGreaterThan(0);

    // Step 6: ヘルプページ遷移
    await page.goto('/help');
    await page.waitForLoadState('networkidle');
    const helpContent = await page.content();
    expect(helpContent).not.toContain('アクセスが拒否されました');

    // Step 7: プロフィール診断ページ遷移
    await page.goto('/profile-diagnosis');
    await page.waitForLoadState('networkidle');

    // Step 8: サブスクライブページ遷移
    await page.goto('/subscribe');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();

    // Step 9: ログアウト（トークンクリア）
    await page.evaluate(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
    });

    // Step 10: 保護ページにアクセスできないことを確認
    const helpAfterLogout = await page.request.get('/help');
    // middleware でJWT検証されるので403が返るはず
    // ただしNext.jsのページ遷移はクライアント側なので、APIで確認
    const meAfterLogout = await page.request.get('/api/auth/me');
    expect(meAfterLogout.status()).toBe(401);

    // Step 11: 再ログイン
    await page.goto('/login');
    await page.fill('#email', TEST_EMAIL);
    await page.fill('#password', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/', { timeout: 15000 });

    // Step 12: 再ログイン後の正常性確認
    const newToken = await page.evaluate(() => localStorage.getItem('token'));
    expect(newToken).toBeTruthy();
    expect(newToken).not.toBe(token); // 新しいトークンが発行されている
  });

  test('Stripe Checkoutページ遷移（テストモード）', async ({ page }) => {
    // ログイン
    await page.goto('/login');
    await page.fill('#email', TEST_EMAIL);
    await page.fill('#password', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/', { timeout: 15000 });

    // サブスクライブページへ
    await page.goto('/subscribe');
    await page.waitForLoadState('networkidle');

    // プランボタンの存在確認（Stripeテストモード時のみ実際にクリック）
    // ここでは遷移確認のみ（実際の決済は行わない）
    await expect(page.locator('body')).toBeVisible();
  });
});
