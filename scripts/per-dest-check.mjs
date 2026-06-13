import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const getEnv = (k) => { const m = env.match(new RegExp(`^${k}=(.+)$`, 'm')); return m ? m[1].trim() : null; };
const sb = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));
const BASE_URL = 'https://www.pwgotravel.com.tw';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

function sanitize(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

// DB
const { data: allDests } = await sb.from('destinations')
  .select('id, title, sub_region, source_url, region_id')
  .eq('is_active', true);
const { data: allRegions } = await sb.from('regions').select('id, title');
const { data: allTrips } = await sb.from('trips')
  .select('id, title, destination_id, trip_banner, is_active')
  .eq('is_active', true);

const activeByDest = new Map();
for (const t of allTrips) {
  const list = activeByDest.get(t.destination_id) || [];
  list.push(t);
  activeByDest.set(t.destination_id, list);
}

// 朋威頁面 → 用 source_url 精確匹配
const REGION_URLS = [
  '/japan/', '/south-korea/', '/thailand/', '/vietnam/', '/indonesia/',
  '/malaysia/', '/philippines/', '/europe/', '/china/', '/asia/',
  '/southasia/', '/new/', '/kinmen/', '/mazu/', '/penghu/',
  '/freetour/', '/golf/',
];

// 手動映射: 朋威 section label → 我們的 destination title/sub_region
const SECTION_MAP = {
  // Japan
  '函館/札幌/旭川': '北海道', '札幌': '北海道',
  '仙台/青森/秋田': '東北', '仙台': '東北',
  '東京/箱根/富士': '關東', '東京': '關東',
  '名古屋/北陸/立山黑部': '中部', '名古屋/小松': '中部',
  '京都/大阪/神戶/奈良': '關西',
  '廣島/松山/高松': '四國', '高松/小豆島': '四國',
  '北九州/福岡/熊本': '九州', '福岡/長崎/鹿兒島/熊本': '九州',
  '那霸/石垣/宮古': '沖繩',
  // Korea
  '首爾/京畿道': '首爾',
  '釜山/慶州': '釜山',
  // Southeast Asia
  '曼谷/清邁/清萊': '泰國',
  '峇里島/雅加達': '印尼',
  '富國島/芽莊/中越/北越': '越南',
  '中越': '越南', '北越': '越南', '富國島': '越南', '芽莊': '越南',
  '長灘島/宿霧': '菲律賓',
  '馬來西亞/新加坡': '馬新',
  // Europe
  '法國/英國/德國/瑞士/荷比盧': '中西歐', '中西歐地區': '中西歐',
  '奧捷斯匈/巴爾幹': '東歐', '東歐地區': '東歐',
  '義大利/西班牙/葡萄牙/希臘': '南歐', '南歐地區': '南歐',
  '挪威/丹麥/瑞典/芬蘭/冰島': '北歐', '北歐地區': '北歐',
  // China
  '東北地區': '東北', '華東地區': '華東', '華中地區': '華中',
  '華南地區': '華南', '西南地區': '西南', '西北地區': '西北',
  // Asia/Middle East
  '杜拜 / 阿布達比': '杜拜 / 阿布達比', '中東地區': '杜拜 / 阿布達比',
  '中亞地區': '中亞',
  // South Asia
  '心之所向·錫蘭之光': '斯里蘭卡',
  // New
  '紐西蘭/澳洲': '紐澳', '紐澳地區': '紐澳',
  '美國/加拿大': '美加', '美加地區': '美加',
  // Free tour
  '放飛東北亞': null, '放飛東南亞': null, '放飛台灣': null,
};

// 抓朋威每個 section 的 codes
const pwSections = []; // { regionUrl, label, codes: Set }

for (const regionUrl of REGION_URLS) {
  try {
    const res = await fetch(BASE_URL + regionUrl, { headers: { 'User-Agent': UA } });
    const html = await res.text();
    const ch = cheerio.load(html);
    ch('.row.expand-graphics').each((_, container) => {
      const label = sanitize(ch(container).parent().find('.header-title').first().text());
      const codes = new Set();
      ch(container).find('.item-box a[href*="/products/"]').each((_, link) => {
        const href = ch(link).attr('href') || '';
        const m = href.match(/mold-new\/([A-Z0-9]+)/i);
        if (m) codes.add(m[1].split('?')[0]);
      });
      if (codes.size > 0) pwSections.push({ regionUrl, label, codes });
    });
  } catch {}
  await new Promise(r => setTimeout(r, 300));
}

// 匹配每個 section → destination
console.log('=== 按 destination 頁面比對 ===\n');
let issues = 0;

for (const pw of pwSections) {
  // 用 source_url + label 找 destination
  const regionPath = pw.regionUrl.replace(/\/$/, '');
  const mappedName = SECTION_MAP[pw.label];
  
  // 如果是已知不需要的 section，跳過
  if (mappedName === null) continue;

  const candidates = allDests.filter(d => d.source_url && d.source_url.includes(regionPath));
  
  let dest = null;
  if (candidates.length === 1) {
    dest = candidates[0];
  } else if (candidates.length > 1) {
    const targetName = mappedName || pw.label;
    dest = candidates.find(d => {
      const dTitle = sanitize(d.title);
      const dSub = sanitize(d.sub_region || '');
      return dTitle === targetName || dSub === targetName ||
             dTitle.includes(targetName) || targetName.includes(dTitle) ||
             (dSub && (dSub.includes(targetName) || targetName.includes(dSub)));
    });
  }

  if (!dest) {
    // console.log(`⚠️  ${pw.label} (${pw.regionUrl}): ${pw.codes.size} trips → 無匹配 destination`);
    continue;
  }

  const region = allRegions.find(r => r.id === dest.region_id);
  const dbTrips = activeByDest.get(dest.id) || [];
  const dbCodes = new Set(dbTrips.map(t => t.trip_banner?.code_label).filter(Boolean));

  // 哪些 code 在朋威的這個 section 但不在我們的 destination
  const missing = [...pw.codes].filter(c => !dbCodes.has(c));
  // 哪些 code 在我們的 destination 但不在朋威的這個 section
  const extra = [...dbCodes].filter(c => !pw.codes.has(c));

  if (missing.length > 0) {
    issues++;
    console.log(`❌ ${region?.title || '?'} > ${dest.title}: 朋威 ${pw.label} 有 ${pw.codes.size} 筆, 我們有 ${dbCodes.size} 筆`);
    console.log(`   朋威有但我們沒有 (${missing.length}):`);
    for (const code of missing) {
      // 看這個 code 在我們 DB 的哪裡
      const inOther = allTrips.find(t => t.trip_banner?.code_label === code);
      const otherDest = inOther ? allDests.find(d => d.id === inOther.destination_id) : null;
      console.log(`     ${code} → ${otherDest ? `在 ${otherDest.title}` : '不存在'}`);
    }
    if (extra.length > 0) {
      console.log(`   我們有但朋威沒有 (${extra.length}):`);
      for (const code of extra) {
        const trip = dbTrips.find(t => t.trip_banner?.code_label === code);
        console.log(`     ${code} | ${trip?.title?.substring(0, 40) || '?'}`);
      }
    }
    console.log();
  }
}

console.log(`=== 有差異的 destination: ${issues} 個 ===`);
