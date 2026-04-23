-- 最終修正：使用 ID 直接更新這三個目的地的圖片
-- 先查詢這三個目的地的完整資訊

SELECT id, title, subtitle, image_url, region_id
FROM destinations 
WHERE title IN ('北海道', '濟州', '薄荷島')
ORDER BY title;

-- 如果上面的查詢有結果，請記下每個目的地的 ID
-- 然後使用以下 UPDATE 語句（將 'ID_HERE' 替換為實際的 ID）

-- 方法 1：使用 title 和 subtitle 組合更新
UPDATE destinations 
SET image_url = 'https://images.unsplash.com/photo-1560253034-1a9c043ffb47?auto=format&fit=crop&w=1200&q=80'
WHERE title = '北海道' AND subtitle = '雪景溫泉 / 四季自然';

UPDATE destinations 
SET image_url = 'https://images.unsplash.com/photo-1590478367653-b1f2b4a0b2e5?auto=format&fit=crop&w=1200&q=80'
WHERE title = '濟州' AND subtitle = '自然療癒 / 海岸風光';

UPDATE destinations 
SET image_url = 'https://images.unsplash.com/photo-1621277224630-81d9af65e40e?auto=format&fit=crop&w=1200&q=80'
WHERE title = '薄荷島' AND subtitle = '悠閒海景與雙人度假';

-- 驗證更新結果
SELECT title, subtitle, image_url 
FROM destinations 
WHERE title IN ('北海道', '濟州', '薄荷島')
ORDER BY title;
