-- ============================================
-- Gary Travel Site - 資料庫擴展
-- 新增 trips、trip_days、inquiries 表
-- 請在 Supabase Dashboard SQL Editor 中執行
-- ============================================

-- 1. 行程表
CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id UUID REFERENCES destinations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subtitle TEXT,
  duration TEXT NOT NULL,
  price_range TEXT,
  cover_image_url TEXT,
  highlights TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 每日行程表
CREATE TABLE IF NOT EXISTS trip_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  meals TEXT,
  accommodation TEXT,
  activities TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 諮詢紀錄表
CREATE TABLE IF NOT EXISTS inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
  trip_title TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  message TEXT,
  source TEXT NOT NULL DEFAULT 'FORM',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 索引
CREATE INDEX IF NOT EXISTS idx_trips_destination_id ON trips(destination_id);
CREATE INDEX IF NOT EXISTS idx_trips_is_active ON trips(is_active);
CREATE INDEX IF NOT EXISTS idx_trips_display_order ON trips(display_order);
CREATE INDEX IF NOT EXISTS idx_trip_days_trip_id ON trip_days(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_days_day_number ON trip_days(trip_id, day_number);
CREATE INDEX IF NOT EXISTS idx_inquiries_trip_id ON inquiries(trip_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries(created_at);

-- 5. updated_at 自動更新觸發器
CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inquiries_updated_at BEFORE UPDATE ON inquiries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. RLS 政策
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to active trips"
  ON trips FOR SELECT USING (is_active = true);

CREATE POLICY "Allow public read access to trip_days"
  ON trip_days FOR SELECT USING (true);

CREATE POLICY "Allow public insert to inquiries"
  ON inquiries FOR INSERT WITH CHECK (true);

-- ============================================
-- 範例行程種子資料（大阪）
-- 先找到大阪的 destination id
-- ============================================

-- 插入範例行程（大阪）
-- 注意：destination_id 需要替換為實際的 UUID
-- 可用以下查詢找到：SELECT id, title FROM destinations WHERE title LIKE '%大阪%';

DO $$
DECLARE
  osaka_id UUID;
  trip1_id UUID;
  trip2_id UUID;
BEGIN
  -- 找到大阪的 destination_id
  SELECT id INTO osaka_id FROM destinations WHERE title LIKE '%大阪%' LIMIT 1;

  IF osaka_id IS NOT NULL THEN
    -- 行程 1：京阪神五日遊
    INSERT INTO trips (id, destination_id, title, subtitle, duration, price_range, highlights, display_order)
    VALUES (
      gen_random_uuid(),
      osaka_id,
      '京阪神五日遊',
      '一次玩遍大阪、京都、神戶三大城市',
      '5天4夜',
      'NT$35,000~45,000',
      ARRAY['道頓堀', '清水寺', '金閣寺', '神戶港', '環球影城'],
      1
    ) RETURNING id INTO trip1_id;

    -- 行程 1 每日明細
    INSERT INTO trip_days (trip_id, day_number, title, description, meals, accommodation, activities) VALUES
    (trip1_id, 1, '抵達大阪 → 道頓堀夜遊', '抵達關西機場後搭乘利木津巴士前往飯店，傍晚前往道頓堀享受美食與購物', '晚餐：道頓堀自理', '大阪難波飯店', ARRAY['關西機場接機', '道頓堀', '心齋橋購物']),
    (trip1_id, 2, '大阪環球影城一日遊', '全天暢遊日本環球影城，體驗哈利波特魔法世界與超級任天堂世界', '早餐：飯店 / 午晚餐：園區自理', '大阪難波飯店', ARRAY['環球影城', '哈利波特魔法世界', '超級任天堂世界']),
    (trip1_id, 3, '京都經典一日遊', '探訪千年古都京都，參觀清水寺、金閣寺、嵐山竹林', '早餐：飯店 / 午餐：京都料理', '大阪難波飯店', ARRAY['清水寺', '金閣寺', '嵐山竹林', '伏見稻荷大社']),
    (trip1_id, 4, '神戶半日遊 + 大阪購物', '上午前往神戶港散步、品嚐神戶牛，下午回大阪自由購物', '早餐：飯店 / 午餐：神戶牛排', '大阪難波飯店', ARRAY['神戶港', '北野異人館', '梅田購物']),
    (trip1_id, 5, '大阪城 → 返程', '上午參觀大阪城天守閣，下午搭機返台', '早餐：飯店', '', ARRAY['大阪城', '黑門市場', '關西機場送機']);

    -- 行程 2：大阪自由行三日
    INSERT INTO trips (id, destination_id, title, subtitle, duration, price_range, highlights, display_order)
    VALUES (
      gen_random_uuid(),
      osaka_id,
      '大阪自由行三日',
      '輕鬆自在的大阪深度探索',
      '3天2夜',
      'NT$18,000~25,000',
      ARRAY['道頓堀', '大阪城', '黑門市場', '通天閣'],
      2
    ) RETURNING id INTO trip2_id;

    INSERT INTO trip_days (trip_id, day_number, title, description, meals, accommodation, activities) VALUES
    (trip2_id, 1, '抵達大阪 → 心齋橋探索', '下午抵達大阪，入住飯店後前往心齋橋商圈', '晚餐：道頓堀自理', '大阪難波飯店', ARRAY['心齋橋', '道頓堀', '法善寺橫丁']),
    (trip2_id, 2, '大阪城 + 天王寺', '全天大阪市區觀光，大阪城天守閣、天王寺、通天閣', '早餐：飯店 / 午餐：黑門市場', '大阪難波飯店', ARRAY['大阪城', '黑門市場', '天王寺', '通天閣']),
    (trip2_id, 3, '梅田購物 → 返程', '上午在梅田地區購物，下午前往機場', '早餐：飯店', '', ARRAY['梅田', 'HEP FIVE摩天輪', '關西機場送機']);

    RAISE NOTICE '成功插入大阪範例行程';
  ELSE
    RAISE NOTICE '找不到大阪目的地，請確認 destinations 表中有大阪資料';
  END IF;
END $$;
