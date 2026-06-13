import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const getEnv = (k) => { const m = env.match(new RegExp(`^${k}=(.+)$`, 'm')); return m ? m[1].trim() : null; };
const sb = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));

// 港澳大陸 region ID
const REGION_ID = '101d01ad-832d-405a-9625-48a08b44349c';

// 取所有港澳大陸的行程
const { data: dests } = await sb.from('destinations')
  .select('id, title, sub_region')
  .eq('region_id', REGION_ID)
  .eq('is_active', true);

const { data: allTrips } = await sb.from('trips')
  .select('id, title, trip_banner, destination_id')
  .eq('is_active', true)
  .in('destination_id', dests.map(d => d.id));

console.log(`港澳大陸: ${dests.length} destinations, ${allTrips.length} trips\n`);

// 分類規則：根據行程標題和 code 判斷 sub_area
function categorize(trip) {
  const title = trip.title || '';
  const code = trip.trip_banner?.code_label || '';
  
  // 高雄出發 — 最優先
  if (title.includes('高雄出發') || code.includes('KHH')) return '高雄出發';
  
  // 張家界
  if (title.includes('張家界') && !title.includes('九寨') && !title.includes('重慶')) return '張家界';
  
  // 九寨溝
  if (title.includes('九寨溝') || title.includes('九寨黃龍')) return '九寨溝';
  
  // 張家界+九寨溝 (兩個都有)
  if (title.includes('張家界') && title.includes('九寨')) return '張家界+九寨溝';
  
  // 重慶
  if (title.includes('重慶') || code.startsWith('CKG')) return '重慶';
  if (title.includes('三峽') && title.includes('重慶')) return '重慶';
  
  // 貴州
  if (title.includes('貴州') || title.includes('黔') || code.startsWith('KWE')) return '貴州';
  
  // 桂林
  if (title.includes('桂林') || code.startsWith('KWL')) return '桂林';
  
  // 甘南
  if (title.includes('甘南') || title.includes('洛克之路') || code.startsWith('GSR')) return '甘南';
  
  // 北疆
  if (title.includes('北疆') || title.includes('新疆') || code.startsWith('URC')) return '北疆';
  
  // 黃山
  if (title.includes('黃山') || code.startsWith('TXN')) return '黃山';
  
  // 金廈
  if (title.includes('金廈') || title.includes('廈門') || title.includes('鷺島') || code.startsWith('XMN')) return '金廈';
  
  // 武夷山
  if (title.includes('武夷山')) return '武夷山';
  
  // 江南
  if (title.includes('江南') || title.includes('蘇杭') || code.startsWith('PVG')) return '江南';
  
  // 洛陽 / 河南
  if (title.includes('洛陽') || title.includes('少林') || title.includes('龍門') || code.startsWith('CGO')) return '洛陽';
  
  // 哈爾濱 / 東北
  if (title.includes('哈爾濱') || title.includes('雪鄉') || code.startsWith('SHE')) return '哈爾濱';
  
  // 三峽 / 長江遊輪
  if (title.includes('三峽') || title.includes('長江') || code.startsWith('YIH') || code.startsWith('YTG')) return '三峽';
  
  // 雲南
  if (title.includes('雲南') || title.includes('納西') || code.startsWith('LST')) return '雲南';
  
  // 青島 / 山東
  if (title.includes('青島') || code.startsWith('TAO')) return '青島';
  
  // 台中出發
  if (title.includes('台中出發')) return '台中出發';
  
  // fallback: 用 destination sub_region
  const dest = dests.find(d => d.id === trip.destination_id);
  return dest?.sub_region || '其他';
}

// 分類並更新
const categories = new Map();
const updates = [];

for (const trip of allTrips) {
  const area = categorize(trip);
  const list = categories.get(area) || [];
  list.push(trip);
  categories.set(area, list);
  updates.push({ id: trip.id, area });
}

// 顯示分類結果
console.log('=== 分類結果 ===\n');
for (const [area, trips] of [...categories.entries()].sort()) {
  console.log(`${area}: ${trips.length} 筆`);
  for (const t of trips) {
    const code = t.trip_banner?.code_label || '?';
    console.log(`  ${code} | ${t.title.substring(0, 50)}`);
  }
  console.log();
}

// 執行更新
console.log('\n=== 更新 DB ===\n');
let updated = 0;
for (const u of updates) {
  const trip = allTrips.find(t => t.id === u.id);
  const banner = { ...(trip.trip_banner || {}), sub_area: u.area };
  const { error } = await sb.from('trips')
    .update({ trip_banner: banner })
    .eq('id', u.id);
  if (error) console.log(`❌ ${u.id}: ${error.message}`);
  else updated++;
}
console.log(`更新: ${updated}/${updates.length}`);
