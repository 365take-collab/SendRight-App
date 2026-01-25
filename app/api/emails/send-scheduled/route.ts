import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { sendStepEmail } from '@/lib/resend';

// Vercel Cron Job用のエンドポイント
// 毎日1回実行される想定
export async function GET(request: NextRequest) {
  try {
    // 認証チェック（Vercel Cron Secret）
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    // 送信予定のメールを取得（scheduled_atが過去で、まだ送信されていないもの）
    const { data: schedules, error } = await supabase
      .from('email_schedules')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', now)
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
        // 既に送信済みかチェック
        const { data: existing } = await supabase
          .from('email_sent_history')
          .select('id')
          .eq('user_id', schedule.user_id)
          .eq('email_type', schedule.email_type)
          .single();

        if (existing) {
          // 既に送信済み → スキップ
          await supabase
            .from('email_schedules')
            .update({ status: 'cancelled' })
            .eq('id', schedule.id);
          
          results.skipped++;
          continue;
        }

        // メール送信
        await sendStepEmail(
          schedule.email,
          schedule.email_type as 'welcome' | 'day1' | 'day3' | 'day7' | 'day14' | 'day30'
        );

        // 送信履歴に記録
        await supabase
          .from('email_sent_history')
          .insert({
            user_id: schedule.user_id,
            email: schedule.email,
            email_type: schedule.email_type,
          });

        // スケジュールを更新
        await supabase
          .from('email_schedules')
          .update({
            status: 'sent',
            sent_at: now,
          })
          .eq('id', schedule.id);

        results.sent++;
      } catch (error) {
        console.error(`Failed to send email ${schedule.id}:`, error);
        
        // 失敗として記録
        await supabase
          .from('email_schedules')
          .update({
            status: 'failed',
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
