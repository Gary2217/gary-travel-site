/**
 * 比對朋威旅遊行程 vs 本站行程，找出缺少的
 * 執行：node scripts/check-missing-trips.mjs
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
const REGION_PAGES = [
  '/japan/', '/south-korea/', '/thailand/', '/vietnam/',
  '/indonesia/', '/malaysia/', '/philippines/', '/europe/',
  '/china/', '/asia/', '/SouthAsia/', '/new/',
  '/kinmen/', '/mazu/', '/penghu/', '/freetour/',
];

function normalizeTitle(title) {
  return title
    .replace(/[～~\-–—|｜×✕✖＋+&＆]/g, '')
    .replace(/\s+/g, '')
    .replace(/[，,。.、！!？?：:；;（）()【】\[\]「」『』""'']/g, '')
    .toLowerCase()
    .trim();
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

async function scrapeRegion(page, regionPath) {
  try {
    await page.goto(`${BASE_URL}${regionPath}`, { waitUntil: 'networkidle2', timeout: 30000 });
  } catch { /* timeout OK */ }

  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let h = 0;
      const t = setInterval(() => { window.scrollBy(0, 500); h += 500; if (h >= document.body.scrollHeight) { clearInterval(t); resolve(); } }, 100);
      setTimeout(() => { clearInterval(t); resolve(); }, 10000);
    });
  });
  await new Promise(r => setTimeout(r, 1500));

  return page.evaluate((baseUrl) => {
    const links = document.querySelectorAll('a[href*="/products/group/"]');
    const results = [];
    const seen = new Set();
    for (const link of links) {
      const h3 = link.querySelector('h3');
      const h4 = link.querySelector('h4');
      if (!h3) continue;
      const title = h3.textContent.trim();
      if (seen.has(title)) continue;
      seen.add(title);
      const price = h4 ? h4.textContent.trim() : '';
      results.push({ title, price, href: link.getAttribute('href') || '' });
    }
    return results;
  }, BASE_URL);
}

async function main() {
  // 1. 取得本站行程
  const { data: dbTrips } = await supabase
    .from('trips')
    .select('id, title')
    .eq('is_active', true);

  console.log(`本站行程: ${dbTrips.length}\n`);

  // 2. 爬取朋威
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0');

  const allScraped = [];
  for (const r of REGION_PAGES) {
    const trips = await scrapeRegion(page, r);
    trips.forEach(t => { t.region = r; });
    allScraped.push(...trips);
    process.stdout.write(`  ${r}: ${trips.length} 個\n`);
  }
  await browser.close();

  // 去重
  const unique = [];
  const seen = new Set();
  for (const t of allScraped) {
    const key = normalizeTitle(t.title);
    if (!seen.has(key)) { seen.add(key); unique.push(t); }
  }

  console.log(`\n朋威行程: ${unique.length}\n`);

  // 3. 找出朋威有但本站沒有的
  const missing = [];
  for (const scraped of unique) {
    let bestScore = 0;
    for (const db of dbTrips) {
      const score = similarity(scraped.title, db.title);
      if (score > bestScore) bestScore = score;
    }
    if (bestScore < 0.7) {
      missing.push({ ...scraped, bestScore });
    }
  }

  console.log(`=== 朋威有但本站可能缺少的行程 (${missing.length}) ===\n`);
  for (const m of missing) {
    console.log(`  [${m.region}] ${m.title}`);
    console.log(`    價格: ${m.price}  最佳匹配: ${(m.bestScore * 100).toFixed(0)}%`);
  }

  if (missing.length === 0) {
    console.log('  ✅ 沒有缺少的行程，本站已完整覆蓋！');
  }
}

main().catch(console.error);
