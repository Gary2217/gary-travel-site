/**
 * 修正 sub_area tabs 資料（第二批）
 * 用法: node scripts/fix-sub-area-tabs-2.mjs
 *
 * 修改項目：
 * 1. 洛陽：移 6 筆行程到張家界/九寨溝 destination
 * 2. 洛陽：洛陽行程 sub_area 改為「洛陽」
 * 3. 自由行>大阪：停用郵輪行程
 * 4. 不丹：停用重複行程
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = readFileSync('.env.local', 'utf8');
const getEnv = (k) => {
  const m = env.match(new RegExp(`^${k}=(.+)$`, 'm'));
  return m ? m[1].trim() : null;
};

const sb = createClient(
  getEnv('NEXT_PUBLIC_SUPABASE_URL'),
  getEnv('SUPABASE_SERVICE_ROLE_KEY')
);

const ZHANGJIAJIE_DEST_ID = 'ce46019d-9435-4e52-99f7-90ae53d093bb';

// ── 1. 洛陽 → 張家界/九寨溝（移動 destination_id）──────────
const moveToZhangjiajie = [
  { id: '36d74fe3-3f82-4949-a7b9-089c414f8e5e', title: '台中出發│張家界' },
  { id: '5d2f00aa-b9e0-4559-b093-f10857c0e4cb', title: '高雄出發│張家界' },
  { id: '43b9c0ec-4fc8-45d7-a16d-fef33de8dd3d', title: '廣州進出-張家界' },
  { id: 'dee5b1a1-5e75-4373-b9b3-fa11d698d147', title: '湘鄂山水藏奇境' },
  { id: '01cf4e2d-4a08-48f6-ab32-36d6e4ea8068', title: '船過三峽.重慶' },
  { id: '317f7b43-b850-4d90-8e74-53ff6228e999', title: '長江三號遊輪' },
];

// ── 2. 洛陽行程：華中地區 → 洛陽 ──────────────────────────
const luoyangSubAreaUpdate = {
  id: '070f941e-b6db-4c08-be34-fe799b0e60a5',
  newSubArea: '洛陽',
};

// ── 3. 自由行>大阪：停用郵輪行程 ──────────────────────────
const osakaDeactivate = 'afc3bb57-15b8-46c0-8c6c-ba00b1f19561';

// ── 4. 不丹：停用重複行程 ────────────────────────────────
const bhutanDeactivate = '73e9f89b-d407-4028-a6f3-fe1b77550b39';

async function main() {
  let pass = 0;
  let fail = 0;

  // ── 1. 移動洛陽行程到張家界/九寨溝 ──
  console.log('=== 移動洛陽行程到張家界/九寨溝 ===');
  for (const trip of moveToZhangjiajie) {
    const { error } = await sb
      .from('trips')
      .update({ destination_id: ZHANGJIAJIE_DEST_ID })
      .eq('id', trip.id);

    if (error) {
      console.log(`FAIL: ${trip.title} - ${error.message}`);
      fail++;
    } else {
      console.log(`PASS: ${trip.title} -> 張家界/九寨溝`);
      pass++;
    }
  }

  // ── 2. 洛陽行程 sub_area 改為「洛陽」──
  console.log('\n=== 修改洛陽行程 sub_area ===');
  const { data: lyTrip } = await sb.from('trips')
    .select('trip_banner')
    .eq('id', luoyangSubAreaUpdate.id)
    .single();

  const mergedBanner = { ...(lyTrip?.trip_banner || {}), sub_area: '洛陽' };
  const { error: lyErr } = await sb.from('trips')
    .update({ trip_banner: mergedBanner })
    .eq('id', luoyangSubAreaUpdate.id);

  if (lyErr) {
    console.log(`FAIL: 洛陽 sub_area - ${lyErr.message}`);
    fail++;
  } else {
    console.log('PASS: 洛陽行程 sub_area 華中地區 -> 洛陽');
    pass++;
  }

  // ── 3. 停用自由行>大阪郵輪行程 ──
  console.log('\n=== 停用自由行>大阪郵輪行程 ===');
  const { error: osErr } = await sb.from('trips')
    .update({ is_active: false })
    .eq('id', osakaDeactivate);

  if (osErr) {
    console.log(`FAIL: 大阪郵輪 - ${osErr.message}`);
    fail++;
  } else {
    console.log('PASS: 大阪郵輪行程已停用');
    pass++;
  }

  // ── 4. 停用不丹重複行程 ──
  console.log('\n=== 停用不丹重複行程 ===');
  const { error: btErr } = await sb.from('trips')
    .update({ is_active: false })
    .eq('id', bhutanDeactivate);

  if (btErr) {
    console.log(`FAIL: 不丹重複 - ${btErr.message}`);
    fail++;
  } else {
    console.log('PASS: 不丹重複行程已停用');
    pass++;
  }

  console.log(`\n=== 結果: ${pass} PASS, ${fail} FAIL ===`);
  if (fail > 0) process.exit(1);
}

main().catch((err) => {
  console.error('腳本失敗:', err);
  process.exit(1);
});
