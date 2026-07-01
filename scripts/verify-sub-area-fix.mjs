/**
 * 驗證 sub_area tabs 修正結果
 * 用法: node scripts/verify-sub-area-fix.mjs
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

async function verify() {
  let pass = 0;
  let fail = 0;

  // 1. 越南：沒有 active 中越
  const { data: vnTrips } = await sb.from('trips')
    .select('id, title, trip_banner, is_active')
    .eq('destination_id', 'a0b347b8-05f8-45c2-9b78-50a7715d0743')
    .eq('is_active', true);

  const zhongYue = vnTrips.filter(t => t.trip_banner?.sub_area === '中越');
  if (zhongYue.length === 0) { console.log('PASS: 越南沒有 active 中越'); pass++; }
  else { console.log('FAIL: 越南仍有 ' + zhongYue.length + ' 筆中越'); fail++; }

  // 2. 越南：5 筆峴港
  const xianGang = vnTrips.filter(t => t.trip_banner?.sub_area === '峴港');
  if (xianGang.length === 5) { console.log('PASS: 越南 5 筆峴港'); pass++; }
  else { console.log('FAIL: 越南峴港應 5 筆, 實為 ' + xianGang.length); fail++; }

  // 3. 越南：沙壩跨 tab
  const sabaTrip = vnTrips.find(t => t.id === '78d889d9-1fb7-43bc-b398-15a6dc95801a');
  const sabaExpect = '北越,沙壩/芽莊/大叻';
  if (sabaTrip?.trip_banner?.sub_area === sabaExpect) {
    console.log('PASS: 越南沙壩行程跨 tab');
    pass++;
  } else {
    console.log('FAIL: 越南沙壩行程 sub_area=' + sabaTrip?.trip_banner?.sub_area);
    fail++;
  }

  // 越南 tabs 總覽
  const vnAreas = [...new Set(vnTrips.flatMap(t =>
    (t.trip_banner?.sub_area || '').split(',').map(s => s.trim())
  ).filter(Boolean))];
  console.log('  越南 tabs: [' + vnAreas.join(', ') + ']');

  // 4. 北海道：沒有放飛東北亞
  const { data: hkTrips } = await sb.from('trips')
    .select('id, title, trip_banner')
    .eq('destination_id', 'e00a038e-cbc2-43e5-a7e3-d312fb90bc6c')
    .eq('is_active', true);

  const fangFei = hkTrips.filter(t => t.trip_banner?.sub_area === '放飛東北亞');
  if (fangFei.length === 0) { console.log('PASS: 北海道沒有放飛東北亞'); pass++; }
  else { console.log('FAIL: 北海道仍有放飛東北亞'); fail++; }

  const hkAreas = [...new Set(hkTrips.map(t => t.trip_banner?.sub_area || '').filter(Boolean))];
  console.log('  北海道 tabs: [' + hkAreas.join(', ') + ']');

  // 5. 不丹：沒有幸福王國不丹之旅
  const { data: btTrips } = await sb.from('trips')
    .select('id, title, trip_banner')
    .eq('destination_id', 'f76b0e94-e053-45df-ae14-bdcdc37f9c81')
    .eq('is_active', true);

  const xingFu = btTrips.filter(t => t.trip_banner?.sub_area === '幸福王國不丹之旅');
  if (xingFu.length === 0) { console.log('PASS: 不丹沒有幸福王國不丹之旅'); pass++; }
  else { console.log('FAIL: 不丹仍有幸福王國不丹之旅'); fail++; }

  const btAreas = [...new Set(btTrips.map(t => t.trip_banner?.sub_area || '').filter(Boolean))];
  console.log('  不丹 tabs: [' + btAreas.join(', ') + ']');

  // 6. 馬祖：沒有全部行程
  const { data: mzTrips } = await sb.from('trips')
    .select('id, title, trip_banner')
    .eq('destination_id', 'ec7dbc91-576d-4994-a738-2bd13ca253e6')
    .eq('is_active', true);

  const quanBu = mzTrips.filter(t => t.trip_banner?.sub_area === '全部行程');
  if (quanBu.length === 0) { console.log('PASS: 馬祖沒有全部行程'); pass++; }
  else { console.log('FAIL: 馬祖仍有全部行程'); fail++; }

  const mzAreas = [...new Set(mzTrips.map(t => t.trip_banner?.sub_area || '').filter(Boolean))];
  console.log('  馬祖 tabs: [' + mzAreas.join(', ') + ']');

  // 7. 哈爾濱：僅 1 筆 active
  const { data: hrTrips } = await sb.from('trips')
    .select('id, title, trip_banner')
    .eq('destination_id', 'c6d6d483-a328-4d36-a706-b88e4b1b466e')
    .eq('is_active', true);

  if (hrTrips.length === 1) {
    console.log('PASS: 哈爾濱僅 1 筆 active (' + hrTrips[0].title.substring(0, 30) + ')');
    pass++;
  } else {
    console.log('FAIL: 哈爾濱應 1 筆 active, 實為 ' + hrTrips.length);
    fail++;
  }

  console.log('\n=== 結果: ' + pass + ' PASS, ' + fail + ' FAIL ===');
  if (fail > 0) process.exit(1);
}

verify().catch((err) => {
  console.error('驗證腳本失敗:', err);
  process.exit(1);
});
