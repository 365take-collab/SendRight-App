import { afterEach, describe, expect, it, vi } from 'vitest';

const mockFindUserByEmail = vi.fn();

vi.mock('./supabase', () => ({
  findUserByEmail: (...args: unknown[]) => mockFindUserByEmail(...args),
}));

function buildDbUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'user@example.com',
    password_hash: null,
    stripe_customer_id: null,
    referral_code: null,
    is_subscribed: false,
    subscription_type: 'free',
    daily_usage_limit: 3,
    current_streak: 0,
    longest_streak: 0,
    last_active_date: null,
    total_usage_count: 0,
    success_count: 0,
    level: 1,
    badges: [],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

async function loadAuth() {
  vi.resetModules();
  return import('./auth');
}

afterEach(() => {
  mockFindUserByEmail.mockReset();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('auth.ts referral code mapping', () => {
  it('findUserByEmail は referral_code を referralCode に変換する', async () => {
    mockFindUserByEmail.mockResolvedValue(buildDbUser({ referral_code: 'REF-ABC-123' }));
    const auth = await loadAuth();

    const user = await auth.findUserByEmail('user@example.com');

    expect(user?.referralCode).toBe('REF-ABC-123');
  });

  it('referral_code が null の場合は referralCode が undefined になる', async () => {
    mockFindUserByEmail.mockResolvedValue(buildDbUser({ referral_code: null }));
    const auth = await loadAuth();

    const user = await auth.findUserByEmail('user@example.com');

    expect(user?.referralCode).toBeUndefined();
  });

  it('DBにユーザーがいない場合は undefined を返す', async () => {
    mockFindUserByEmail.mockResolvedValue(null);
    const auth = await loadAuth();

    const user = await auth.findUserByEmail('missing@example.com');

    expect(user).toBeUndefined();
  });
});
