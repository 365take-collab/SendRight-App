/// <reference lib="deno.ns" />
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (request) => {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return new Response(html('エラー', '無効なリンクです。'), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      status: 400,
    });
  }

  let email: string;
  try {
    email = atob(token);
  } catch {
    return new Response(html('エラー', '無効なトークンです。'), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      status: 400,
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(html('エラー', 'サーバー設定が不足しています。'), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      status: 500,
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await supabase
    .from('subscriber_seq_state')
    .update({ status: 'unsubscribed' })
    .eq('subscriber_email', email)
    .neq('status', 'unsubscribed');

  if (error) {
    console.error('unsubscribe failed', error);
    return new Response(html('エラー', '処理中にエラーが発生しました。'), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      status: 500,
    });
  }

  return new Response(
    html('配信停止完了', `${email} への配信を停止しました。<br>ご利用ありがとうございました。`),
    {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    }
  );
});

function html(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} - マーケティングAIファクトリー</title>
<style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f9fafb}
.card{background:#fff;border-radius:12px;padding:48px;box-shadow:0 1px 3px rgba(0,0,0,.1);text-align:center;max-width:480px}
h1{font-size:24px;margin-bottom:16px}p{color:#6b7280;line-height:1.6}</style>
</head>
<body><div class="card"><h1>${title}</h1><p>${body}</p></div></body></html>`;
}
