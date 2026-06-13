import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const getEnv = (k) => { const m = env.match(new RegExp(`^${k}=(.+)$`, 'm')); return m ? m[1].trim() : null; };
const sb = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));
const BASE = 'https://www.pwgotravel.com.tw';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0';

function sanitize(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

// ===== 朋威 china 頁面 =====
const res = await fetch(BASE + '/china/', { headers: { 'User-Agent': UA } });
const html = await res.text();
const ch = cheerio.load(html);

console.log('=== 朋威 /china/ 各 section ===\n');
const pwSections = [];

ch('.row.expand-graphics').each((_, container) => {
  const section = sanitize(ch(container).parent().find('.header-title').first().text());
  const trips = [];
  ch(container).find('.item-box a[href*="/products/"]').each((i, link) => {
    const title = sanitize(ch(link).find('h3').text());
    const href = ch(link).attr('href') || '';
    const m = href.match(/mold-new\/([A-Z0-9]+)/i);
    const code = m ? m[1].split('?')[0] : '?';
    trips.push({ order: i + 1, code, title: title.substring(0, 50) });
  });
  pwSections.push({ section, trips });
  console.log(`${section}: ${trips.length} 筆`);
  trips.forEach(t => console.log(`  ${t.order}. ${t.code} | ${t.title}`));
  console.log();
});

// ===== 我們的 DB: 港澳大陸所有 destinations =====
console.log('\n=== 我們的 DB: 港澳大陸所有 destinations ===\n');

const { data: allDests } = await sb.from('destinations')
  .select('id, title, sub_region, source_url, region_id')
  .eq('is_active', true);

const { data: allRegions } = await sb.from('regions').select('id, title');
const chinaRegion = allRegions.find(r => r.title === '港澳大陸');

const chinaDests = allDests.filter(d => d.region_id === chinaRegion?.id);
console.log(`港澳大陸 region ID: ${chinaRegion?.id}`);
console.log(`destinations: ${chinaDests.length} 個\n`);

for (const d of chinaDests.sort((a, b) => (a.sub_region || '').localeCompare(b.sub_region || ''))) {
  const { data: trips } = await sb.from('trips')
    .select('id, title, trip_banner, is_active, display_order')
    .eq('destination_id', d.id)
    .order('display_order');
  
  const active = trips.filter(t => t.is_active);
  console.log(`${d.title} (sub: ${d.sub_region || '無'}): ${active.length} active`);
  for (const t of active) {
    const code = t.trip_banner?.code_label || '?';
    console.log(`  #${t.display_order} ${code} | ${t.title.substring(0, 50)}`);
  }
  console.log();
}

// ===== 比對: 朋威 section vs 我們的 destination =====
console.log('\n=== 比對 ===\n');

// 朋威 section → 我們的 sub_region mapping
const sectionMap = {
  '東北地區': '東北',
  '華東地區': '華東',
  '華中地區': '華中',
  '華南地區': '華南',
  '西南地區': '西南',
  '西北地區': '西北',
};

for (const pw of pwSections) {
  const subRegion = sectionMap[pw.section] || pw.section;
  const matchingDests = chinaDests.filter(d => d.sub_region === subRegion);
  
  // 收集這些 destinations 的所有 active codes
  const dbCodes = new Set();
  const dbTrips = [];
  for (const d of matchingDests) {
    const { data: trips } = await sb.from('trips')
      .select('id, title, trip_banner, is_active')
      .eq('destination_id', d.id)
      .eq('is_active', true);
    for (const t of trips) {
      const code = t.trip_banner?.code_label;
      if (code) dbCodes.add(code);
      dbTrips.push(t);
    }
  }

  const pwCodes = new Set(pw.trips.map(t => t.code));
  
  // 朋威有但我們沒有
  const missing = [...pwCodes].filter(c => !dbCodes.has(c));
  // 我們有但朋威沒有
  const extra = [...dbCodes].filter(c => !pwCodes.has(c));
  
  if (missing.length === 0 && extra.length === 0) {
    console.log(`✅ ${pw.section} (${subRegion}): 朋威=${pwCodes.size} 我們=${dbCodes.size}`);
  } else {
    console.log(`❌ ${pw.section} (${subRegion}): 朋威=${pwCodes.size} 我們=${dbCodes.size}`);
    if (missing.length > 0) {
      console.log(`   朋威有但我們沒有 (${missing.length}):`);
      for (const code of missing) {
        const pwTrip = pw.trips.find(t => t.code === code);
        // 看這個 code 是否在其他 destination
        const { data: elsewhere } = await sb.from('trips')
          .select('id, destination_id, is_active')
          .eq('is_active', true)
          .contains('trip_banner', { code_label: code });
        const otherDest = elsewhere?.[0] ? allDests.find(d => d.id === elsewhere[0].destination_id) : null;
        console.log(`     ${code} | ${pwTrip?.title || '?'} ${otherDest ? `→ 在「${otherDest.title}」` : '→ 不存在'}`);
      }
    }
    if (extra.length > 0) {
      console.log(`   我們有但朋威沒有 (${extra.length}):`);
      for (const code of extra) {
        const t = dbTrips.find(t => t.trip_banner?.code_label === code);
        console.log(`     ${code} | ${t?.title?.substring(0, 50) || '?'}`);
      }
    }
  }
  console.log();
}
