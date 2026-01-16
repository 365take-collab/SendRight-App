-- ============================================
-- SendRight 紹介システム - Utage自動連携
-- ============================================
-- 紹介人数が3/5/10人に達したら自動でUtageにメール送信

-- Utageフォーム情報
-- 3人達成: https://utage-system.com/r/PdimgvZMchyM/store
-- 5人達成: https://utage-system.com/r/STxiepSXlIXU/store
-- 10人達成: https://utage-system.com/r/V0C9cKJ3mO54/store
-- rid（共通）: vOKY9xljNlf3

-- 1. Utageフォーム設定テーブル
CREATE TABLE IF NOT EXISTS sendright_utage_forms (
  id INTEGER PRIMARY KEY,
  threshold INTEGER NOT NULL,           -- 紹介人数の閾値（3, 5, 10）
  form_url TEXT NOT NULL,               -- UtageフォームのURL
  rid TEXT NOT NULL,                    -- hidden field
  description TEXT
);

-- 初期データを挿入
INSERT INTO sendright_utage_forms (id, threshold, form_url, rid, description)
VALUES 
  (1, 3, 'https://utage-system.com/r/PdimgvZMchyM/store', 'vOKY9xljNlf3', '紹介3人達成特典配信'),
  (2, 5, 'https://utage-system.com/r/STxiepSXlIXU/store', 'vOKY9xljNlf3', '紹介5人達成特典配信'),
  (3, 10, 'https://utage-system.com/r/V0C9cKJ3mO54/store', 'vOKY9xljNlf3', '紹介10人達成特典配信')
ON CONFLICT (id) DO UPDATE SET
  form_url = EXCLUDED.form_url,
  rid = EXCLUDED.rid,
  description = EXCLUDED.description;

-- 2. pg_net拡張を有効化（HTTP リクエスト用）
-- ※ Supabaseダッシュボード > Database > Extensions で pg_net を有効化する必要あり
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 3. Utageへのフォーム送信関数
CREATE OR REPLACE FUNCTION send_to_utage(user_email TEXT, threshold INTEGER)
RETURNS VOID AS $$
DECLARE
  form_record RECORD;
BEGIN
  -- フォーム情報を取得
  SELECT * INTO form_record 
  FROM sendright_utage_forms 
  WHERE sendright_utage_forms.threshold = send_to_utage.threshold;
  
  IF form_record IS NULL THEN
    RAISE NOTICE 'No Utage form found for threshold %', threshold;
    RETURN;
  END IF;
  
  -- 既に送信済みかチェック
  IF EXISTS (
    SELECT 1 FROM sendright_referral_bonuses 
    WHERE sendright_referral_bonuses.user_email = send_to_utage.user_email
    AND bonus_type = 'bonus_' || threshold
  ) THEN
    RAISE NOTICE 'Already sent for user % at threshold %', user_email, threshold;
    RETURN;
  END IF;
  
  -- Utageにフォーム送信（pg_net使用）
  PERFORM net.http_post(
    url := form_record.form_url,
    headers := '{"Content-Type": "application/x-www-form-urlencoded"}'::jsonb,
    body := 'mail=' || user_email || '&rid=' || form_record.rid
  );
  
  -- 送信履歴を記録
  INSERT INTO sendright_referral_bonuses (user_email, bonus_type, bonus_name, delivery_method)
  VALUES (
    user_email,
    'bonus_' || threshold,
    form_record.description,
    'utage_auto'
  );
  
  RAISE NOTICE 'Sent to Utage: % at threshold %', user_email, threshold;
END;
$$ LANGUAGE plpgsql;

-- 4. 紹介カウント更新時のトリガー関数
CREATE OR REPLACE FUNCTION check_referral_threshold()
RETURNS TRIGGER AS $$
BEGIN
  -- 紹介カウントが変更された場合のみチェック
  IF NEW.referral_count IS DISTINCT FROM OLD.referral_count THEN
    -- 3人達成チェック
    IF NEW.referral_count >= 3 AND (OLD.referral_count IS NULL OR OLD.referral_count < 3) THEN
      PERFORM send_to_utage(NEW.email, 3);
    END IF;
    
    -- 5人達成チェック
    IF NEW.referral_count >= 5 AND (OLD.referral_count IS NULL OR OLD.referral_count < 5) THEN
      PERFORM send_to_utage(NEW.email, 5);
    END IF;
    
    -- 10人達成チェック
    IF NEW.referral_count >= 10 AND (OLD.referral_count IS NULL OR OLD.referral_count < 10) THEN
      PERFORM send_to_utage(NEW.email, 10);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. トリガーを作成
DROP TRIGGER IF EXISTS trigger_check_referral_threshold ON users;
CREATE TRIGGER trigger_check_referral_threshold
AFTER UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION check_referral_threshold();

-- ============================================
-- テスト用クエリ
-- ============================================
-- 
-- -- Utageフォーム設定を確認
-- SELECT * FROM sendright_utage_forms;
-- 
-- -- 手動でUtageに送信テスト
-- SELECT send_to_utage('test@example.com', 3);
-- 
-- -- 送信履歴を確認
-- SELECT * FROM sendright_referral_bonuses ORDER BY delivered_at DESC;
-- 
-- -- 紹介カウントを更新してテスト（トリガーが発動する）
-- UPDATE users SET referral_count = 3 WHERE email = 'test@example.com';
