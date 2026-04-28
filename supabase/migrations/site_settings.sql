-- 網站設定表（維護模式等）
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT 'false',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 啟用 RLS
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- 公開讀取
CREATE POLICY "Public read site_settings"
  ON site_settings FOR SELECT
  USING (true);

-- 初始化維護模式為關閉
INSERT INTO site_settings (key, value)
VALUES ('maintenance_mode', 'false')
ON CONFLICT (key) DO NOTHING;
