import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

async function importFreshAi() {
  vi.resetModules();
  return import('./ai');
}

beforeEach(() => {
  process.env.OPENAI_API_KEY = 'test-openai';
  delete process.env.AI_GATEWAY_API_KEY;
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete process.env[key];
    }
  }
  Object.assign(process.env, ORIGINAL_ENV);
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('sanitizeGeneratedReply', () => {
  it('句読点を残したまま自然な2文までに整える', async () => {
    const { sanitizeGeneratedReply } = await importFreshAi();
    const reply = sanitizeGeneratedReply('了解。今日は行けるよ。\n何時にする？');

    expect(reply).toBe('了解。今日は行けるよ。\n何時にする？');
  });

  it('長文でも自然な範囲なら2文まで残す', async () => {
    const { sanitizeGeneratedReply } = await importFreshAi();
    const reply = sanitizeGeneratedReply(
      'それめっちゃ大変だったね。\n無理しすぎないでね。\n落ち着いたらまた聞かせて。返事は急がなくていいよ。',
    );

    expect(reply).toBe('それめっちゃ大変だったね。\n無理しすぎないでね。');
  });

  it('AI Gateway 利用時も既定優先順に従った provider 情報を返す', async () => {
    process.env.OPENAI_API_KEY = '';
    process.env.AI_GATEWAY_API_KEY = 'test-gateway';

    const { getAiProviderInfo } = await importFreshAi();
    expect(getAiProviderInfo()).toEqual({
      provider: 'deepseek',
      model: 'deepseek/deepseek-chat',
      label: 'DeepSeek deepseek/deepseek-chat via Vercel AI Gateway',
    });
  });
});
