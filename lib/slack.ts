function getWebhookUrl(): string | null {
  return process.env.SLACK_ERROR_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL || null;
}

function buildText(where: string, message: string, digest?: string): string {
  const lines = [
    '*SendRight Error*',
    `where: ${where}`,
    `message: ${message}`,
    digest ? `digest: ${digest}` : null,
    `time: ${new Date().toISOString()}`,
  ].filter(Boolean);

  return lines.join('\n');
}

/**
 * Best-effort: Slackが未設定/送信失敗でも例外は投げない。
 */
export async function notifyError(where: string, message: string, digest?: string): Promise<void> {
  const webhookUrl = getWebhookUrl();
  if (!webhookUrl) {
    // ローカル/未設定環境では黙ってスキップ
    console.warn('SLACK_WEBHOOK_URL is not set; skipping Slack notification', { where });
    return;
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: buildText(where, message, digest) }),
    });

    if (!res.ok) {
      console.error('Slack webhook returned non-2xx', { status: res.status, statusText: res.statusText });
    }
  } catch (e) {
    console.error('Failed to notify Slack', e);
  }
}

