import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const getEnv = (k) => { const m = env.match(new RegExp(`^${k}=(.+)$`, 'm')); return m ? m[1].trim() : null; };
const sb = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));
const BASE_URL = 'https://www.pwgotravel.com.tw';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

function sanitize(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

// ========== Step 1: 取得所有 DB destinations ==========
const { data: allDests, error: destErr } = await sb.from('destinations')
  .select('id, title, sub_region, source_url, region_id')
  .eq('is_active', true);

if (destErr) { console.error('destinations query error:', destErr); process.exit(1); }
console.log(`DB destinations: ${allDests.length} 筆`);

const { data: allRegions, error: regErr } = await sb.from('regions')
  .select('id, title, category_label');
if (regErr) { console.error('regions query error:', regErr); process.exit(1); }
console.log(`DB regions: ${allRegions.length} 筆`);

// Attach region info
for (const d of allDests) {
  d.region = allRegions.find(r => r.id === d.region_id) || null;
}

const { data: allTrips, error: tripErr } = await sb.from('trips')
  .select('id, title, destination_id, trip_banner, is_active')
  .order('display_order');

if (tripErr) { console.error('trips query error:', tripErr); process.exit(1); }

const allInactive = allTrips.filter(t => !t.is_active);

// DB trips by destination
const activeByDest = new Map();
const inactiveByDest = new Map();
for (const t of allTrips) {
  if (t.is_active) {
    const list = activeByDest.get(t.destination_id) || [];
    list.push(t);
    activeByDest.set(t.destination_id, list);
  }
}
for (const t of allInactive) {
  const list = inactiveByDest.get(t.destination_id) || [];
  list.push(t);
  inactiveByDest.set(t.destination_id, list);
}

// ========== Step 2: 抓朋威所有區域頁面 ==========
const REGIONS = [
  { key: 'japan', url: '/japan/' },
  { key: 'south-korea', url: '/south-korea/' },
  { key: 'thailand', url: '/thailand/' },
  { key: 'vietnam', url: '/vietnam/' },
  { key: 'indonesia', url: '/indonesia/' },
  { key: 'malaysia', url: '/malaysia/' },
  { key: 'philippines', url: '/philippines/' },
  { key: 'europe', url: '/europe/' },
  { key: 'china', url: '/china/' },
  { key: 'asia', url: '/asia/' },
  { key: 'southasia', url: '/southasia/' },
  { key: 'new', url: '/new/' },
  { key: 'kinmen', url: '/kinmen/' },
  { key: 'mazu', url: '/mazu/' },
  { key: 'penghu', url: '/penghu/' },
  { key: 'freetour', url: '/freetour/' },
  { key: 'golf', url: '/golf/' },
];

// 朋威資料結構: { regionKey, sectionLabel, trips: [{code, title, price, imgUrl, tags}] }
const pwData = [];

for (const region of REGIONS) {
  try {
    const res = await fetch(BASE_URL + region.url, { headers: { 'User-Agent': UA } });
    const html = await res.text();
    const ch = cheerio.load(html);

    ch('.row.expand-graphics').each((_, container) => {
      const section = sanitize(ch(container).parent().find('.header-title').first().text());
      const trips = [];
      ch(container).find('.item-box a[href*="/products/"]').each((i, link) => {
        const title = sanitize(ch(link).find('h3').text());
        const href = ch(link).attr('href') || '';
        const codeMatch = href.match(/mold-new\/([A-Z0-9]+)/i);
        const code = codeMatch ? codeMatch[1].split('?')[0] : '';
        const img = ch(link).find('img').attr('src') || '';
        const imgUrl = img.startsWith('http') ? img : img.startsWith('//') ? `https:${img}` : `${BASE_URL}${img}`;
        const price = sanitize(ch(link).find('h4').text());
        const tags = [];
        ch(link).find('.item_tag').each((_, t) => tags.push(sanitize(ch(t).text())));
        trips.push({ order: i + 1, code, title, price, imgUrl, tags });
      });
      if (trips.length > 0) {
        pwData.push({ regionKey: region.key, regionUrl: region.url, sectionLabel: section, trips });
      }
    });
  } catch (e) {
    console.log(`抓取 ${region.key} 失敗: ${e.message}`);
  }
  await new Promise(r => setTimeout(r, 300));
}

// ========== Step 3: 用 source_url 精準匹配 destination ==========
// 每個 destination 的 source_url 包含區域 URL，同時用 sub_region / title 匹配 section label

function matchDestination(regionUrl, sectionLabel) {
  // 找 source_url 包含此區域的 destinations
  const candidates = allDests.filter(d => {
    if (!d.source_url) return false;
    const regionPath = regionUrl.replace(/\/$/, '');
    return d.source_url.includes(regionPath);
  });

  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  // 多個 candidate → 精確匹配 sub_region 或 title
  const label = sanitize(sectionLabel);
  
  // 1. Exact match on sub_region
  const exactSub = candidates.find(d => sanitize(d.sub_region) === label);
  if (exactSub) return exactSub;

  // 2. Exact match on title
  const exactTitle = candidates.find(d => sanitize(d.title) === label);
  if (exactTitle) return exactTitle;

  // 3. Contains match (section label contains dest name or vice versa)
  const contains = candidates.find(d => {
    const dTitle = sanitize(d.title);
    const dSub = sanitize(d.sub_region || '');
    return label.includes(dTitle) || dTitle.includes(label) ||
           (dSub && (label.includes(dSub) || dSub.includes(label)));
  });
  if (contains) return contains;

  // 4. Known mappings for tricky ones
  const labelMap = {
    '京都/大阪/神戶/奈良': '關西',
    '東京/箱根/富士': '關東',
    '名古屋/北陸/立山黑部': '中部',
    '廣島/松山/高松': '四國',
    '福岡/長崎/鹿兒島/熊本': '九州',
    '仙台/青森/秋田': '東北',
    '函館/札幌/旭川': '北海道',
    '那霸/石垣/宮古': '沖繩',
    '曼谷/清邁/清萊': '泰國',
    '峇里島/雅加達': '印尼',
    '富國島/芽莊/中越/北越': '越南',
    '長灘島/宿霧': '菲律賓',
    '馬來西亞/新加坡': '馬新',
    '首爾/京畿道': '首爾',
    '釜山/慶州': '釜山',
    '中西歐地區': '中西歐',
    '東歐地區': '東歐',
    '南歐地區': '南歐',
    '北歐地區': '北歐',
    '東北地區': null, // ambiguous - need regionUrl
    '華東地區': '華東',
    '華中地區': '華中',
    '華南地區': '華南',
    '西南地區': '西南',
    '西北地區': '西北',
    '中東地區': '中東',
    '中亞地區': '中亞',
    '西伯利亞': '西伯利亞',
    '高雄出發': '高雄出發',
    '紐澳地區': '紐澳',
    '美加地區': '美加',
  };

  // Try mapped name
  const mapped = labelMap[label];
  if (mapped) {
    const byMapped = candidates.find(d => 
      sanitize(d.title) === mapped || sanitize(d.sub_region) === mapped
    );
    if (byMapped) return byMapped;
  }

  // Strip 地區 suffix
  const stripped = label.replace(/地區$/, '');
  const byStripped = candidates.find(d => {
    const dTitle = sanitize(d.title);
    const dSub = sanitize(d.sub_region || '');
    return dTitle === stripped || dSub === stripped ||
           dTitle.includes(stripped) || stripped.includes(dTitle);
  });
  if (byStripped) return byStripped;

  return null;
}

// ========== Step 4: 比對並輸出結果 ==========
console.log('=== 全站行程數量比對 ===\n');

let totalMissing = 0;
const allMissing = []; // { dest, code, pwTrip, regionKey, sectionLabel }

for (const pw of pwData) {
  const dest = matchDestination(pw.regionUrl, pw.sectionLabel);
  const pwCodes = new Set(pw.trips.map(t => t.code).filter(Boolean));
  const pwCount = pw.trips.length;

  if (!dest) {
    console.log(`⚠️  ${pw.sectionLabel} (${pw.regionKey}): 朋威=${pwCount} → 無對應 destination`);
    continue;
  }

  const dbActive = activeByDest.get(dest.id) || [];
  const dbInactive = inactiveByDest.get(dest.id) || [];
  const dbActiveCodes = new Set(dbActive.map(t => t.trip_banner?.code_label).filter(Boolean));
  const dbCount = dbActive.length;

  if (dbCount >= pwCount) {
    // OK
    continue;
  }

  // 找缺少的 codes
  const missingCodes = [];
  for (const t of pw.trips) {
    if (t.code && !dbActiveCodes.has(t.code)) {
      missingCodes.push(t);
      // 檢查是否在 inactive 中
      const inactiveMatch = dbInactive.find(db => db.trip_banner?.code_label === t.code);
      allMissing.push({
        dest,
        code: t.code,
        pwTrip: t,
        regionKey: pw.regionKey,
        sectionLabel: pw.sectionLabel,
        hasInactive: !!inactiveMatch,
        inactiveId: inactiveMatch?.id,
      });
    }
  }

  totalMissing += missingCodes.length;
  console.log(`❌ ${dest.title} (${pw.sectionLabel}): 朋威=${pwCount} 我們=${dbCount} (缺${missingCodes.length})`);
  for (const mc of missingCodes) {
    const inactiveMatch = dbInactive.find(db => db.trip_banner?.code_label === mc.code);
    console.log(`   ${inactiveMatch ? '🔄可恢復' : '🆕需新增'} ${mc.code} | ${mc.title.substring(0, 50)} | ${mc.price}`);
  }
}

console.log(`\n=== 總結 ===`);
console.log(`缺少行程: ${totalMissing} 筆`);
console.log(`  可恢復(inactive): ${allMissing.filter(m => m.hasInactive).length} 筆`);
console.log(`  需新增: ${allMissing.filter(m => !m.hasInactive).length} 筆`);

// 輸出 JSON 供修復 script 使用
if (allMissing.length > 0) {
  console.log('\n=== 修復清單 ===');
  for (const m of allMissing) {
    console.log(JSON.stringify({
      action: m.hasInactive ? 'reactivate' : 'create',
      destId: m.dest.id,
      destTitle: m.dest.title,
      inactiveId: m.inactiveId || null,
      code: m.code,
      title: m.pwTrip.title,
      price: m.pwTrip.price,
      order: m.pwTrip.order,
      imgUrl: m.pwTrip.imgUrl,
      tags: m.pwTrip.tags,
    }));
  }
}
