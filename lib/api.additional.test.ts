import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

function jsonResponse(input: {
  ok: boolean;
  status?: number;
  data?: unknown;
  rejectJson?: boolean;
}) {
  return {
    ok: input.ok,
    status: input.status ?? (input.ok ? 200 : 500),
    json: input.rejectJson
      ? vi.fn().mockRejectedValue(new Error('invalid json'))
      : vi.fn().mockResolvedValue(input.data ?? {}),
  };
}

async function loadApi() {
  vi.resetModules();
  return import('./api');
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete process.env[key];
    }
  }
  Object.assign(process.env, ORIGINAL_ENV);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('api.ts additional', () => {
  it('register 成功時は API レスポンスを返す', async () => {
    const api = await loadApi();
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;

    fetchMock.mockResolvedValue(
      jsonResponse({
        ok: true,
        data: {
          token: 'token-123',
          user: { id: 'u1', email: 'user@example.com', isSubscribed: false },
        },
      })
    );

    const result = await api.register('user@example.com', 'password');

    expect(result.token).toBe('token-123');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('register 失敗時はエラーメッセージを優先し、JSONパース失敗時はフォールバックする', async () => {
    const api = await loadApi();
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;

    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        ok: false,
        status: 400,
        data: { error: 'メール形式が不正です' },
      })
    );
    await expect(api.register('invalid', 'password')).rejects.toThrow('メール形式が不正です');

    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        ok: false,
        status: 500,
        rejectJson: true,
      })
    );
    await expect(api.register('user@example.com', 'password')).rejects.toThrow('サーバーエラーが発生しました');
  });

  it('generateAIResponse は開発モード時に Authorization を付けない', async () => {
    process.env.NEXT_PUBLIC_DEV_MODE = 'true';
    const api = await loadApi();
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;

    fetchMock.mockResolvedValue(
      jsonResponse({
        ok: true,
        data: { response: 'ok', explanation: 'done' },
      })
    );

    await api.generateAIResponse('token-dev', 'hello');

    const [, options] = fetchMock.mock.calls[0] as [string, { headers: Record<string, string> }];
    expect(options.headers.Authorization).toBeUndefined();
  });

  it('generateAIResponse は非開発モード時に Authorization を付ける', async () => {
    process.env.NEXT_PUBLIC_DEV_MODE = 'false';
    const api = await loadApi();
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;

    fetchMock.mockResolvedValue(
      jsonResponse({
        ok: true,
        data: { response: 'ok', explanation: 'done' },
      })
    );

    await api.generateAIResponse('token-prod', 'hello');

    const [, options] = fetchMock.mock.calls[0] as [string, { headers: Record<string, string> }];
    expect(options.headers.Authorization).toBe('Bearer token-prod');
  });
});
