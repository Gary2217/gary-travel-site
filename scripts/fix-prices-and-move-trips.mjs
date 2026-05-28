/**
 * 修正價格 + 搬移行程至杜拜目的地
 * 用法: node scripts/fix-prices-and-move-trips.mjs
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = readFileSync('.env.local', 'utf8');
const getEnv = (k) => {
  const m = env.match(new RegExp(`^${k}=(.+)$`, 'm'));
  return m ? m[1].trim() : null;
};

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY');
}
const sb = createClient(supabaseUrl, serviceRoleKey);

const DUBAI_DEST = '2b1e1dac-4b61-4113-8a64-8cfb3861dc03';

// ── 1. 修正價格 ──────────────────────────────────
const priceFixes = [
  {
    tripId: '13bdcb88-e45a-4614-a139-0d0543cdf442',
    label: '黑金三國8日 (DXB4ZA8D)',
    oldPrice: 49900,
    newPrice: 39900,
    newPriceRange: 'NT$39,900起',
  },
  {
    tripId: '0f448466-0962-43b5-9443-2cecf744a5d8',
    label: '烏茲別克8日 (TAS4AC8D)',
    oldPrice: 82000,
    newPrice: 79000,
    newPriceRange: 'NT$79,000起',
  },
];

// ── 2. 搬移行程至杜拜 ───────────────────────────
const moveTrips = [
  { tripId: '542a0e30-c63c-4277-9c4f-da20a59c613b', label: '土耳其9日 (IST5AA9D)' },
  { tripId: '685a3d0f-9c5b-4d98-9056-1f24824703a5', label: '埃及10日 (CAI5AA10D)' },
  { tripId: 'a437ee1e-c591-4d54-983a-24ded6e20c9b', label: '伊朗10日 (IKA5AA10D)' },
];

async function fixPrices() {
  console.log('\n── 修正價格 ──');
  for (const fix of priceFixes) {
    // 1) 更新 trips 表的 price_range + trip_banner
    const { data: trip, error: fetchErr } = await sb
      .from('trips')
      .select('id, title, price_range, trip_banner')
      .eq('id', fix.tripId)
      .single();

    if (fetchErr || !trip) {
      console.error(`  ❌ 找不到 ${fix.label}: ${fetchErr?.message}`);
      continue;
    }

    console.log(`  📦 ${fix.label}`);
    console.log(`     現有價格: ${trip.price_range}`);

    const updatedBanner = { ...trip.trip_banner };
    if (updatedBanner.price_label) updatedBanner.price_label = fix.newPriceRange;
    if (updatedBanner.price_detail) {
      updatedBanner.price_detail = updatedBanner.price_detail
        .replace(new RegExp(fix.oldPrice.toLocaleString(), 'g'), fix.newPrice.toLocaleString());
    }

    const { error: updateErr } = await sb
      .from('trips')
      .update({ price_range: fix.newPriceRange, trip_banner: updatedBanner })
      .eq('id', fix.tripId);

    if (updateErr) {
      console.error(`  ❌ 更新 trip 失敗: ${updateErr.message}`);
      continue;
    }
    console.log(`     ✅ price_range → ${fix.newPriceRange}`);

    // 2) 更新 trip_departure_dates 的價格
    const { data: deps, error: depErr } = await sb
      .from('trip_departure_dates')
      .select('id, price')
      .eq('trip_id', fix.tripId)
      .eq('price', fix.oldPrice);

    if (depErr) {
      console.error(`  ❌ 查詢出發日期失敗: ${depErr.message}`);
      continue;
    }

    if (deps && deps.length > 0) {
      const { error: depUpdateErr } = await sb
        .from('trip_departure_dates')
        .update({ price: fix.newPrice })
        .eq('trip_id', fix.tripId)
        .eq('price', fix.oldPrice);

      if (depUpdateErr) {
        console.error(`  ❌ 更新出發日期價格失敗: ${depUpdateErr.message}`);
      } else {
        console.log(`     ✅ ${deps.length} 筆出發日期價格 → NT$${fix.newPrice.toLocaleString()}`);
      }
    } else {
      console.log(`     ℹ️ 無需更新出發日期價格（無匹配的舊價格）`);
    }
  }
}

async function moveTripsToDestination() {
  console.log('\n── 搬移行程至杜拜目的地 ──');
  for (const item of moveTrips) {
    const { data: trip, error: fetchErr } = await sb
      .from('trips')
      .select('id, title, destination_id')
      .eq('id', item.tripId)
      .single();

    if (fetchErr || !trip) {
      console.error(`  ❌ 找不到 ${item.label}: ${fetchErr?.message}`);
      continue;
    }

    console.log(`  📦 ${item.label}`);
    console.log(`     現有 destination_id: ${trip.destination_id}`);

    if (trip.destination_id === DUBAI_DEST) {
      console.log(`     ℹ️ 已在杜拜目的地，跳過`);
      continue;
    }

    const { error: updateErr } = await sb
      .from('trips')
      .update({ destination_id: DUBAI_DEST })
      .eq('id', item.tripId);

    if (updateErr) {
      console.error(`  ❌ 搬移失敗: ${updateErr.message}`);
    } else {
      console.log(`     ✅ 已搬移至杜拜 (${DUBAI_DEST})`);
    }
  }
}

async function verify() {
  console.log('\n── 驗證結果 ──');

  // 驗證杜拜行程數
  const { data: dubaiTrips, error: e1 } = await sb
    .from('trips')
    .select('id, title, price_range, destination_id')
    .eq('destination_id', DUBAI_DEST)
    .eq('is_active', true)
    .order('display_order');

  if (e1) { console.error(`  ❌ 查詢失敗: ${e1.message}`); return; }
  console.log(`  杜拜目的地行程數: ${dubaiTrips.length}`);
  dubaiTrips.forEach((t, i) => {
    console.log(`    ${i + 1}. ${t.title} | ${t.price_range}`);
  });

  // 驗證價格修正
  for (const fix of priceFixes) {
    const { data } = await sb.from('trips').select('price_range').eq('id', fix.tripId).single();
    const ok = data?.price_range === fix.newPriceRange;
    console.log(`  ${ok ? '✅' : '❌'} ${fix.label}: ${data?.price_range}`);
  }
}

async function main() {
  console.log('🚀 開始修正...');
  await fixPrices();
  await moveTripsToDestination();
  await verify();
  console.log('\n✅ 全部完成！');
}

main().catch((err) => {
  console.error('\n❌ 腳本失敗:', err);
  process.exit(1);
});
