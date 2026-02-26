import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

async function loadSecurity() {
  vi.resetModules();
  return import('./security');
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('security.ts basic', () => {
  it('レート制限は4回目で拒否される', async () => {
    const security = await loadSecurity();

    const first = security.checkRateLimit('user-a');
    const second = security.checkRateLimit('user-a');
    const third = security.checkRateLimit('user-a');
    const fourth = security.checkRateLimit('user-a');

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(true);
    expect(fourth.allowed).toBe(false);
    expect(fourth.remaining).toBe(0);
  });

  it('リセット境界時刻ちょうどで新しいレート制限ウィンドウが始まる', async () => {
    const security = await loadSecurity();

    const first = security.checkRateLimit('user-b');
    vi.setSystemTime(first.resetAt);

    const resetCall = security.checkRateLimit('user-b');
    expect(resetCall.allowed).toBe(true);
    expect(resetCall.remaining).toBe(security.RATE_LIMIT_MAX_REQUESTS - 1);
  });

  it('セッション有効期限とリフレッシュ判定の境界を正しく扱う', async () => {
    const security = await loadSecurity();

    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    expect(security.isSessionValid(now - oneDayMs + 1)).toBe(true);
    expect(security.isSessionValid(now - oneDayMs)).toBe(false);

    const half = oneDayMs / 2;
    expect(security.shouldRefreshSession(now - half)).toBe(true);
    expect(security.shouldRefreshSession(now - half + 1)).toBe(false);
  });

  it('X-Forwarded-Forの先頭IPを優先し、なければX-Real-IPを使う', async () => {
    const security = await loadSecurity();

    const forwarded = new Headers({
      'x-forwarded-for': ' 203.0.113.10, 10.0.0.1 ',
      'x-real-ip': '198.51.100.5',
    });
    const realOnly = new Headers({ 'x-real-ip': '198.51.100.6' });
    const none = new Headers();

    expect(security.getClientIP(forwarded)).toBe('203.0.113.10');
    expect(security.getClientIP(realOnly)).toBe('198.51.100.6');
    expect(security.getClientIP(none)).toBe('unknown');
  });
});
