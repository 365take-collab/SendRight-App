/**
 * SendRight APIヘルスチェック
 * 主要エンドポイントへリクエストし、ステータスコードとレスポンスタイムを検証。
 * 異常時にSlack「バグ検知」チャンネルへ通知。
 *
 * 実行: npm run health-check
 * cron: 15分おき推奨
 */
import { QA_CONFIG } from './lib/config.js';
import { getTestUserToken } from './lib/auth-helper.js';
import { reportHealthCheck, reportTestSummary } from './lib/slack-reporter.js';
import { recordResponseTime } from './lib/response-tracker.js';

interface CheckResult {
  endpoint: string;
  label: string;
  status: number;
  expectedStatus: number;
  responseMs: number;
  maxMs: number;
  passed: boolean;
  error?: string;
}

async function checkEndpoint(
  endpoint: typeof QA_CONFIG.healthCheck.endpoints[number],
  token: string | null
): Promise<CheckResult> {
  const url = `${QA_CONFIG.baseUrl}${endpoint.path}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (endpoint.needsAuth && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const start = Date.now();
  let status = 0;
  let error: string | undefined;

  try {
    const options: RequestInit = { method: endpoint.method, headers };

    // ログインエンドポイントにはテストユーザー情報を送る
    if (endpoint.path === '/api/auth/login') {
      options.body = JSON.stringify({
        email: QA_CONFIG.testUser.email,
        password: QA_CONFIG.testUser.password,
      });
    }

    const res = await fetch(url, options);
    status = res.status;
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  const responseMs = Date.now() - start;
  const passed = status === endpoint.expectedStatus && responseMs <= endpoint.maxResponseMs && !error;

  return {
    endpoint: endpoint.path,
    label: endpoint.label,
    status,
    expectedStatus: endpoint.expectedStatus,
    responseMs,
    maxMs: endpoint.maxResponseMs,
    passed,
    error,
  };
}

async function main() {
  console.log(`\n=== SendRight ヘルスチェック ===`);
  console.log(`対象: ${QA_CONFIG.baseUrl}`);
  console.log(`時刻: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}\n`);

  // テストユーザーで認証
  let token: string | null = null;
  try {
    token = await getTestUserToken();
    console.log('認証: OK\n');
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`認証失敗: ${msg}`);
    await reportHealthCheck('/api/auth/login', 'ログイン', 0, 200, 0, 3000, msg);
    process.exit(1);
  }

  const startTime = Date.now();
  const results: CheckResult[] = [];

  for (const endpoint of QA_CONFIG.healthCheck.endpoints) {
    const result = await checkEndpoint(endpoint, token);
    results.push(result);

    // レスポンスタイム記録・劣化検知
    const tracking = recordResponseTime(endpoint.path, result.responseMs);

    const statusIcon = result.passed ? '✅' : '❌';
    console.log(`${statusIcon} ${result.label} (${result.endpoint})`);
    console.log(`   ステータス: ${result.status} (期待: ${result.expectedStatus})`);
    console.log(`   レスポンス: ${result.responseMs}ms (閾値: ${result.maxMs}ms, 平均: ${tracking.avgMs}ms)`);
    if (tracking.isDegraded) {
      console.log(`   ⚠️ レスポンス劣化検知 (閾値: ${tracking.threshold}ms)`);
    }
    if (result.error) console.log(`   エラー: ${result.error}`);
    console.log('');

    // 異常時はSlack通知
    if (!result.passed || tracking.isDegraded) {
      const degradeNote = tracking.isDegraded ? ` [レスポンス劣化: 平均${tracking.avgMs}ms → ${result.responseMs}ms]` : '';
      await reportHealthCheck(
        result.endpoint,
        result.label,
        result.status,
        result.expectedStatus,
        result.responseMs,
        result.maxMs,
        result.error ? `${result.error}${degradeNote}` : (tracking.isDegraded ? degradeNote.trim() : undefined)
      );
    }
  }

  const totalMs = Date.now() - startTime;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`\n--- 結果: ${passed}/${results.length} 成功 (${(totalMs / 1000).toFixed(1)}秒) ---\n`);

  // 1つでも失敗があればサマリーを送信
  if (failed > 0) {
    await reportTestSummary({
      suiteName: 'ヘルスチェック',
      results: results.map(r => ({
        name: `${r.label} (${r.endpoint})`,
        passed: r.passed,
        durationMs: r.responseMs,
        error: r.error || (!r.passed ? `ステータス ${r.status} / ${r.responseMs}ms` : undefined),
      })),
      totalDurationMs: totalMs,
      environment: QA_CONFIG.baseUrl,
    });
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('ヘルスチェック実行エラー:', e);
  process.exit(1);
});
