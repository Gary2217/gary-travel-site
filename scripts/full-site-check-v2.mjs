import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const getEnv = (k) => { const m = env.match(new RegExp(`^${k}=(.+)$`, 'm')); return m ? m[1].trim() : null; };
const sb = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));
const BASE_URL = 'https://www.pwgotravel.com.tw';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

function sanitize(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

// ========== Step 1: DB 資料 ==========
const { data: allDests } = await sb.from('destinations')
  .select('id, title, sub_region, source_url, region_id')
  .eq('is_active', true);

const { data: allRegions } = await sb.from('regions')
  .select('id, title, category_label');

const { data: allTrips } = await sb.from('trips')
  .select('id, title, destination_id, trip_banner, is_active, display_order');

const activeCodes = new Map(); // code → trip
const inactiveCodes = new Map(); // code → trip
const activeByDest = new Map(); // destId → [trips]

for (const t of allTrips) {
  const code = t.trip_banner?.code_label;
  if (!code) continue;
  if (t.is_active) {
    activeCodes.set(code, t);
    const list = activeByDest.get(t.destination_id) || [];
    list.push(t);
    activeByDest.set(t.destination_id, list);
  } else {
    inactiveCodes.set(code, t);
  }
}

console.log(`DB: ${activeCodes.size} active codes, ${inactiveCodes.size} inactive codes\n`);

// ========== Step 2: 朋威所有區域 ==========
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

// 朋威行程資料: code → { regionKey, sectionLabel, title, price, imgUrl, tags, order }
const pwAll = new Map();

for (const region of REGIONS) {
  try {
    const res = await fetch(BASE_URL + region.url, { headers: { 'User-Agent': UA } });
    const html = await res.text();
    const ch = cheerio.load(html);

    ch('.row.expand-graphics').each((_, container) => {
      const section = sanitize(ch(container).parent().find('.header-title').first().text());
      let orderInSection = 0;
      ch(container).find('.item-box a[href*="/products/"]').each((_, link) => {
        orderInSection++;
        const title = sanitize(ch(link).find('h3').text());
        const href = ch(link).attr('href') || '';
        const codeMatch = href.match(/mold-new\/([A-Z0-9]+)/i);
        const code = codeMatch ? codeMatch[1].split('?')[0] : '';
        if (!code) return;
        const img = ch(link).find('img').attr('src') || '';
        const imgUrl = img.startsWith('http') ? img : img.startsWith('//') ? `https:${img}` : `${BASE_URL}${img}`;
        const price = sanitize(ch(link).find('h4').text());
        const tags = [];
        ch(link).find('.item_tag').each((_, t) => tags.push(sanitize(ch(t).text())));
        pwAll.set(code, { code, regionKey: region.key, regionUrl: region.url, sectionLabel: section, title, price, imgUrl, tags, order: orderInSection });
      });
    });
  } catch (e) {
    console.log(`抓取 ${region.key} 失敗: ${e.message}`);
  }
  await new Promise(r => setTimeout(r, 300));
}

console.log(`朋威: ${pwAll.size} codes\n`);

// ========== Step 3: 比對 ==========

// 3a: 朋威有、我們 active 沒有的 → 缺少
const missing = [];
for (const [code, pw] of pwAll) {
  if (!activeCodes.has(code)) {
    const inactive = inactiveCodes.get(code);
    missing.push({ ...pw, hasInactive: !!inactive, inactiveTrip: inactive || null });
  }
}

// 3b: 我們 active 有、朋威沒有的 → 多出來的（可能被下架了）
const extra = [];
for (const [code, trip] of activeCodes) {
  if (!pwAll.has(code)) {
    const dest = allDests.find(d => d.id === trip.destination_id);
    extra.push({ code, trip, dest });
  }
}

// ========== Step 4: 按 destination 分組輸出 ==========

// 把缺少的按 section 分組
console.log('=== 缺少的行程（朋威有、我們沒有） ===\n');

const missingBySection = new Map();
for (const m of missing) {
  const key = `${m.regionKey}|${m.sectionLabel}`;
  const list = missingBySection.get(key) || [];
  list.push(m);
  missingBySection.set(key, list);
}

for (const [key, trips] of [...missingBySection.entries()].sort()) {
  const [regionKey, section] = key.split('|');
  console.log(`${section} (${regionKey}): ${trips.length} 筆缺少`);
  for (const t of trips) {
    const status = t.hasInactive ? '🔄可恢復' : '🆕需新增';
    console.log(`  ${status} ${t.code} | ${t.title.substring(0, 55)} | ${t.price}`);
    if (t.hasInactive) {
      console.log(`    → inactive trip ID: ${t.inactiveTrip.id}`);
    }
  }
  console.log();
}

// 按 destination 比對數量
console.log('\n=== 按 destination 比對 ===\n');

// 建立 destination → source_url → region mapping
for (const dest of allDests) {
  if (!dest.source_url) continue;
  const region = allRegions.find(r => r.id === dest.region_id);
  const dbActive = activeByDest.get(dest.id) || [];
  
  // 找朋威對應此 destination 的行程
  // 通過 source_url 找區域，再通過 sub_region/title 找 section
  const regionPath = dest.source_url.replace(BASE_URL, '').replace(/\/$/, '');
  const regionConfig = REGIONS.find(r => regionPath.includes(r.url.replace(/\/$/, '')));
  if (!regionConfig) continue;

  // 找此區域所有 section，看哪些 match 此 destination
  let matchedPwCodes = new Set();
  for (const [code, pw] of pwAll) {
    if (pw.regionUrl !== regionConfig.url) continue;
    const label = pw.sectionLabel;
    const dTitle = sanitize(dest.title);
    const dSub = sanitize(dest.sub_region || '');
    
    // 精準匹配
    if (label === dTitle || label === dSub) { matchedPwCodes.add(code); continue; }
    if (label.includes(dTitle) || dTitle.includes(label)) { matchedPwCodes.add(code); continue; }
    if (dSub && (label.includes(dSub) || dSub.includes(label))) { matchedPwCodes.add(code); continue; }
  }

  const dbCount = dbActive.length;
  const pwCount = matchedPwCodes.size;
  
  if (pwCount === 0 && dbCount > 0) continue; // 我們有但無法配對朋威 section，跳過
  if (dbCount >= pwCount) continue; // OK

  const dbCodes = new Set(dbActive.map(t => t.trip_banner?.code_label).filter(Boolean));
  const missingHere = [...matchedPwCodes].filter(c => !dbCodes.has(c));
  
  if (missingHere.length > 0) {
    console.log(`❌ ${region?.title || '?'} > ${dest.title}: 朋威=${pwCount} 我們=${dbCount} (缺${missingHere.length})`);
    for (const code of missingHere) {
      const pw = pwAll.get(code);
      const inactive = inactiveCodes.get(code);
      console.log(`   ${inactive ? '🔄' : '🆕'} ${code} | ${pw?.title?.substring(0, 50) || '?'}`);
    }
  }
}

console.log(`\n=== 總結 ===`);
console.log(`朋威總 codes: ${pwAll.size}`);
console.log(`我們 active codes: ${activeCodes.size}`);
console.log(`缺少: ${missing.length} (可恢復: ${missing.filter(m => m.hasInactive).length}, 需新增: ${missing.filter(m => !m.hasInactive).length})`);
console.log(`多出 (我們有朋威沒有): ${extra.length}`);
