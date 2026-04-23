-- ============================================
-- 修正所有目的地圖片 URL（使用經過驗證的 Unsplash 圖片）
-- ============================================

-- 日本
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=80' WHERE title = '東京';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1590559899731-a382839e5549?auto=format&fit=crop&w=1200&q=80' WHERE title = '大阪';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1560253034-1a9c043ffb47?auto=format&fit=crop&w=1200&q=80' WHERE title = '北海道';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?auto=format&fit=crop&w=1200&q=80' WHERE title = '沖繩';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1528164344705-47542687000d?auto=format&fit=crop&w=1200&q=80' WHERE title = '九州';

-- 韓國
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1549693578-d683be217e58?auto=format&fit=crop&w=1200&q=80' WHERE title = '首爾';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=1200&q=80' WHERE title = '釜山';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1590478367653-b1f2b4a0b2e5?auto=format&fit=crop&w=1200&q=80' WHERE title = '濟州';

-- 中港澳
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1548919973-5cef591cdbc9?auto=format&fit=crop&w=1200&q=80' WHERE title = '上海';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&w=1200&q=80' WHERE title = '北京';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1609137144813-7d9921338f24?auto=format&fit=crop&w=1200&q=80' WHERE title = '張家界';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80' WHERE title = '九寨溝';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1536599018102-9f803c140fc1?auto=format&fit=crop&w=1200&q=80' WHERE title = '香港';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1555993539-1732b0258235?auto=format&fit=crop&w=1200&q=80' WHERE title = '澳門';

-- 東南亞
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1200&q=80' WHERE title = '曼谷';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1200&q=80' WHERE title = '新加坡';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?auto=format&fit=crop&w=1200&q=80' WHERE title = '峇里島';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1200&q=80' WHERE title = '峴港';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=1200&q=80' WHERE title = '富國島';

-- 歐洲
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80' WHERE title = '巴黎';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1200&q=80' WHERE title = '羅馬';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1527668752968-14dc70a27c95?auto=format&fit=crop&w=1200&q=80' WHERE title = '瑞士';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1200&q=80' WHERE title = '倫敦';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1541849546-216549ae216d?auto=format&fit=crop&w=1200&q=80' WHERE title = '布拉格';

-- 美國加拿大
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=1200&q=80' WHERE title = '紐約';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1534190239940-9ba8944ea261?auto=format&fit=crop&w=1200&q=80' WHERE title = '洛杉磯';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1542259009477-d625272157b7?auto=format&fit=crop&w=1200&q=80' WHERE title = '夏威夷';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?auto=format&fit=crop&w=1200&q=80' WHERE title = '溫哥華';

-- 澳洲紐西蘭
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=1200&q=80' WHERE title = '雪梨';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1514395462725-fb4566210144?auto=format&fit=crop&w=1200&q=80' WHERE title = '墨爾本';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1589802829985-817e51171b92?auto=format&fit=crop&w=1200&q=80' WHERE title = '皇后鎮';

-- 中東非洲
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80' WHERE title = '杜拜';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=1200&q=80' WHERE title = '土耳其';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1539768942893-daf53e448371?auto=format&fit=crop&w=1200&q=80' WHERE title = '埃及';

-- 郵輪旅遊
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?auto=format&fit=crop&w=1200&q=80' WHERE title = '沖繩' AND subtitle = '台灣出發短線首選';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?auto=format&fit=crop&w=1200&q=80' WHERE title = '石垣島';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?auto=format&fit=crop&w=1200&q=80' WHERE title = '宮古島';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1528164344705-47542687000d?auto=format&fit=crop&w=1200&q=80' WHERE title = '九州／日韓雙國';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80' WHERE title = '地中海';

-- 奢華旅遊
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80' WHERE title = '巴黎' AND subtitle = '經典高端歐洲之旅';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=1200&q=80' WHERE title = '瑞士' AND subtitle = '雪山景觀與奢華飯店';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80' WHERE title = '杜拜' AND subtitle = '都市奢華與頂級享受';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=1200&q=80' WHERE title = '馬爾地夫';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=1200&q=80' WHERE title = '義大利';

-- 蜜月旅遊
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=1200&q=80' WHERE title = '馬爾地夫' AND subtitle = '奢華水上屋蜜月首選';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1621277224630-81d9af65e40e?auto=format&fit=crop&w=1200&q=80' WHERE title = '薄荷島';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?auto=format&fit=crop&w=1200&q=80' WHERE title = '峇里島' AND subtitle = '浪漫海島與Villa體驗';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=1200&q=80' WHERE title = '長灘島';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?auto=format&fit=crop&w=1200&q=80' WHERE title = '普吉島';

-- 自由行
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=80' WHERE title = '東京' AND subtitle = '都會購物與自由行首選';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1590559899731-a382839e5549?auto=format&fit=crop&w=1200&q=80' WHERE title = '大阪' AND subtitle = '美食購物人氣城市';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1549693578-d683be217e58?auto=format&fit=crop&w=1200&q=80' WHERE title = '首爾' AND subtitle = '短天數自由行熱門';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1200&q=80' WHERE title = '曼谷' AND subtitle = '高CP值自由行';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1200&q=80' WHERE title = '新加坡' AND subtitle = '親子與城市輕旅行';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1536599018102-9f803c140fc1?auto=format&fit=crop&w=1200&q=80' WHERE title = '香港' AND subtitle = '近程快閃自由行';

-- 客製旅遊
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1200&q=80' WHERE title = '家庭旅遊';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?auto=format&fit=crop&w=1200&q=80' WHERE title = '蜜月旅遊' AND subtitle = '浪漫假期 / 精緻住宿';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1200&q=80' WHERE title = '公司旅遊';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80' WHERE title = '小團包車';
