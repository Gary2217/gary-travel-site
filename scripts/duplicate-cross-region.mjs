import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const getEnv = (k) => { const m = env.match(new RegExp(`^${k}=(.+)$`, 'm')); return m ? m[1].trim() : null; };
const sb = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));

// Destination IDs
const KANSAI_ID = '69409768-618f-42a1-9787-f6d689cd3583';
const KYUSHU_ID = 'c5edad39-d9ae-4739-823a-d644e0142944';

// 查目前九州裡的這兩個行程（作為複製來源）
const { data: kyushuTrips } = await sb.from('trips')
  .select('*')
  .eq('destination_id', KYUSHU_ID)
  .eq('is_active', true);

const codesToDuplicate = ['PJP5KJ5D', 'KIX5DST'];

// 檢查關西是否已有這些 code
const { data: kansaiTrips } = await sb.from('trips')
  .select('id, trip_banner, is_active')
  .eq('destination_id', KANSAI_ID);

const kansaiActiveCodes = new Set(
  kansaiTrips.filter(t => t.is_active).map(t => t.trip_banner?.code_label).filter(Boolean)
);
const kansaiInactive = kansaiTrips.filter(t => !t.is_active);

// 取關西目前最大 display_order
const { data: kansaiOrdered } = await sb.from('trips')
  .select('display_order')
  .eq('destination_id', KANSAI_ID)
  .eq('is_active', true)
  .order('display_order', { ascending: false })
  .limit(1);
let nextOrder = (kansaiOrdered?.[0]?.display_order || 0) + 1;

for (const code of codesToDuplicate) {
  if (kansaiActiveCodes.has(code)) {
    console.log(`⏭️ ${code} 已在關西 (active)，跳過`);
    continue;
  }

  // 檢查是否有 inactive 的可以恢復
  const inactive = kansaiInactive.find(t => t.trip_banner?.code_label === code);
  if (inactive) {
    const { error } = await sb.from('trips')
      .update({ is_active: true, display_order: nextOrder })
      .eq('id', inactive.id);
    if (error) console.log(`❌ ${code} 恢復失敗: ${error.message}`);
    else console.log(`🔄 ${code} 恢復 inactive → active (order ${nextOrder})`);
    nextOrder++;
    continue;
  }

  // 從九州複製一份到關西
  const source = kyushuTrips.find(t => t.trip_banner?.code_label === code);
  if (!source) {
    console.log(`⚠️ ${code} 在九州找不到`);
    continue;
  }

  const { id, created_at, updated_at, ...tripData } = source;
  tripData.destination_id = KANSAI_ID;
  tripData.display_order = nextOrder;

  const { error } = await sb.from('trips').insert(tripData);
  if (error) console.log(`❌ ${code} 複製失敗: ${error.message}`);
  else console.log(`✅ ${code} 複製到關西 (order ${nextOrder})`);
  nextOrder++;
}

// 驗證
const { data: finalKansai } = await sb.from('trips')
  .select('trip_banner')
  .eq('destination_id', KANSAI_ID)
  .eq('is_active', true);
const { data: finalKyushu } = await sb.from('trips')
  .select('trip_banner')
  .eq('destination_id', KYUSHU_ID)
  .eq('is_active', true);

console.log(`\n關西: ${finalKansai.length} active`);
console.log(`九州: ${finalKyushu.length} active`);
