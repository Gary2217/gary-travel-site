-- ============================================================
-- 自動抓取系統：pending_changes + scrape_logs + 設定初始化
-- 用法：在 Supabase SQL Editor 執行此檔案
-- ============================================================

-- ─── 1. pending_changes 表（待確認變更）───────────────────────

CREATE TABLE IF NOT EXISTS pending_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 關聯
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,  -- NULL = 新行程
  destination_id UUID REFERENCES destinations(id) ON DELETE CASCADE,

  -- 變更類型
  change_type TEXT NOT NULL,  -- price | new_trip | removed | departure | info | price_detail | flight | image
  field_name TEXT,            -- 變更欄位名（如 price_range、title、duration 等）
  old_value TEXT,             -- 舊值
  new_value TEXT,             -- 新值

  -- 行程資訊（方便列表顯示，不需 JOIN）
  trip_title TEXT,
  source_code TEXT,           -- 團號（AUH4AG7D）
  source_url TEXT,            -- 朋威行程頁 URL
  region_label TEXT,          -- 區域標籤（中東、中亞、西伯利亞）

  -- 完整抓取資料（確認時直接用這份寫入 DB）
  scraped_data JSONB,

  -- 狀態
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | dismissed
  scrape_log_id UUID,         -- 屬於哪次抓取

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_pending_changes_status ON pending_changes(status);
CREATE INDEX IF NOT EXISTS idx_pending_changes_trip_id ON pending_changes(trip_id);
CREATE INDEX IF NOT EXISTS idx_pending_changes_scrape_log ON pending_changes(scrape_log_id);

-- RLS
ALTER TABLE pending_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read pending_changes"
  ON pending_changes FOR SELECT
  USING (true);

CREATE POLICY "Service role manage pending_changes"
  ON pending_changes FOR ALL
  USING (true)
  WITH CHECK (true);


-- ─── 2. scrape_logs 表（抓取紀錄 + 即時進度）──────────────────

CREATE TABLE IF NOT EXISTS scrape_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 狀態
  status TEXT NOT NULL DEFAULT 'running',  -- running | completed | failed | cancelled

  -- 進度（前端輪詢用）
  current_region TEXT,        -- 目前正在抓的區域名
  current_trip TEXT,          -- 目前正在抓的行程名
  total_regions INT DEFAULT 0,
  completed_regions INT DEFAULT 0,
  total_trips INT DEFAULT 0,
  completed_trips INT DEFAULT 0,
  changes_found INT DEFAULT 0,

  -- 錯誤
  error_message TEXT,

  -- 各區域明細
  region_details JSONB DEFAULT '[]',  -- [{ name, status, trip_count, completed }]

  -- 時間
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_scrape_logs_status ON scrape_logs(status);
CREATE INDEX IF NOT EXISTS idx_scrape_logs_started ON scrape_logs(started_at DESC);

-- RLS
ALTER TABLE scrape_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read scrape_logs"
  ON scrape_logs FOR SELECT
  USING (true);

CREATE POLICY "Service role manage scrape_logs"
  ON scrape_logs FOR ALL
  USING (true)
  WITH CHECK (true);


-- ─── 3. scrape_log_id FK（pending_changes → scrape_logs）─────

ALTER TABLE pending_changes
  ADD CONSTRAINT fk_pending_changes_scrape_log
  FOREIGN KEY (scrape_log_id) REFERENCES scrape_logs(id) ON DELETE SET NULL;


-- ─── 4. site_settings 初始化抓取設定 ─────────────────────────

INSERT INTO site_settings (key, value) VALUES
  ('scrape_auto_enabled', 'false'),
  ('scrape_interval_days', '3'),
  ('scrape_time', '"03:00"'),
  ('scrape_last_run', 'null'),
  ('scrape_regions', '["asia","japan","south-korea","thailand","vietnam","indonesia","malaysia","philippines","europe","china","southasia","new"]')
ON CONFLICT (key) DO NOTHING;
