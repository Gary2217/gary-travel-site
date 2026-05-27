import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
const env = readFileSync('.env.local', 'utf8');
const g = (k) => { const m = env.match(new RegExp(`^${k}=(.+)$`, 'm')); return m ? m[1].trim() : null; };
const sb = createClient(g('NEXT_PUBLIC_SUPABASE_URL'), g('SUPABASE_SERVICE_ROLE_KEY'));
const DID = 'f1b28d9d-ecd7-4c68-97cb-cef84b417ecc';

const { data: trips } = await sb.from('trips').select('id,title,duration,price_range,trip_banner').eq('destination_id', DID).order('display_order');
console.log(`=== 行程數: ${trips.length} ===`);

for (const t of trips) {
  const b = t.trip_banner || {};
  const { data: deps } = await sb.from('trip_departure_dates')
    .select('id,departure_date,airline,price,seats_total,seats_available,label,flight_segments')
    .eq('trip_id', t.id).order('departure_date');

  const dim = b.departure_info_map || {};
  const depIds = deps.map(d => d.id);
  const dimKeys = Object.keys(dim);
  const missingDim = depIds.filter(id => !dimKeys.includes(id));
  const hasFlight = deps.filter(d => d.flight_segments && d.flight_segments.length > 0).length;
  const hasDate = deps.filter(d => d.flight_segments && d.flight_segments.every(s => s.date)).length;

  console.log(`\n▶ ${t.title.substring(0, 30)}`);
  console.log(`  duration: ${t.duration} | price_range: ${t.price_range}`);
  console.log(`  banner: code=${b.code_label} | dur=${b.duration_label} | tags=${b.tags?.length || 0} | min_group=${b.min_group_size}`);
  console.log(`  梯次: ${deps.length} | 有航班: ${hasFlight} | 航段有日期: ${hasDate}`);
  console.log(`  售價(dim): ${dimKeys.length} | 缺少dim: ${missingDim.length}`);

  if (deps.length > 0) {
    const d = deps[0];
    const info = dim[d.id];
    console.log(`  第1梯: ${d.departure_date} ${d.airline} $${d.price} label: ${d.label || '無'}`);
    console.log(`  航段數: ${d.flight_segments?.length || 0}`);
    if (info) {
      const pd = JSON.parse(info.price_detail || '{}');
      console.log(`  團號: ${info.group_code} | 大人: ${pd.adultPrice} | 佔床: ${pd.childWithBedPrice} | 不佔: ${pd.childNoBedPrice}`);
    } else {
      console.log(`  ⚠️ 此梯次無 departure_info_map！`);
    }
  }
}
console.log('\n✅ 檢查完成');
