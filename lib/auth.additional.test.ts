import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadAuth() {
  vi.resetModules();
  return import('./auth');
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('auth.ts additional', () => {
  it('generateToken/verifyToken が往復で userId を保持する', async () => {
    const auth = await loadAuth();

    const token = auth.generateToken('user-123');
    const decoded = auth.verifyToken(token);

    expect(decoded).not.toBeNull();
    expect(decoded).toMatchObject({ userId: 'user-123' });
  });

  it('不正なトークンは null を返す', async () => {
    const auth = await loadAuth();

    expect(auth.verifyToken('not-a-token')).toBeNull();
  });

  it('初期パスワードは指定長で、紛らわしい文字を含まない', async () => {
    const auth = await loadAuth();

    const password = auth.generateInitialPassword(24);
    expect(password).toHaveLength(24);
    expect(password).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789]+$/);
  });
});
