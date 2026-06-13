import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const getEnv = (k) => { const m = env.match(new RegExp(`^${k}=(.+)$`, 'm')); return m ? m[1].trim() : null; };
const sb = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));
const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');

const { data: trips } = await sb.from('trips')
  .select('id, title, cover_image_url, trip_banner, destination_id, is_active')
  .eq('is_active', true)
  .order('destination_id');

const { data: dests } = await sb.from('destinations')
  .select('id, title, region_id');
const { data: regions } = await sb.from('regions')
  .select('id, title');

const destMap = new Map(dests.map(d => [d.id, d]));
const regionMap = new Map(regions.map(r => [r.id, r]));

let missing = 0;
let invalid = 0;
let ok = 0;

const problems = [];

for (const t of trips) {
  const url = t.cover_image_url || '';
  const code = t.trip_banner?.code_label || '?';
  const dest = destMap.get(t.destination_id);
  const region = dest ? regionMap.get(dest.region_id) : null;
  const label = `${region?.title || '?'} > ${dest?.title || '?'}`;

  if (!url || url === '') {
    missing++;
    problems.push({ id: t.id, code, title: t.title, label, issue: '無圖片 URL', url });
  } else if (url.includes('pwgotravel.com') && !url.includes('/products/')) {
    // URL 是朋威首頁而不是實際圖片
    invalid++;
    problems.push({ id: t.id, code, title: t.title, label, issue: '無效 URL (朋威首頁)', url });
  } else if (url === 'https://www.pwgotravel.com.tw') {
    invalid++;
    problems.push({ id: t.id, code, title: t.title, label, issue: '無效 URL (朋威首頁)', url });
  } else if (!url.includes(supabaseUrl) && !url.includes('supabase')) {
    // 外部 URL，未上傳到 Supabase Storage
    invalid++;
    problems.push({ id: t.id, code, title: t.title, label, issue: '外部 URL (未上傳)', url: url.substring(0, 80) });
  } else {
    ok++;
  }
}

console.log(`=== 封面圖片狀態 ===`);
console.log(`正常 (Supabase): ${ok}`);
console.log(`有問題: ${missing + invalid} (無 URL: ${missing}, 無效: ${invalid})\n`);

// 按 destination 分組
const byDest = new Map();
for (const p of problems) {
  const list = byDest.get(p.label) || [];
  list.push(p);
  byDest.set(p.label, list);
}

for (const [label, items] of [...byDest.entries()].sort()) {
  console.log(`${label}: ${items.length} 筆缺圖`);
  for (const p of items) {
    console.log(`  ${p.code} | ${p.title.substring(0, 45)} | ${p.issue}`);
  }
  console.log();
}
