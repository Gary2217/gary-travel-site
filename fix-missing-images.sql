-- 修正北海道、濟州、薄荷島的圖片 URL
-- 使用更可靠的圖片來源

UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1560253034-1a9c043ffb47?auto=format&fit=crop&w=1200&q=80' 
WHERE title LIKE '%北海道%' OR title = '北海道';

UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1590478367653-b1f2b4a0b2e5?auto=format&fit=crop&w=1200&q=80' 
WHERE title LIKE '%濟州%' OR title = '濟州';

UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1621277224630-81d9af65e40e?auto=format&fit=crop&w=1200&q=80' 
WHERE title LIKE '%薄荷島%' OR title = '薄荷島';

-- 驗證更新結果
SELECT title, subtitle, image_url 
FROM destinations 
WHERE title IN ('北海道', '濟州', '薄荷島')
ORDER BY title;
