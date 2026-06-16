/**
 * 新增朋威有但本站缺少的行程
 * - 匹配度 >= 65%: 更新現有行程標題 + 補圖片
 * - 匹配度 < 65%: 新增行程
 * 執行：node scripts/add-missing-trips.mjs
 */

import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://soujehqympampczeiwcz.supabase.co';
// ⚠️ 已移除硬編碼金鑰，改從 .env.local 讀取
import { readFileSync } from 'fs';
const _env = readFileSync('.env.local', 'utf8');
const _getEnv = (k) => { const m = _env.match(new RegExp(`^${k}=(.+)$`, 'm')); return m ? m[1].trim() : null; };
const SERVICE_ROLE_KEY = _getEnv('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const BASE_URL = 'https://www.pwgotravel.com.tw';

// 這 9 個缺少的行程（從 check-missing-trips 輸出）
const MISSING_TRIPS = [
  { title: '同遊義大利首選10日-直飛米蘭.水都威尼斯.文藝佛羅倫斯.羅馬假期.真愛維洛納.托斯卡尼.Outlet購物趣', price: 'NT$79,900', region: '/europe/' },
  { title: '阿提哈德超值杜拜經典7日~杜拜之框、藍色市集、AL SEEF阿拉伯建築群、沙漠衝沙', price: 'NT$39,900', region: '/asia/' },
  { title: '黑金三國-杜拜、阿布達比、汶萊、阿拉伯之夜、吉普車歷險8日沙漠衝沙 羅浮宮 天空之鏡 長鼻猴生態之旅', price: 'NT$39,900', region: '/asia/' },
  { title: '神秘絲路之心~中亞五國哈薩克、吉爾吉斯、烏茲別克、塔吉克、土庫曼17天', price: 'NT$229,000', region: '/asia/' },
  { title: '神秘絲路之心~中亞五國哈薩克、吉爾吉斯、烏茲別克、塔吉克、土庫曼18天', price: 'NT$235,000', region: '/asia/' },
  { title: '浪漫島嶼沖繩自由行4日', price: 'NT$17,900', region: '/freetour/' },
  { title: '夢旅北海道自由行5日', price: 'NT$28,900', region: '/freetour/' },
  { title: 'FUN輕鬆~首爾自由行5日', price: 'NT$18,900', region: '/freetour/' },
  { title: 'FUN輕鬆~釜山自由行5日', price: 'NT$19,500', region: '/freetour/' },
];

// 區域到 destination 的映射關鍵字
const REGION_DEST_MAP = {
  '/europe/': '歐洲',
  '/asia/': '中東',
  '/freetour/': null, // 自由行需個別映射
};

// 自由行映射
const FREETOUR_DEST_MAP = {
  '沖繩': '沖繩',
  '北海道': '北海道',
  '首爾': '首爾',
  '釜山': '釜山',
};

function normalizeTitle(title) {
  return title.replace(/[～~\-–—|｜×✕✖＋+&＆]/g, '').replace(/\s+/g, '').replace(/[，,。.、！!？?：:；;（）()【】\[\]「」『』""'']/g, '').toLowerCase().trim();
}

function similarity(a, b) {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.9;
  const setA = new Set(na);
  const setB = new Set(nb);
  let common = 0;
  for (const c of setA) if (setB.has(c)) common++;
  return common / Math.max(setA.size, setB.size);
}

async function scrapeImage(page, regionPath, title) {
  try {
    await page.goto(`${BASE_URL}${regionPath}`, { waitUntil: 'networkidle2', timeout: 30000 });
  } catch { /* ok */ }

  await page.evaluate(async () => {
    await new Promise(resolve => {
      let h = 0;
      const t = setInterval(() => { window.scrollBy(0, 500); h += 500; if (h >= document.body.scrollHeight) { clearInterval(t); resolve(); } }, 100);
      setTimeout(() => { clearInterval(t); resolve(); }, 10000);
    });
  });
  await new Promise(r => setTimeout(r, 1500));

  const result = await page.evaluate((targetTitle, baseUrl) => {
    const links = document.querySelectorAll('a[href*="/products/group/"]');
    for (const link of links) {
      const h3 = link.querySelector('h3');
      if (!h3) continue;
      const t = h3.textContent.trim();
      if (t === targetTitle || t.includes(targetTitle.slice(0, 15))) {
        const img = link.querySelector('img');
        let imgSrc = img ? (img.src || img.dataset?.src || '') : '';
        if (imgSrc && imgSrc.startsWith('/')) imgSrc = baseUrl + imgSrc;
        return imgSrc;
      }
    }
    return '';
  }, title, BASE_URL);

  return result;
}

async function downloadAndUpload(imgUrl, tripId) {
  if (!imgUrl) return null;
  const url = imgUrl.startsWith('/') ? BASE_URL + imgUrl : imgUrl;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': BASE_URL },
    redirect: 'follow',
  });
  if (!res.ok) return null;

  const contentType = res.headers.get('content-type') || 'image/jpeg';
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length < 2000) return null;

  const fileName = `${tripId}-${Date.now()}.${ext}`;
  const filePath = `trips/${fileName}`;

  const { error } = await supabase.storage.from('images').upload(filePath, buffer, {
    contentType,
    cacheControl: 'public, max-age=31536000',
    upsert: true,
  });
  if (error) return null;

  const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filePath);
  return `${publicUrl}?v=${Date.now()}`;
}

async function main() {
  console.log('📦 取得現有行程與目的地...\n');

  const { data: dbTrips } = await supabase.from('trips').select('id, title').eq('is_active', true);
  const { data: destinations } = await supabase.from('destinations').select('id, title, sub_region').eq('is_active', true);

  // 找出目的地
  function findDestination(trip) {
    const region = trip.region;

    // 自由行：根據標題中的關鍵字找目的地
    if (region === '/freetour/') {
      for (const [keyword, destKeyword] of Object.entries(FREETOUR_DEST_MAP)) {
        if (trip.title.includes(keyword)) {
          const dest = destinations.find(d =>
            d.title.includes(destKeyword) || (d.sub_region && d.sub_region.includes(destKeyword))
          );
          if (dest) return dest.id;
        }
      }
      // 找韓國相關
      if (trip.title.includes('首爾') || trip.title.includes('釜山')) {
        const dest = destinations.find(d => d.title.includes('韓國') || d.title.includes('首爾') || d.title.includes('釜山'));
        if (dest) return dest.id;
      }
    }

    // 歐洲
    if (region === '/europe/') {
      const dest = destinations.find(d => d.title.includes('歐洲') || d.title.includes('義大利'));
      if (dest) return dest.id;
    }

    // 中東亞非
    if (region === '/asia/') {
      if (trip.title.includes('杜拜') || trip.title.includes('阿布達比')) {
        const dest = destinations.find(d => d.title.includes('杜拜') || d.title.includes('中東'));
        if (dest) return dest.id;
      }
      if (trip.title.includes('中亞') || trip.title.includes('絲路')) {
        const dest = destinations.find(d => d.title.includes('中亞') || d.title.includes('絲路'));
        if (dest) return dest.id;
      }
      // fallback: 找中東亞非
      const dest = destinations.find(d => d.title.includes('中東') || d.title.includes('亞非'));
      if (dest) return dest.id;
    }

    // fallback: 第一個目的地
    return destinations[0]?.id;
  }

  // 啟動瀏覽器
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0');

  let added = 0;
  let updated = 0;

  for (const trip of MISSING_TRIPS) {
    console.log(`\n🔍 處理: ${trip.title.substring(0, 50)}...`);

    // 檢查是否有近似的現有行程（>= 65%）
    let bestMatch = null;
    let bestScore = 0;
    for (const db of dbTrips) {
      const score = similarity(trip.title, db.title);
      if (score > bestScore) { bestScore = score; bestMatch = db; }
    }

    // 爬取圖片
    console.log(`  爬取圖片 from ${trip.region}...`);
    const imgUrl = await scrapeImage(page, trip.region, trip.title);
    console.log(`  圖片: ${imgUrl ? imgUrl.substring(0, 60) + '...' : '❌ 無'}`);

    if (bestScore >= 0.65 && bestMatch) {
      // 更新現有行程：標題 + 圖片
      console.log(`  ♻️  更新現有 [${(bestScore * 100).toFixed(0)}%]: ${bestMatch.title.substring(0, 40)}`);

      const updates = { title: trip.title };

      if (imgUrl) {
        const uploadedUrl = await downloadAndUpload(imgUrl, bestMatch.id);
        if (uploadedUrl) {
          updates.cover_image_url = uploadedUrl;
          console.log(`  ✅ 圖片已上傳`);
        }
      }

      await supabase.from('trips').update(updates).eq('id', bestMatch.id);
      updated++;

    } else {
      // 新增行程
      const destId = findDestination(trip);
      if (!destId) {
        console.log(`  ❌ 找不到對應目的地，跳過`);
        continue;
      }

      const priceNum = trip.price.replace(/[^\d]/g, '');
      const newTrip = {
        destination_id: destId,
        title: trip.title,
        subtitle: '',
        duration: '',
        price_range: trip.price.replace('起 ', ''),
        cover_image_url: '',
        highlights: [],
        is_active: true,
        display_order: 99,
      };

      const { data: inserted, error: insertErr } = await supabase
        .from('trips')
        .insert(newTrip)
        .select()
        .single();

      if (insertErr) {
        console.log(`  ❌ 新增失敗: ${insertErr.message}`);
        continue;
      }

      // 上傳圖片
      if (imgUrl) {
        const uploadedUrl = await downloadAndUpload(imgUrl, inserted.id);
        if (uploadedUrl) {
          await supabase.from('trips').update({ cover_image_url: uploadedUrl }).eq('id', inserted.id);
          console.log(`  ✅ 新增完成 + 圖片已上傳`);
        } else {
          console.log(`  ✅ 新增完成（無圖片）`);
        }
      } else {
        console.log(`  ✅ 新增完成（無圖片）`);
      }

      added++;
    }

    await new Promise(r => setTimeout(r, 500));
  }

  await browser.close();

  console.log(`\n🎉 完成！新增: ${added}, 更新: ${updated}`);
}

main().catch(console.error);
