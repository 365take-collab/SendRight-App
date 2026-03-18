import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

function applyEnv(vars: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

async function importFreshAi() {
  vi.resetModules();
  return import('./ai');
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  // Restore process.env without swapping the object reference
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete process.env[key];
    }
  }
  applyEnv(ORIGINAL_ENV);
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('AI provider policy', () => {
  it('ANTHROPIC_API_KEY があっても明示オプトイン無しでは anthropic を選ばない', async () => {
    applyEnv({
      OPENAI_API_KEY: 'test-openai',
      ANTHROPIC_API_KEY: 'test-anthropic',
      AI_PROVIDER: undefined,
      ALLOW_ANTHROPIC: undefined,
      INTERNAL_AUTOMATION: undefined,
    });

    const ai = await importFreshAi();
    expect(ai.AI_PROVIDER).toBe('openai');
  });

  it('AI_PROVIDER=anthropic でも ALLOW_ANTHROPIC=1 が無いと起動時に拒否する', async () => {
    applyEnv({
      OPENAI_API_KEY: 'test-openai',
      ANTHROPIC_API_KEY: 'test-anthropic',
      AI_PROVIDER: 'anthropic',
      ALLOW_ANTHROPIC: undefined,
      INTERNAL_AUTOMATION: undefined,
    });

    await expect(importFreshAi()).rejects.toThrow(/ALLOW_ANTHROPIC=1/);
  });

  it('AI_PROVIDER=anthropic + ALLOW_ANTHROPIC=1 のときのみ anthropic を選べる', async () => {
    applyEnv({
      OPENAI_API_KEY: 'test-openai',
      ANTHROPIC_API_KEY: 'test-anthropic',
      AI_PROVIDER: 'anthropic',
      ALLOW_ANTHROPIC: '1',
      INTERNAL_AUTOMATION: undefined,
    });

    const ai = await importFreshAi();
    expect(ai.AI_PROVIDER).toBe('anthropic');
  });

  it('AI Gateway 利用時は ANTHROPIC_API_KEY なしでも anthropic を選べる', async () => {
    applyEnv({
      OPENAI_API_KEY: undefined,
      ANTHROPIC_API_KEY: undefined,
      AI_GATEWAY_API_KEY: 'test-gateway',
      AI_PROVIDER: 'anthropic',
      ALLOW_ANTHROPIC: '1',
      INTERNAL_AUTOMATION: undefined,
    });

    const ai = await importFreshAi();
    expect(ai.AI_PROVIDER).toBe('anthropic');
    expect(ai.AI_MODEL_ID).toBe('anthropic/claude-3-5-haiku-20241022');
  });

  it('AI Gateway 利用時は DEEPSEEK_API_KEY なしでも deepseek を選べる', async () => {
    applyEnv({
      OPENAI_API_KEY: undefined,
      DEEPSEEK_API_KEY: undefined,
      AI_GATEWAY_API_KEY: 'test-gateway',
      AI_PROVIDER: 'deepseek',
      ALLOW_ANTHROPIC: undefined,
      INTERNAL_AUTOMATION: undefined,
    });

    const ai = await importFreshAi();
    expect(ai.AI_PROVIDER).toBe('deepseek');
    expect(ai.AI_MODEL_ID).toBe('deepseek/deepseek-chat');
  });

  it('AI Gateway 利用時も AI_PROVIDER 未指定なら既定で deepseek を優先する', async () => {
    applyEnv({
      OPENAI_API_KEY: undefined,
      DEEPSEEK_API_KEY: undefined,
      AI_GATEWAY_API_KEY: 'test-gateway',
      AI_PROVIDER: undefined,
      ALLOW_ANTHROPIC: undefined,
      INTERNAL_AUTOMATION: undefined,
    });

    const ai = await importFreshAi();
    expect(ai.AI_PROVIDER).toBe('deepseek');
    expect(ai.AI_MODEL_ID).toBe('deepseek/deepseek-chat');
  });

  it('INTERNAL_AUTOMATION=1 の場合は Claude を禁止する', async () => {
    applyEnv({
      OPENAI_API_KEY: 'test-openai',
      ANTHROPIC_API_KEY: 'test-anthropic',
      AI_GATEWAY_API_KEY: undefined,
      AI_PROVIDER: 'anthropic',
      ALLOW_ANTHROPIC: '1',
      INTERNAL_AUTOMATION: '1',
    });

    await expect(importFreshAi()).rejects.toThrow(/forbidden/i);
  });
});
