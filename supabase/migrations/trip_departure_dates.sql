-- 行程出團日期表（一個行程可有多個出團梯次）
CREATE TABLE IF NOT EXISTS trip_departure_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  departure_date DATE NOT NULL,
  departure_city TEXT NOT NULL DEFAULT '桃園',
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
CREATE INDEX IF NOT EXISTS idx_trip_departure_dates_trip_id ON trip_departure_dates(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_departure_dates_date ON trip_departure_dates(departure_date);

-- 啟用 RLS
ALTER TABLE trip_departure_dates ENABLE ROW LEVEL SECURITY;

-- 公開讀取
CREATE POLICY "Public read trip_departure_dates"
  ON trip_departure_dates FOR SELECT
  USING (true);
