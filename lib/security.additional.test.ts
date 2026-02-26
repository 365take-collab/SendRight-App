import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('security.ts additional anomalies', () => {
  it('1分間に30回で too_many_requests を検出する', async () => {
    const security = await loadSecurity();
    const base = Date.now();

    for (let i = 0; i < 29; i++) {
      const result = security.detectAnomalousPattern('user-many', `/api/health-${i}`, base + i, '203.0.113.1');
      expect(result.isAnomalous).toBe(false);
    }

    const thirtieth = security.detectAnomalousPattern('user-many', '/api/health-30', base + 29, '203.0.113.1');
    expect(thirtieth).toEqual({ isAnomalous: true, reason: 'too_many_requests' });
  });

  it('同一パス1秒以内5回で rapid_same_path_access を検出する', async () => {
    const security = await loadSecurity();
    const base = Date.now();

    for (let i = 0; i < 4; i++) {
      const result = security.detectAnomalousPattern('user-rapid', '/api/rapid', base + i * 100, '203.0.113.2');
      expect(result.isAnomalous).toBe(false);
    }

    const fifth = security.detectAnomalousPattern('user-rapid', '/api/rapid', base + 400, '203.0.113.2');
    expect(fifth).toEqual({ isAnomalous: true, reason: 'rapid_same_path_access' });
  });

  it('5分以内に3つのIPで multiple_ips を検出する', async () => {
    const security = await loadSecurity();
    const base = Date.now();

    expect(security.detectAnomalousPattern('user-ips', '/api/x', base, '198.51.100.1').isAnomalous).toBe(false);
    expect(security.detectAnomalousPattern('user-ips', '/api/y', base + 2000, '198.51.100.2').isAnomalous).toBe(false);

    const third = security.detectAnomalousPattern('user-ips', '/api/z', base + 4000, '198.51.100.3');
    expect(third).toEqual({ isAnomalous: true, reason: 'multiple_ips' });
  });
});
