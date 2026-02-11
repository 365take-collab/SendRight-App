-- ============================================
-- ステップメール用スキーマ
-- ============================================
-- Supabaseダッシュボード > SQL Editor で実行してください

-- メールスケジュールテーブル
CREATE TABLE IF NOT EXISTS email_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  email_type TEXT NOT NULL, -- 'welcome', 'day1', 'day3', 'day7', 'day14', 'day30'
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'sent', 'failed', 'cancelled'
  send_attempts INTEGER DEFAULT 0,
  last_error TEXT,
  processing_started_at TIMESTAMPTZ,
  processing_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_email_schedules_user_id ON email_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_email_schedules_email ON email_schedules(email);
CREATE INDEX IF NOT EXISTS idx_email_schedules_status ON email_schedules(status);
CREATE INDEX IF NOT EXISTS idx_email_schedules_scheduled_at ON email_schedules(scheduled_at);

-- 既存テーブルへの追加カラム（マイグレーション用）
ALTER TABLE email_schedules
  ADD COLUMN IF NOT EXISTS send_attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS processing_id TEXT;

-- 送信済みメール履歴テーブル（重複送信防止）
CREATE TABLE IF NOT EXISTS email_sent_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  email_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_email_sent_history_user_id ON email_sent_history(user_id);
CREATE INDEX IF NOT EXISTS idx_email_sent_history_email_type ON email_sent_history(email_type);

-- ユニーク制約（同じユーザーに同じタイプのメールを重複送信しない）
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_sent_history_unique 
ON email_sent_history(user_id, email_type);

-- ステップメールスケジュール作成関数
CREATE OR REPLACE FUNCTION create_email_schedules(user_email TEXT, user_uuid UUID)
RETURNS void AS $$
DECLARE
  now_time TIMESTAMPTZ := now();
BEGIN
  -- ウェルカムメール（即座）
  INSERT INTO email_schedules (user_id, email, email_type, scheduled_at, status)
  VALUES (user_uuid, user_email, 'welcome', now_time, 'pending')
  ON CONFLICT DO NOTHING;

  -- 1日後
  INSERT INTO email_schedules (user_id, email, email_type, scheduled_at, status)
  VALUES (user_uuid, user_email, 'day1', now_time + INTERVAL '1 day', 'pending')
  ON CONFLICT DO NOTHING;

  -- 3日後
  INSERT INTO email_schedules (user_id, email, email_type, scheduled_at, status)
  VALUES (user_uuid, user_email, 'day3', now_time + INTERVAL '3 days', 'pending')
  ON CONFLICT DO NOTHING;

  -- 7日後
  INSERT INTO email_schedules (user_id, email, email_type, scheduled_at, status)
  VALUES (user_uuid, user_email, 'day7', now_time + INTERVAL '7 days', 'pending')
  ON CONFLICT DO NOTHING;

  -- 14日後
  INSERT INTO email_schedules (user_id, email, email_type, scheduled_at, status)
  VALUES (user_uuid, user_email, 'day14', now_time + INTERVAL '14 days', 'pending')
  ON CONFLICT DO NOTHING;

  -- 30日後
  INSERT INTO email_schedules (user_id, email, email_type, scheduled_at, status)
  VALUES (user_uuid, user_email, 'day30', now_time + INTERVAL '30 days', 'pending')
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;
