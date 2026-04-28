-- 機票航班出發日期表（一條航線可有多個出發日期/票價）
CREATE TABLE IF NOT EXISTS flight_departure_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_route_id UUID NOT NULL REFERENCES flight_routes(id) ON DELETE CASCADE,
  departure_date DATE NOT NULL,
  airline TEXT,
  price INTEGER,
  seats_total INTEGER DEFAULT 0,
  seats_available INTEGER DEFAULT 0,
  label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_flight_departure_dates_route_id ON flight_departure_dates(flight_route_id);
CREATE INDEX IF NOT EXISTS idx_flight_departure_dates_date ON flight_departure_dates(departure_date);

-- 啟用 RLS
ALTER TABLE flight_departure_dates ENABLE ROW LEVEL SECURITY;

-- 公開讀取
CREATE POLICY "Public read flight_departure_dates"
  ON flight_departure_dates FOR SELECT
  USING (true);
