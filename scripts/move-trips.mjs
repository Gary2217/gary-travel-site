import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const getEnv = (k) => { const m = env.match(new RegExp(`^${k}=(.+)$`, 'm')); return m ? m[1].trim() : null; };
const sb = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));

// ===== 1. 查所有相關 destination IDs =====
const { data: dests } = await sb.from('destinations')
  .select('id, title, sub_region, region_id')
  .eq('is_active', true);

const findDest = (title) => dests.find(d => d.title === title);
const KANSAI = findDest('關西');
const KYUSHU = findDest('九州');
const CHUBU = findDest('中部');
const LUOYANG = findDest('洛陽');
const ZJJ = findDest('張家界 / 九寨溝');
const DUBAI = findDest('杜拜 / 阿布達比');

console.log('Destination IDs:');
console.log('  關西:', KANSAI?.id);
console.log('  九州:', KYUSHU?.id);
console.log('  中部:', CHUBU?.id);
console.log('  洛陽:', LUOYANG?.id);
console.log('  張家界/九寨溝:', ZJJ?.id);
console.log('  杜拜/阿布達比:', DUBAI?.id);

// 找埃及 destination
const EGYPT = dests.find(d => d.title === '埃及');
console.log('  埃及:', EGYPT?.id);

// ===== 2. 查所有需要移動的行程 =====
const { data: allTrips } = await sb.from('trips')
  .select('id, title, destination_id, trip_banner, is_active')
  .eq('is_active', true);

function findTrip(code, destId) {
  return allTrips.find(t => t.trip_banner?.code_label === code && t.destination_id === destId);
}

function findTripByCode(code) {
  return allTrips.filter(t => t.trip_banner?.code_label === code);
}

// ===== 3. 移動計畫 =====
const moves = [];

// 3a. KIX5DTB: 中部 → 關西
const kix5dtb = findTrip('KIX5DTB', CHUBU?.id);
if (kix5dtb) {
  moves.push({ trip: kix5dtb, from: CHUBU, to: KANSAI, reason: '朋威放在關西 tab' });
} else {
  console.log('⚠️ KIX5DTB 不在中部，檢查位置:');
  findTripByCode('KIX5DTB').forEach(t => {
    const d = dests.find(d => d.id === t.destination_id);
    console.log(`  → ${d?.title} (${t.is_active ? 'active' : 'inactive'})`);
  });
}

// 3b. PJP5KJ5D: 關西 → 九州
const pjp = findTrip('PJP5KJ5D', KANSAI?.id);
if (pjp) {
  moves.push({ trip: pjp, from: KANSAI, to: KYUSHU, reason: '朋威放在九州 tab' });
}

// 3c. KIX5DST: 關西 → 九州
const kixdst = findTrip('KIX5DST', KANSAI?.id);
if (kixdst) {
  moves.push({ trip: kixdst, from: KANSAI, to: KYUSHU, reason: '朋威放在九州 tab' });
}

// 3d. 華中 10 筆: 張家界/九寨溝 → 洛陽
const huazhongCodes = ['DYG5MF8D', 'DYGTPE8D', 'DYGRMQ8D', 'DYGKHH8D', 'DYG5EE8D',
  'YIH5YZ8D', 'DYG5HA8D', 'DYG5HB8D', 'YIH4GT8D', 'YTG5ED8D'];
for (const code of huazhongCodes) {
  const trip = findTrip(code, ZJJ?.id);
  if (trip) {
    moves.push({ trip, from: ZJJ, to: LUOYANG, reason: '朋威放在華中 tab' });
  } else {
    console.log(`⚠️ ${code} 不在張家界/九寨溝`);
  }
}

// 3e. CAI5AA10D: 埃及 → 杜拜/阿布達比
const cai = allTrips.find(t => t.trip_banner?.code_label === 'CAI5AA10D');
if (cai) {
  const fromDest = dests.find(d => d.id === cai.destination_id);
  if (fromDest?.id !== DUBAI?.id) {
    moves.push({ trip: cai, from: fromDest, to: DUBAI, reason: '朋威放在中東 tab' });
  }
}

// ===== 4. 執行移動 =====
console.log(`\n=== 移動計畫: ${moves.length} 筆 ===\n`);
for (const m of moves) {
  console.log(`  ${m.trip.trip_banner?.code_label} | ${m.trip.title.substring(0, 45)}`);
  console.log(`    ${m.from?.title} → ${m.to?.title} (${m.reason})`);
}

console.log('\n執行中...\n');

for (const m of moves) {
  const { error } = await sb.from('trips')
    .update({ destination_id: m.to.id })
    .eq('id', m.trip.id);
  
  if (error) {
    console.log(`❌ ${m.trip.trip_banner?.code_label}: ${error.message}`);
  } else {
    console.log(`✅ ${m.trip.trip_banner?.code_label}: ${m.from?.title} → ${m.to?.title}`);
  }
}

// ===== 5. 驗證 =====
console.log('\n=== 驗證 ===');
const checkDests = [KANSAI, KYUSHU, CHUBU, LUOYANG, ZJJ, DUBAI];
for (const d of checkDests) {
  if (!d) continue;
  const { data: trips } = await sb.from('trips')
    .select('id, trip_banner')
    .eq('destination_id', d.id)
    .eq('is_active', true);
  console.log(`${d.title}: ${trips.length} active trips`);
}
