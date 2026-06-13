import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const getEnv = (k) => { const m = env.match(new RegExp(`^${k}=(.+)$`, 'm')); return m ? m[1].trim() : null; };
const sb = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));

const REGION_ID = '101d01ad-832d-405a-9625-48a08b44349c';
const { data: dests } = await sb.from('destinations').select('id').eq('region_id', REGION_ID).eq('is_active', true);
const { data: trips } = await sb.from('trips')
  .select('id, title, trip_banner')
  .eq('is_active', true)
  .in('destination_id', dests.map(d => d.id));

let changed = 0;

for (const t of trips) {
  const title = t.title || '';
  const oldArea = t.trip_banner?.sub_area || '';
  let newArea = oldArea;

  // 1. 張家界+九寨溝：標題同時包含兩者
  if ((title.includes('張家界') && title.includes('九寨')) ||
      (title.includes('雙城奇景') && title.includes('黃龍') && title.includes('張家界'))) {
    newArea = '張家界+九寨溝';
  }

  // 2. 三峽 → 長江三峽
  if (oldArea === '三峽') {
    newArea = '長江三峽';
  }

  if (newArea !== oldArea) {
    const banner = { ...t.trip_banner, sub_area: newArea };
    const { error } = await sb.from('trips').update({ trip_banner: banner }).eq('id', t.id);
    if (error) console.log(`❌ ${t.trip_banner?.code_label}: ${error.message}`);
    else {
      console.log(`✅ ${t.trip_banner?.code_label} | ${oldArea} → ${newArea} | ${title.substring(0, 45)}`);
      changed++;
    }
  }
}

console.log(`\n更新: ${changed} 筆`);

// 驗證
const { data: updated } = await sb.from('trips')
  .select('trip_banner')
  .eq('is_active', true)
  .in('destination_id', dests.map(d => d.id));
const cats = {};
for (const t of updated) { const a = t.trip_banner?.sub_area || '?'; cats[a] = (cats[a] || 0) + 1; }
console.log('\n=== 最終分類 ===');
for (const [k, v] of Object.entries(cats).sort((a, b) => b[1] - a[1])) console.log(`${v}\t${k}`);
