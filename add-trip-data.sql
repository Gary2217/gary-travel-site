-- ============================================
-- 全目的地行程種子資料 - 2026-04-24
-- 在 Supabase Dashboard SQL Editor 中執行
-- ============================================

DO $$
DECLARE
  did UUID;
BEGIN

  -- ==========================================
  -- 日本 - 東京
  -- ==========================================
  SELECT id INTO did FROM destinations WHERE title = '東京' AND region_id = (SELECT id FROM regions WHERE category_label = '日本') LIMIT 1;
  IF did IS NOT NULL THEN
    INSERT INTO trips (destination_id, title, duration, price_range, cover_image_url, highlights, display_order) VALUES
    (did, '東京迪士尼歡樂購物5日', '5天4夜', 'NT$32,000~42,000', 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=800&q=80', ARRAY['迪士尼','銀座','淺草'], 1),
    (did, '東京箱根富士山溫泉5日', '5天4夜', 'NT$35,000~45,000', 'https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?auto=format&fit=crop&w=800&q=80', ARRAY['箱根','富士山','溫泉'], 2),
    (did, '東京自由行機加酒4日', '4天3夜', 'NT$20,000~28,000', 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80', ARRAY['自由行','機加酒'], 3),
    (did, '東京輕井澤避暑溫泉6日', '6天5夜', 'NT$42,000~52,000', 'https://images.unsplash.com/photo-1528164344705-47542687000d?auto=format&fit=crop&w=800&q=80', ARRAY['輕井澤','outlet','溫泉'], 4),
    (did, '東京親子樂園5日', '5天4夜', 'NT$35,000~45,000', 'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?auto=format&fit=crop&w=800&q=80', ARRAY['迪士尼','三鷹吉卜力','台場'], 5),
    (did, '東京河口湖富士絕景4日', '4天3夜', 'NT$28,000~36,000', 'https://images.unsplash.com/photo-1578271887552-5ac3a72752bc?auto=format&fit=crop&w=800&q=80', ARRAY['河口湖','富士山','忍野八海'], 6),
    (did, '東京橫濱鎌倉江之島5日', '5天4夜', 'NT$33,000~43,000', 'https://images.unsplash.com/photo-1480796927426-f609979314bd?auto=format&fit=crop&w=800&q=80', ARRAY['鎌倉','江之島','橫濱'], 7),
    (did, '東京賞櫻季節限定5日', '5天4夜', 'NT$38,000~48,000', 'https://images.unsplash.com/photo-1522383225653-ed111181a951?auto=format&fit=crop&w=800&q=80', ARRAY['賞櫻','上野','目黑川'], 8),
    (did, '東京澀谷原宿潮流4日', '4天3夜', 'NT$25,000~33,000', 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=800&q=80', ARRAY['澀谷','原宿','新宿'], 9),
    (did, '東京近郊日光川越5日', '5天4夜', 'NT$34,000~44,000', 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80', ARRAY['日光東照宮','川越','秩父'], 10);
  END IF;

  -- ==========================================
  -- 日本 - 大阪（已有2筆，補8筆）
  -- ==========================================
  SELECT id INTO did FROM destinations WHERE title = '大阪' AND region_id = (SELECT id FROM regions WHERE category_label = '日本') LIMIT 1;
  IF did IS NOT NULL THEN
    INSERT INTO trips (destination_id, title, duration, price_range, cover_image_url, highlights, display_order) VALUES
    (did, '大阪環球影城京都5日', '5天4夜', 'NT$35,000~45,000', 'https://images.unsplash.com/photo-1590559899731-a382839e5549?auto=format&fit=crop&w=800&q=80', ARRAY['環球影城','京都','清水寺'], 3),
    (did, '京阪奈經典5日', '5天4夜', 'NT$33,000~42,000', 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80', ARRAY['京都','奈良','大阪'], 4),
    (did, '關西賞櫻名所5日', '5天4夜', 'NT$38,000~48,000', 'https://images.unsplash.com/photo-1522383225653-ed111181a951?auto=format&fit=crop&w=800&q=80', ARRAY['醍醐寺','哲學之道','大阪城'], 5),
    (did, '大阪和歌山溫泉5日', '5天4夜', 'NT$36,000~46,000', 'https://images.unsplash.com/photo-1528164344705-47542687000d?auto=format&fit=crop&w=800&q=80', ARRAY['和歌山','白浜溫泉','黑潮市場'], 6),
    (did, '京阪神姬路城6日', '6天5夜', 'NT$40,000~50,000', 'https://images.unsplash.com/photo-1505069190533-da1c9af13346?auto=format&fit=crop&w=800&q=80', ARRAY['姬路城','神戶','有馬溫泉'], 7),
    (did, '大阪美食道頓堀深度4日', '4天3夜', 'NT$25,000~33,000', 'https://images.unsplash.com/photo-1590559899731-a382839e5549?auto=format&fit=crop&w=800&q=80', ARRAY['道頓堀','黑門市場','新世界'], 8),
    (did, '大阪親子環球影城4日', '4天3夜', 'NT$30,000~38,000', 'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?auto=format&fit=crop&w=800&q=80', ARRAY['環球影城','海遊館','天保山'], 9),
    (did, '關西廣域鐵路周遊6日', '6天5夜', 'NT$38,000~48,000', 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80', ARRAY['廣域周遊券','天橋立','城崎溫泉'], 10);
  END IF;

  -- ==========================================
  -- 日本 - 北海道
  -- ==========================================
  SELECT id INTO did FROM destinations WHERE title = '北海道' LIMIT 1;
  IF did IS NOT NULL THEN
    INSERT INTO trips (destination_id, title, duration, price_range, cover_image_url, highlights, display_order) VALUES
    (did, '北海道薰衣草花田5日', '5天4夜', 'NT$38,000~48,000', 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=800&q=80', ARRAY['富良野','美瑛','薰衣草'], 1),
    (did, '北海道冬季雪祭5日', '5天4夜', 'NT$40,000~50,000', 'https://images.unsplash.com/photo-1513407030348-c983a97b98d8?auto=format&fit=crop&w=800&q=80', ARRAY['雪祭','小樽','旭山動物園'], 2),
    (did, '札幌小樽函館5日', '5天4夜', 'NT$36,000~46,000', 'https://images.unsplash.com/photo-1513407030348-c983a97b98d8?auto=format&fit=crop&w=800&q=80', ARRAY['札幌','小樽運河','函館夜景'], 3),
    (did, '北海道溫泉美食5日', '5天4夜', 'NT$42,000~52,000', 'https://images.unsplash.com/photo-1528164344705-47542687000d?auto=format&fit=crop&w=800&q=80', ARRAY['登別溫泉','洞爺湖','螃蟹'], 4),
    (did, '北海道滑雪度假5日', '5天4夜', 'NT$45,000~55,000', 'https://images.unsplash.com/photo-1517309230475-6736d926b979?auto=format&fit=crop&w=800&q=80', ARRAY['二世古','留壽都','粉雪'], 5),
    (did, '富良野美瑛花季5日', '5天4夜', 'NT$38,000~48,000', 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=800&q=80', ARRAY['拼布之路','青池','四季彩之丘'], 6),
    (did, '北海道破冰船流冰5日', '5天4夜', 'NT$45,000~55,000', 'https://images.unsplash.com/photo-1513407030348-c983a97b98d8?auto=format&fit=crop&w=800&q=80', ARRAY['網走','破冰船','知床'], 7),
    (did, '星野TOMAMU度假村5日', '5天4夜', 'NT$50,000~65,000', 'https://images.unsplash.com/photo-1513407030348-c983a97b98d8?auto=format&fit=crop&w=800&q=80', ARRAY['星野','雲海','水之教堂'], 8),
    (did, '北海道道東秘境6日', '6天5夜', 'NT$48,000~58,000', 'https://images.unsplash.com/photo-1513407030348-c983a97b98d8?auto=format&fit=crop&w=800&q=80', ARRAY['摩周湖','阿寒湖','釧路濕原'], 9),
    (did, '北海道自駕深度5日', '5天4夜', 'NT$35,000~45,000', 'https://images.unsplash.com/photo-1513407030348-c983a97b98d8?auto=format&fit=crop&w=800&q=80', ARRAY['自駕','積丹半島','余市'], 10);
  END IF;

  -- ==========================================
  -- 日本 - 沖繩
  -- ==========================================
  SELECT id INTO did FROM destinations WHERE title = '沖繩' AND region_id = (SELECT id FROM regions WHERE category_label = '日本') LIMIT 1;
  IF did IS NOT NULL THEN
    INSERT INTO trips (destination_id, title, duration, price_range, cover_image_url, highlights, display_order) VALUES
    (did, '沖繩海洋博水族館4日', '4天3夜', 'NT$22,000~30,000', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80', ARRAY['水族館','古宇利島','美國村'], 1),
    (did, '沖繩親子全包度假5日', '5天4夜', 'NT$30,000~40,000', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80', ARRAY['親子','海灘','水上活動'], 2),
    (did, '沖繩離島跳島4日', '4天3夜', 'NT$28,000~36,000', 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=800&q=80', ARRAY['慶良間','座間味','浮潛'], 3),
    (did, '沖繩自駕兜風4日', '4天3夜', 'NT$22,000~30,000', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80', ARRAY['自駕','萬座毛','殘波岬'], 4),
    (did, '沖繩古宇利島美食4日', '4天3夜', 'NT$24,000~32,000', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80', ARRAY['古宇利島','蝦蝦飯','海景咖啡'], 5),
    (did, '沖繩北谷美國村4日', '4天3夜', 'NT$23,000~31,000', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80', ARRAY['美國村','購物','夕陽'], 6),
    (did, '沖繩渡嘉敷島浮潛4日', '4天3夜', 'NT$26,000~34,000', 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=800&q=80', ARRAY['渡嘉敷','浮潛','透明海'], 7),
    (did, '沖繩石垣島跳島5日', '5天4夜', 'NT$35,000~45,000', 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=800&q=80', ARRAY['石垣島','竹富島','西表島'], 8);
  END IF;

  -- ==========================================
  -- 日本 - 九州
  -- ==========================================
  SELECT id INTO did FROM destinations WHERE title = '九州' LIMIT 1;
  IF did IS NOT NULL THEN
    INSERT INTO trips (destination_id, title, duration, price_range, cover_image_url, highlights, display_order) VALUES
    (did, '九州湯布院別府溫泉5日', '5天4夜', 'NT$35,000~45,000', 'https://images.unsplash.com/photo-1528164344705-47542687000d?auto=format&fit=crop&w=800&q=80', ARRAY['湯布院','別府地獄','溫泉'], 1),
    (did, '九州鐵道環島5日', '5天4夜', 'NT$38,000~48,000', 'https://images.unsplash.com/photo-1528164344705-47542687000d?auto=format&fit=crop&w=800&q=80', ARRAY['由布院之森','SL人吉','指宿玉手箱'], 2),
    (did, '九州阿蘇火山熊本5日', '5天4夜', 'NT$34,000~44,000', 'https://images.unsplash.com/photo-1528164344705-47542687000d?auto=format&fit=crop&w=800&q=80', ARRAY['阿蘇','熊本城','熊本熊'], 3),
    (did, '九州豪斯登堡福岡5日', '5天4夜', 'NT$33,000~43,000', 'https://images.unsplash.com/photo-1528164344705-47542687000d?auto=format&fit=crop&w=800&q=80', ARRAY['豪斯登堡','福岡','太宰府'], 4),
    (did, '福岡太宰府柳川5日', '5天4夜', 'NT$32,000~42,000', 'https://images.unsplash.com/photo-1528164344705-47542687000d?auto=format&fit=crop&w=800&q=80', ARRAY['太宰府','柳川遊船','中洲屋台'], 5),
    (did, '九州黑川溫泉美食5日', '5天4夜', 'NT$40,000~50,000', 'https://images.unsplash.com/photo-1528164344705-47542687000d?auto=format&fit=crop&w=800&q=80', ARRAY['黑川溫泉','和牛','地獄蒸'], 6),
    (did, '鹿兒島指宿砂浴5日', '5天4夜', 'NT$36,000~46,000', 'https://images.unsplash.com/photo-1528164344705-47542687000d?auto=format&fit=crop&w=800&q=80', ARRAY['指宿砂浴','櫻島','屋久島'], 7),
    (did, '九州屋久島自然5日', '5天4夜', 'NT$42,000~52,000', 'https://images.unsplash.com/photo-1528164344705-47542687000d?auto=format&fit=crop&w=800&q=80', ARRAY['屋久杉','白谷雲水峽','繩文杉'], 8);
  END IF;

  -- ==========================================
  -- 日本 - 京都
  -- ==========================================
  SELECT id INTO did FROM destinations WHERE title = '京都' LIMIT 1;
  IF did IS NOT NULL THEN
    INSERT INTO trips (destination_id, title, duration, price_range, cover_image_url, highlights, display_order) VALUES
    (did, '京都深度和服寺院4日', '4天3夜', 'NT$28,000~36,000', 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80', ARRAY['和服體驗','清水寺','伏見稻荷'], 1),
    (did, '京都嵐山竹林奈良5日', '5天4夜', 'NT$34,000~44,000', 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80', ARRAY['嵐山','竹林','奈良小鹿'], 2),
    (did, '京都賞楓名所4日', '4天3夜', 'NT$35,000~45,000', 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80', ARRAY['東福寺','永觀堂','嵐山'], 3),
    (did, '京都茶道文化體驗4日', '4天3夜', 'NT$30,000~38,000', 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80', ARRAY['茶道','宇治','抹茶'], 4),
    (did, '京都宇治伏見稻荷4日', '4天3夜', 'NT$27,000~35,000', 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80', ARRAY['宇治','伏見稻荷','平等院'], 5),
    (did, '京都祇園祭限定5日', '5天4夜', 'NT$40,000~50,000', 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80', ARRAY['祇園祭','花見小路','先斗町'], 6);
  END IF;

  -- ==========================================
  -- 日本 - 名古屋・合掌村
  -- ==========================================
  SELECT id INTO did FROM destinations WHERE title = '名古屋・合掌村' LIMIT 1;
  IF did IS NOT NULL THEN
    INSERT INTO trips (destination_id, title, duration, price_range, cover_image_url, highlights, display_order) VALUES
    (did, '合掌村點燈名古屋4日', '4天3夜', 'NT$32,000~42,000', 'https://images.unsplash.com/photo-1578271887552-5ac3a72752bc?auto=format&fit=crop&w=800&q=80', ARRAY['合掌村點燈','高山老街','飛驒牛'], 1),
    (did, '合掌村高山金澤5日', '5天4夜', 'NT$36,000~46,000', 'https://images.unsplash.com/photo-1578271887552-5ac3a72752bc?auto=format&fit=crop&w=800&q=80', ARRAY['合掌村','高山','金澤兼六園'], 2),
    (did, '名古屋樂高樂園親子4日', '4天3夜', 'NT$28,000~36,000', 'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?auto=format&fit=crop&w=800&q=80', ARRAY['樂高樂園','名古屋城','熱田神宮'], 3),
    (did, '立山黑部名古屋5日', '5天4夜', 'NT$42,000~52,000', 'https://images.unsplash.com/photo-1578271887552-5ac3a72752bc?auto=format&fit=crop&w=800&q=80', ARRAY['立山黑部','雪之大谷','上高地'], 4),
    (did, '合掌村飛驒牛美食4日', '4天3夜', 'NT$34,000~44,000', 'https://images.unsplash.com/photo-1578271887552-5ac3a72752bc?auto=format&fit=crop&w=800&q=80', ARRAY['飛驒牛','朝市','下呂溫泉'], 5),
    (did, '名古屋伊勢神宮4日', '4天3夜', 'NT$30,000~38,000', 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80', ARRAY['伊勢神宮','托福橫丁','鳥羽'], 6);
  END IF;

  -- ==========================================
  -- 韓國 - 首爾
  -- ==========================================
  SELECT id INTO did FROM destinations WHERE title = '首爾' AND region_id = (SELECT id FROM regions WHERE category_label = '韓國') LIMIT 1;
  IF did IS NOT NULL THEN
    INSERT INTO trips (destination_id, title, duration, price_range, cover_image_url, highlights, display_order) VALUES
    (did, '首爾明洞弘大購物5日', '5天4夜', 'NT$22,000~30,000', 'https://images.unsplash.com/photo-1549693578-d683be217e58?auto=format&fit=crop&w=800&q=80', ARRAY['明洞','弘大','東大門'], 1),
    (did, '首爾韓劇景點巡禮4日', '4天3夜', 'NT$20,000~28,000', 'https://images.unsplash.com/photo-1549693578-d683be217e58?auto=format&fit=crop&w=800&q=80', ARRAY['北村韓屋','景福宮','南山塔'], 2),
    (did, '首爾自由行機加酒4日', '4天3夜', 'NT$15,000~22,000', 'https://images.unsplash.com/photo-1549693578-d683be217e58?auto=format&fit=crop&w=800&q=80', ARRAY['自由行','機加酒'], 3),
    (did, '首爾江南美食5日', '5天4夜', 'NT$23,000~31,000', 'https://images.unsplash.com/photo-1549693578-d683be217e58?auto=format&fit=crop&w=800&q=80', ARRAY['江南','狎鷗亭','韓牛'], 4),
    (did, '首爾樂天世界親子4日', '4天3夜', 'NT$22,000~30,000', 'https://images.unsplash.com/photo-1549693578-d683be217e58?auto=format&fit=crop&w=800&q=80', ARRAY['樂天世界','兒童大公園','汗蒸幕'], 5),
    (did, '首爾近郊南怡島春川4日', '4天3夜', 'NT$20,000~28,000', 'https://images.unsplash.com/photo-1549693578-d683be217e58?auto=format&fit=crop&w=800&q=80', ARRAY['南怡島','春川','晨靜樹木園'], 6),
    (did, '首爾賞櫻季節限定5日', '5天4夜', 'NT$25,000~33,000', 'https://images.unsplash.com/photo-1549693578-d683be217e58?auto=format&fit=crop&w=800&q=80', ARRAY['汝矣島','石村湖','賞櫻'], 7),
    (did, '首爾滑雪溫泉冬季5日', '5天4夜', 'NT$28,000~36,000', 'https://images.unsplash.com/photo-1517309230475-6736d926b979?auto=format&fit=crop&w=800&q=80', ARRAY['滑雪','溫泉','冬季限定'], 8);
  END IF;

  -- ==========================================
  -- 韓國 - 釜山
  -- ==========================================
  SELECT id INTO did FROM destinations WHERE title = '釜山' LIMIT 1;
  IF did IS NOT NULL THEN
    INSERT INTO trips (destination_id, title, duration, price_range, cover_image_url, highlights, display_order) VALUES
    (did, '釜山甘川洞海雲台4日', '4天3夜', 'NT$18,000~26,000', 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=800&q=80', ARRAY['甘川洞','海雲台','廣安大橋'], 1),
    (did, '釜山慶州古都5日', '5天4夜', 'NT$22,000~30,000', 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=800&q=80', ARRAY['慶州','佛國寺','石窟庵'], 2),
    (did, '釜山海鮮市場美食4日', '4天3夜', 'NT$18,000~26,000', 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=800&q=80', ARRAY['札嘎其市場','西面','豬肉湯飯'], 3),
    (did, '釜山巨濟島統營5日', '5天4夜', 'NT$24,000~32,000', 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=800&q=80', ARRAY['巨濟島','統營','閑麗水道'], 4),
    (did, '釜山自由行機加酒3日', '3天2夜', 'NT$12,000~18,000', 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=800&q=80', ARRAY['自由行','機加酒'], 5),
    (did, '釜山大邱雙城4日', '4天3夜', 'NT$20,000~28,000', 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=800&q=80', ARRAY['大邱','西門市場','八公山'], 6);
  END IF;

  -- ==========================================
  -- 韓國 - 濟州
  -- ==========================================
  SELECT id INTO did FROM destinations WHERE title = '濟州' LIMIT 1;
  IF did IS NOT NULL THEN
    INSERT INTO trips (destination_id, title, duration, price_range, cover_image_url, highlights, display_order) VALUES
    (did, '濟州島環島自駕4日', '4天3夜', 'NT$18,000~26,000', 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80', ARRAY['自駕','城山日出峰','牛島'], 1),
    (did, '濟州島蜜月浪漫4日', '4天3夜', 'NT$25,000~33,000', 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80', ARRAY['蜜月','海景飯店','私房咖啡'], 2),
    (did, '濟州島親子度假4日', '4天3夜', 'NT$20,000~28,000', 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80', ARRAY['泰迪熊博物館','Aqua Planet','親子'], 3),
    (did, '濟州城山日出峰4日', '4天3夜', 'NT$18,000~26,000', 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80', ARRAY['城山日出峰','涉地可支','萬丈窟'], 4),
    (did, '濟州島美食海女3日', '3天2夜', 'NT$14,000~20,000', 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80', ARRAY['海女','黑豬肉','鮑魚粥'], 5),
    (did, '濟州漢拏山健行4日', '4天3夜', 'NT$18,000~26,000', 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80', ARRAY['漢拏山','御里牧','靈室'], 6);
  END IF;

  -- ==========================================
  -- 韓國 - 江原道
  -- ==========================================
  SELECT id INTO did FROM destinations WHERE title = '江原道' LIMIT 1;
  IF did IS NOT NULL THEN
    INSERT INTO trips (destination_id, title, duration, price_range, cover_image_url, highlights, display_order) VALUES
    (did, '江原道滑雪溫泉5日', '5天4夜', 'NT$28,000~36,000', 'https://images.unsplash.com/photo-1517309230475-6736d926b979?auto=format&fit=crop&w=800&q=80', ARRAY['滑雪','溫泉','雪景'], 1),
    (did, '江原道春川南怡島4日', '4天3夜', 'NT$20,000~28,000', 'https://images.unsplash.com/photo-1517309230475-6736d926b979?auto=format&fit=crop&w=800&q=80', ARRAY['南怡島','春川','辣炒雞'], 2),
    (did, '江原道束草雪嶽山4日', '4天3夜', 'NT$22,000~30,000', 'https://images.unsplash.com/photo-1517309230475-6736d926b979?auto=format&fit=crop&w=800&q=80', ARRAY['雪嶽山','束草','注文津海邊'], 3),
    (did, '江原道平昌冬奧4日', '4天3夜', 'NT$24,000~32,000', 'https://images.unsplash.com/photo-1517309230475-6736d926b979?auto=format&fit=crop&w=800&q=80', ARRAY['平昌','Alpensia','月精寺'], 4),
    (did, '江原道正東津日出4日', '4天3夜', 'NT$20,000~28,000', 'https://images.unsplash.com/photo-1517309230475-6736d926b979?auto=format&fit=crop&w=800&q=80', ARRAY['正東津','海岸列車','鏡浦台'], 5),
    (did, '江原道鐵道自行車4日', '4天3夜', 'NT$19,000~27,000', 'https://images.unsplash.com/photo-1517309230475-6736d926b979?auto=format&fit=crop&w=800&q=80', ARRAY['鐵道自行車','江村','加平'], 6);
  END IF;

  -- ==========================================
  -- 東南亞 - 峇里島
  -- ==========================================
  SELECT id INTO did FROM destinations WHERE title = '峇里島' LIMIT 1;
  IF did IS NOT NULL THEN
    INSERT INTO trips (destination_id, title, duration, price_range, cover_image_url, highlights, display_order) VALUES
    (did, '超激省峇里島5日 Atlas Beach Club', '5天4夜', 'NT$22,000~30,000', 'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?auto=format&fit=crop&w=800&q=80', ARRAY['Atlas Beach Club','SPA','泛舟'], 1),
    (did, '潮遊峇里 LOCCA下午茶5日', '5天4夜', 'NT$25,000~33,000', 'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?auto=format&fit=crop&w=800&q=80', ARRAY['LOCCA','潘娜達娃沙灘','藍色公路'], 2),
    (did, '小資峇里島5日 德哥拉朗梯田', '5天4夜', 'NT$20,000~28,000', 'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?auto=format&fit=crop&w=800&q=80', ARRAY['藍色公路','星巴克','德哥拉朗'], 3),
    (did, '北境海豚灣SPA泛舟峇里島5日', '5天4夜', 'NT$26,000~34,000', 'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?auto=format&fit=crop&w=800&q=80', ARRAY['海豚灣','葡萄酒莊','SPA'], 4),
    (did, '萬豪酒店烏布藝術峇里島5日', '5天4夜', 'NT$35,000~45,000', 'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?auto=format&fit=crop&w=800&q=80', ARRAY['萬豪','烏布','山中湖'], 5),
    (did, '華航藍夢島VILLA跳島5日', '5天4夜', 'NT$30,000~40,000', 'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?auto=format&fit=crop&w=800&q=80', ARRAY['藍夢島','VILLA','貝尼達島'], 6),
    (did, '金銀島貝尼達島藍夢島5日', '5天4夜', 'NT$28,000~36,000', 'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?auto=format&fit=crop&w=800&q=80', ARRAY['金銀島','貝尼達島','藍夢島'], 7),
    (did, '峇里島蜜月Villa浪漫6日', '6天5夜', 'NT$38,000~50,000', 'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?auto=format&fit=crop&w=800&q=80', ARRAY['蜜月','Villa','浪漫晚餐'], 8),
    (did, '峇里島火山日出泛舟5日', '5天4夜', 'NT$24,000~32,000', 'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?auto=format&fit=crop&w=800&q=80', ARRAY['巴杜爾火山','日出','泛舟'], 9),
    (did, '峇里島親子海灘度假5日', '5天4夜', 'NT$26,000~34,000', 'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?auto=format&fit=crop&w=800&q=80', ARRAY['親子','海灘','Safari公園'], 10);
  END IF;

  -- ==========================================
  -- 東南亞 - 曼谷
  -- ==========================================
  SELECT id INTO did FROM destinations WHERE title = '曼谷' LIMIT 1;
  IF did IS NOT NULL THEN
    INSERT INTO trips (destination_id, title, duration, price_range, cover_image_url, highlights, display_order) VALUES
    (did, '曼谷芭達雅雙城5日', '5天4夜', 'NT$18,000~26,000', 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=800&q=80', ARRAY['芭達雅','水上市場','大皇宮'], 1),
    (did, '曼谷水上市場美食5日', '5天4夜', 'NT$16,000~24,000', 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=800&q=80', ARRAY['水上市場','夜市','按摩'], 2),
    (did, '曼谷自由行機加酒4日', '4天3夜', 'NT$12,000~18,000', 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=800&q=80', ARRAY['自由行','機加酒'], 3),
    (did, '曼谷華欣海灘5日', '5天4夜', 'NT$20,000~28,000', 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=800&q=80', ARRAY['華欣','海灘','皇室行宮'], 4),
    (did, '曼谷大城古蹟5日', '5天4夜', 'NT$18,000~26,000', 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=800&q=80', ARRAY['大城','古蹟','遺跡巡禮'], 5),
    (did, '曼谷北碧桂河5日', '5天4夜', 'NT$20,000~28,000', 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=800&q=80', ARRAY['北碧','桂河大橋','死亡鐵路'], 6),
    (did, '曼谷按摩購物輕旅行4日', '4天3夜', 'NT$14,000~20,000', 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=800&q=80', ARRAY['按摩','暹羅百麗宮','洽圖洽'], 7),
    (did, '曼谷考艾農場5日', '5天4夜', 'NT$22,000~30,000', 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=800&q=80', ARRAY['考艾','農場','國家公園'], 8);
  END IF;

  -- ==========================================
  -- 東南亞 - 新加坡
  -- ==========================================
  SELECT id INTO did FROM destinations WHERE title = '新加坡' LIMIT 1;
  IF did IS NOT NULL THEN
    INSERT INTO trips (destination_id, title, duration, price_range, cover_image_url, highlights, display_order) VALUES
    (did, '新加坡環球影城4日', '4天3夜', 'NT$25,000~33,000', 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=800&q=80', ARRAY['環球影城','濱海灣','聖淘沙'], 1),
    (did, '新加坡親子科學館4日', '4天3夜', 'NT$26,000~34,000', 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=800&q=80', ARRAY['科學館','動物園','河川生態園'], 2),
    (did, '新加坡自由行機加酒3日', '3天2夜', 'NT$16,000~22,000', 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=800&q=80', ARRAY['自由行','機加酒'], 3),
    (did, '新加坡美食之旅4日', '4天3夜', 'NT$24,000~32,000', 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=800&q=80', ARRAY['牛車水','老巴剎','辣椒螃蟹'], 4),
    (did, '新加坡濱海灣夜景4日', '4天3夜', 'NT$28,000~36,000', 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=800&q=80', ARRAY['金沙酒店','濱海灣花園','摩天輪'], 5),
    (did, '新加坡馬來西亞雙城5日', '5天4夜', 'NT$28,000~36,000', 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=800&q=80', ARRAY['新加坡','新山','樂高樂園'], 6);
  END IF;

  -- ==========================================
  -- 東南亞 - 峴港
  -- ==========================================
  SELECT id INTO did FROM destinations WHERE title = '峴港' LIMIT 1;
  IF did IS NOT NULL THEN
    INSERT INTO trips (destination_id, title, duration, price_range, cover_image_url, highlights, display_order) VALUES
    (did, '峴港會安巴拿山5日', '5天4夜', 'NT$18,000~26,000', 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80', ARRAY['會安古鎮','巴拿山','黃金橋'], 1),
    (did, '峴港黃金橋美食5日', '5天4夜', 'NT$16,000~24,000', 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80', ARRAY['黃金橋','美食','海灘'], 2),
    (did, '峴港順化古都5日', '5天4夜', 'NT$18,000~26,000', 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80', ARRAY['順化皇城','靈姥寺','香江'], 3),
    (did, '峴港海灘度假4日', '4天3夜', 'NT$14,000~22,000', 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80', ARRAY['美溪沙灘','SPA','度假村'], 4),
    (did, '峴港自由行機加酒4日', '4天3夜', 'NT$12,000~18,000', 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80', ARRAY['自由行','機加酒'], 5),
    (did, '峴港迦南島竹籃船5日', '5天4夜', 'NT$16,000~24,000', 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80', ARRAY['迦南島','竹籃船','椰林'], 6);
  END IF;

  -- ==========================================
  -- 東南亞 - 富國島
  -- ==========================================
  SELECT id INTO did FROM destinations WHERE title = '富國島' LIMIT 1;
  IF did IS NOT NULL THEN
    INSERT INTO trips (destination_id, title, duration, price_range, cover_image_url, highlights, display_order) VALUES
    (did, '富國島全包度假5日', '5天4夜', 'NT$20,000~28,000', 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=800&q=80', ARRAY['全包式','海灘','度假村'], 1),
    (did, '富國島跳島浮潛4日', '4天3夜', 'NT$18,000~26,000', 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=800&q=80', ARRAY['跳島','浮潛','翡翠灣'], 2),
    (did, '富國島日落小鎮4日', '4天3夜', 'NT$16,000~24,000', 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=800&q=80', ARRAY['日落小鎮','纜車','Kiss Bridge'], 3),
    (did, '富國島親子樂園5日', '5天4夜', 'NT$22,000~30,000', 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=800&q=80', ARRAY['VinWonders','Safari','水上樂園'], 4),
    (did, '富國島蜜月Villa 5日', '5天4夜', 'NT$30,000~40,000', 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=800&q=80', ARRAY['蜜月','Villa','浪漫晚餐'], 5),
    (did, '富國島釣墨魚夜遊4日', '4天3夜', 'NT$16,000~24,000', 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=800&q=80', ARRAY['釣墨魚','夜市','珍珠養殖場'], 6);
  END IF;

  -- ==========================================
  -- 東南亞 - 宿霧
  -- ==========================================
  SELECT id INTO did FROM destinations WHERE title = '宿霧' LIMIT 1;
  IF did IS NOT NULL THEN
    INSERT INTO trips (destination_id, title, duration, price_range, cover_image_url, highlights, display_order) VALUES
    (did, '宿霧鯨鯊共游跳島5日', '5天4夜', 'NT$22,000~30,000', 'https://images.unsplash.com/photo-1505881502353-a1986add3762?auto=format&fit=crop&w=800&q=80', ARRAY['鯨鯊','跳島','奧斯陸'], 1),
    (did, '宿霧薄荷島探險5日', '5天4夜', 'NT$24,000~32,000', 'https://images.unsplash.com/photo-1505881502353-a1986add3762?auto=format&fit=crop&w=800&q=80', ARRAY['薄荷島','巧克力山','眼鏡猴'], 2),
    (did, '宿霧資生堂島4日', '4天3夜', 'NT$20,000~28,000', 'https://images.unsplash.com/photo-1505881502353-a1986add3762?auto=format&fit=crop&w=800&q=80', ARRAY['資生堂島','浮潛','白沙灘'], 3),
    (did, '宿霧墨寶沙丁魚風暴5日', '5天4夜', 'NT$24,000~32,000', 'https://images.unsplash.com/photo-1505881502353-a1986add3762?auto=format&fit=crop&w=800&q=80', ARRAY['墨寶','沙丁魚風暴','峽谷溯溪'], 4),
    (did, '宿霧親子度假4日', '4天3夜', 'NT$20,000~28,000', 'https://images.unsplash.com/photo-1505881502353-a1986add3762?auto=format&fit=crop&w=800&q=80', ARRAY['親子','海洋公園','度假村'], 5),
    (did, '宿霧自由行機加酒4日', '4天3夜', 'NT$15,000~22,000', 'https://images.unsplash.com/photo-1505881502353-a1986add3762?auto=format&fit=crop&w=800&q=80', ARRAY['自由行','機加酒'], 6);
  END IF;

  -- ==========================================
  -- 東南亞 - 清邁
  -- ==========================================
  SELECT id INTO did FROM destinations WHERE title = '清邁' LIMIT 1;
  IF did IS NOT NULL THEN
    INSERT INTO trips (destination_id, title, duration, price_range, cover_image_url, highlights, display_order) VALUES
    (did, '清邁古城寺廟文青5日', '5天4夜', 'NT$16,000~24,000', 'https://images.unsplash.com/photo-1512553432520-4fa228e9053c?auto=format&fit=crop&w=800&q=80', ARRAY['古城','帕辛寺','週日市集'], 1),
    (did, '清邁大象保護園4日', '4天3夜', 'NT$15,000~22,000', 'https://images.unsplash.com/photo-1512553432520-4fa228e9053c?auto=format&fit=crop&w=800&q=80', ARRAY['大象保護園','叢林飛索','泰餐課程'], 2),
    (did, '清邁素帖山泰餐4日', '4天3夜', 'NT$14,000~20,000', 'https://images.unsplash.com/photo-1512553432520-4fa228e9053c?auto=format&fit=crop&w=800&q=80', ARRAY['素帖山','雙龍寺','泰式料理'], 3),
    (did, '清邁清萊白廟藍廟5日', '5天4夜', 'NT$18,000~26,000', 'https://images.unsplash.com/photo-1512553432520-4fa228e9053c?auto=format&fit=crop&w=800&q=80', ARRAY['白廟','藍廟','黑屋博物館'], 4),
    (did, '清邁PAI城慢遊5日', '5天4夜', 'NT$17,000~25,000', 'https://images.unsplash.com/photo-1512553432520-4fa228e9053c?auto=format&fit=crop&w=800&q=80', ARRAY['PAI','雲來觀景','峽谷'], 5),
    (did, '清邁夜間動物園4日', '4天3夜', 'NT$15,000~22,000', 'https://images.unsplash.com/photo-1512553432520-4fa228e9053c?auto=format&fit=crop&w=800&q=80', ARRAY['夜間動物園','長頸族','蘭花園'], 6);
  END IF;

  -- ==========================================
  -- 東南亞 - 吉隆坡
  -- ==========================================
  SELECT id INTO did FROM destinations WHERE title = '吉隆坡' LIMIT 1;
  IF did IS NOT NULL THEN
    INSERT INTO trips (destination_id, title, duration, price_range, cover_image_url, highlights, display_order) VALUES
    (did, '吉隆坡雙子塔美食4日', '4天3夜', 'NT$16,000~24,000', 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=800&q=80', ARRAY['雙子塔','亞羅街','黑風洞'], 1),
    (did, '吉隆坡雲頂高原5日', '5天4夜', 'NT$18,000~26,000', 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=800&q=80', ARRAY['雲頂','賭場','主題樂園'], 2),
    (did, '吉隆坡馬六甲古城5日', '5天4夜', 'NT$18,000~26,000', 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=800&q=80', ARRAY['馬六甲','荷蘭紅屋','雞場街'], 3),
    (did, '吉隆坡檳城美食5日', '5天4夜', 'NT$20,000~28,000', 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=800&q=80', ARRAY['檳城','壁畫街','炒粿條'], 4),
    (did, '吉隆坡自由行機加酒3日', '3天2夜', 'NT$10,000~16,000', 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=800&q=80', ARRAY['自由行','機加酒'], 5),
    (did, '吉隆坡蘭卡威海島5日', '5天4夜', 'NT$22,000~30,000', 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=800&q=80', ARRAY['蘭卡威','天空之橋','跳島'], 6);
  END IF;

  -- ==========================================
  -- 東南亞 - 河內
  -- ==========================================
  SELECT id INTO did FROM destinations WHERE title = '河內' LIMIT 1;
  IF did IS NOT NULL THEN
    INSERT INTO trips (destination_id, title, duration, price_range, cover_image_url, highlights, display_order) VALUES
    (did, '河內下龍灣遊船5日', '5天4夜', 'NT$18,000~26,000', 'https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?auto=format&fit=crop&w=800&q=80', ARRAY['下龍灣','遊船','鐘乳石洞'], 1),
    (did, '河內陸龍灣古都5日', '5天4夜', 'NT$16,000~24,000', 'https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?auto=format&fit=crop&w=800&q=80', ARRAY['寧平','陸龍灣','長安'], 2),
    (did, '河內沙壩梯田5日', '5天4夜', 'NT$18,000~26,000', 'https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?auto=format&fit=crop&w=800&q=80', ARRAY['沙壩','梯田','少數民族'], 3),
    (did, '河內老城美食4日', '4天3夜', 'NT$14,000~20,000', 'https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?auto=format&fit=crop&w=800&q=80', ARRAY['三十六古街','河粉','蛋咖啡'], 4),
    (did, '河內自由行機加酒4日', '4天3夜', 'NT$12,000~18,000', 'https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?auto=format&fit=crop&w=800&q=80', ARRAY['自由行','機加酒'], 5),
    (did, '河內寧平長安竹筏5日', '5天4夜', 'NT$16,000~24,000', 'https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?auto=format&fit=crop&w=800&q=80', ARRAY['長安','竹筏','古廟'], 6);
  END IF;

  -- ==========================================
  -- 歐洲 - 巴黎
  -- ==========================================
  SELECT id INTO did FROM destinations WHERE title = '巴黎' AND region_id = (SELECT id FROM regions WHERE category_label = '歐洲') LIMIT 1;
  IF did IS NOT NULL THEN
    INSERT INTO trips (destination_id, title, duration, price_range, cover_image_url, highlights, display_order) VALUES
    (did, '巴黎經典深度7日', '7天6夜', 'NT$75,000~95,000', 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=800&q=80', ARRAY['艾菲爾鐵塔','羅浮宮','凡爾賽宮'], 1),
    (did, '巴黎南法普羅旺斯10日', '10天9夜', 'NT$95,000~120,000', 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=800&q=80', ARRAY['普羅旺斯','薰衣草','尼斯'], 2),
    (did, '法瑞雙國10日', '10天9夜', 'NT$100,000~130,000', 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=800&q=80', ARRAY['巴黎','瑞士','少女峰'], 3),
    (did, '巴黎自由行機加酒6日', '6天5夜', 'NT$55,000~70,000', 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=800&q=80', ARRAY['自由行','機加酒'], 4),
    (did, '巴黎凡爾賽盧浮宮7日', '7天6夜', 'NT$78,000~98,000', 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=800&q=80', ARRAY['凡爾賽','盧浮宮','奧賽美術館'], 5),
    (did, '巴黎蜜月浪漫8日', '8天7夜', 'NT$90,000~115,000', 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=800&q=80', ARRAY['蜜月','塞納河','蒙馬特'], 6);
  END IF;

  -- ==========================================
  -- 歐洲 - 羅馬
  -- ==========================================
  SELECT id INTO did FROM destinations WHERE title = '羅馬' LIMIT 1;
  IF did IS NOT NULL THEN
    INSERT INTO trips (destination_id, title, duration, price_range, cover_image_url, highlights, display_order) VALUES
    (did, '義大利經典三城10日', '10天9夜', 'NT$95,000~120,000', 'https://images.unsplash.com/photo-1525874684015-58379d421a52?auto=format&fit=crop&w=800&q=80', ARRAY['羅馬','佛羅倫斯','威尼斯'], 1),
    (did, '羅馬佛羅倫斯威尼斯8日', '8天7夜', 'NT$80,000~100,000', 'https://images.unsplash.com/photo-1525874684015-58379d421a52?auto=format&fit=crop&w=800&q=80', ARRAY['鬥獸場','百花大教堂','貢多拉'], 2),
    (did, '羅馬阿瑪菲海岸8日', '8天7夜', 'NT$85,000~105,000', 'https://images.unsplash.com/photo-1525874684015-58379d421a52?auto=format&fit=crop&w=800&q=80', ARRAY['阿瑪菲','波西塔諾','卡布里島'], 3),
    (did, '義大利深度美食8日', '8天7夜', 'NT$82,000~102,000', 'https://images.unsplash.com/photo-1525874684015-58379d421a52?auto=format&fit=crop&w=800&q=80', ARRAY['托斯卡尼','紅酒','松露'], 4),
    (did, '羅馬龐貝古城7日', '7天6夜', 'NT$75,000~95,000', 'https://images.unsplash.com/photo-1525874684015-58379d421a52?auto=format&fit=crop&w=800&q=80', ARRAY['龐貝','那不勒斯','梵蒂岡'], 5),
    (did, '義大利南法蔚藍海岸10日', '10天9夜', 'NT$100,000~130,000', 'https://images.unsplash.com/photo-1525874684015-58379d421a52?auto=format&fit=crop&w=800&q=80', ARRAY['蔚藍海岸','摩納哥','尼斯'], 6);
  END IF;

  -- ==========================================
  -- 歐洲 - 瑞士
  -- ==========================================
  SELECT id INTO did FROM destinations WHERE title = '瑞士' AND region_id = (SELECT id FROM regions WHERE category_label = '歐洲') LIMIT 1;
  IF did IS NOT NULL THEN
    INSERT INTO trips (destination_id, title, duration, price_range, cover_image_url, highlights, display_order) VALUES
    (did, '瑞士少女峰火車10日', '10天9夜', 'NT$110,000~140,000', 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80', ARRAY['少女峰','黃金列車','琉森'], 1),
    (did, '瑞士湖光山色8日', '8天7夜', 'NT$90,000~115,000', 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80', ARRAY['琉森湖','因特拉肯','蘇黎世'], 2),
    (did, '瑞士冰河列車8日', '8天7夜', 'NT$95,000~120,000', 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80', ARRAY['冰河列車','策馬特','聖莫里茲'], 3),
    (did, '瑞法雙國10日', '10天9夜', 'NT$105,000~135,000', 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80', ARRAY['巴黎','日內瓦','伯恩'], 4),
    (did, '瑞士策馬特馬特洪峰8日', '8天7夜', 'NT$95,000~120,000', 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80', ARRAY['馬特洪峰','策馬特','五湖健行'], 5),
    (did, '瑞士自駕深度10日', '10天9夜', 'NT$100,000~130,000', 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80', ARRAY['自駕','阿爾卑斯','格林德瓦'], 6);
  END IF;

  -- ==========================================
  -- 歐洲 - 倫敦
  -- ==========================================
  SELECT id INTO did FROM destinations WHERE title = '倫敦' LIMIT 1;
  IF did IS NOT NULL THEN
    INSERT INTO trips (destination_id, title, duration, price_range, cover_image_url, highlights, display_order) VALUES
    (did, '英國倫敦經典7日', '7天6夜', 'NT$72,000~92,000', 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=800&q=80', ARRAY['大笨鐘','白金漢宮','大英博物館'], 1),
    (did, '英國蘇格蘭高地10日', '10天9夜', 'NT$95,000~120,000', 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=800&q=80', ARRAY['愛丁堡','高地','尼斯湖'], 2),
    (did, '倫敦巴黎歐洲之星8日', '8天7夜', 'NT$85,000~108,000', 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=800&q=80', ARRAY['歐洲之星','巴黎','倫敦眼'], 3),
    (did, '英國湖區莊園8日', '8天7夜', 'NT$82,000~105,000', 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=800&q=80', ARRAY['湖區','科茲窩','莊園飯店'], 4),
    (did, '倫敦自由行機加酒6日', '6天5夜', 'NT$52,000~68,000', 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=800&q=80', ARRAY['自由行','機加酒'], 5),
    (did, '英國哈利波特影城7日', '7天6夜', 'NT$75,000~95,000', 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=800&q=80', ARRAY['哈利波特','牛津','巴斯'], 6);
  END IF;

  -- ==========================================
  -- 歐洲 - 布拉格
  -- ==========================================
  SELECT id INTO did FROM destinations WHERE title = '布拉格' LIMIT 1;
  IF did IS NOT NULL THEN
    INSERT INTO trips (destination_id, title, duration, price_range, cover_image_url, highlights, display_order) VALUES
    (did, '布拉格維也納雙城8日', '8天7夜', 'NT$78,000~98,000', 'https://images.unsplash.com/photo-1519677100203-a0e668c92439?auto=format&fit=crop&w=800&q=80', ARRAY['布拉格','維也納','查理大橋'], 1),
    (did, '東歐三國經典10日', '10天9夜', 'NT$88,000~112,000', 'https://images.unsplash.com/photo-1519677100203-a0e668c92439?auto=format&fit=crop&w=800&q=80', ARRAY['捷克','奧地利','匈牙利'], 2),
    (did, '布拉格CK小鎮7日', '7天6夜', 'NT$72,000~92,000', 'https://images.unsplash.com/photo-1519677100203-a0e668c92439?auto=format&fit=crop&w=800&q=80', ARRAY['CK小鎮','城堡區','老城廣場'], 3),
    (did, '捷奧匈三國10日', '10天9夜', 'NT$90,000~115,000', 'https://images.unsplash.com/photo-1519677100203-a0e668c92439?auto=format&fit=crop&w=800&q=80', ARRAY['布達佩斯','哈修塔特','薩爾茨堡'], 4),
    (did, '布拉格聖誕市集7日', '7天6夜', 'NT$75,000~95,000', 'https://images.unsplash.com/photo-1519677100203-a0e668c92439?auto=format&fit=crop&w=800&q=80', ARRAY['聖誕市集','熱紅酒','冬季限定'], 5),
    (did, '布拉格溫泉小鎮7日', '7天6夜', 'NT$72,000~92,000', 'https://images.unsplash.com/photo-1519677100203-a0e668c92439?auto=format&fit=crop&w=800&q=80', ARRAY['卡羅維瓦利','溫泉杯','啤酒'], 6);
  END IF;

  -- ==========================================
  -- 歐洲 - 西班牙
  -- ==========================================
  SELECT id INTO did FROM destinations WHERE title = '西班牙' LIMIT 1;
  IF did IS NOT NULL THEN
    INSERT INTO trips (destination_id, title, duration, price_range, cover_image_url, highlights, display_order) VALUES
    (did, '西班牙高第巴塞隆納8日', '8天7夜', 'NT$78,000~98,000', 'https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=800&q=80', ARRAY['聖家堂','奎爾公園','蘭布拉大道'], 1),
    (did, '西班牙葡萄牙雙國10日', '10天9夜', 'NT$92,000~118,000', 'https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=800&q=80', ARRAY['里斯本','巴塞隆納','馬德里'], 2),
    (did, '西班牙佛朗明哥安達盧西亞8日', '8天7夜', 'NT$80,000~100,000', 'https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=800&q=80', ARRAY['塞維亞','格拉納達','阿爾罕布拉宮'], 3),
    (did, '巴塞隆納自由行6日', '6天5夜', 'NT$55,000~72,000', 'https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=800&q=80', ARRAY['自由行','聖家堂','畢卡索'], 4),
    (did, '西班牙馬德里托雷多8日', '8天7夜', 'NT$78,000~98,000', 'https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=800&q=80', ARRAY['馬德里','托雷多','塞哥維亞'], 5),
    (did, '西班牙朝聖之路10日', '10天9夜', 'NT$85,000~108,000', 'https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=800&q=80', ARRAY['聖地牙哥','朝聖之路','加利西亞'], 6);
  END IF;

  -- ==========================================
  -- 歐洲 - 希臘聖托里尼
  -- ==========================================
  SELECT id INTO did FROM destinations WHERE title = '希臘聖托里尼' LIMIT 1;
  IF did IS NOT NULL THEN
    INSERT INTO trips (destination_id, title, duration, price_range, cover_image_url, highlights, display_order) VALUES
    (did, '希臘藍白天堂8日', '8天7夜', 'NT$82,000~105,000', 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=800&q=80', ARRAY['聖托里尼','伊亞夕陽','藍頂教堂'], 1),
    (did, '希臘雅典愛琴海跳島10日', '10天9夜', 'NT$95,000~120,000', 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=800&q=80', ARRAY['雅典','米克諾斯','聖托里尼'], 2),
    (did, '希臘蜜月浪漫8日', '8天7夜', 'NT$90,000~115,000', 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=800&q=80', ARRAY['蜜月','懸崖酒店','浪漫晚餐'], 3),
    (did, '希臘土耳其雙國10日', '10天9夜', 'NT$92,000~118,000', 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=800&q=80', ARRAY['希臘','土耳其','愛琴海'], 4),
    (did, '聖托里尼自由行7日', '7天6夜', 'NT$65,000~85,000', 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=800&q=80', ARRAY['自由行','費拉','紅沙灘'], 5),
    (did, '希臘米克諾斯派對8日', '8天7夜', 'NT$85,000~108,000', 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=800&q=80', ARRAY['米克諾斯','風車','天堂海灘'], 6);
  END IF;

  -- ==========================================
  -- 歐洲 - 冰島
  -- ==========================================
  SELECT id INTO did FROM destinations WHERE title = '冰島' LIMIT 1;
  IF did IS NOT NULL THEN
    INSERT INTO trips (destination_id, title, duration, price_range, cover_image_url, highlights, display_order) VALUES
    (did, '冰島極光環島8日', '8天7夜', 'NT$120,000~150,000', 'https://images.unsplash.com/photo-1504829857797-ddff29c27927?auto=format&fit=crop&w=800&q=80', ARRAY['極光','環島','冰河湖'], 1),
    (did, '冰島藍湖黃金圈6日', '6天5夜', 'NT$88,000~112,000', 'https://images.unsplash.com/photo-1504829857797-ddff29c27927?auto=format&fit=crop&w=800&q=80', ARRAY['藍湖溫泉','黃金圈','間歇泉'], 2),
    (did, '冰島冰河湖鑽石沙灘7日', '7天6夜', 'NT$100,000~128,000', 'https://images.unsplash.com/photo-1504829857797-ddff29c27927?auto=format&fit=crop&w=800&q=80', ARRAY['冰河湖','鑽石沙灘','瀑布'], 3),
    (did, '冰島自駕環島10日', '10天9夜', 'NT$110,000~140,000', 'https://images.unsplash.com/photo-1504829857797-ddff29c27927?auto=format&fit=crop&w=800&q=80', ARRAY['自駕','環島','峽灣'], 4),
    (did, '冰島北極光攝影8日', '8天7夜', 'NT$115,000~145,000', 'https://images.unsplash.com/photo-1504829857797-ddff29c27927?auto=format&fit=crop&w=800&q=80', ARRAY['攝影團','極光','冰洞'], 5),
    (did, '冰島夏季午夜太陽8日', '8天7夜', 'NT$108,000~138,000', 'https://images.unsplash.com/photo-1504829857797-ddff29c27927?auto=format&fit=crop&w=800&q=80', ARRAY['午夜太陽','賞鯨','健行'], 6);
  END IF;

  -- ==========================================
  -- 美加 - 紐約
  -- ==========================================
  SELECT id INTO did FROM destinations WHERE title = '紐約' LIMIT 1;
  IF did IS NOT NULL THEN
    INSERT INTO trips (destination_id, title, duration, price_range, cover_image_url, highlights, display_order) VALUES
    (did, '美東紐約華盛頓8日', '8天7夜', 'NT$78,000~98,000', 'https://images.unsplash.com/photo-1499092346589-b9b6be3e94b2?auto=format&fit=crop&w=800&q=80', ARRAY['自由女神','時代廣場','華盛頓'], 1),
    (did, '紐約自由行機加酒6日', '6天5夜', 'NT$55,000~72,000', 'https://images.unsplash.com/photo-1499092346589-b9b6be3e94b2?auto=format&fit=crop&w=800&q=80', ARRAY['自由行','機加酒'], 2),
    (did, '紐約百老匯購物7日', '7天6夜', 'NT$72,000~92,000', 'https://images.unsplash.com/photo-1499092346589-b9b6be3e94b2?auto=format&fit=crop&w=800&q=80', ARRAY['百老匯','第五大道','中央公園'], 3),
    (did, '美東三城經典10日', '10天9夜', 'NT$92,000~118,000', 'https://images.unsplash.com/photo-1499092346589-b9b6be3e94b2?auto=format&fit=crop&w=800&q=80', ARRAY['紐約','波士頓','費城'], 4),
    (did, '紐約尼加拉瀑布8日', '8天7夜', 'NT$82,000~105,000', 'https://images.unsplash.com/photo-1499092346589-b9b6be3e94b2?auto=format&fit=crop&w=800&q=80', ARRAY['尼加拉瀑布','伍德伯里','Outlet'], 5),
    (did, '紐約跨年倒數7日', '7天6夜', 'NT$85,000~110,000', 'https://images.unsplash.com/photo-1499092346589-b9b6be3e94b2?auto=format&fit=crop&w=800&q=80', ARRAY['時代廣場跨年','洛克斐勒','聖誕'], 6);
  END IF;

  -- ==========================================
  -- 美加 - 洛杉磯
  -- ==========================================
  SELECT id INTO did FROM destinations WHERE title = '洛杉磯' LIMIT 1;
  IF did IS NOT NULL THEN
    INSERT INTO trips (destination_id, title, duration, price_range, cover_image_url, highlights, display_order) VALUES
    (did, '美西洛杉磯舊金山8日', '8天7夜', 'NT$75,000~95,000', 'https://images.unsplash.com/photo-1534196511436-921a4e99f297?auto=format&fit=crop&w=800&q=80', ARRAY['好萊塢','金門大橋','一號公路'], 1),
    (did, '洛杉磯拉斯維加斯7日', '7天6夜', 'NT$68,000~88,000', 'https://images.unsplash.com/photo-1534196511436-921a4e99f297?auto=format&fit=crop&w=800&q=80', ARRAY['拉斯維加斯','大峽谷','好萊塢'], 2),
    (did, '美西國家公園自駕10日', '10天9夜', 'NT$85,000~110,000', 'https://images.unsplash.com/photo-1534196511436-921a4e99f297?auto=format&fit=crop&w=800&q=80', ARRAY['優勝美地','大峽谷','錫安'], 3),
    (did, '洛杉磯迪士尼環球7日', '7天6夜', 'NT$72,000~92,000', 'https://images.unsplash.com/photo-1534196511436-921a4e99f297?auto=format&fit=crop&w=800&q=80', ARRAY['迪士尼','環球影城','聖塔莫尼卡'], 4),
    (did, '美西一號公路自駕8日', '8天7夜', 'NT$72,000~92,000', 'https://images.unsplash.com/photo-1534196511436-921a4e99f297?auto=format&fit=crop&w=800&q=80', ARRAY['一號公路','蒙特雷','大乘海岸'], 5),
    (did, '洛杉磯聖地牙哥7日', '7天6夜', 'NT$68,000~88,000', 'https://images.unsplash.com/photo-1534196511436-921a4e99f297?auto=format&fit=crop&w=800&q=80', ARRAY['聖地牙哥','海洋世界','蒂華納'], 6);
  END IF;

  -- ==========================================
  -- 美加 - 夏威夷
  -- ==========================================
  SELECT id INTO did FROM destinations WHERE title = '夏威夷' LIMIT 1;
  IF did IS NOT NULL THEN
    INSERT INTO trips (destination_id, title, duration, price_range, cover_image_url, highlights, display_order) VALUES
    (did, '夏威夷歐胡島5日', '5天4夜', 'NT$52,000~68,000', 'https://images.unsplash.com/photo-1505881502353-a1986add3762?auto=format&fit=crop&w=800&q=80', ARRAY['威基基','鑽石頭山','珍珠港'], 1),
    (did, '夏威夷茂宜島6日', '6天5夜', 'NT$62,000~80,000', 'https://images.unsplash.com/photo-1505881502353-a1986add3762?auto=format&fit=crop&w=800&q=80', ARRAY['茂宜島','哈納公路','日出'], 2),
    (did, '夏威夷雙島跳島7日', '7天6夜', 'NT$72,000~92,000', 'https://images.unsplash.com/photo-1505881502353-a1986add3762?auto=format&fit=crop&w=800&q=80', ARRAY['歐胡島','茂宜島','跳島'], 3),
    (did, '夏威夷蜜月度假6日', '6天5夜', 'NT$75,000~95,000', 'https://images.unsplash.com/photo-1505881502353-a1986add3762?auto=format&fit=crop&w=800&q=80', ARRAY['蜜月','度假村','浪漫'], 4),
    (did, '夏威夷自由行機加酒5日', '5天4夜', 'NT$42,000~55,000', 'https://images.unsplash.com/photo-1505881502353-a1986add3762?auto=format&fit=crop&w=800&q=80', ARRAY['自由行','機加酒'], 5),
    (did, '夏威夷大島火山6日', '6天5夜', 'NT$65,000~85,000', 'https://images.unsplash.com/photo-1505881502353-a1986add3762?auto=format&fit=crop&w=800&q=80', ARRAY['大島','火山國家公園','黑沙灘'], 6);
  END IF;

  -- ==========================================
  -- 美加 - 溫哥華、舊金山、多倫多
  -- ==========================================
  SELECT id INTO did FROM destinations WHERE title = '溫哥華' LIMIT 1;
  IF did IS NOT NULL THEN
    INSERT INTO trips (destination_id, title, duration, price_range, cover_image_url, highlights, display_order) VALUES
    (did, '溫哥華洛磯山脈8日', '8天7夜', 'NT$78,000~98,000', 'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?auto=format&fit=crop&w=800&q=80', ARRAY['班夫','路易斯湖','哥倫比亞冰原'], 1),
    (did, '溫哥華維多利亞6日', '6天5夜', 'NT$58,000~75,000', 'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?auto=format&fit=crop&w=800&q=80', ARRAY['維多利亞','布查花園','渡輪'], 2),
    (did, '加西溫哥華班夫10日', '10天9夜', 'NT$92,000~118,000', 'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?auto=format&fit=crop&w=800&q=80', ARRAY['班夫','傑士伯','冰原大道'], 3),
    (did, '溫哥華惠斯勒滑雪7日', '7天6夜', 'NT$72,000~92,000', 'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?auto=format&fit=crop&w=800&q=80', ARRAY['惠斯勒','滑雪','海天公路'], 4),
    (did, '溫哥華自由行機加酒5日', '5天4夜', 'NT$42,000~55,000', 'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?auto=format&fit=crop&w=800&q=80', ARRAY['自由行','機加酒'], 5),
    (did, '溫哥華黃刀鎮極光8日', '8天7夜', 'NT$95,000~120,000', 'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?auto=format&fit=crop&w=800&q=80', ARRAY['黃刀鎮','極光','原住民村'], 6);
  END IF;

  SELECT id INTO did FROM destinations WHERE title = '舊金山' LIMIT 1;
  IF did IS NOT NULL THEN
    INSERT INTO trips (destination_id, title, duration, price_range, cover_image_url, highlights, display_order) VALUES
    (did, '舊金山優勝美地7日', '7天6夜', 'NT$72,000~92,000', 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=800&q=80', ARRAY['優勝美地','金門大橋','漁人碼頭'], 1),
    (did, '舊金山納帕酒鄉6日', '6天5夜', 'NT$62,000~80,000', 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=800&q=80', ARRAY['納帕','酒莊','品酒'], 2),
    (did, '舊金山一號公路7日', '7天6夜', 'NT$68,000~88,000', 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=800&q=80', ARRAY['一號公路','蒙特雷','卡梅爾'], 3),
    (did, '舊金山自由行機加酒5日', '5天4夜', 'NT$42,000~55,000', 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=800&q=80', ARRAY['自由行','機加酒'], 4),
    (did, '舊金山洛杉磯雙城8日', '8天7夜', 'NT$75,000~95,000', 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=800&q=80', ARRAY['雙城','一號公路','好萊塢'], 5),
    (did, '舊金山矽谷史丹佛5日', '5天4夜', 'NT$55,000~72,000', 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=800&q=80', ARRAY['矽谷','史丹佛','蘋果園區'], 6);
  END IF;

  SELECT id INTO did FROM destinations WHERE title = '多倫多' LIMIT 1;
  IF did IS NOT NULL THEN
    INSERT INTO trips (destination_id, title, duration, price_range, cover_image_url, highlights, display_order) VALUES
    (did, '多倫多尼加拉瀑布6日', '6天5夜', 'NT$58,000~75,000', 'https://images.unsplash.com/photo-1517090504332-edc2c553f114?auto=format&fit=crop&w=800&q=80', ARRAY['尼加拉瀑布','CN塔','皇家博物館'], 1),
    (did, '加東楓葉大道10日', '10天9夜', 'NT$92,000~118,000', 'https://images.unsplash.com/photo-1517090504332-edc2c553f114?auto=format&fit=crop&w=800&q=80', ARRAY['楓葉大道','魁北克','蒙特婁'], 2),
    (did, '多倫多渥太華蒙特婁8日', '8天7夜', 'NT$78,000~98,000', 'https://images.unsplash.com/photo-1517090504332-edc2c553f114?auto=format&fit=crop&w=800&q=80', ARRAY['渥太華','蒙特婁','國會山莊'], 3),
    (did, '多倫多自由行機加酒5日', '5天4夜', 'NT$42,000~55,000', 'https://images.unsplash.com/photo-1517090504332-edc2c553f114?auto=format&fit=crop&w=800&q=80', ARRAY['自由行','機加酒'], 4),
    (did, '多倫多千島湖遊船7日', '7天6夜', 'NT$68,000~88,000', 'https://images.unsplash.com/photo-1517090504332-edc2c553f114?auto=format&fit=crop&w=800&q=80', ARRAY['千島湖','遊船','金斯頓'], 5),
    (did, '多倫多阿岡昆賞楓7日', '7天6夜', 'NT$72,000~92,000', 'https://images.unsplash.com/photo-1517090504332-edc2c553f114?auto=format&fit=crop&w=800&q=80', ARRAY['阿岡昆','賞楓','獨木舟'], 6);
  END IF;

  -- ==========================================
  -- 澳紐 - 雪梨、墨爾本、皇后鎮
  -- ==========================================
  SELECT id INTO did FROM destinations WHERE title = '雪梨' LIMIT 1;
  IF did IS NOT NULL THEN
    INSERT INTO trips (destination_id, title, duration, price_range, cover_image_url, highlights, display_order) VALUES
    (did, '雪梨藍山大堡礁8日', '8天7夜', 'NT$78,000~98,000', 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=800&q=80', ARRAY['歌劇院','藍山','大堡礁'], 1),
    (did, '雪梨墨爾本雙城8日', '8天7夜', 'NT$75,000~95,000', 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=800&q=80', ARRAY['雪梨','墨爾本','大洋路'], 2),
    (did, '澳洲東岸經典10日', '10天9夜', 'NT$88,000~112,000', 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=800&q=80', ARRAY['雪梨','黃金海岸','凱恩斯'], 3),
    (did, '雪梨自由行機加酒6日', '6天5夜', 'NT$48,000~62,000', 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=800&q=80', ARRAY['自由行','機加酒'], 4),
    (did, '雪梨獵人谷酒莊7日', '7天6夜', 'NT$68,000~88,000', 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=800&q=80', ARRAY['獵人谷','酒莊','熱氣球'], 5),
    (did, '雪梨塔斯馬尼亞8日', '8天7夜', 'NT$82,000~105,000', 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=800&q=80', ARRAY['塔斯馬尼亞','搖籃山','薰衣草'], 6);
  END IF;

  SELECT id INTO did FROM destinations WHERE title = '墨爾本' LIMIT 1;
  IF did IS NOT NULL THEN
    INSERT INTO trips (destination_id, title, duration, price_range, cover_image_url, highlights, display_order) VALUES
    (did, '墨爾本大洋路6日', '6天5夜', 'NT$55,000~72,000', 'https://images.unsplash.com/photo-1514395462725-fb4566210144?auto=format&fit=crop&w=800&q=80', ARRAY['大洋路','十二使徒岩','自駕'], 1),
    (did, '墨爾本菲利普島企鵝6日', '6天5夜', 'NT$52,000~68,000', 'https://images.unsplash.com/photo-1514395462725-fb4566210144?auto=format&fit=crop&w=800&q=80', ARRAY['菲利普島','企鵝歸巢','亞拉河谷'], 2),
    (did, '墨爾本自由行機加酒5日', '5天4夜', 'NT$42,000~55,000', 'https://images.unsplash.com/photo-1514395462725-fb4566210144?auto=format&fit=crop&w=800&q=80', ARRAY['自由行','機加酒'], 3),
    (did, '墨爾本亞拉河谷酒莊6日', '6天5夜', 'NT$55,000~72,000', 'https://images.unsplash.com/photo-1514395462725-fb4566210144?auto=format&fit=crop&w=800&q=80', ARRAY['亞拉河谷','酒莊','熱氣球'], 4),
    (did, '墨爾本雪梨雙城8日', '8天7夜', 'NT$75,000~95,000', 'https://images.unsplash.com/photo-1514395462725-fb4566210144?auto=format&fit=crop&w=800&q=80', ARRAY['墨爾本','雪梨','歌劇院'], 5),
    (did, '墨爾本塔斯馬尼亞8日', '8天7夜', 'NT$78,000~98,000', 'https://images.unsplash.com/photo-1514395462725-fb4566210144?auto=format&fit=crop&w=800&q=80', ARRAY['塔斯馬尼亞','搖籃山','荷巴特'], 6);
  END IF;

  SELECT id INTO did FROM destinations WHERE title = '皇后鎮' LIMIT 1;
  IF did IS NOT NULL THEN
    INSERT INTO trips (destination_id, title, duration, price_range, cover_image_url, highlights, display_order) VALUES
    (did, '紐西蘭南島皇后鎮8日', '8天7夜', 'NT$82,000~105,000', 'https://images.unsplash.com/photo-1502780402662-acc019177b56?auto=format&fit=crop&w=800&q=80', ARRAY['皇后鎮','米佛峽灣','瓦納卡'], 1),
    (did, '紐西蘭南北島10日', '10天9夜', 'NT$95,000~120,000', 'https://images.unsplash.com/photo-1502780402662-acc019177b56?auto=format&fit=crop&w=800&q=80', ARRAY['奧克蘭','羅托魯瓦','皇后鎮'], 2),
    (did, '皇后鎮米佛峽灣7日', '7天6夜', 'NT$75,000~95,000', 'https://images.unsplash.com/photo-1502780402662-acc019177b56?auto=format&fit=crop&w=800&q=80', ARRAY['米佛峽灣','蒂阿瑙','峽灣遊船'], 3),
    (did, '紐西蘭自駕環島12日', '12天11夜', 'NT$105,000~135,000', 'https://images.unsplash.com/photo-1502780402662-acc019177b56?auto=format&fit=crop&w=800&q=80', ARRAY['自駕','環島','庫克山'], 4),
    (did, '皇后鎮極限運動7日', '7天6夜', 'NT$78,000~98,000', 'https://images.unsplash.com/photo-1502780402662-acc019177b56?auto=format&fit=crop&w=800&q=80', ARRAY['高空彈跳','跳傘','噴射快艇'], 5),
    (did, '紐西蘭魔戒取景地8日', '8天7夜', 'NT$82,000~105,000', 'https://images.unsplash.com/photo-1502780402662-acc019177b56?auto=format&fit=crop&w=800&q=80', ARRAY['哈比村','魔戒','瑪塔瑪塔'], 6);
  END IF;

  -- ==========================================
  -- 中東非洲 - 杜拜、土耳其、埃及
  -- ==========================================
  SELECT id INTO did FROM destinations WHERE title = '杜拜' AND region_id = (SELECT id FROM regions WHERE category_label = '中東非洲') LIMIT 1;
  IF did IS NOT NULL THEN
    INSERT INTO trips (destination_id, title, duration, price_range, cover_image_url, highlights, display_order) VALUES
    (did, '杜拜奢華購物5日', '5天4夜', 'NT$42,000~55,000', 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80', ARRAY['杜拜購物中心','帆船酒店','黃金市集'], 1),
    (did, '杜拜沙漠衝沙5日', '5天4夜', 'NT$40,000~52,000', 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80', ARRAY['沙漠衝沙','駱駝騎乘','BBQ'], 2),
    (did, '杜拜阿布達比雙城6日', '6天5夜', 'NT$48,000~62,000', 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80', ARRAY['阿布達比','羅浮宮','法拉利世界'], 3),
    (did, '杜拜亞特蘭提斯5日', '5天4夜', 'NT$55,000~72,000', 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80', ARRAY['亞特蘭提斯','水上樂園','水族館'], 4),
    (did, '杜拜自由行機加酒4日', '4天3夜', 'NT$30,000~40,000', 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80', ARRAY['自由行','機加酒'], 5),
    (did, '杜拜棕櫚島度假5日', '5天4夜', 'NT$50,000~65,000', 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80', ARRAY['棕櫚島','海灘','度假村'], 6);
  END IF;

  SELECT id INTO did FROM destinations WHERE title = '土耳其' LIMIT 1;
  IF did IS NOT NULL THEN
    INSERT INTO trips (destination_id, title, duration, price_range, cover_image_url, highlights, display_order) VALUES
    (did, '土耳其熱氣球全覽10日', '10天9夜', 'NT$62,000~80,000', 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=800&q=80', ARRAY['卡帕多奇亞','熱氣球','棉堡'], 1),
    (did, '土耳其經典全覽10日', '10天9夜', 'NT$58,000~75,000', 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=800&q=80', ARRAY['伊斯坦堡','以弗所','安塔利亞'], 2),
    (did, '土耳其伊斯坦堡8日', '8天7夜', 'NT$52,000~68,000', 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=800&q=80', ARRAY['藍色清真寺','聖索菲亞','大巴扎'], 3),
    (did, '土耳其棉堡溫泉10日', '10天9夜', 'NT$60,000~78,000', 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=800&q=80', ARRAY['棉堡','溫泉','以弗所'], 4),
    (did, '土耳其蜜月浪漫10日', '10天9夜', 'NT$68,000~88,000', 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=800&q=80', ARRAY['蜜月','洞穴酒店','熱氣球'], 5),
    (did, '土耳其地中海遊船10日', '10天9夜', 'NT$65,000~85,000', 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=800&q=80', ARRAY['地中海','遊船','安塔利亞'], 6);
  END IF;

  SELECT id INTO did FROM destinations WHERE title = '埃及' LIMIT 1;
  IF did IS NOT NULL THEN
    INSERT INTO trips (destination_id, title, duration, price_range, cover_image_url, highlights, display_order) VALUES
    (did, '埃及金字塔尼羅河8日', '8天7夜', 'NT$58,000~75,000', 'https://images.unsplash.com/photo-1539768942893-daf53e448371?auto=format&fit=crop&w=800&q=80', ARRAY['金字塔','人面獅身','尼羅河'], 1),
    (did, '埃及經典全覽10日', '10天9夜', 'NT$68,000~88,000', 'https://images.unsplash.com/photo-1539768942893-daf53e448371?auto=format&fit=crop&w=800&q=80', ARRAY['開羅','盧克索','亞斯文'], 2),
    (did, '埃及紅海度假8日', '8天7夜', 'NT$55,000~72,000', 'https://images.unsplash.com/photo-1539768942893-daf53e448371?auto=format&fit=crop&w=800&q=80', ARRAY['紅海','浮潛','洪加達'], 3),
    (did, '埃及盧克索帝王谷8日', '8天7夜', 'NT$60,000~78,000', 'https://images.unsplash.com/photo-1539768942893-daf53e448371?auto=format&fit=crop&w=800&q=80', ARRAY['帝王谷','卡納克神殿','熱氣球'], 4),
    (did, '埃及尼羅河遊輪10日', '10天9夜', 'NT$72,000~92,000', 'https://images.unsplash.com/photo-1539768942893-daf53e448371?auto=format&fit=crop&w=800&q=80', ARRAY['尼羅河遊輪','亞斯文','菲萊神殿'], 5),
    (did, '埃及沙漠綠洲8日', '8天7夜', 'NT$62,000~80,000', 'https://images.unsplash.com/photo-1539768942893-daf53e448371?auto=format&fit=crop&w=800&q=80', ARRAY['白沙漠','黑沙漠','錫瓦綠洲'], 6);
  END IF;

  -- ==========================================
  -- 海島度假 - 帛琉、關島、塞班島
  -- ==========================================
  SELECT id INTO did FROM destinations WHERE title = '帛琉' LIMIT 1;
  IF did IS NOT NULL THEN
    INSERT INTO trips (destination_id, title, duration, price_range, cover_image_url, highlights, display_order) VALUES
    (did, '帛琉水母湖浮潛5日', '5天4夜', 'NT$42,000~55,000', 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?auto=format&fit=crop&w=800&q=80', ARRAY['水母湖','牛奶湖','大斷層'], 1),
    (did, '帛琉牛奶湖大斷層5日', '5天4夜', 'NT$40,000~52,000', 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?auto=format&fit=crop&w=800&q=80', ARRAY['牛奶湖','大斷層','干貝城'], 2),
    (did, '帛琉海豚灣獨木舟5日', '5天4夜', 'NT$42,000~55,000', 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?auto=format&fit=crop&w=800&q=80', ARRAY['海豚灣','獨木舟','洛克群島'], 3),
    (did, '帛琉深潛藍角5日', '5天4夜', 'NT$48,000~62,000', 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?auto=format&fit=crop&w=800&q=80', ARRAY['藍角','深潛','鯊魚城'], 4),
    (did, '帛琉蜜月度假5日', '5天4夜', 'NT$50,000~65,000', 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?auto=format&fit=crop&w=800&q=80', ARRAY['蜜月','浪漫','海景Villa'], 5),
    (did, '帛琉親子浮潛4日', '4天3夜', 'NT$35,000~45,000', 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?auto=format&fit=crop&w=800&q=80', ARRAY['親子','浮潛','海洋生態'], 6);
  END IF;

  SELECT id INTO did FROM destinations WHERE title = '關島' LIMIT 1;
  IF did IS NOT NULL THEN
    INSERT INTO trips (destination_id, title, duration, price_range, cover_image_url, highlights, display_order) VALUES
    (did, '關島海灘購物4日', '4天3夜', 'NT$28,000~36,000', 'https://images.unsplash.com/photo-1544550581-5f7ceaf7f992?auto=format&fit=crop&w=800&q=80', ARRAY['杜夢灣','免稅購物','海灘'], 1),
    (did, '關島浮潛跳島4日', '4天3夜', 'NT$30,000~38,000', 'https://images.unsplash.com/photo-1544550581-5f7ceaf7f992?auto=format&fit=crop&w=800&q=80', ARRAY['浮潛','跳島','海底世界'], 2),
    (did, '關島蜜月浪漫4日', '4天3夜', 'NT$35,000~45,000', 'https://images.unsplash.com/photo-1544550581-5f7ceaf7f992?auto=format&fit=crop&w=800&q=80', ARRAY['蜜月','教堂婚禮','夕陽'], 3),
    (did, '關島親子水上樂園4日', '4天3夜', 'NT$30,000~38,000', 'https://images.unsplash.com/photo-1544550581-5f7ceaf7f992?auto=format&fit=crop&w=800&q=80', ARRAY['親子','水上樂園','海豚'], 4),
    (did, '關島自由行機加酒3日', '3天2夜', 'NT$20,000~28,000', 'https://images.unsplash.com/photo-1544550581-5f7ceaf7f992?auto=format&fit=crop&w=800&q=80', ARRAY['自由行','機加酒'], 5),
    (did, '關島高爾夫度假4日', '4天3夜', 'NT$35,000~45,000', 'https://images.unsplash.com/photo-1544550581-5f7ceaf7f992?auto=format&fit=crop&w=800&q=80', ARRAY['高爾夫','度假','海景球場'], 6);
  END IF;

  SELECT id INTO did FROM destinations WHERE title = '塞班島' LIMIT 1;
  IF did IS NOT NULL THEN
    INSERT INTO trips (destination_id, title, duration, price_range, cover_image_url, highlights, display_order) VALUES
    (did, '塞班藍洞潛水5日', '5天4夜', 'NT$32,000~42,000', 'https://images.unsplash.com/photo-1468413253725-0d5181091126?auto=format&fit=crop&w=800&q=80', ARRAY['藍洞','潛水','萬歲崖'], 1),
    (did, '塞班軍艦島浮潛4日', '4天3夜', 'NT$28,000~36,000', 'https://images.unsplash.com/photo-1468413253725-0d5181091126?auto=format&fit=crop&w=800&q=80', ARRAY['軍艦島','浮潛','香蕉船'], 2),
    (did, '塞班島全包度假4日', '4天3夜', 'NT$26,000~34,000', 'https://images.unsplash.com/photo-1468413253725-0d5181091126?auto=format&fit=crop&w=800&q=80', ARRAY['全包式','海灘','度假村'], 3),
    (did, '塞班天寧島跳島5日', '5天4夜', 'NT$34,000~44,000', 'https://images.unsplash.com/photo-1468413253725-0d5181091126?auto=format&fit=crop&w=800&q=80', ARRAY['天寧島','星沙海灘','小飛機'], 4),
    (did, '塞班蜜月海景Villa 5日', '5天4夜', 'NT$38,000~48,000', 'https://images.unsplash.com/photo-1468413253725-0d5181091126?auto=format&fit=crop&w=800&q=80', ARRAY['蜜月','Villa','日落帆船'], 5),
    (did, '塞班島自由行機加酒4日', '4天3夜', 'NT$22,000~30,000', 'https://images.unsplash.com/photo-1468413253725-0d5181091126?auto=format&fit=crop&w=800&q=80', ARRAY['自由行','機加酒'], 6);
  END IF;

  RAISE NOTICE '全部行程種子資料已新增完成';
END $$;
