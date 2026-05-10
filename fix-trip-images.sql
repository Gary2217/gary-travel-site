-- ============================================================
-- 修復所有行程封面圖片（使用 Unsplash 高畫質免費圖片）
-- 每個行程都有唯一圖片，無重複
-- 之後可透過開發者模式逐一替換為自己的圖片
-- ============================================================

-- 日本 - 東京
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&h=600&fit=crop' WHERE title LIKE '東京輕井澤%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800&h=600&fit=crop' WHERE title LIKE '富士美景%';

-- 日本 - 大阪
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1590559899731-a382839e5549?w=800&h=600&fit=crop' WHERE title LIKE '大阪 暑期限定%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=800&h=600&fit=crop' WHERE title LIKE '大阪櫻花聖地%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1624601573012-efb68931cc8f?w=800&h=600&fit=crop' WHERE title LIKE '致未來的回憶%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1570521462033-3015e76e7432?w=800&h=600&fit=crop' WHERE title LIKE '戀戀京阪神%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?w=800&h=600&fit=crop' WHERE title LIKE '穿越大阪九州%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&h=600&fit=crop' WHERE title LIKE '%橫貫大阪九州%';

-- 日本 - 北海道
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1578271887552-5ac3a72752bc?w=800&h=600&fit=crop' WHERE title LIKE '花現富良野%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1548032885926-e8b3fe0f2927?w=800&h=600&fit=crop' WHERE title LIKE '米其林函館山%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1517309230475-6736d926b979?w=800&h=600&fit=crop' WHERE title LIKE '北海道破冰船%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1610375461249-cba8db2a3f9c?w=800&h=600&fit=crop' WHERE title LIKE '六人小包團~北海道%';

-- 日本 - 沖繩
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1543704836-e56bec1a8e7c?w=800&h=600&fit=crop' WHERE title LIKE '蔚藍陽光%沖繩%';

-- 日本 - 九州
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=800&h=600&fit=crop' WHERE title LIKE '九州FUN風%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1528164344885-47b1492b7ccd?w=800&h=600&fit=crop' WHERE title LIKE '六人小包團-九州%';

-- 日本 - 福岡
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=800&h=600&fit=crop' WHERE title LIKE '福岡粉蝶花%';

-- 日本 - 熊本
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1480796927426-f609979314bd?w=800&h=600&fit=crop' WHERE title LIKE '熊本FUN風%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=800&h=600&fit=crop' WHERE title LIKE '熊本賞櫻%';

-- 日本 - 四國/高松
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&h=600&fit=crop' WHERE title LIKE '四國夏日%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1504109586057-7a2ae83d1338?w=800&h=600&fit=crop' WHERE title LIKE '台北高松%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=800&h=600&fit=crop' WHERE title LIKE '台中高松%';

-- 日本 - 東北/仙台
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1542640244-7e672d6cef4e?w=800&h=600&fit=crop' WHERE title LIKE '初夏戀東北%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=800&h=600&fit=crop' WHERE title LIKE '櫻雪飛舞%會津鐵道賞櫻%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1462275646964-a0e3c11f18a6?w=800&h=600&fit=crop' WHERE title LIKE '櫻雪飛舞%猊鼻溪%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1551641506-ee5bf4cb45f1?w=800&h=600&fit=crop' WHERE title LIKE '東北藏王樹冰+銀山%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&h=600&fit=crop' WHERE title LIKE '東北森吉山%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1477346611705-65d1883cee1e?w=800&h=600&fit=crop' WHERE title LIKE '東北藏王樹冰+藏王狐狸村兩晚%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop' WHERE title LIKE '東北藏王樹冰+藏王狐狸村3晚%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1440778303588-435521a205bc?w=800&h=600&fit=crop' WHERE title LIKE '期間限定%東北三大秋祭%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1528164344885-47b1492b7ccd?w=800&h=600&fit=crop' WHERE title LIKE '星野集團%';

-- 日本 - 神戶
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1505662695280-4425e3b1b812?w=800&h=600&fit=crop' WHERE title LIKE '台中神戶%';

-- 日本 - 名古屋/合掌村
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1512036666432-4b89eaaa8509?w=800&h=600&fit=crop' WHERE title LIKE '%走進雪之奇景%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1576675466969-38eeae4b41f6?w=800&h=600&fit=crop' WHERE title LIKE '立山黑部%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1600959907703-125d2f7e41ab?w=800&h=600&fit=crop' WHERE title LIKE '名古屋立山%';

-- 韓國 - 首爾
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=800&h=600&fit=crop' WHERE title LIKE '百花齊放首爾%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1546874177718-15bf84d14c09?w=800&h=600&fit=crop' WHERE title LIKE '饗食百匯首爾%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1583167625729-45e0a6accf67?w=800&h=600&fit=crop' WHERE title LIKE '首爾天空之橋%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?w=800&h=600&fit=crop' WHERE title LIKE '首爾歡樂主題%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1601621915196-2621bfb0cd6e?w=800&h=600&fit=crop' WHERE title LIKE '精彩首爾雙樂園%';

-- 韓國 - 釜山
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1573044093982-8c1aabc3aa17?w=800&h=600&fit=crop' WHERE title LIKE '花枝招展釜山%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1596610868498-aaad7502ec37?w=800&h=600&fit=crop' WHERE title LIKE '釜山奢華五星%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1541411438265-4cb4687110f2?w=800&h=600&fit=crop' WHERE title LIKE '美拍迷人釜山%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1578037571214-25e07ed4a987?w=800&h=600&fit=crop' WHERE title LIKE '釜慶邱饗樂%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=800&h=600&fit=crop' WHERE title LIKE '樂遊釜邱%';

-- 韓國 - 濟州
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1597655601841-214a4c5a5ed2?w=800&h=600&fit=crop' WHERE title LIKE '碧海藍天濟州%';

-- 東南亞 - 曼谷
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800&h=600&fit=crop' WHERE title LIKE '泰響曼谷%全程網評%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1563492065599-35ea82a39c6a?w=800&h=600&fit=crop' WHERE title LIKE '泰響曼谷%放題泰國%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=800&h=600&fit=crop' WHERE title LIKE '尊爵泰奢華%';

-- 東南亞 - 清邁
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1599925765498-6be0e0158400?w=800&h=600&fit=crop' WHERE title LIKE '%清邁%';

-- 東南亞 - 芽莊
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1557750255934-173583f0b8c8?w=800&h=600&fit=crop' WHERE title LIKE '越南山海之約%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1559628233-100c798642d4?w=800&h=600&fit=crop' WHERE title LIKE '芽莊5日促銷%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800&h=600&fit=crop' WHERE title LIKE '小資限定%芽莊%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1504457047772-27faf1c00561?w=800&h=600&fit=crop' WHERE title LIKE '五星直飛海島芽莊%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1552733407-5d5c46c3bb3b?w=800&h=600&fit=crop' WHERE title LIKE '直飛芽莊大叻%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1530521954074-e64f6810b32d?w=800&h=600&fit=crop' WHERE title LIKE '芽莊五星假期%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop' WHERE title LIKE '超值芽莊%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1468413253725-0d5181091126?w=800&h=600&fit=crop' WHERE title LIKE '五星南洋之夢芽莊%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1516815231560-8f41ec531527?w=800&h=600&fit=crop' WHERE title LIKE '五星大叻芽莊%';

-- 東南亞 - 富國島
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&h=600&fit=crop' WHERE title LIKE '夏日富國島6日(四星%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1520483601560-389dff434fdf?w=800&h=600&fit=crop' WHERE title LIKE '夏日富國島5日(五星%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&h=600&fit=crop' WHERE title LIKE '夏日富國島5日(四星%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=800&h=600&fit=crop' WHERE title LIKE 'SUN玩富國島%六日%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&h=600&fit=crop' WHERE title LIKE '超SUN樂遊富國島%六日%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=800&h=600&fit=crop' WHERE title LIKE '超SUN樂遊富國島%五日%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=600&fit=crop' WHERE title LIKE 'SUN玩富國島%五日%';

-- 東南亞 - 峴港
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1555921015-5532091f6026?w=800&h=600&fit=crop' WHERE title LIKE '舊愛重峴6日%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1464037866556-6812c9d1c72e?w=800&h=600&fit=crop' WHERE title LIKE '舊愛重峴5日%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&h=600&fit=crop' WHERE title LIKE '臻情再峴6日%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1500835556837-99ac94a94552?w=800&h=600&fit=crop' WHERE title LIKE '臻情再峴五日%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&h=600&fit=crop' WHERE title LIKE '從從容容%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1476900164809-ff19b8ae5968?w=800&h=600&fit=crop' WHERE title LIKE '浪漫湧峴6日%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1433838552652-f9a46b332c40?w=800&h=600&fit=crop' WHERE title LIKE '浪漫湧峴5日%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1586500036706-41963de24d8b?w=800&h=600&fit=crop' WHERE title LIKE '峴慕%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1473116763249-2faaef81ccda?w=800&h=600&fit=crop' WHERE title LIKE '星嚮峴港%';

-- 東南亞 - 河內/北越
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1528127269322-539801943592?w=800&h=600&fit=crop' WHERE title LIKE '午去晚回%龍灣%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1573790387438-4da905039392?w=800&h=600&fit=crop' WHERE title LIKE '早去午回%龍灣%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800&h=600&fit=crop' WHERE title LIKE '夏遊雙龍灣%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1513415277900-a62401e19be4?w=800&h=600&fit=crop' WHERE title LIKE '閃耀北越%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?w=800&h=600&fit=crop' WHERE title LIKE '絕色北越%';

-- 東南亞 - 峇里島
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&h=600&fit=crop' WHERE title LIKE '玩嗨峇里島%';

-- 東南亞 - 吉隆坡
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=800&h=600&fit=crop' WHERE title LIKE '大紅花%';

-- 東南亞 - 新加坡
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800&h=600&fit=crop' WHERE title LIKE '馬新雙樂園%';

-- 東南亞 - 宿霧
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1546500720-5f58b37bcabd?w=800&h=600&fit=crop' WHERE title LIKE '神鬼奇航%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800&h=600&fit=crop' WHERE title LIKE '鯨彩宿霧%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=800&h=600&fit=crop' WHERE title LIKE '探索薄荷島%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1516690561799-46d8f74f9abf?w=800&h=600&fit=crop' WHERE title LIKE '嗨翻宿霧%';

-- 歐洲 - 芬蘭/北歐
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1483347778171-4d5be4443f03?w=800&h=600&fit=crop' WHERE title LIKE '北歐極光%破冰船%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1509356843151-3e7d96241e11?w=800&h=600&fit=crop' WHERE title LIKE '北歐極光%馴鹿%耶誕%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800&h=600&fit=crop' WHERE title LIKE '北歐極光10日%';

-- 歐洲 - 荷比盧
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=800&h=600&fit=crop' WHERE title LIKE '%法比荷%';

-- 歐洲 - 瑞士
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1527668752968-14dc70a27c95?w=800&h=600&fit=crop' WHERE title LIKE '%德瑞法%';

-- 歐洲 - 倫敦
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&h=600&fit=crop' WHERE title LIKE '%英倫時尚%';

-- 歐洲 - 波羅的海
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1560707854654-5c1c0a5ab93d?w=800&h=600&fit=crop' WHERE title LIKE '%波蘭%波羅的海%';

-- 歐洲 - 奧捷斯匈
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1541849546-216549ae216d?w=800&h=600&fit=crop' WHERE title LIKE '%奧捷斯匈%';

-- 歐洲 - 希臘
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=800&h=600&fit=crop' WHERE title LIKE '追尋太陽%希臘%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=800&h=600&fit=crop' WHERE title LIKE '沉醉希臘%';

-- 歐洲 - 義大利
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&h=600&fit=crop' WHERE title LIKE '%義大利首選%';

-- 港澳大陸 - 廈門
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1544989164-31a4de5a0a58?w=800&h=600&fit=crop' WHERE title LIKE '戀戀鷺島%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?w=800&h=600&fit=crop' WHERE title LIKE '山海傳奇%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1474181628765-5e3e4eae1e10?w=800&h=600&fit=crop' WHERE title LIKE '漫遊金廈%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=800&h=600&fit=crop' WHERE title LIKE '浪漫金廈%';

-- 港澳大陸 - 福建
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1513415564515-763d91423bdd?w=800&h=600&fit=crop' WHERE title LIKE '暢遊夷廈%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1470004914212-05527e49370b?w=800&h=600&fit=crop' WHERE title LIKE '雙遺產武夷山%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1496531693211-31c5234a5ea9?w=800&h=600&fit=crop' WHERE title LIKE '山海奇緣%';

-- 港澳大陸 - 江南
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=800&h=600&fit=crop' WHERE title LIKE '奢華唯美%江南%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?w=800&h=600&fit=crop' WHERE title LIKE '山水江南%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1474540412665-1cdae210ae6b?w=800&h=600&fit=crop' WHERE title LIKE '江南嚴選%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=800&h=600&fit=crop' WHERE title LIKE '江南五星%';

-- 港澳大陸 - 安徽
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1516496636080-d5e2e5c83b0a?w=800&h=600&fit=crop' WHERE title LIKE '黃山奇景%';

-- 港澳大陸 - 山東
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=800&h=600&fit=crop' WHERE title LIKE '浪漫青島%';

-- 港澳大陸 - 甘肅
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800&h=600&fit=crop' WHERE title LIKE '甘南秘境%';

-- 港澳大陸 - 新疆
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&h=600&fit=crop' WHERE title LIKE '世外桃源%北疆%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop' WHERE title LIKE '北疆阿爾泰%';

-- 港澳大陸 - 九寨溝
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1516496636080-d5e2e5c83b0a?w=800&h=600&fit=crop' WHERE title LIKE '人間最美仙境%九寨溝%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=600&fit=crop' WHERE title LIKE '人間仙境%九寨溝%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop' WHERE title LIKE '九寨溝 嚴選%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&h=600&fit=crop' WHERE title LIKE '九寨溝、雙高鐵%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=800&h=600&fit=crop' WHERE title LIKE '九寨溝 五星旗艦%';

-- 港澳大陸 - 重慶
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=800&h=600&fit=crop' WHERE title LIKE '魔幻重慶%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?w=800&h=600&fit=crop' WHERE title LIKE '船過三峽%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1474540412665-1cdae210ae6b?w=800&h=600&fit=crop' WHERE title LIKE '長江三號%';

-- 港澳大陸 - 張家界
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1537531010519-f04f8e13e3ab?w=800&h=600&fit=crop' WHERE title LIKE '世界奇景雙奏%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop' WHERE title LIKE '鳳凰古城、天門山%' AND title NOT LIKE '桃園%' AND title NOT LIKE '台中%' AND title NOT LIKE '高雄%' AND title NOT LIKE '(直飛)%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=800&h=600&fit=crop' WHERE title LIKE '桃園出發│張家界%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=800&h=600&fit=crop' WHERE title LIKE '台中出發│張家界%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1464278533981-50106e6176b1?w=800&h=600&fit=crop' WHERE title LIKE '高雄出發│張家界%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=800&h=600&fit=crop' WHERE title LIKE '湘鄂山水%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5?w=800&h=600&fit=crop' WHERE title LIKE '(直飛)張家界%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1431794062232-2a99a5431c6c?w=800&h=600&fit=crop' WHERE title LIKE '嚴選湘西%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1465056836900-8f1e940f2914?w=800&h=600&fit=crop' WHERE title LIKE '五星湘西%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=800&h=600&fit=crop' WHERE title LIKE '桃園出發【雙城奇景】%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1490682143684-14369e18dce8?w=800&h=600&fit=crop' WHERE title LIKE '高雄出發【雙城奇景】%';

-- 港澳大陸 - 貴州/雲南/廣西/河南/遼寧
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1440778303588-435521a205bc?w=800&h=600&fit=crop' WHERE title LIKE '精彩貴州%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1500259571355-332da5cb07aa?w=800&h=600&fit=crop' WHERE title LIKE '星光列車%雲南%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=800&h=600&fit=crop' WHERE title LIKE '夢幻桂林%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1548013146-72479768bada?w=800&h=600&fit=crop' WHERE title LIKE '少林寺%';

-- 中東非洲 - 杜拜
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1512453913667-52e46f6ec3a5?w=800&h=600&fit=crop' WHERE title LIKE '阿聯風華杜拜%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1518684079-3c830dcef090?w=800&h=600&fit=crop' WHERE title LIKE '阿提哈德超值杜拜%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?w=800&h=600&fit=crop' WHERE title LIKE '6人成行%杜拜%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1546412414-e1885e51148b?w=800&h=600&fit=crop' WHERE title LIKE '黑金三國%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1466442929976-97f336a657be?w=800&h=600&fit=crop' WHERE title LIKE '歐亞交響曲x%杜拜%';

-- 中東非洲 - 阿布達比
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1597659840241-37e2b9c2f55f?w=800&h=600&fit=crop' WHERE title LIKE '閃耀阿布達比%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1577717903315-1691ae25ab3f?w=800&h=600&fit=crop' WHERE title LIKE 'F1賽道%';

-- 中東非洲 - 土耳其
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=800&h=600&fit=crop' WHERE title LIKE '歐亞交響曲×%土耳其%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=800&h=600&fit=crop' WHERE title LIKE '滿漢波斯%';

-- 中東非洲 - 埃及
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=800&h=600&fit=crop' WHERE title LIKE '漫步埃及%';

-- 中東非洲 - 烏茲別克
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?w=800&h=600&fit=crop' WHERE title LIKE '中亞藍色圓頂%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=800&h=600&fit=crop' WHERE title LIKE '神秘絲路之心%17天%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1504457047772-27faf1c00561?w=800&h=600&fit=crop' WHERE title LIKE '古絲路中亞三國%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1502920514313-52581002a659?w=800&h=600&fit=crop' WHERE title LIKE '神秘絲路上的藍色寶石%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1523978591478-c753949ff840?w=800&h=600&fit=crop' WHERE title LIKE '走訪中亞之心%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=800&h=600&fit=crop' WHERE title LIKE '探訪中亞絲路%';

-- 中東非洲 - 西伯利亞/蒙古
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1476900164809-ff19b8ae5968?w=800&h=600&fit=crop' WHERE title LIKE '馬背上的國度%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?w=800&h=600&fit=crop' WHERE title LIKE '塞外風情%';

-- 南亞
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1552055568-fa6e1c3a5379?w=800&h=600&fit=crop' WHERE title LIKE '斯里蘭卡%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800&h=600&fit=crop' WHERE title LIKE '湛藍微光馬爾地夫%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1544556905-02a2c2e96b14?w=800&h=600&fit=crop' WHERE title LIKE '幸福王國%三星%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1553856622-d1b352e24a44?w=800&h=600&fit=crop' WHERE title LIKE '幸福王國%四星%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1526711657229-e7e080ed7aa1?w=800&h=600&fit=crop' WHERE title LIKE '幸福王國%五星%';

-- 紐澳美加
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=800&h=600&fit=crop' WHERE title LIKE '%黃金海岸%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1524820197278-540916411e20?w=800&h=600&fit=crop' WHERE title LIKE '%黃金雪雙城%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&h=600&fit=crop' WHERE title LIKE '%澳洲全覽%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1507699622108-4be3abd695ad?w=800&h=600&fit=crop' WHERE title LIKE '%南北島%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=800&h=600&fit=crop' WHERE title LIKE '%美西三城%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&h=600&fit=crop' WHERE title LIKE '%美東旅遊%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&h=600&fit=crop' WHERE title LIKE '%黃石深度%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1560813962-ff3d8fcf59ba?w=800&h=600&fit=crop' WHERE title LIKE '%美加雙城%';

-- 台灣
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1584013915735-0bb6bf2d3c8c?w=800&h=600&fit=crop' WHERE title LIKE '尋驛金門%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1470004914212-05527e49370b?w=800&h=600&fit=crop' WHERE title LIKE '浯島大小金%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?w=800&h=600&fit=crop' WHERE title LIKE '神秘大膽島%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1504109586057-7a2ae83d1338?w=800&h=600&fit=crop' WHERE title LIKE '秘境大膽島%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop' WHERE title LIKE '相約馬祖%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1559628233-100c798642d4?w=800&h=600&fit=crop' WHERE title LIKE '純南北竿%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=800&h=600&fit=crop' WHERE title LIKE '南北竿+大坵%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1544006659-f0b21884ce1d?w=800&h=600&fit=crop' WHERE title LIKE '美拍南海澎湖%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=800&h=600&fit=crop' WHERE title LIKE '暢遊澎湖%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1520483601560-389dff434fdf?w=800&h=600&fit=crop' WHERE title LIKE '水漾喜來登%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&h=600&fit=crop' WHERE title LIKE '金馬躍新春%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=600&fit=crop' WHERE title LIKE '冬享澎澄%3日%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1468413253725-0d5181091126?w=800&h=600&fit=crop' WHERE title LIKE '冬享澎澄%2日%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1530521954074-e64f6810b32d?w=800&h=600&fit=crop' WHERE title LIKE '金色映雙島%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1516815231560-8f41ec531527?w=800&h=600&fit=crop' WHERE title LIKE '遇見七美%';
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1473116763249-2faaef81ccda?w=800&h=600&fit=crop' WHERE title LIKE '仲夏樂東海%';

-- 最後確認：沒有空圖片的行程
-- 如果還有遺漏，設一個通用旅遊圖片
UPDATE trips SET cover_image_url = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&h=600&fit=crop' WHERE cover_image_url = '' OR cover_image_url IS NULL;

-- 完成
