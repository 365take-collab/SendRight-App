#!/usr/bin/env node

/**
 * 紹介システムのスキーマをSupabaseに適用するスクリプト
 * 使用方法: node scripts/apply-referral-schema.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// .env.localから環境変数を読み込む
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 環境変数が設定されていません');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// SQLを分割して実行する関数
async function executeSql(sql) {
  // Supabaseのrpc関数を使ってSQLを実行
  // ただし、これはPostgreSQLの関数を呼び出すものなので、
  // 直接SQLを実行するにはSupabase CLIまたはダッシュボードが必要
  
  // 代わりに、Supabaseのデータベース直接接続を試みる
  console.log('⚠️ Supabase JS SDKでは直接SQLを実行できません');
  console.log('以下の方法でスキーマを適用してください:');
  console.log('');
  console.log('方法1: Supabase CLI');
  console.log('  npx supabase db push --db-url "YOUR_DATABASE_URL"');
  console.log('');
  console.log('方法2: Supabaseダッシュボード');
  console.log('  1. https://app.supabase.com にアクセス');
  console.log('  2. プロジェクトを選択');
  console.log('  3. SQL Editor を開く');
  console.log('  4. 以下のファイルの内容をコピペして実行:');
  console.log('     supabase/referral_schema.sql');
  console.log('');
  
  // SQLファイルの内容を表示
  const schemaPath = path.join(__dirname, '..', 'supabase', 'referral_schema.sql');
  if (fs.existsSync(schemaPath)) {
    console.log('📄 スキーマファイルの場所:', schemaPath);
  }
}

// テーブル状況を確認する関数
async function checkTables() {
  console.log('📊 現在のテーブル状況を確認中...\n');

  // usersテーブルの紹介関連カラムを確認
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, referral_code, referral_count')
    .limit(3);

  if (usersError) {
    if (usersError.message.includes('referral_code')) {
      console.log('❌ usersテーブルに紹介関連カラムがありません');
      console.log('   → スキーマを実行する必要があります\n');
    } else {
      console.log('❌ usersテーブルエラー:', usersError.message);
    }
  } else {
    console.log('✓ usersテーブル: 存在します');
    if (users && users.length > 0 && 'referral_code' in users[0]) {
      console.log('✓ 紹介関連カラム: 存在します');
      console.log('  サンプルデータ:');
      users.forEach(u => {
        console.log(`    ${u.email}: ${u.referral_code || '(未設定)'}`);
      });
    } else {
      console.log('⚠️ 紹介関連カラム: 存在しないか、データがありません');
    }
  }

  // sendright_referralsテーブルを確認
  const { data: referrals, error: referralsError } = await supabase
    .from('sendright_referrals')
    .select('*')
    .limit(1);

  if (referralsError) {
    console.log('❌ sendright_referralsテーブル: 存在しません');
    console.log('   → スキーマを実行する必要があります\n');
  } else {
    console.log('✓ sendright_referralsテーブル: 存在します');
  }

  // sendright_referral_settingsテーブルを確認
  const { data: settings, error: settingsError } = await supabase
    .from('sendright_referral_settings')
    .select('*')
    .limit(1);

  if (settingsError) {
    console.log('❌ sendright_referral_settingsテーブル: 存在しません');
    console.log('   → スキーマを実行する必要があります\n');
  } else {
    console.log('✓ sendright_referral_settingsテーブル: 存在します');
    if (settings && settings.length > 0) {
      console.log('  設定:', JSON.stringify(settings[0], null, 2));
    }
  }
}

async function main() {
  console.log('🚀 SendRight 紹介システム スキーマ適用スクリプト\n');
  console.log('Supabase URL:', supabaseUrl);
  console.log('');

  await checkTables();
  console.log('');
  await executeSql();
}

main().catch(console.error);
