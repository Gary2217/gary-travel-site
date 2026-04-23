-- ============================================
-- 更新所有目的地圖片為真實熱門景點照片
-- ============================================

-- 日本
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&q=80' WHERE title = '東京' AND subtitle = '都會購物 / 美食散策';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1590559899731-a382839e5549?w=1200&q=80' WHERE title = '大阪' AND subtitle = '關西人氣 / 樂園行程';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1560253034-1a9c043ffb47?w=1200&q=80' WHERE title = '北海道' AND subtitle = '雪景溫泉 / 四季自然';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=1200&q=80' WHERE title = '沖繩' AND subtitle = '海島度假 / 親子首選';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1528164344705-47542687000d?w=1200&q=80' WHERE title = '九州' AND subtitle = '溫泉鐵道 / 深度慢旅';

-- 韓國
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1549693578-d683be217e58?w=1200&q=80' WHERE title = '首爾' AND subtitle = '潮流購物 / 韓劇景點';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=1200&q=80' WHERE title = '釜山' AND subtitle = '海景咖啡 / 美食市場';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1590478367653-b1f2b4a0b2e5?w=1200&q=80' WHERE title = '濟州' AND subtitle = '自然療癒 / 海岸風光';

-- 中港澳
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1548919973-5cef591cdbc9?w=1200&q=80' WHERE title = '上海' AND subtitle = '都會購物與夜景';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=1200&q=80' WHERE title = '北京' AND subtitle = '歷史文化與古蹟';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1609137144813-7d9921338f24?w=1200&q=80' WHERE title = '張家界' AND subtitle = '山水奇景人氣爆款';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1528127269322-539801943592?w=1200&q=80' WHERE title = '九寨溝' AND subtitle = '夢幻湖景';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1536599018102-9f803c140fc1?w=1200&q=80' WHERE title = '香港' AND subtitle = '購物美食短天數首選';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1555993539-1732b0258235?w=1200&q=80' WHERE title = '澳門' AND subtitle = '渡假娛樂與美食';

-- 東南亞
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=1200&q=80' WHERE title = '曼谷' AND subtitle = '夜市購物 / 寺廟文化';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=1200&q=80' WHERE title = '新加坡' AND subtitle = '城市花園 / 親子旅遊';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?w=1200&q=80' WHERE title = '峇里島' AND subtitle = 'Villa 度假 / 浪漫放鬆';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=1200&q=80' WHERE title = '峴港' AND subtitle = '海濱假期 / 中越景點';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1200&q=80' WHERE title = '富國島' AND subtitle = '海島慢旅 / 放空首選';

-- 歐洲（重點修正瑞士圖片）
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=80' WHERE title = '巴黎' AND subtitle = '浪漫城市 / 精品藝術';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1200&q=80' WHERE title = '羅馬' AND subtitle = '歷史古城 / 義式風情';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1527668752968-14dc70a27c95?w=1200&q=80' WHERE title = '瑞士' AND subtitle = '雪山湖景 / 火車旅行';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200&q=80' WHERE title = '倫敦' AND subtitle = '英倫城市 / 博物館漫遊';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1541849546-216549ae216d?w=1200&q=80' WHERE title = '布拉格' AND subtitle = '童話古城 / 河岸夜景';

-- 美國加拿大
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1200&q=80' WHERE title = '紐約' AND subtitle = '經典地標 / 百老匯';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1534190239940-9ba8944ea261?w=1200&q=80' WHERE title = '洛杉磯' AND subtitle = '影城景點 / 海岸公路';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1542259009477-d625272157b7?w=1200&q=80' WHERE title = '夏威夷' AND subtitle = '海島假期 / 悠閒度假';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?w=1200&q=80' WHERE title = '溫哥華' AND subtitle = '城市自然 / 輕奢慢旅';

-- 澳洲紐西蘭
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=1200&q=80' WHERE title = '雪梨' AND subtitle = '海港城市 / 地標建築';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1514395462725-fb4566210144?w=1200&q=80' WHERE title = '墨爾本' AND subtitle = '藝術街區 / 大洋路';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1589802829985-817e51171b92?w=1200&q=80' WHERE title = '皇后鎮' AND subtitle = '湖畔山景 / 蜜月精選';

-- 中東非洲
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&q=80' WHERE title = '杜拜' AND subtitle = '奢華城市 / 沙漠體驗';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1200&q=80' WHERE title = '土耳其' AND subtitle = '熱氣球 / 東西文化';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1539768942893-daf53e448371?w=1200&q=80' WHERE title = '埃及' AND subtitle = '金字塔 / 尼羅河風情';

-- 郵輪旅遊
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=1200&q=80' WHERE title = '沖繩' AND subtitle = '台灣出發短線首選';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=1200&q=80' WHERE title = '石垣島' AND subtitle = '跳島人氣航點';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200&q=80' WHERE title = '宮古島' AND subtitle = '海島度假輕鬆玩';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1528164344705-47542687000d?w=1200&q=80' WHERE title = '九州／日韓雙國' AND subtitle = '一次玩兩地';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=1200&q=80' WHERE title = '地中海' AND subtitle = '歐洲人氣郵輪航線';

-- 奢華旅遊
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=80' WHERE title = '巴黎' AND subtitle = '經典高端歐洲之旅';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1200&q=80' WHERE title = '瑞士' AND subtitle = '雪山景觀與奢華飯店';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1200&q=80' WHERE title = '杜拜' AND subtitle = '都市奢華與頂級享受';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=1200&q=80' WHERE title = '馬爾地夫' AND subtitle = '頂級度假與私人島嶼';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=1200&q=80' WHERE title = '義大利' AND subtitle = '精品文化與高端旅行';

-- 蜜月旅遊
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=1200&q=80' WHERE title = '馬爾地夫' AND subtitle = '奢華水上屋蜜月首選';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1621277224630-81d9af65e40e?w=1200&q=80' WHERE title = '薄荷島' AND subtitle = '悠閒海景與雙人度假';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?w=1200&q=80' WHERE title = '峇里島' AND subtitle = '浪漫海島與Villa體驗';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1200&q=80' WHERE title = '長灘島' AND subtitle = '白沙灘蜜月人氣航點';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=1200&q=80' WHERE title = '普吉島' AND subtitle = '海景放鬆與雙人小旅行';

-- 自由行
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&q=80' WHERE title = '東京' AND subtitle = '都會購物與自由行首選';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1590559899731-a382839e5549?w=1200&q=80' WHERE title = '大阪' AND subtitle = '美食購物人氣城市';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1549693578-d683be217e58?w=1200&q=80' WHERE title = '首爾' AND subtitle = '短天數自由行熱門';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=1200&q=80' WHERE title = '曼谷' AND subtitle = '高CP值自由行';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=1200&q=80' WHERE title = '新加坡' AND subtitle = '親子與城市輕旅行';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1536599018102-9f803c140fc1?w=1200&q=80' WHERE title = '香港' AND subtitle = '近程快閃自由行';

-- 客製旅遊
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=1200&q=80' WHERE title = '家庭旅遊' AND subtitle = '親子友善 / 輕鬆安排';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=1200&q=80' WHERE title = '蜜月旅遊' AND subtitle = '浪漫假期 / 精緻住宿';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1200&q=80' WHERE title = '公司旅遊' AND subtitle = '團體安排 / 行程效率';
UPDATE destinations SET image_url = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80' WHERE title = '小團包車' AND subtitle = '彈性路線 / 專人帶玩';
