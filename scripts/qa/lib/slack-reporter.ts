import { QA_CONFIG } from './config.js';

interface TestResult {
  name: string;
  passed: boolean;
  durationMs?: number;
  error?: string;
}

interface TestSummary {
  suiteName: string;
  results: TestResult[];
  totalDurationMs: number;
  environment: string;
}

const SEVERITY_CONFIG = {
  critical: { emoji: ':red_circle:', color: '#e74c3c' },
  warning: { emoji: ':warning:', color: '#f39c12' },
  info: { emoji: ':information_source:', color: '#3498db' },
  success: { emoji: ':white_check_mark:', color: '#2ecc71' },
} as const;

async function sendToSlack(payload: Record<string, unknown>): Promise<boolean> {
  const webhookUrl = QA_CONFIG.slack.webhookUrl;
  if (!webhookUrl) {
    console.warn('SLACK_WEBHOOK_URL_BUGS is not set, skipping notification');
    return false;
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (error) {
    console.error('Slack送信エラー:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

export async function reportTestSummary(summary: TestSummary): Promise<boolean> {
  const passed = summary.results.filter(r => r.passed).length;
  const failed = summary.results.filter(r => !r.passed).length;
  const total = summary.results.length;
  const allPassed = failed === 0;

  const { emoji, color } = allPassed ? SEVERITY_CONFIG.success : SEVERITY_CONFIG.critical;
  const timestamp = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });

  const failedTests = summary.results
    .filter(r => !r.passed)
    .map(r => `- ${r.name}: ${r.error || '不明なエラー'}`)
    .join('\n');

  const blocks: Record<string, unknown>[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `${emoji} ${summary.suiteName}`, emoji: true },
    },
    { type: 'divider' },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*結果*\n${passed}/${total} 成功` },
        { type: 'mrkdwn', text: `*所要時間*\n${(summary.totalDurationMs / 1000).toFixed(1)}秒` },
        { type: 'mrkdwn', text: `*環境*\n${summary.environment}` },
      ],
    },
  ];

  if (failedTests) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*失敗テスト:*\n${failedTests}` },
    });
  }

  blocks.push({
    type: 'context',
    elements: [{ type: 'mrkdwn', text: `SendRight QA | ${timestamp}` }],
  });

  return sendToSlack({ blocks, attachments: [{ color, fallback: `${summary.suiteName}: ${passed}/${total}` }] });
}

export async function reportHealthCheck(
  endpoint: string,
  label: string,
  status: number,
  expectedStatus: number,
  responseMs: number,
  maxMs: number,
  error?: string
): Promise<boolean> {
  const isStatusOk = status === expectedStatus;
  const isFast = responseMs <= maxMs;
  const allOk = isStatusOk && isFast && !error;

  if (allOk) return true; // 正常時は通知しない

  const severity = error || status >= 500 ? 'critical' : 'warning';
  const { emoji, color } = SEVERITY_CONFIG[severity];
  const timestamp = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });

  const fields = [
    { type: 'mrkdwn', text: `*エンドポイント*\n\`${endpoint}\`` },
    { type: 'mrkdwn', text: `*ステータス*\n${status} (期待: ${expectedStatus})` },
    { type: 'mrkdwn', text: `*レスポンス*\n${responseMs}ms (閾値: ${maxMs}ms)` },
  ];

  if (error) {
    fields.push({ type: 'mrkdwn', text: `*エラー*\n${error}` });
  }

  const blocks: Record<string, unknown>[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `${emoji} ヘルスチェック異常: ${label}`, emoji: true },
    },
    { type: 'divider' },
    { type: 'section', fields },
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `SendRight ヘルスチェック | ${timestamp}` }],
    },
  ];

  return sendToSlack({ blocks, attachments: [{ color, fallback: `ヘルスチェック異常: ${endpoint} ${status}` }] });
}
