/**
 * 爬取朋威旅遊行程圖片，比對本站行程，下載並上傳到 Supabase Storage
 * 執行：node scripts/scrape-and-replace-images.mjs
 */

import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://soujehqympampczeiwcz.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvdWplaHF5bXBhbXBjemVpd2N6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjkyMTEyNywiZXhwIjoyMDkyNDk3MTI3fQ.7wgfFZ_RSHEmTKEJGGpg1lDK10N6doom_n_2os4E8pI';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const BASE_URL = 'https://www.pwgotravel.com.tw';

// 朋威旅遊各區域頁面
const REGION_PAGES = [
  '/japan/',
  '/south-korea/',
  '/thailand/',
  '/vietnam/',
  '/indonesia/',
  '/malaysia/',
  '/philippines/',
  '/europe/',
  '/china/',
  '/asia/',
  '/SouthAsia/',
  '/new/',
  '/kinmen/',
  '/mazu/',
  '/penghu/',
  '/freetour/',
];

// 正規化標題用於比對
function normalizeTitle(title) {
  return title
    .replace(/[～~\-–—|｜×✕✖＋+&＆]/g, '')
    .replace(/\s+/g, '')
    .replace(/[，,。.、！!？?：:；;（）()【】\[\]「」『』""'']/g, '')
    .toLowerCase()
    .trim();
}

// 模糊比對 — 取兩個標題的共同字元比率
function similarity(a, b) {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (na === nb) return 1;

  // 其中一個包含另一個
  if (na.includes(nb) || nb.includes(na)) return 0.9;

  // 計算共同字元
  const setA = new Set(na);
  const setB = new Set(nb);
  let common = 0;
  for (const c of setA) {
    if (setB.has(c)) common++;
  }
  return common / Math.max(setA.size, setB.size);
}

async function scrapeRegion(page, regionPath) {
  const url = `${BASE_URL}${regionPath}`;
  console.log(`\n🌐 爬取: ${url}`);

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  } catch (err) {
    console.log(`  ⚠️ 載入超時，嘗試繼續...`);
  }

  // 滾動頁面載入 lazy images
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 500;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
      setTimeout(() => { clearInterval(timer); resolve(); }, 12000);
    });
  });

  // 等待圖片載入
  await new Promise(r => setTimeout(r, 2000));

  // 提取行程卡片資料
  const trips = await page.evaluate((baseUrl) => {
    const links = document.querySelectorAll('a[href*="/products/group/"]');
    const results = [];
    const seen = new Set();

    for (const link of links) {
      const img = link.querySelector('img');
      const h3 = link.querySelector('h3');
      const h4 = link.querySelector('h4');
      if (!h3) continue;

      const title = h3.textContent.trim();
      if (seen.has(title)) continue; // 跳過重複
      seen.add(title);

      const price = h4 ? h4.textContent.trim() : '';
      let imgSrc = '';
      if (img) {
        imgSrc = img.src || img.dataset?.src || img.getAttribute('data-original') || '';
        // 轉成絕對路徑
        if (imgSrc && imgSrc.startsWith('/')) {
          imgSrc = baseUrl + imgSrc;
        }
      }
      const href = link.getAttribute('href') || '';

      results.push({ title, price, imgSrc, href });
    }
    return results;
  }, BASE_URL);

  console.log(`  📋 找到 ${trips.length} 個行程`);
  return trips;
}

async function main() {
  console.log('🚀 開始爬取朋威旅遊行程圖片\n');

  // 1. 查詢本站所有行程
  console.log('📦 取得本站行程資料...');
  const { data: dbTrips, error: dbError } = await supabase
    .from('trips')
    .select('id, title, cover_image_url, destination_id')
    .eq('is_active', true);

  if (dbError) {
    console.error('❌ 取得行程失敗:', dbError.message);
    process.exit(1);
  }

  console.log(`  本站共 ${dbTrips.length} 個行程\n`);

  // 2. 用 Puppeteer 爬取所有區域
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  const allScraped = [];

  for (const regionPath of REGION_PAGES) {
    try {
      const trips = await scrapeRegion(page, regionPath);
      for (const t of trips) {
        t.region = regionPath;
      }
      allScraped.push(...trips);
    } catch (err) {
      console.log(`  ❌ 爬取 ${regionPath} 失敗: ${err.message}`);
    }
  }

  await browser.close();

  // 去除重複
  const uniqueScraped = [];
  const seenTitles = new Set();
  for (const t of allScraped) {
    const key = normalizeTitle(t.title);
    if (!seenTitles.has(key)) {
      seenTitles.add(key);
      uniqueScraped.push(t);
    }
  }

  console.log(`\n📊 爬取完成：共 ${uniqueScraped.length} 個不重複行程`);
  console.log(`  有圖片 URL: ${uniqueScraped.filter(t => t.imgSrc).length}`);
  console.log(`  無圖片 URL: ${uniqueScraped.filter(t => !t.imgSrc).length}\n`);

  // 3. 比對行程
  const matched = [];
  const unmatched = [];

  for (const dbTrip of dbTrips) {
    let bestMatch = null;
    let bestScore = 0;

    for (const scraped of uniqueScraped) {
      const score = similarity(dbTrip.title, scraped.title);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = scraped;
      }
    }

    if (bestScore >= 0.7 && bestMatch?.imgSrc) {
      matched.push({
        dbTrip,
        scraped: bestMatch,
        score: bestScore,
      });
    } else {
      unmatched.push({ dbTrip, bestScore, bestTitle: bestMatch?.title || '(無)' });
    }
  }

  console.log(`🔗 比對結果：成功 ${matched.length} / 失敗 ${unmatched.length}`);

  if (unmatched.length > 0) {
    console.log('\n⚠️ 未匹配的行程：');
    for (const u of unmatched.slice(0, 20)) {
      console.log(`  - [${(u.bestScore * 100).toFixed(0)}%] ${u.dbTrip.title.substring(0, 40)} → ${u.bestTitle.substring(0, 30)}`);
    }
  }

  // 4. 下載圖片並上傳
  console.log(`\n🖼️  開始下載/上傳圖片...\n`);

  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < matched.length; i++) {
    const { dbTrip, scraped, score } = matched[i];
    const progress = `[${i + 1}/${matched.length}]`;

    // 如果已經有 Supabase Storage URL 且不是 Unsplash，跳過
    const currentUrl = dbTrip.cover_image_url || '';
    const isSupabaseUrl = currentUrl.includes('supabase.co/storage');
    const isUnsplash = currentUrl.includes('unsplash.com') || currentUrl.includes('images.unsplash');

    if (isSupabaseUrl && !isUnsplash) {
      // 檢查是否是 Supabase 上的舊圖（可能也是 Unsplash 上傳的）
      // 還是要替換，因為可能是之前上傳的 Unsplash 圖
    }

    try {
      // 下載圖片
      let imgUrl = scraped.imgSrc;
      if (!imgUrl.startsWith('http')) {
        imgUrl = BASE_URL + imgUrl;
      }

      console.log(`${progress} ⬇️  ${dbTrip.title.substring(0, 35)}...`);
      console.log(`        匹配 [${(score * 100).toFixed(0)}%]: ${scraped.title.substring(0, 35)}`);
      console.log(`        圖片: ${imgUrl.substring(0, 80)}`);

      const imgRes = await fetch(imgUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Referer': BASE_URL,
        },
        redirect: 'follow',
      });

      if (!imgRes.ok) {
        console.log(`${progress} ⚠️  下載失敗 (${imgRes.status})`);
        failed++;
        continue;
      }

      const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
      const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
      const buffer = Buffer.from(await imgRes.arrayBuffer());

      if (buffer.length < 2000) {
        console.log(`${progress} ⚠️  圖片太小 (${buffer.length} bytes), 跳過`);
        failed++;
        continue;
      }

      // 上傳到 Supabase Storage
      const fileName = `${dbTrip.id}-${Date.now()}.${ext}`;
      const filePath = `trips/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, buffer, {
          contentType,
          cacheControl: 'public, max-age=31536000',
          upsert: true,
        });

      if (uploadError) {
        console.log(`${progress} ❌ 上傳失敗: ${uploadError.message}`);
        failed++;
        continue;
      }

      // 取得公開 URL
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      const versionedUrl = `${publicUrl}?v=${Date.now()}`;

      // 更新 cover_image_url
      const { error: updateError } = await supabase
        .from('trips')
        .update({ cover_image_url: versionedUrl })
        .eq('id', dbTrip.id);

      if (updateError) {
        console.log(`${progress} ❌ 更新 DB 失敗: ${updateError.message}`);
        failed++;
        continue;
      }

      // 也更新 trip_banner.side_image_url（形象圖）
      const bannerFileName = `${dbTrip.id}-banner-${Date.now()}.${ext}`;
      const bannerPath = `trips/banner/${bannerFileName}`;

      await supabase.storage
        .from('images')
        .upload(bannerPath, buffer, {
          contentType,
          cacheControl: 'public, max-age=31536000',
          upsert: true,
        });

      const { data: { publicUrl: bannerPublicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(bannerPath);

      const bannerVersionedUrl = `${bannerPublicUrl}?v=${Date.now()}`;

      // 更新 trip_banner JSONB 的 side_image_url
      const { data: tripData } = await supabase
        .from('trips')
        .select('trip_banner')
        .eq('id', dbTrip.id)
        .single();

      const currentBanner = tripData?.trip_banner || {};
      await supabase
        .from('trips')
        .update({
          trip_banner: { ...currentBanner, side_image_url: bannerVersionedUrl },
        })
        .eq('id', dbTrip.id);

      console.log(`${progress} ✅ 完成`);
      success++;

      // 避免被限速
      await new Promise(r => setTimeout(r, 500));

    } catch (err) {
      console.log(`${progress} ❌ 錯誤: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n🎉 完成！`);
  console.log(`  成功: ${success}`);
  console.log(`  失敗: ${failed}`);
  console.log(`  跳過: ${skipped}`);
  console.log(`  未匹配: ${unmatched.length}`);
}

main().catch(console.error);
