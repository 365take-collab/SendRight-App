/**
 * SendRight スクリーンショット比較テスト
 * Playwrightの toHaveScreenshot() で主要画面の視覚的回帰テスト。
 *
 * 初回実行: npx playwright test scripts/qa/screenshot-test.ts --update-snapshots
 * 以降: npm run screenshot-test
 */
import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.QA_TEST_EMAIL || 'qa-test@sendright.jp';
const TEST_PASSWORD = process.env.QA_TEST_PASSWORD || '';

test.describe('SendRight スクリーンショット比較', () => {
  test('ログインページ', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('login.png', {
      maxDiffPixelRatio: 0.02,
      fullPage: true,
    });
  });

  test('ダッシュボード（認証済み）', async ({ page }) => {
    if (!TEST_PASSWORD) {
      test.skip(true, 'QA_TEST_PASSWORD not set');
      return;
    }

    // ログイン
    await page.goto('/login');
    await page.fill('#email', TEST_EMAIL);
    await page.fill('#password', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('dashboard.png', {
      maxDiffPixelRatio: 0.02,
      fullPage: true,
    });
  });

  test('ヘルプページ', async ({ page }) => {
    if (!TEST_PASSWORD) {
      test.skip(true, 'QA_TEST_PASSWORD not set');
      return;
    }

    // ログイン（ヘルプページは認証必要）
    await page.goto('/login');
    await page.fill('#email', TEST_EMAIL);
    await page.fill('#password', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('/', { timeout: 15000 });

    await page.goto('/help');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('help.png', {
      maxDiffPixelRatio: 0.02,
      fullPage: true,
    });
  });

  test('サブスクライブページ', async ({ page }) => {
    await page.goto('/subscribe');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('subscribe.png', {
      maxDiffPixelRatio: 0.02,
      fullPage: true,
    });
  });
});
