-- ============================================
-- パスワードハッシュカラムをusersテーブルに追加
-- ============================================
-- Supabaseダッシュボード > SQL Editor で実行してください
--
-- 目的: Stripe経由で購入したユーザーがログインできるよう、
--       パスワードハッシュを保存するカラムを追加する。

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 確認クエリ
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_hash';
