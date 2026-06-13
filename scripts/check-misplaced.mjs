import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const getEnv = (k) => { const m = env.match(new RegExp(`^${k}=(.+)$`, 'm')); return m ? m[1].trim() : null; };
const sb = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));

// 查看這些 code 在哪個 destination
const codes = [
  // 九州缺的 2 筆
  'PJP5KJ5D', 'KIX5DST',
  // 洛陽/華中缺的 10 筆
  'DYG5MF8D', 'DYGTPE8D', 'DYGRMQ8D', 'DYGKHH8D', 'DYG5EE8D',
  'YIH5YZ8D', 'DYG5HA8D', 'DYG5HB8D', 'YIH4GT8D', 'YTG5ED8D',
  // 中東缺的 1 筆
  'CAI5AA10D',
  // 全域缺的 2 筆
  'CTUKHH8D', 'DAD5BE5D',
];

const { data: allTrips } = await sb.from('trips')
  .select('id, title, destination_id, trip_banner, is_active, display_order');

const { data: allDests } = await sb.from('destinations')
  .select('id, title, sub_region, region_id');

const { data: allRegions } = await sb.from('regions')
  .select('id, title');

for (const code of codes) {
  const matches = allTrips.filter(t => t.trip_banner?.code_label === code);
  if (matches.length === 0) {
    console.log(`❌ ${code}: 不存在於 DB`);
    continue;
  }
  for (const t of matches) {
    const dest = allDests.find(d => d.id === t.destination_id);
    const region = allRegions.find(r => r.id === dest?.region_id);
    console.log(`${t.is_active ? '✅' : '⛔'} ${code} → ${region?.title || '?'} > ${dest?.title || '?'} | ${t.title.substring(0, 50)} | active=${t.is_active}`);
  }
}

// 也看看華中的 destination ID 和行程
console.log('\n=== 華中相關 destinations ===');
const huazhong = allDests.filter(d => 
  d.sub_region?.includes('華中') || d.title?.includes('華中') || d.title?.includes('洛陽')
);
for (const d of huazhong) {
  const region = allRegions.find(r => r.id === d.region_id);
  const trips = allTrips.filter(t => t.destination_id === d.id);
  console.log(`${region?.title} > ${d.title} (${d.sub_region}): ${trips.filter(t=>t.is_active).length} active, ${trips.filter(t=>!t.is_active).length} inactive`);
  for (const t of trips) {
    console.log(`  ${t.is_active ? '✅' : '⛔'} ${t.trip_banner?.code_label || '?'} | ${t.title.substring(0, 50)} | order=${t.display_order}`);
  }
}

// 也看九州
console.log('\n=== 九州 destination ===');
const kyushu = allDests.filter(d => d.title?.includes('九州'));
for (const d of kyushu) {
  const region = allRegions.find(r => r.id === d.region_id);
  const trips = allTrips.filter(t => t.destination_id === d.id);
  console.log(`${region?.title} > ${d.title}: ${trips.filter(t=>t.is_active).length} active, ${trips.filter(t=>!t.is_active).length} inactive`);
  for (const t of trips) {
    console.log(`  ${t.is_active ? '✅' : '⛔'} ${t.trip_banner?.code_label || '?'} | ${t.title.substring(0, 50)} | order=${t.display_order}`);
  }
}

// 中東
console.log('\n=== 中東/杜拜 destination ===');
const mideast = allDests.filter(d => d.title?.includes('杜拜') || d.sub_region?.includes('中東'));
for (const d of mideast) {
  const region = allRegions.find(r => r.id === d.region_id);
  const trips = allTrips.filter(t => t.destination_id === d.id);
  console.log(`${region?.title} > ${d.title}: ${trips.filter(t=>t.is_active).length} active, ${trips.filter(t=>!t.is_active).length} inactive`);
  for (const t of trips) {
    console.log(`  ${t.is_active ? '✅' : '⛔'} ${t.trip_banner?.code_label || '?'} | ${t.title.substring(0, 50)} | order=${t.display_order}`);
  }
}

// 西南
console.log('\n=== 西南 destination ===');
const xinan = allDests.filter(d => d.sub_region?.includes('西南') || d.title?.includes('西南'));
for (const d of xinan) {
  const region = allRegions.find(r => r.id === d.region_id);
  const trips = allTrips.filter(t => t.destination_id === d.id);
  console.log(`${region?.title} > ${d.title}: ${trips.filter(t=>t.is_active).length} active, ${trips.filter(t=>!t.is_active).length} inactive`);
  for (const t of trips) {
    console.log(`  ${t.is_active ? '✅' : '⛔'} ${t.trip_banner?.code_label || '?'} | ${t.title.substring(0, 50)} | order=${t.display_order}`);
  }
}

// 越南
console.log('\n=== 越南 destination ===');
const vn = allDests.filter(d => d.title?.includes('越南'));
for (const d of vn) {
  const region = allRegions.find(r => r.id === d.region_id);
  const trips = allTrips.filter(t => t.destination_id === d.id);
  console.log(`${region?.title} > ${d.title}: ${trips.filter(t=>t.is_active).length} active, ${trips.filter(t=>!t.is_active).length} inactive`);
  for (const t of trips) {
    console.log(`  ${t.is_active ? '✅' : '⛔'} ${t.trip_banner?.code_label || '?'} | ${t.title.substring(0, 50)} | order=${t.display_order}`);
  }
}
