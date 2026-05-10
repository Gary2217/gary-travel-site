-- ============================================================
-- 新增 sub_region 欄位並分組所有目的地
-- 執行位置：Supabase SQL Editor
-- ============================================================

-- Step 1: 新增 sub_region 欄位
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS sub_region TEXT DEFAULT '';

-- Step 2: 更新日本目的地的子區域
UPDATE destinations SET sub_region = '北海道' WHERE title IN ('北海道', '函館', '旭川', '釧路') AND region_id = (SELECT id FROM regions WHERE category_label = '日本' LIMIT 1);
UPDATE destinations SET sub_region = '東北' WHERE title IN ('仙台', '青森', '盛岡', '秋田', '山形', '福島') AND region_id = (SELECT id FROM regions WHERE category_label = '日本' LIMIT 1);
UPDATE destinations SET sub_region = '關東' WHERE title IN ('東京', '橫濱', '埼玉', '千葉', '宇都宮', '水戶', '前橋') AND region_id = (SELECT id FROM regions WHERE category_label = '日本' LIMIT 1);
UPDATE destinations SET sub_region = '中部' WHERE title IN ('名古屋・合掌村', '新潟', '金澤', '長野', '靜岡', '富山') AND region_id = (SELECT id FROM regions WHERE category_label = '日本' LIMIT 1);
UPDATE destinations SET sub_region = '關西' WHERE title IN ('大阪', '京都', '神戶', '奈良', '大津', '和歌山') AND region_id = (SELECT id FROM regions WHERE category_label = '日本' LIMIT 1);
UPDATE destinations SET sub_region = '四國' WHERE title IN ('高松', '松山', '德島', '高知') AND region_id = (SELECT id FROM regions WHERE category_label = '日本' LIMIT 1);
UPDATE destinations SET sub_region = '九州' WHERE title IN ('九州', '福岡', '北九州', '熊本', '鹿兒島', '長崎', '大分', '宮崎', '佐賀') AND region_id = (SELECT id FROM regions WHERE category_label = '日本' LIMIT 1);
UPDATE destinations SET sub_region = '沖繩' WHERE title IN ('沖繩', '那霸') AND region_id = (SELECT id FROM regions WHERE category_label = '日本' LIMIT 1);

-- Step 3: 更新韓國目的地的子區域
UPDATE destinations SET sub_region = '首爾' WHERE title = '首爾' AND region_id = (SELECT id FROM regions WHERE category_label = '韓國' LIMIT 1);
UPDATE destinations SET sub_region = '釜山' WHERE title IN ('釜山', '大邱') AND region_id = (SELECT id FROM regions WHERE category_label = '韓國' LIMIT 1);
UPDATE destinations SET sub_region = '濟州' WHERE title IN ('濟州', '江原道') AND region_id = (SELECT id FROM regions WHERE category_label = '韓國' LIMIT 1);

-- Step 4: 更新東南亞目的地的子區域
UPDATE destinations SET sub_region = '泰國' WHERE title IN ('曼谷', '清邁', '泰北', '普吉') AND region_id = (SELECT id FROM regions WHERE category_label = '東南亞' LIMIT 1);
UPDATE destinations SET sub_region = '越南' WHERE title IN ('芽莊', '富國島', '峴港', '河內', '中越', '北越') AND region_id = (SELECT id FROM regions WHERE category_label = '東南亞' LIMIT 1);
UPDATE destinations SET sub_region = '印尼' WHERE title IN ('峇里島', '雅加達') AND region_id = (SELECT id FROM regions WHERE category_label = '東南亞' LIMIT 1);
UPDATE destinations SET sub_region = '馬新' WHERE title IN ('新加坡', '吉隆坡') AND region_id = (SELECT id FROM regions WHERE category_label = '東南亞' LIMIT 1);
UPDATE destinations SET sub_region = '菲律賓' WHERE title IN ('宿霧', '長灘島') AND region_id = (SELECT id FROM regions WHERE category_label = '東南亞' LIMIT 1);

-- Step 5: 更新歐洲目的地的子區域
UPDATE destinations SET sub_region = '中西歐' WHERE title IN ('巴黎', '倫敦', '瑞士', '德國', '荷比盧', '阿姆斯特丹') AND region_id = (SELECT id FROM regions WHERE category_label = '歐洲' LIMIT 1);
UPDATE destinations SET sub_region = '東歐' WHERE title IN ('布拉格', '維也納', '奧捷斯匈', '巴爾幹', '波羅的海三小國') AND region_id = (SELECT id FROM regions WHERE category_label = '歐洲' LIMIT 1);
UPDATE destinations SET sub_region = '南歐' WHERE title IN ('羅馬', '西班牙', '希臘聖托里尼', '葡萄牙') AND region_id = (SELECT id FROM regions WHERE category_label = '歐洲' LIMIT 1);
UPDATE destinations SET sub_region = '北歐' WHERE title IN ('冰島', '挪威', '丹麥', '瑞典', '芬蘭') AND region_id = (SELECT id FROM regions WHERE category_label = '歐洲' LIMIT 1);

-- Step 6: 更新中港澳目的地的子區域
UPDATE destinations SET sub_region = '華東' WHERE title IN ('上海', '江蘇', '浙江', '安徽', '福建', '廈門', '山東', '江西') AND region_id = (SELECT id FROM regions WHERE category_label = '中港澳旅遊' LIMIT 1);
UPDATE destinations SET sub_region = '華南' WHERE title IN ('香港', '澳門', '海南', '廣西', '廣東') AND region_id = (SELECT id FROM regions WHERE category_label = '中港澳旅遊' LIMIT 1);
UPDATE destinations SET sub_region = '華中' WHERE title IN ('湖南', '湖北', '河南') AND region_id = (SELECT id FROM regions WHERE category_label = '中港澳旅遊' LIMIT 1);
UPDATE destinations SET sub_region = '西南' WHERE title IN ('四川', '重慶', '雲南', '貴州', '西藏', '九寨溝', '張家界') AND region_id = (SELECT id FROM regions WHERE category_label = '中港澳旅遊' LIMIT 1);
UPDATE destinations SET sub_region = '西北' WHERE title IN ('陝西', '甘肅', '寧夏', '青海', '新疆') AND region_id = (SELECT id FROM regions WHERE category_label = '中港澳旅遊' LIMIT 1);
UPDATE destinations SET sub_region = '東北' WHERE title IN ('遼寧', '吉林', '黑龍江', '北京') AND region_id = (SELECT id FROM regions WHERE category_label = '中港澳旅遊' LIMIT 1);

-- Step 7: 更新中東非洲目的地的子區域
UPDATE destinations SET sub_region = '中東' WHERE title IN ('杜拜', '阿布達比', '土耳其', '埃及') AND region_id = (SELECT id FROM regions WHERE category_label = '中東非洲' LIMIT 1);
UPDATE destinations SET sub_region = '中亞' WHERE title IN ('烏茲別克', '西伯利亞') AND region_id = (SELECT id FROM regions WHERE category_label = '中東非洲' LIMIT 1);

-- 完成
