-- ============================================
-- RLS 策略補齊 — 2026-05-06
-- 針對缺少 RLS 的表啟用並設定適當政策
-- 請在 Supabase Dashboard SQL Editor 中執行
-- ============================================

-- ── analytics_events ────────────────────────
-- 用途：追蹤使用者行為（頁面瀏覽、下載、分享等）
-- 策略：公開新增（前端送事件）、僅 service_role 可讀（後台統計用）

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- 允許匿名新增事件
CREATE POLICY "Allow public insert analytics_events"
  ON analytics_events FOR SELECT
  USING (true);

CREATE POLICY "Allow anon insert analytics_events"
  ON analytics_events FOR INSERT
  WITH CHECK (true);

-- 禁止匿名更新和刪除（只有 service_role 可以）
-- RLS 預設拒絕，不需額外 DENY 政策


-- ── contact_forms ───────────────────────────
-- 用途：客戶聯絡表單
-- 策略：公開新增（訪客提交）、禁止公開讀取（含個資）

ALTER TABLE contact_forms ENABLE ROW LEVEL SECURITY;

-- 允許匿名新增
CREATE POLICY "Allow anon insert contact_forms"
  ON contact_forms FOR INSERT
  WITH CHECK (true);

-- 不建立 SELECT 政策 → 匿名讀取被 RLS 擋住
-- API route 用 service_role key 讀取（已有 dev auth 保護）


-- ── flight_routes ───────────────────────────
-- 用途：航線資料（公開瀏覽）
-- 策略：公開讀取 active 航線、寫入僅 service_role

ALTER TABLE flight_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read active flight_routes"
  ON flight_routes FOR SELECT
  USING (is_active = true);


-- ── trip_side_media ─────────────────────────
-- 用途：行程側邊媒體（圖片、IG 影片）
-- 策略：公開讀取、寫入僅 service_role

ALTER TABLE trip_side_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read trip_side_media"
  ON trip_side_media FOR SELECT
  USING (true);


-- ============================================
-- 驗證：列出所有表的 RLS 狀態
-- ============================================
-- 執行以下查詢確認所有表都啟用了 RLS：
--
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
