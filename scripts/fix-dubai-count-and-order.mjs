/**
 * 杜拜目的地：停用高雄出發行程 + 調整排序對齊朋威中東 tab
 * 用法: node scripts/fix-dubai-count-and-order.mjs
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = readFileSync('.env.local', 'utf8');
const getEnv = (k) => {
  const m = env.match(new RegExp(`^${k}=(.+)$`, 'm'));
  return m ? m[1].trim() : null;
};

const sb = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));

const DUBAI_DEST = '2b1e1dac-4b61-4113-8a64-8cfb3861dc03';

// ── 朋威中東 tab 順序（上→下、左→右） ──
// 1. 閃耀阿布達比、杜拜7日  AUH4AG7D
// 2. F1賽道狂熱 AUH5AD7D
// 3. 阿提哈德超值杜拜經典7日 AUH4AB7D
// 4. 6人成行自由行6日 AUH5AA6D
// 5. 黑金三國8日 DXB4ZA8D
// 6. 歐亞交響曲×榮耀土耳其9日 IST5AA9D
// 7. 漫步埃及10日 CAI5AA10D
// 8. 歐亞交響曲x榮耀土耳其之杜拜雙國11日 IST5AA11D
// 9. 滿漢波斯假期~伊朗10日 IKA5AA10D

const correctOrder = [
  { tripId: 'e2b84d5d-e2a4-4821-be55-e7dab4d6e01a', order: 1, label: '1. 閃耀阿布達比、杜拜7日' },
  { tripId: '7f4f2e55-8dd8-487d-b91c-03bd57955276', order: 2, label: '2. F1賽道狂熱7日' },
  { tripId: '20e3f08c-10a1-486d-8af1-8a847bc1b436', order: 3, label: '3. 阿提哈德超值杜拜經典7日' },
  { tripId: '3f5666df-3f63-456d-b6a3-c3a3acfca6ee', order: 4, label: '4. 6人成行自由行6日' },
  { tripId: '13bdcb88-e45a-4614-a139-0d0543cdf442', order: 5, label: '5. 黑金三國8日' },
  { tripId: '542a0e30-c63c-4277-9c4f-da20a59c613b', order: 6, label: '6. 歐亞交響曲×土耳其9日' },
  { tripId: '685a3d0f-9c5b-4d98-9056-1f24824703a5', order: 7, label: '7. 漫步埃及10日' },
  { tripId: '610c7f0c-5326-4c64-bb83-ce22dd141f1f', order: 8, label: '8. 歐亞交響曲杜拜雙國11日' },
  { tripId: 'a437ee1e-c591-4d54-983a-24ded6e20c9b', order: 9, label: '9. 滿漢波斯假期伊朗10日' },
];

// 要停用的高雄出發行程
const deactivateTrips = [
  { tripId: 'fc9af03d-0c15-4c9e-b5e2-f01d2c744242', label: '高雄出發 阿聯酋 DXB57KH7D' },
  { tripId: 'fe9e24d2-94f5-442d-b9e5-021a2ffcee8d', label: '高雄出發 阿提哈德 AUH57KH7D' },
];

async function main() {
  console.log('🚀 開始修正杜拜行程數量與排序...\n');

  // ── 1. 停用高雄出發行程 ──
  console.log('── 停用高雄出發行程 ──');
  for (const item of deactivateTrips) {
    const { error } = await sb.from('trips').update({ is_active: false }).eq('id', item.tripId);
    if (error) console.error(`  ❌ ${item.label}: ${error.message}`);
    else console.log(`  ✅ ${item.label} → is_active = false`);
  }

  // 找並停用 AUH34KH7D（用 code_label 找）
  const { data: auh34, error: findErr } = await sb
    .from('trips')
    .select('id, title, trip_banner')
    .eq('destination_id', DUBAI_DEST)
    .eq('is_active', true);

  if (!findErr && auh34) {
    const match = auh34.find(t =>
      t.trip_banner?.code_label === 'AUH34KH7D' ||
      t.title?.includes('AUH34KH7D')
    );
    if (match) {
      const { error } = await sb.from('trips').update({ is_active: false }).eq('id', match.id);
      if (error) console.error(`  ❌ AUH34KH7D: ${error.message}`);
      else console.log(`  ✅ AUH34KH7D (${match.id}) → is_active = false`);
    } else {
      console.log('  ℹ️ AUH34KH7D 未找到或已停用');
    }
  }

  // ── 2. 設定 display_order ──
  console.log('\n── 調整排序（對齊朋威中東 tab） ──');
  for (const item of correctOrder) {
    const { error } = await sb.from('trips').update({ display_order: item.order }).eq('id', item.tripId);
    if (error) console.error(`  ❌ ${item.label}: ${error.message}`);
    else console.log(`  ✅ ${item.label} → display_order = ${item.order}`);
  }

  // ── 3. 驗證 ──
  console.log('\n── 驗證結果 ──');
  const { data: finalTrips, error: verifyErr } = await sb
    .from('trips')
    .select('id, title, price_range, display_order')
    .eq('destination_id', DUBAI_DEST)
    .eq('is_active', true)
    .order('display_order');

  if (verifyErr) { console.error(`  ❌ ${verifyErr.message}`); return; }

  console.log(`  杜拜中東行程數: ${finalTrips.length}`);
  finalTrips.forEach((t) => {
    console.log(`    ${t.display_order}. ${t.title} | ${t.price_range}`);
  });

  if (finalTrips.length === 9) {
    console.log('\n✅ 完成！9 筆行程，排序已對齊朋威。');
  } else {
    console.log(`\n⚠️ 行程數 ${finalTrips.length}，預期 9。請手動檢查。`);
  }
}

main().catch((err) => { console.error('❌', err); process.exit(1); });
