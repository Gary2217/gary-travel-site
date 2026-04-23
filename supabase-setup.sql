-- ============================================
-- 蓋瑞旅遊網站 - Supabase 資料庫結構
-- ============================================

-- 1. 建立旅遊區域表
CREATE TABLE IF NOT EXISTS regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_label TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 建立目的地表
CREATE TABLE IF NOT EXISTS destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID REFERENCES regions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  click_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 建立點擊追蹤表
CREATE TABLE IF NOT EXISTS click_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id UUID REFERENCES destinations(id) ON DELETE CASCADE,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_agent TEXT,
  referrer TEXT,
  ip_address TEXT
);

-- 4. 建立索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_regions_display_order ON regions(display_order);
CREATE INDEX IF NOT EXISTS idx_regions_is_active ON regions(is_active);
CREATE INDEX IF NOT EXISTS idx_destinations_region_id ON destinations(region_id);
CREATE INDEX IF NOT EXISTS idx_destinations_display_order ON destinations(display_order);
CREATE INDEX IF NOT EXISTS idx_destinations_is_active ON destinations(is_active);
CREATE INDEX IF NOT EXISTS idx_click_analytics_destination_id ON click_analytics(destination_id);
CREATE INDEX IF NOT EXISTS idx_click_analytics_clicked_at ON click_analytics(clicked_at);

-- 5. 建立自動更新 updated_at 的觸發器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_regions_updated_at BEFORE UPDATE ON regions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_destinations_updated_at BEFORE UPDATE ON destinations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. 啟用 Row Level Security (RLS)
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE click_analytics ENABLE ROW LEVEL SECURITY;

-- 7. 建立公開讀取政策（所有人都可以讀取已啟用的資料）
CREATE POLICY "Allow public read access to active regions"
  ON regions FOR SELECT
  USING (is_active = true);

CREATE POLICY "Allow public read access to active destinations"
  ON destinations FOR SELECT
  USING (is_active = true);

-- 8. 建立點擊追蹤的插入政策（允許匿名插入）
CREATE POLICY "Allow public insert to click_analytics"
  ON click_analytics FOR INSERT
  WITH CHECK (true);

-- 9. 插入初始資料 - 日本
INSERT INTO regions (category_label, title, description, display_order) VALUES
('日本', '日本旅遊', '東京、大阪到北海道，快速瀏覽熱門日本城市與度假路線。', 1);

-- 取得日本區域的 ID（用於插入目的地）
DO $$
DECLARE
  japan_id UUID;
  korea_id UUID;
  china_id UUID;
  sea_id UUID;
  europe_id UUID;
  usa_id UUID;
  aus_id UUID;
  middle_id UUID;
  cruise_id UUID;
  luxury_id UUID;
  honeymoon_id UUID;
  free_id UUID;
  custom_id UUID;
BEGIN
  -- 日本
  SELECT id INTO japan_id FROM regions WHERE category_label = '日本';
  
  INSERT INTO destinations (region_id, title, subtitle, image_url, display_order) VALUES
  (japan_id, '東京', '都會購物 / 美食散策', 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=80', 1),
  (japan_id, '大阪', '關西人氣 / 樂園行程', 'https://images.unsplash.com/photo-1590559899731-a382839e5549?auto=format&fit=crop&w=1200&q=80', 2),
  (japan_id, '北海道', '雪景溫泉 / 四季自然', 'https://images.unsplash.com/photo-1513407030348-c983a97b98d8?auto=format&fit=crop&w=1200&q=80', 3),
  (japan_id, '沖繩', '海島度假 / 親子首選', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80', 4),
  (japan_id, '九州', '溫泉鐵道 / 深度慢旅', 'https://images.unsplash.com/photo-1528164344705-47542687000d?auto=format&fit=crop&w=1200&q=80', 5);

  -- 韓國
  INSERT INTO regions (category_label, title, description, display_order) VALUES
  ('韓國', '韓國旅遊', '適合短天數出遊，從城市購物到海岸景點都能快速安排。', 2)
  RETURNING id INTO korea_id;
  
  INSERT INTO destinations (region_id, title, subtitle, image_url, display_order) VALUES
  (korea_id, '首爾', '潮流購物 / 韓劇景點', 'https://images.unsplash.com/photo-1549693578-d683be217e58?auto=format&fit=crop&w=1200&q=80', 1),
  (korea_id, '釜山', '海景咖啡 / 美食市場', 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=1200&q=80', 2),
  (korea_id, '濟州', '自然療癒 / 海岸風光', 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80', 3);

  -- 中港澳
  INSERT INTO regions (category_label, title, description, display_order) VALUES
  ('中港澳旅遊', '中港澳旅遊', '城市探索・自然奇景・經典熱門路線', 3)
  RETURNING id INTO china_id;
  
  INSERT INTO destinations (region_id, title, subtitle, image_url, display_order) VALUES
  (china_id, '上海', '都會購物與夜景', 'https://images.unsplash.com/photo-1548919973-5cef591cdbc9?q=80&w=1200&auto=format&fit=crop', 1),
  (china_id, '北京', '歷史文化與古蹟', 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&w=1200&q=80', 2),
  (china_id, '張家界', '山水奇景人氣爆款', 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80', 3),
  (china_id, '九寨溝', '夢幻湖景', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80', 4),
  (china_id, '香港', '購物美食短天數首選', 'https://images.unsplash.com/photo-1506970845246-18f21d533b20?auto=format&fit=crop&w=1200&q=80', 5),
  (china_id, '澳門', '渡假娛樂與美食', 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1200&q=80', 6);

  -- 東南亞
  INSERT INTO regions (category_label, title, description, display_order) VALUES
  ('東南亞', '東南亞旅遊', '輕鬆度假與高性價比首選，熱門海島與城市一次掌握。', 4)
  RETURNING id INTO sea_id;
  
  INSERT INTO destinations (region_id, title, subtitle, image_url, display_order) VALUES
  (sea_id, '曼谷', '夜市購物 / 寺廟文化', 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1200&q=80', 1),
  (sea_id, '新加坡', '城市花園 / 親子旅遊', 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1200&q=80', 2),
  (sea_id, '峇里島', 'Villa 度假 / 浪漫放鬆', 'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?auto=format&fit=crop&w=1200&q=80', 3),
  (sea_id, '峴港', '海濱假期 / 中越景點', 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80', 4),
  (sea_id, '富國島', '海島慢旅 / 放空首選', 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=80', 5);

  -- 歐洲
  INSERT INTO regions (category_label, title, description, display_order) VALUES
  ('歐洲', '歐洲旅遊', '經典藝術、人文與自然景色並行，適合深度旅行規劃。', 5)
  RETURNING id INTO europe_id;
  
  INSERT INTO destinations (region_id, title, subtitle, image_url, display_order) VALUES
  (europe_id, '巴黎', '浪漫城市 / 精品藝術', 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=1200&q=80', 1),
  (europe_id, '羅馬', '歷史古城 / 義式風情', 'https://images.unsplash.com/photo-1525874684015-58379d421a52?auto=format&fit=crop&w=1200&q=80', 2),
  (europe_id, '瑞士', '雪山湖景 / 火車旅行', 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80', 3),
  (europe_id, '倫敦', '英倫城市 / 博物館漫遊', 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1200&q=80', 4),
  (europe_id, '布拉格', '童話古城 / 河岸夜景', 'https://images.unsplash.com/photo-1519677100203-a0e668c92439?auto=format&fit=crop&w=1200&q=80', 5);

  -- 美國加拿大
  INSERT INTO regions (category_label, title, description, display_order) VALUES
  ('美國加拿大', '美國加拿大', '城市地標、自然景觀與度假海島，適合多元組合式行程。', 6)
  RETURNING id INTO usa_id;
  
  INSERT INTO destinations (region_id, title, subtitle, image_url, display_order) VALUES
  (usa_id, '紐約', '經典地標 / 百老匯', 'https://images.unsplash.com/photo-1499092346589-b9b6be3e94b2?auto=format&fit=crop&w=1200&q=80', 1),
  (usa_id, '洛杉磯', '影城景點 / 海岸公路', 'https://images.unsplash.com/photo-1534196511436-921a4e99f297?auto=format&fit=crop&w=1200&q=80', 2),
  (usa_id, '夏威夷', '海島假期 / 悠閒度假', 'https://images.unsplash.com/photo-1505881502353-a1986add3762?auto=format&fit=crop&w=1200&q=80', 3),
  (usa_id, '溫哥華', '城市自然 / 輕奢慢旅', 'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?auto=format&fit=crop&w=1200&q=80', 4);

  -- 澳洲紐西蘭
  INSERT INTO regions (category_label, title, description, display_order) VALUES
  ('澳洲紐西蘭', '澳洲紐西蘭', '適合自然景色與城市假期並重的中長天數旅行。', 7)
  RETURNING id INTO aus_id;
  
  INSERT INTO destinations (region_id, title, subtitle, image_url, display_order) VALUES
  (aus_id, '雪梨', '海港城市 / 地標建築', 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=1200&q=80', 1),
  (aus_id, '墨爾本', '藝術街區 / 大洋路', 'https://images.unsplash.com/photo-1514395462725-fb4566210144?auto=format&fit=crop&w=1200&q=80', 2),
  (aus_id, '皇后鎮', '湖畔山景 / 蜜月精選', 'https://images.unsplash.com/photo-1502780402662-acc019177b56?auto=format&fit=crop&w=1200&q=80', 3);

  -- 中東非洲
  INSERT INTO regions (category_label, title, description, display_order) VALUES
  ('中東非洲', '中東非洲', '異國文化與沙漠古文明，適合特色主題旅行。', 8)
  RETURNING id INTO middle_id;
  
  INSERT INTO destinations (region_id, title, subtitle, image_url, display_order) VALUES
  (middle_id, '杜拜', '奢華城市 / 沙漠體驗', 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80', 1),
  (middle_id, '土耳其', '熱氣球 / 東西文化', 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=1200&q=80', 2),
  (middle_id, '埃及', '金字塔 / 尼羅河風情', 'https://images.unsplash.com/photo-1539768942893-daf53e448371?auto=format&fit=crop&w=1200&q=80', 3);

  -- 郵輪旅遊
  INSERT INTO regions (category_label, title, description, display_order) VALUES
  ('郵輪旅遊', '郵輪旅遊', '精選熱門郵輪航線，從台灣短線到歐洲經典路線一次掌握。', 9)
  RETURNING id INTO cruise_id;
  
  INSERT INTO destinations (region_id, title, subtitle, image_url, display_order) VALUES
  (cruise_id, '沖繩', '台灣出發短線首選', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80', 1),
  (cruise_id, '石垣島', '跳島人氣航點', 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1200&q=80', 2),
  (cruise_id, '宮古島', '海島度假輕鬆玩', 'https://images.unsplash.com/photo-1493558103817-58b2924bce98?auto=format&fit=crop&w=1200&q=80', 3),
  (cruise_id, '九州／日韓雙國', '一次玩兩地', 'https://images.unsplash.com/photo-1528164344705-47542687000d?auto=format&fit=crop&w=1200&q=80', 4),
  (cruise_id, '地中海', '歐洲人氣郵輪航線', 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=80', 5);

  -- 奢華旅遊
  INSERT INTO regions (category_label, title, description, display_order) VALUES
  ('奢華旅遊', '奢華旅遊', '高端住宿、商務艙與私人訂製服務靈感，適合追求品質與體驗的旅客。', 10)
  RETURNING id INTO luxury_id;
  
  INSERT INTO destinations (region_id, title, subtitle, image_url, display_order) VALUES
  (luxury_id, '巴黎', '經典高端歐洲之旅', 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=1200&q=80', 1),
  (luxury_id, '瑞士', '雪山景觀與奢華飯店', 'https://images.unsplash.com/photo-1521295121783-8a321d551ad2?auto=format&fit=crop&w=1200&q=80', 2),
  (luxury_id, '杜拜', '都市奢華與頂級享受', 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80', 3),
  (luxury_id, '馬爾地夫', '頂級度假與私人島嶼', 'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?auto=format&fit=crop&w=1200&q=80', 4),
  (luxury_id, '義大利', '精品文化與高端旅行', 'https://images.unsplash.com/photo-1525874684015-58379d421a52?auto=format&fit=crop&w=1200&q=80', 5);

  -- 蜜月旅遊
  INSERT INTO regions (category_label, title, description, display_order) VALUES
  ('蜜月旅遊', '蜜月旅遊', '精選浪漫海島與蜜月度假靈感，適合情侶、夫妻與新婚旅行規劃。', 11)
  RETURNING id INTO honeymoon_id;
  
  INSERT INTO destinations (region_id, title, subtitle, image_url, display_order) VALUES
  (honeymoon_id, '馬爾地夫', '奢華水上屋蜜月首選', 'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?auto=format&fit=crop&w=1200&q=80', 1),
  (honeymoon_id, '薄荷島', '悠閒海景與雙人度假', 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80', 2),
  (honeymoon_id, '峇里島', '浪漫海島與Villa體驗', 'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?auto=format&fit=crop&w=1200&q=80', 3),
  (honeymoon_id, '長灘島', '白沙灘蜜月人氣航點', 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=80', 4),
  (honeymoon_id, '普吉島', '海景放鬆與雙人小旅行', 'https://images.unsplash.com/photo-1468413253725-0d5181091126?auto=format&fit=crop&w=1200&q=80', 5);

  -- 自由行
  INSERT INTO regions (category_label, title, description, display_order) VALUES
  ('自由行', '自由行', '機加酒、交通票券與彈性路線建議，適合喜歡自主安排的旅客。', 12)
  RETURNING id INTO free_id;
  
  INSERT INTO destinations (region_id, title, subtitle, image_url, display_order) VALUES
  (free_id, '東京', '都會購物與自由行首選', 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=80', 1),
  (free_id, '大阪', '美食購物人氣城市', 'https://images.unsplash.com/photo-1590559899731-a382839e5549?auto=format&fit=crop&w=1200&q=80', 2),
  (free_id, '首爾', '短天數自由行熱門', 'https://images.unsplash.com/photo-1549693578-d683be217e58?auto=format&fit=crop&w=1200&q=80', 3),
  (free_id, '曼谷', '高CP值自由行', 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1200&q=80', 4),
  (free_id, '新加坡', '親子與城市輕旅行', 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1200&q=80', 5),
  (free_id, '香港', '近程快閃自由行', 'https://images.unsplash.com/photo-1506970845246-18f21d533b20?auto=format&fit=crop&w=1200&q=80', 6);

  -- 客製旅遊
  INSERT INTO regions (category_label, title, description, display_order) VALUES
  ('客製旅遊', '客製旅遊', '依照你的同行對象與旅行目的，安排最適合的客製化玩法。', 13)
  RETURNING id INTO custom_id;
  
  INSERT INTO destinations (region_id, title, subtitle, image_url, display_order) VALUES
  (custom_id, '家庭旅遊', '親子友善 / 輕鬆安排', 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1200&q=80', 1),
  (custom_id, '蜜月旅遊', '浪漫假期 / 精緻住宿', 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=1200&q=80', 2),
  (custom_id, '公司旅遊', '團體安排 / 行程效率', 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80', 3),
  (custom_id, '小團包車', '彈性路線 / 專人帶玩', 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80', 4);

END $$;
