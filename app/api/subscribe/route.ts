import { NextResponse } from 'next/server';

export async function POST() {
  // サブスクリプション更新はStripe Webhook経由のみ許可する
  return NextResponse.json(
    { error: 'このエンドポイントは無効です。Stripe Webhook経由のみ利用できます。' },
    { status: 403 }
  );
}
