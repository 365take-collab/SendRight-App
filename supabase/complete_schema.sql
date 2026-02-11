-- ============================================
-- SendRight 完全スキーマ（基本 + 紹介システム）
-- ============================================
-- Supabaseダッシュボード > SQL Editor で実行してください

-- 1. usersテーブル（基本）
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  stripe_customer_id TEXT,
  is_subscribed BOOLEAN DEFAULT false,
  is_utage_user BOOLEAN DEFAULT false, -- legacy: Utage解約済み（互換維持）
  subscription_type TEXT DEFAULT 'free',
  daily_usage_limit INTEGER DEFAULT 3,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_active_date DATE,
  total_usage_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  badges TEXT[] DEFAULT '{}',
  -- 紹介システム用カラム
  referral_code TEXT UNIQUE,
  referred_by TEXT,
  referral_count INTEGER DEFAULT 0,
  referral_discount_percent INTEGER DEFAULT 0,
  -- タイムスタンプ
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. usage_recordsテーブル（使用履歴）
CREATE TABLE IF NOT EXISTS usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. ban_listテーブル（BAN管理）
CREATE TABLE IF NOT EXISTS ban_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT,
  banned_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- 4. 紹介トラッキングテーブル
CREATE TABLE IF NOT EXISTS sendright_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_email TEXT NOT NULL,
  referred_email TEXT NOT NULL,
  referral_code TEXT NOT NULL,
  status TEXT DEFAULT 'registered',
  reward_percent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  converted_at TIMESTAMPTZ,
  notes TEXT
);

-- 5. 紹介報酬設定テーブル
CREATE TABLE IF NOT EXISTS sendright_referral_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  discount_1_referral INTEGER DEFAULT 10,
  discount_2_referral INTEGER DEFAULT 20,
  discount_3_referral INTEGER DEFAULT 50,
  discount_5_referral INTEGER DEFAULT 100,
  trial_extension_days INTEGER DEFAULT 7,
  max_referrals_per_month INTEGER DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 初期設定を挿入
INSERT INTO sendright_referral_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- インデックス
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);
CREATE INDEX IF NOT EXISTS idx_usage_records_user_date ON usage_records(user_id, date);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON sendright_referrals(referrer_email);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON sendright_referrals(referred_email);

-- ============================================
-- 紹介コード生成関数
-- ============================================
CREATE OR REPLACE FUNCTION generate_sendright_referral_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  final_code TEXT;
  i INTEGER;
BEGIN
  LOOP
    final_code := '';
    FOR i IN 1..8 LOOP
      final_code := final_code || SUBSTR(chars, FLOOR(RANDOM() * LENGTH(chars) + 1)::INTEGER, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM users WHERE referral_code = final_code);
  END LOOP;
  RETURN final_code;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 新規ユーザー作成時に自動で紹介コードを生成するトリガー
-- ============================================
CREATE OR REPLACE FUNCTION auto_generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_sendright_referral_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_referral_code ON users;
CREATE TRIGGER trigger_auto_referral_code
BEFORE INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION auto_generate_referral_code();

-- ============================================
-- 確認クエリ（実行後にコメントを外して確認）
-- ============================================
-- SELECT * FROM users LIMIT 5;
-- SELECT * FROM sendright_referral_settings;
-- SELECT * FROM sendright_referrals LIMIT 5;

-- ============================================
-- AI返信履歴・フィードバック
-- ============================================
CREATE TABLE IF NOT EXISTS response_histories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  her_message TEXT NOT NULL,
  response TEXT NOT NULL,
  explanation TEXT,
  alternatives JSONB DEFAULT '[]',
  conversation_history JSONB,
  full_conversation_text TEXT,
  profile_context TEXT,
  goal TEXT,
  tone TEXT,
  response_type TEXT,
  ai_provider TEXT,
  ai_model TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_response_histories_user_id ON response_histories(user_id);
CREATE INDEX IF NOT EXISTS idx_response_histories_created_at ON response_histories(created_at);

CREATE TABLE IF NOT EXISTS response_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  response_id UUID REFERENCES response_histories(id) ON DELETE CASCADE,
  rating TEXT NOT NULL,
  reason TEXT,
  tags TEXT[],
  goal_achieved BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_response_feedback_user_id ON response_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_response_feedback_response_id ON response_feedback(response_id);

-- ============================================
-- Success Pattern DB（高評価セッションのナレッジ化）
-- ============================================
CREATE TABLE IF NOT EXISTS success_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  response_id UUID REFERENCES response_histories(id) ON DELETE CASCADE,
  task_text TEXT NOT NULL,
  her_message TEXT NOT NULL,
  response TEXT NOT NULL,
  knowledge JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_success_patterns_user_response_unique
ON success_patterns(user_id, response_id);

CREATE INDEX IF NOT EXISTS idx_success_patterns_user_id ON success_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_success_patterns_created_at ON success_patterns(created_at);

-- ============================================
-- Stripe webhook冪等性
-- ============================================
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  stripe_created_at TIMESTAMPTZ,
  status TEXT DEFAULT 'processing', -- processing, processed, ignored, failed
  last_error TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_event_id ON stripe_webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_status ON stripe_webhook_events(status);

-- ============================================
-- ステップメール用スキーマ
-- ============================================
CREATE TABLE IF NOT EXISTS email_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  email_type TEXT NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_email_schedules_user_id ON email_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_email_schedules_email ON email_schedules(email);
CREATE INDEX IF NOT EXISTS idx_email_schedules_status ON email_schedules(status);
CREATE INDEX IF NOT EXISTS idx_email_schedules_scheduled_at ON email_schedules(scheduled_at);

CREATE TABLE IF NOT EXISTS email_sent_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  email_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_email_sent_history_user_id ON email_sent_history(user_id);
CREATE INDEX IF NOT EXISTS idx_email_sent_history_email_type ON email_sent_history(email_type);

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_sent_history_unique
ON email_sent_history(user_id, email_type);
