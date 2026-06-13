import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const getEnv = (k) => { const m = env.match(new RegExp(`^${k}=(.+)$`, 'm')); return m ? m[1].trim() : null; };
const sb = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));
const BASE_URL = 'https://www.pwgotravel.com.tw';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';

function sanitize(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

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
];

// 朋威: 按 section 計數
const pwSections = new Map(); // "region|section" → Set of codes
for (const region of REGIONS) {
  try {
    const res = await fetch(BASE_URL + region.url, { headers: { 'User-Agent': UA } });
    const html = await res.text();
    const ch = cheerio.load(html);
    ch('.row.expand-graphics').each((_, container) => {
      const section = sanitize(ch(container).parent().find('.header-title').first().text());
      const key = `${region.key}|${section}`;
      if (!pwSections.has(key)) pwSections.set(key, new Set());
      ch(container).find('.item-box a[href*="/products/"]').each((_, link) => {
        const href = ch(link).attr('href') || '';
        const m = href.match(/mold-new\/([A-Z0-9]+)/i);
        if (m) pwSections.get(key).add(m[1].split('?')[0]);
      });
    });
  } catch {}
  await new Promise(r => setTimeout(r, 200));
}

// DB: 按 destination 計數
const { data: allDests } = await sb.from('destinations')
  .select('id, title, sub_region, source_url, regions!inner(title, category_label)')
  .eq('is_active', true);

const { data: allTrips } = await sb.from('trips')
  .select('id, destination_id, trip_banner')
  .eq('is_active', true);

const tripsByDest = new Map();
for (const t of allTrips) {
  const list = tripsByDest.get(t.destination_id) || [];
  list.push(t);
  tripsByDest.set(t.destination_id, list);
}

// 比對
console.log('=== 全站行程數量比對 ===\n');
let totalPw = 0, totalDb = 0, mismatches = 0;

for (const [key, codes] of [...pwSections.entries()].sort()) {
  const [regionKey, section] = key.split('|');
  const regionUrl = REGIONS.find(r => r.key === regionKey)?.url || '';
  
  // 找對應的 destination
  const dest = allDests.find(d => {
    if (!d.source_url || !d.source_url.includes(regionUrl.replace(/\/$/, ''))) return false;
    const subMatch = d.sub_region && sanitize(d.sub_region) === sanitize(section);
    const titleMatch = sanitize(d.title) === sanitize(section);
    const fuzzy = sanitize(d.title).includes(sanitize(section).substring(0, 3)) || sanitize(section).includes(sanitize(d.title).substring(0, 3));
    return subMatch || titleMatch || fuzzy;
  });

  const dbCount = dest ? (tripsByDest.get(dest.id) || []).length : 0;
  const pwCount = codes.size;
  totalPw += pwCount;

  if (dest) {
    totalDb += dbCount;
    const match = dbCount >= pwCount;
    if (!match) {
      mismatches++;
      console.log(`❌ ${section} (${regionKey}): 朋威=${pwCount} 我們=${dbCount} (少${pwCount - dbCount})`);
      // 列出缺少的 codes
      const dbCodes = new Set((tripsByDest.get(dest.id) || []).map(t => t.trip_banner?.code_label).filter(Boolean));
      for (const code of codes) {
        if (!dbCodes.has(code)) console.log(`   缺: ${code}`);
      }
    }
  } else {
    console.log(`⚠️ ${section} (${regionKey}): 朋威=${pwCount} 無對應 destination`);
  }
}

console.log(`\n=== 朋威: ${totalPw} | 我們: ${allTrips.length} | 不一致: ${mismatches} 個 ===`);
