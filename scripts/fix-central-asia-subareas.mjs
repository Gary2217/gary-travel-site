import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = readFileSync('.env.local', 'utf8');
const getEnv = (k) => { const m = env.match(new RegExp(`^${k}=(.+)$`, 'm')); return m ? m[1].trim() : null; };
const sb = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));

const DEST_ZHONGYA = 'f1b28d9d-ecd7-4c68-97cb-cef84b417ecc'; // sub_region=中亞，保留
const DEST_UZB     = '5fcacf86-98e4-4b50-bfa0-12f9766ed1e8'; // sub_region=""，0 trips，停用
const DEST_UZB_KAZ = '92660787-3f31-4e06-8526-6075a881207e'; // sub_region=""，1 trip，停用

function classifySubArea(title) {
  if (/五國/.test(title)) return '中亞五國';
  if (/三國|雙國/.test(title)) return '中亞三國';
  return '烏茲別克';
}

// 1. 取得 中亞 destination 下所有行程（含 trip_banner JSONB）
const { data: trips, error: tripsErr } = await sb.from('trips')
  .select('id, title, trip_banner')
  .eq('destination_id', DEST_ZHONGYA);

if (tripsErr) { console.error('取行程失敗:', tripsErr.message); process.exit(1); }

console.log(`\n=== 中亞 destination 下 ${trips.length} 筆行程，設定 sub_area ===`);

for (const trip of trips) {
  const subArea = classifySubArea(trip.title);
  console.log(`[${subArea}] ${trip.title.slice(0, 60)}`);

  const currentBanner = (trip.trip_banner && typeof trip.trip_banner === 'object') ? trip.trip_banner : {};
  const updatedBanner = { ...currentBanner, sub_area: subArea };

  const { error } = await sb.from('trips').update({ trip_banner: updatedBanner }).eq('id', trip.id);
  if (error) console.error(`  ✗ 更新失敗:`, error.message);
  else console.log(`  ✓ trip_banner.sub_area=${subArea}`);
}

// 2. 搬移 92660787 的行程到 中亞 destination，設 sub_area=中亞五國
const { data: movingTrips, error: moveErr } = await sb.from('trips')
  .select('id, title, trip_banner')
  .eq('destination_id', DEST_UZB_KAZ);

if (moveErr) { console.error('取搬移行程失敗:', moveErr.message); process.exit(1); }

console.log(`\n=== 搬移 烏茲別克哈薩克 的 ${movingTrips.length} 筆行程到 中亞 destination ===`);
for (const trip of movingTrips) {
  console.log(`搬移: ${trip.title.slice(0, 60)}`);
  const subArea = classifySubArea(trip.title);
  const currentBanner = (trip.trip_banner && typeof trip.trip_banner === 'object') ? trip.trip_banner : {};
  const updatedBanner = { ...currentBanner, sub_area: subArea };

  const { error } = await sb.from('trips')
    .update({ destination_id: DEST_ZHONGYA, trip_banner: updatedBanner })
    .eq('id', trip.id);
  if (error) console.error(`  ✗ 搬移失敗:`, error.message);
  else console.log(`  ✓ 搬移完成，sub_area=${subArea}`);
}

// 3. 停用多餘 destination
console.log('\n=== 停用多餘 destination ===');
for (const destId of [DEST_UZB, DEST_UZB_KAZ]) {
  const { error } = await sb.from('destinations').update({ is_active: false }).eq('id', destId);
  if (error) console.error(`  ✗ 停用 ${destId} 失敗:`, error.message);
  else console.log(`  ✓ 已停用 ${destId}`);
}

console.log('\n完成！');
