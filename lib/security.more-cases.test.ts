import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

async function loadSecurity() {
  vi.resetModules();
  return import('./security');
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
});

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete process.env[key];
    }
  }
  Object.assign(process.env, ORIGINAL_ENV);
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('security.ts more cases', () => {
  it('IP_WHITELIST 未設定時は全許可し、設定時はトリムして判定する', async () => {
    delete process.env.IP_WHITELIST;
    let security = await loadSecurity();
    expect(security.checkIPWhitelist('203.0.113.10')).toBe(true);

    process.env.IP_WHITELIST = '203.0.113.10, 198.51.100.20 ';
    security = await loadSecurity();
    expect(security.checkIPWhitelist('198.51.100.20')).toBe(true);
    expect(security.checkIPWhitelist('198.51.100.21')).toBe(false);
  });

  it('機密APIへの21回アクセスで suspicious_api_access を検出する', async () => {
    const security = await loadSecurity();
    const base = Date.now();

    for (let i = 0; i < 20; i++) {
      const result = security.detectAnomalousPattern('user-sensitive', '/api/generate-response', base + i * 2000);
      expect(result.isAnomalous).toBe(false);
    }

    const twentyFirst = security.detectAnomalousPattern('user-sensitive', '/api/generate-response', base + 20 * 2000);
    expect(twentyFirst).toEqual({ isAnomalous: true, reason: 'suspicious_api_access' });
  });
});
