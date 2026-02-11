import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { sendStepEmail } from '@/lib/resend';
import crypto from 'crypto';

// Vercel Cron Job用のエンドポイント
// 毎日1回実行される想定
export async function GET(request: NextRequest) {
  try {
    // 認証チェック（Vercel Cron Secret）
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const isProdLike = process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test';

    if (!cronSecret) {
      if (isProdLike) {
        console.error('CRON_SECRET is not set');
        return NextResponse.json(
          { error: 'CRON_SECRET is not set' },
          { status: 500 }
        );
      }
    } else if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseClient();
    const now = new Date().toISOString();
    const processingTimeoutMs = 15 * 60 * 1000;
    const staleBefore = new Date(Date.now() - processingTimeoutMs).toISOString();
    const maxAttempts = 3;

    // 長時間処理中のジョブを復旧
    const { error: resetError } = await supabase
      .from('email_schedules')
      .update({ status: 'pending', processing_started_at: null, processing_id: null })
      .eq('status', 'processing')
      .lt('processing_started_at', staleBefore);

    if (resetError) {
      console.error('Error resetting stale schedules:', resetError);
    }

    // 送信予定のメールを取得（scheduled_atが過去で、まだ送信されていないもの）
    const { data: schedules, error } = await supabase
      .from('email_schedules')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', now)
      .order('scheduled_at', { ascending: true })
      .limit(100); // 一度に100件まで処理

    if (error) {
      console.error('Error fetching email schedules:', error);
      return NextResponse.json(
        { error: 'Failed to fetch schedules' },
        { status: 500 }
      );
    }

    if (!schedules || schedules.length === 0) {
      return NextResponse.json({
        message: 'No emails to send',
        count: 0,
      });
    }

    // 各メールを送信
    const results = {
      sent: 0,
      failed: 0,
      skipped: 0,
    };

    for (const schedule of schedules) {
      try {
        const processingId = crypto.randomUUID();
        const { data: claimed, error: claimError } = await supabase
          .from('email_schedules')
          .update({
            status: 'processing',
            processing_started_at: new Date().toISOString(),
            processing_id: processingId,
          })
          .eq('id', schedule.id)
          .eq('status', 'pending')
          .select('id')
          .single();

        if (claimError || !claimed) {
          results.skipped++;
          continue;
        }

        // 既に送信済みかチェック（user_idがある場合はuser_id、ない場合はemailで照合）
        let existingQuery = supabase
          .from('email_sent_history')
          .select('id')
          .eq('email_type', schedule.email_type);

        if (schedule.user_id) {
          existingQuery = existingQuery.eq('user_id', schedule.user_id);
        } else {
          existingQuery = existingQuery.eq('email', schedule.email);
        }

        const { data: existingList, error: existingError } = await existingQuery.limit(1);
        if (existingError) {
          console.error('Error checking sent history:', existingError);
        }

        const existing = Array.isArray(existingList) ? existingList[0] : null;
        if (existing) {
          // 既に送信済み → スキップ
          await supabase
            .from('email_schedules')
            .update({ status: 'cancelled', processing_started_at: null, processing_id: null })
            .eq('id', schedule.id);

          results.skipped++;
          continue;
        }

        // メール送信
        await sendStepEmail(
          schedule.email,
          schedule.email_type
        );

        // 送信履歴に記録
        const historyRecord: any = {
          email: schedule.email,
          email_type: schedule.email_type,
        };
        if (schedule.user_id) {
          historyRecord.user_id = schedule.user_id;
        }
        await supabase
          .from('email_sent_history')
          .insert(historyRecord);

        // スケジュールを更新
        await supabase
          .from('email_schedules')
          .update({
            status: 'sent',
            sent_at: now,
            processing_started_at: null,
            processing_id: null,
            last_error: null,
          })
          .eq('id', schedule.id);

        results.sent++;
      } catch (error) {
        console.error(`Failed to send email ${schedule.id}:`, error);

        const attemptCount = (schedule.send_attempts || 0) + 1;
        const nextStatus = attemptCount >= maxAttempts ? 'failed' : 'pending';
        const errorMessage = error instanceof Error ? error.message : String(error);

        // 失敗として記録（一定回数まで再試行）
        await supabase
          .from('email_schedules')
          .update({
            status: nextStatus,
            send_attempts: attemptCount,
            last_error: errorMessage,
            processing_started_at: null,
            processing_id: null,
          })
          .eq('id', schedule.id);

        results.failed++;
      }
    }

    return NextResponse.json({
      message: 'Email sending completed',
      results,
    });
  } catch (error) {
    console.error('Email sending cron error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
