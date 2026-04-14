/**
 * SendRight デプロイ後自動スモークテスト
 * Playwright不使用。fetch直叩きでAPI疎通を確認。
 * 軽量なのでCI/CDやVercelデプロイ後に実行可能。
 *
 * 実行: npm run post-deploy-smoke
 */
import { config } from 'dotenv';
config({ path: new URL('../../.env.local', import.meta.url).pathname });

const BASE_URL = process.env.QA_BASE_URL || 'https://app.sendright.jp';
const TEST_EMAIL = process.env.QA_TEST_EMAIL || 'qa-test@sendright.jp';
const TEST_PASSWORD = process.env.QA_TEST_PASSWORD || '';
const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL_BUGS || '';

interface CheckResult {
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

async function sendSlackNotification(results: CheckResult[], totalMs: number): Promise<void> {
  if (!SLACK_WEBHOOK) return;

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const allPassed = failed === 0;

  const emoji = allPassed ? ':white_check_mark:' : ':red_circle:';
  const color = allPassed ? '#2ecc71' : '#e74c3c';
  const timestamp = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });

  const failedList = results
    .filter(r => !r.passed)
    .map(r => `- ${r.name}: ${r.error}`)
    .join('\n');

  const blocks: Record<string, unknown>[] = [
    { type: 'header', text: { type: 'plain_text', text: `${emoji} デプロイ後スモークテスト`, emoji: true } },
    { type: 'divider' },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*結果*\n${passed}/${results.length} 成功` },
        { type: 'mrkdwn', text: `*所要時間*\n${(totalMs / 1000).toFixed(1)}秒` },
        { type: 'mrkdwn', text: `*環境*\n${BASE_URL}` },
      ],
    },
  ];

  if (failedList) {
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `*失敗:*\n${failedList}` } });
  }

  blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: `SendRight デプロイ後テスト | ${timestamp}` }] });

  try {
    await fetch(SLACK_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks, attachments: [{ color, fallback: `デプロイ後テスト: ${passed}/${results.length}` }] }),
    });
  } catch (e) {
    console.error('Slack通知失敗:', e);
  }
}

async function check(name: string, fn: () => Promise<void>): Promise<CheckResult> {
  const start = Date.now();
  try {
    await fn();
    return { name, passed: true, durationMs: Date.now() - start };
  } catch (e) {
    return { name, passed: false, durationMs: Date.now() - start, error: e instanceof Error ? e.message : String(e) };
  }
}

async function main() {
  if (!TEST_PASSWORD) {
    console.error('QA_TEST_PASSWORD 環境変数が設定されていません');
    process.exit(1);
  }

  console.log(`\n=== デプロイ後スモークテスト ===`);
  console.log(`対象: ${BASE_URL}\n`);

  const startTime = Date.now();
  const results: CheckResult[] = [];

  // 1. ログインAPI
  let token = '';
  results.push(await check('ログインAPI', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    });
    if (!res.ok) throw new Error(`ステータス ${res.status}`);
    const data = await res.json();
    if (!data.token) throw new Error('トークンなし');
    token = data.token;
  }));

  if (!token) {
    console.error('ログイン失敗のため残りのテストをスキップ');
    await sendSlackNotification(results, Date.now() - startTime);
    process.exit(1);
  }

  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  // 2. ユーザー情報API
  results.push(await check('ユーザー情報API', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`, { headers: authHeaders });
    if (!res.ok) throw new Error(`ステータス ${res.status}`);
    const data = await res.json();
    if (!data.user) throw new Error('ユーザー情報なし');
  }));

  // 3. 使用回数制限API
  results.push(await check('使用回数制限API', async () => {
    const res = await fetch(`${BASE_URL}/api/usage-limit`, { headers: authHeaders });
    if (!res.ok) throw new Error(`ステータス ${res.status}`);
    const data = await res.json();
    if (!data.usageInfo) throw new Error('使用情報なし');
  }));

  // 4. 統計API
  results.push(await check('統計API', async () => {
    const res = await fetch(`${BASE_URL}/api/stats`, { headers: authHeaders });
    if (!res.ok) throw new Error(`ステータス ${res.status}`);
  }));

  // 5. ログインページHTML
  results.push(await check('ログインページHTML', async () => {
    const res = await fetch(`${BASE_URL}/login`);
    if (!res.ok) throw new Error(`ステータス ${res.status}`);
    const html = await res.text();
    if (!html.includes('ログイン')) throw new Error('ログインテキストなし');
  }));

  const totalMs = Date.now() - startTime;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  // 結果表示
  for (const r of results) {
    const icon = r.passed ? '✅' : '❌';
    console.log(`${icon} ${r.name} (${r.durationMs}ms)${r.error ? ` - ${r.error}` : ''}`);
  }

  console.log(`\n--- 結果: ${passed}/${results.length} 成功 (${(totalMs / 1000).toFixed(1)}秒) ---\n`);

  // Slack通知（失敗時のみ、または全件）
  await sendSlackNotification(results, totalMs);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('スモークテスト実行エラー:', e);
  process.exit(1);
});
