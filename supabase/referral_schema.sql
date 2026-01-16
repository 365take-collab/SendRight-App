-- ============================================
-- SendRight 紹介システム スキーマ
-- ============================================
-- Supabaseダッシュボード > SQL Editor で実行してください

-- 1. users テーブルに紹介関連カラムを追加
ALTER TABLE users
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by TEXT,
ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS referral_discount_percent INTEGER DEFAULT 0;

-- 2. 紹介コードのインデックス
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users(referred_by);

-- 3. 紹介トラッキングテーブル（詳細な履歴を保存）
CREATE TABLE IF NOT EXISTS sendright_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_email TEXT NOT NULL,           -- 紹介者のメール
  referred_email TEXT NOT NULL,           -- 紹介された人のメール
  referral_code TEXT NOT NULL,            -- 使用された紹介コード
  status TEXT DEFAULT 'registered',       -- registered, converted, cancelled
  reward_percent INTEGER DEFAULT 0,       -- 割引率（%）
  created_at TIMESTAMPTZ DEFAULT now(),   -- 紹介された日時
  converted_at TIMESTAMPTZ,               -- 有料転換した日時
  notes TEXT                              -- メモ
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON sendright_referrals(referrer_email);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON sendright_referrals(referred_email);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON sendright_referrals(status);

-- 4. 紹介報酬設定テーブル
CREATE TABLE IF NOT EXISTS sendright_referral_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  discount_1_referral INTEGER DEFAULT 10,   -- 1人紹介で10%OFF
  discount_2_referral INTEGER DEFAULT 20,   -- 2人紹介で20%OFF
  discount_3_referral INTEGER DEFAULT 50,   -- 3人紹介で50%OFF
  discount_5_referral INTEGER DEFAULT 100,  -- 5人紹介で100%OFF（無料）
  trial_extension_days INTEGER DEFAULT 7,   -- 紹介された人のトライアル延長日数
  max_referrals_per_month INTEGER DEFAULT 10, -- 月間紹介上限
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 初期設定を挿入
INSERT INTO sendright_referral_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- 5. 紹介コード生成用の関数（完全ランダム8文字）
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

-- 6. 紹介報酬計算関数
CREATE OR REPLACE FUNCTION calculate_sendright_referral_discount(referral_count INTEGER)
RETURNS INTEGER AS $$
DECLARE
  settings RECORD;
BEGIN
  SELECT * INTO settings FROM sendright_referral_settings WHERE id = 1;
  
  IF referral_count >= 5 THEN
    RETURN settings.discount_5_referral;  -- 100% (無料)
  ELSIF referral_count >= 3 THEN
    RETURN settings.discount_3_referral;  -- 50%
  ELSIF referral_count >= 2 THEN
    RETURN settings.discount_2_referral;  -- 20%
  ELSIF referral_count >= 1 THEN
    RETURN settings.discount_1_referral;  -- 10%
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 7. 新規ユーザー作成時に自動で紹介コードを生成するトリガー
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

-- 8. 既存ユーザーに紹介コードを付与（一度だけ実行）
UPDATE users
SET referral_code = generate_sendright_referral_code()
WHERE referral_code IS NULL;

-- ============================================
-- 確認クエリ
-- ============================================
-- SELECT email, referral_code, referral_count, referral_discount_percent FROM users LIMIT 10;
-- SELECT * FROM sendright_referral_settings;
-- SELECT * FROM sendright_referrals ORDER BY created_at DESC LIMIT 10;
