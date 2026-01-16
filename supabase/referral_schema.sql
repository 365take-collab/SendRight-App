-- ============================================
-- SendRight 紹介システム スキーマ
-- ============================================
-- Supabaseダッシュボード > SQL Editor で実行してください

-- 1. users テーブルに紹介関連カラムを追加
ALTER TABLE users
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by TEXT,
ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS referral_free_months INTEGER DEFAULT 0;  -- 獲得した無料月数

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
  free_months_per_referral INTEGER DEFAULT 1,  -- 1人紹介につき1ヶ月無料
  max_free_months INTEGER DEFAULT 12,          -- 最大12ヶ月まで
  trial_extension_days INTEGER DEFAULT 7,      -- 紹介された人のトライアル延長日数
  bonus_3_referrals TEXT DEFAULT 'モテるLINEテクニック集',      -- 3人紹介特典
  bonus_5_referrals TEXT DEFAULT 'デート成功率3倍マニュアル',   -- 5人紹介特典
  bonus_10_referrals TEXT DEFAULT '1時間オンライン恋愛コンサル', -- 10人紹介特典
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 初期設定を挿入
INSERT INTO sendright_referral_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- 5. 特典配布履歴テーブル
CREATE TABLE IF NOT EXISTS sendright_referral_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  bonus_type TEXT NOT NULL,           -- 'bonus_3', 'bonus_5', 'bonus_10'
  bonus_name TEXT NOT NULL,           -- 特典名
  delivered_at TIMESTAMPTZ DEFAULT now(),
  delivery_method TEXT DEFAULT 'email', -- 'email', 'manual'
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_referral_bonuses_user ON sendright_referral_bonuses(user_email);
CREATE INDEX IF NOT EXISTS idx_referral_bonuses_type ON sendright_referral_bonuses(bonus_type);

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

-- 6. 紹介報酬計算関数（無料月数を返す）
CREATE OR REPLACE FUNCTION calculate_sendright_free_months(referral_count INTEGER)
RETURNS INTEGER AS $$
DECLARE
  settings RECORD;
  free_months INTEGER;
BEGIN
  SELECT * INTO settings FROM sendright_referral_settings WHERE id = 1;
  
  -- 紹介人数 × 1ヶ月（最大12ヶ月まで）
  free_months := referral_count * settings.free_months_per_referral;
  
  IF free_months > settings.max_free_months THEN
    RETURN settings.max_free_months;
  ELSE
    RETURN free_months;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 特典チェック関数（どの特典が獲得済みか確認）
CREATE OR REPLACE FUNCTION check_sendright_referral_bonus(referral_count INTEGER)
RETURNS TABLE(bonus_type TEXT, bonus_name TEXT, is_eligible BOOLEAN) AS $$
DECLARE
  settings RECORD;
BEGIN
  SELECT * INTO settings FROM sendright_referral_settings WHERE id = 1;
  
  -- 3人紹介特典
  RETURN QUERY SELECT 
    'bonus_3'::TEXT, 
    settings.bonus_3_referrals, 
    (referral_count >= 3);
  
  -- 5人紹介特典
  RETURN QUERY SELECT 
    'bonus_5'::TEXT, 
    settings.bonus_5_referrals, 
    (referral_count >= 5);
  
  -- 10人紹介特典
  RETURN QUERY SELECT 
    'bonus_10'::TEXT, 
    settings.bonus_10_referrals, 
    (referral_count >= 10);
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
-- SELECT email, referral_code, referral_count, referral_free_months FROM users LIMIT 10;
-- SELECT * FROM sendright_referral_settings;
-- SELECT * FROM sendright_referrals ORDER BY created_at DESC LIMIT 10;
-- SELECT * FROM sendright_referral_bonuses ORDER BY delivered_at DESC LIMIT 10;
-- SELECT * FROM check_sendright_referral_bonus(5);  -- 5人紹介時の特典確認
