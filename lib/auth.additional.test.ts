import { afterEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

function applyEnv(vars: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete process.env[key];
      continue;
    }
    process.env[key] = value;
  }
}

async function loadAuth(env?: Record<string, string | undefined>) {
  vi.resetModules();
  applyEnv({
    JWT_SECRET: 'test-jwt-secret',
    ...env,
  });
  return import('./auth');
}

afterEach(() => {
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

describe('auth.ts additional', () => {
  it('JWT_SECRET が未設定の場合はモジュール初期化時に失敗する', async () => {
    await expect(loadAuth({ JWT_SECRET: undefined })).rejects.toThrow('JWT_SECRET is required');
  });

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
