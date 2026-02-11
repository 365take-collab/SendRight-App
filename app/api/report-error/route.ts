import { NextRequest, NextResponse } from 'next/server';
import { notifyError } from '@/lib/slack';

export async function POST(request: NextRequest) {
  try {
    const { message, digest, url } = await request.json();

    await notifyError(
      url || 'クライアント側エラー',
      message || '不明なエラー',
      digest
    );

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ received: false }, { status: 500 });
  }
}
