import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { sendStepEmail } from '@/lib/resend';
import crypto from 'crypto';

function normalizeHistoryEmail(email: string): string {
  return email.trim().toLowerCase();
}

function createEmailHistoryKey(email: string, emailType: string): string {
  return `email:${normalizeHistoryEmail(email)}:${emailType}`;
}

function createUserHistoryKey(userId: string | null, emailType: string): string | null {
  return userId ? `user:${userId}:${emailType}` : null;
}

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
    const sentHistoryKeys = new Set<string>();

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

        const normalizedEmail = normalizeHistoryEmail(schedule.email);
        const emailHistoryKey = createEmailHistoryKey(schedule.email, schedule.email_type);
        const userHistoryKey = createUserHistoryKey(schedule.user_id ?? null, schedule.email_type);

        if (sentHistoryKeys.has(emailHistoryKey) || (userHistoryKey && sentHistoryKeys.has(userHistoryKey))) {
          await supabase
            .from('email_schedules')
            .update({ status: 'cancelled', processing_started_at: null, processing_id: null })
            .eq('id', schedule.id);

          results.skipped++;
          continue;
        }

        let hasExistingByUser = false;
        if (schedule.user_id) {
          const { data: existingByUser, error: existingByUserError } = await supabase
            .from('email_sent_history')
            .select('id')
            .eq('email_type', schedule.email_type)
            .eq('user_id', schedule.user_id)
            .limit(1);

          if (existingByUserError) {
            console.error('Error checking sent history by user_id:', existingByUserError);
          }

          hasExistingByUser = Array.isArray(existingByUser) && existingByUser.length > 0;
        }

        const { data: existingByEmail, error: existingByEmailError } = await supabase
          .from('email_sent_history')
          .select('id')
          .eq('email_type', schedule.email_type)
          .ilike('email', normalizedEmail)
          .limit(1);

        if (existingByEmailError) {
          console.error('Error checking sent history by email:', existingByEmailError);
        }

        const hasExistingByEmail = Array.isArray(existingByEmail) && existingByEmail.length > 0;
        if (hasExistingByUser || hasExistingByEmail) {
          // 既に送信済み → スキップ
          await supabase
            .from('email_schedules')
            .update({ status: 'cancelled', processing_started_at: null, processing_id: null })
            .eq('id', schedule.id);

          if (userHistoryKey) {
            sentHistoryKeys.add(userHistoryKey);
          }
          sentHistoryKeys.add(emailHistoryKey);

          results.skipped++;
          continue;
        }

        // メール送信
        await sendStepEmail(
          schedule.email,
          schedule.email_type
        );

        // 送信履歴に記録
        const historyRecord: { email: string; email_type: string; user_id?: string } = {
          email: normalizedEmail,
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

        if (userHistoryKey) {
          sentHistoryKeys.add(userHistoryKey);
        }
        sentHistoryKeys.add(emailHistoryKey);

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
