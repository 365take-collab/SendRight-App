import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabaseClient } from '@/lib/supabase';
import { AOPUA_TEMPLATES, AOPUA_EMAIL_TYPES } from '@/lib/email-templates-aopua';
import { sendStepEmail } from '@/lib/resend';
import { z } from 'zod';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Audience IDs
const AUDIENCES: Record<string, string> = {
  aopua: '4b4a6b16-b66c-48fe-99a1-0f1c098b508f',
  sendright: '6a986545-d240-4437-a02a-d8fcdfae9f22',
  netonan: 'ed58a871-3979-4fcc-9386-00b78ae99bfc',
};

const subscribeSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  audience: z.string().min(1, 'audience IDが必要です'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, audience } = subscribeSchema.parse(body);

    if (!email || !audience) {
      return NextResponse.json(
        { error: 'メールアドレスとaudience IDが必要です' },
        { status: 400 }
      );
    }

    const audienceId = AUDIENCES[audience];
    if (!audienceId) {
      return NextResponse.json(
        { error: '無効なaudience' },
        { status: 400 }
      );
    }

    if (!resend) {
      return NextResponse.json(
        { error: 'メール設定が未完了です' },
        { status: 500 }
      );
    }

    // Resend Audienceにコンタクト追加
    let alreadyExists = false;
    try {
      await resend.contacts.create({
        email,
        audienceId,
        unsubscribed: false,
      });
    } catch (contactError: any) {
      if (contactError?.message?.includes('already exists')) {
        alreadyExists = true;
      } else {
        throw contactError;
      }
    }

    // 青PUA audienceの場合: ステップメールのスケジュールを作成
    if (audience === 'aopua' && !alreadyExists) {
      try {
        await scheduleAopuaEmails(email);
      } catch (scheduleError) {
        // スケジュール作成に失敗してもコンタクト追加は成功とする
        console.error('Failed to schedule aopua emails:', scheduleError);
      }
    }

    return NextResponse.json({ success: true, alreadyExists });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || '入力が正しくありません' },
        { status: 400 }
      );
    }
    // 既に登録済みの場合もエラーにしない
    if (error?.message?.includes('already exists')) {
      return NextResponse.json({ success: true, alreadyExists: true });
    }

    console.error('Newsletter subscribe error:', error);
    return NextResponse.json(
      { error: '登録に失敗しました。もう一度お試しください。' },
      { status: 500 }
    );
  }
}

// 青PUAステップメール15通のスケジュールを作成
async function scheduleAopuaEmails(email: string) {
  const supabase = getSupabaseClient();
  const now = new Date();

  // メール1通目は即時送信（sendStepEmailで直接送信）
  try {
    await sendStepEmail(email, 'aopua_01');
    console.log('Aopua mail 01 sent immediately to:', email);
  } catch (err) {
    console.error('Failed to send aopua_01 immediately:', err);
  }

  // 2通目以降をスケジュール登録
  const schedulesToInsert = AOPUA_EMAIL_TYPES
    .filter(type => type !== 'aopua_01') // 1通目は送信済み
    .map(type => {
      const template = AOPUA_TEMPLATES[type];
      const scheduledAt = new Date(now.getTime() + template.delayMinutes * 60 * 1000);
      return {
        email,
        email_type: type,
        scheduled_at: scheduledAt.toISOString(),
        status: 'pending',
        metadata: { audience: 'aopua' },
      };
    });

  if (schedulesToInsert.length > 0) {
    const { error } = await supabase
      .from('email_schedules')
      .insert(schedulesToInsert);

    if (error) {
      console.error('Failed to insert aopua email schedules:', error);
      throw error;
    }

    console.log(`Scheduled ${schedulesToInsert.length} aopua emails for:`, email);
  }
}
