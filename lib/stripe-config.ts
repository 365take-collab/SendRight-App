import type { NextRequest } from 'next/server';

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/g, '');
}

/**
 * StripeのリダイレクトURL生成用のベースURLを返す。
 * 優先順位:
 * 1) NEXT_PUBLIC_BASE_URL / BASE_URL
 * 2) リクエストヘッダー（x-forwarded-* / host）
 * 3) localhost
 */
export function getStripeBaseUrl(request?: NextRequest): string {
  const envUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL;
  if (envUrl) return trimTrailingSlash(envUrl);

  if (request) {
    const proto = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '');
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.host;
    if (proto && host) return trimTrailingSlash(`${proto}://${host}`);
    return trimTrailingSlash(request.nextUrl.origin);
  }

  return 'http://localhost:3000';
}

export function getStripePriceId(plan: 'monthly' | 'yearly'): string {
  const monthly = process.env.STRIPE_PRICE_ID_MONTHLY || process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY;
  const yearly = process.env.STRIPE_PRICE_ID_YEARLY || process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY;

  const id = plan === 'monthly' ? monthly : yearly;
  if (id) return id;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Stripe price id is not configured for plan: ${plan}`);
  }

  // 開発環境のフォールバック（Stripe実行時は失敗するが、開発起動/型チェックを妨げない）
  return plan === 'monthly' ? 'price_dev_monthly' : 'price_dev_yearly';
}

