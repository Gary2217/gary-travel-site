-- ============================================
-- 新增目的地 - 2026-04-24
-- 在 Supabase Dashboard SQL Editor 中執行
-- ============================================

DO $$
DECLARE
  japan_id UUID;
  korea_id UUID;
  sea_id UUID;
  europe_id UUID;
  usa_id UUID;
  island_id UUID;
BEGIN

  -- ==========================================
  -- 1. 日本：新增京都、名古屋（合掌村）
  -- ==========================================
  SELECT id INTO japan_id FROM regions WHERE category_label = '日本' LIMIT 1;

  IF japan_id IS NOT NULL THEN
    INSERT INTO destinations (region_id, title, subtitle, image_url, display_order) VALUES
    (japan_id, '京都', '千年古都 / 神社寺院', 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80', 6),
    (japan_id, '名古屋・合掌村', '世界遺產 / 中部秘境', 'https://images.unsplash.com/photo-1578271887552-5ac3a72752bc?auto=format&fit=crop&w=1200&q=80', 7);
    RAISE NOTICE '日本：已新增京都、名古屋・合掌村';
  END IF;

  -- ==========================================
  -- 2. 韓國：新增江原道
  -- ==========================================
  SELECT id INTO korea_id FROM regions WHERE category_label = '韓國' LIMIT 1;

  IF korea_id IS NOT NULL THEN
    INSERT INTO destinations (region_id, title, subtitle, image_url, display_order) VALUES
    (korea_id, '江原道', '冬季滑雪 / 春川美食', 'https://images.unsplash.com/photo-1517309230475-6736d926b979?auto=format&fit=crop&w=1200&q=80', 4);
    RAISE NOTICE '韓國：已新增江原道';
  END IF;

  -- ==========================================
  -- 3. 東南亞：新增宿霧、清邁、吉隆坡、河內
  -- ==========================================
  SELECT id INTO sea_id FROM regions WHERE category_label = '東南亞' LIMIT 1;

  IF sea_id IS NOT NULL THEN
    INSERT INTO destinations (region_id, title, subtitle, image_url, display_order) VALUES
    (sea_id, '宿霧', '跳島浮潛 / 鯨鯊共游', 'https://images.unsplash.com/photo-1505881502353-a1986add3762?auto=format&fit=crop&w=1200&q=80', 6),
    (sea_id, '清邁', '古城慢遊 / 寺廟文青', 'https://images.unsplash.com/photo-1512553432520-4fa228e9053c?auto=format&fit=crop&w=1200&q=80', 7),
    (sea_id, '吉隆坡', '雙子塔 / 多元美食', 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=1200&q=80', 8),
    (sea_id, '河內', '老城風情 / 下龍灣', 'https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?auto=format&fit=crop&w=1200&q=80', 9);
    RAISE NOTICE '東南亞：已新增宿霧、清邁、吉隆坡、河內';
  END IF;

  -- ==========================================
  -- 4. 歐洲：新增西班牙、希臘聖托里尼、冰島
  -- ==========================================
  SELECT id INTO europe_id FROM regions WHERE category_label = '歐洲' LIMIT 1;

  IF europe_id IS NOT NULL THEN
    INSERT INTO destinations (region_id, title, subtitle, image_url, display_order) VALUES
    (europe_id, '西班牙', '高第建築 / 佛朗明哥', 'https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=1200&q=80', 6),
    (europe_id, '希臘聖托里尼', '藍白小鎮 / 愛琴海夕陽', 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=1200&q=80', 7),
    (europe_id, '冰島', '極光瀑布 / 冰河健行', 'https://images.unsplash.com/photo-1504829857797-ddff29c27927?auto=format&fit=crop&w=1200&q=80', 8);
    RAISE NOTICE '歐洲：已新增西班牙、希臘聖托里尼、冰島';
  END IF;

  -- ==========================================
  -- 5. 美國加拿大：新增舊金山、多倫多
  -- ==========================================
  SELECT id INTO usa_id FROM regions WHERE category_label = '美國加拿大' LIMIT 1;

  IF usa_id IS NOT NULL THEN
    INSERT INTO destinations (region_id, title, subtitle, image_url, display_order) VALUES
    (usa_id, '舊金山', '金門大橋 / 矽谷風情', 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=1200&q=80', 5),
    (usa_id, '多倫多', '尼加拉瀑布 / 多元城市', 'https://images.unsplash.com/photo-1517090504332-edc2c553f114?auto=format&fit=crop&w=1200&q=80', 6);
    RAISE NOTICE '美加：已新增舊金山、多倫多';
  END IF;

  -- ==========================================
  -- 6. 新區域：海島度假（帛琉/關島/塞班）
  -- ==========================================
  INSERT INTO regions (category_label, title, description, display_order, is_active) VALUES
  ('海島度假', '海島度假', '台灣直飛或短程轉機的度假海島，適合短天數放鬆充電。', 14, true)
  RETURNING id INTO island_id;

  INSERT INTO destinations (region_id, title, subtitle, image_url, display_order) VALUES
  (island_id, '帛琉', '海洋天堂 / 水母湖浮潛', 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?auto=format&fit=crop&w=1200&q=80', 1),
  (island_id, '關島', '免稅購物 / 海灘度假', 'https://images.unsplash.com/photo-1544550581-5f7ceaf7f992?auto=format&fit=crop&w=1200&q=80', 2),
  (island_id, '塞班島', '藍洞潛水 / 軍艦島', 'https://images.unsplash.com/photo-1468413253725-0d5181091126?auto=format&fit=crop&w=1200&q=80', 3);
  RAISE NOTICE '新區域：已新增海島度假（帛琉、關島、塞班島）';

END $$;
