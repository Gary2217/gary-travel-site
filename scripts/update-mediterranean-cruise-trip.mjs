// 手動更新「地中海郵輪」行程：MSC神女號西地中海藍海假期12日
// 郵輪為手動管理（不自動抓取）。封面圖與 PDF 由 DevMode 手動上傳，本 script 只填文字/結構資料。
// 執行：node scripts/update-mediterranean-cruise-trip.mjs

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

// 讀取 .env.local
const env = readFileSync('.env.local', 'utf8');
const getEnv = (k) => {
  const m = env.match(new RegExp(`^${k}=(.+)$`, 'm'));
  return m ? m[1].trim() : null;
};

const supabase = createClient(
  getEnv('NEXT_PUBLIC_SUPABASE_URL'),
  getEnv('SUPABASE_SERVICE_ROLE_KEY'),
);

const TRIP_ID = 'ee266273-0a97-4d64-a8ee-70016ee52471';

// 航段（去程：桃園→深圳→米蘭；回程：米蘭→深圳→桃園）
const FLIGHT_SEGMENTS = [
  { date: '2026-11-22', airline: '深圳航空', flight_number: 'ZH9074', dep_time: '17:35', dep_airport: '桃園', arr_time: '19:35', arr_airport: '深圳', next_day: false },
  { date: '2026-11-23', airline: '海南航空', flight_number: 'HU7973', dep_time: '01:45', dep_airport: '深圳', arr_time: '07:40', arr_airport: '米蘭', next_day: false },
  { date: '2026-12-02', airline: '海南航空', flight_number: 'HU7974', dep_time: '09:45', dep_airport: '米蘭', arr_time: '04:30', arr_airport: '深圳', next_day: true },
  { date: '2026-12-03', airline: '深圳航空', flight_number: 'ZH9073', dep_time: '14:25', dep_airport: '深圳', arr_time: '16:15', arr_airport: '桃園', next_day: false },
];

const PRICE_LABEL = 'NT$159,000起';

async function main() {
  // 1) 清除舊出發日期（重建）
  const { error: delErr } = await supabase
    .from('trip_departure_dates')
    .delete()
    .eq('trip_id', TRIP_ID);
  if (delErr) throw new Error(`刪除舊出發日期失敗: ${delErr.message}`);

  // 2) 插入出發日期（11/22 出發）
  const { data: inserted, error: insErr } = await supabase
    .from('trip_departure_dates')
    .insert([
      {
        trip_id: TRIP_ID,
        departure_date: '2026-11-22',
        departure_city: '桃園',
        airline: '深圳航空 / 海南航空',
        price: 159000,
        seats_total: 0,
        seats_available: 0,
        label: null,
        // 去程（第一段）
        outbound_flight: 'ZH9074',
        outbound_time: '17:35',
        outbound_from: '桃園',
        outbound_arrival_time: '19:35',
        outbound_to: '深圳',
        outbound_next_day: false,
        // 回程（最後一段）
        return_date: '2026-12-03',
        return_flight: 'ZH9073',
        return_time: '14:25',
        return_from: '深圳',
        return_arrival_time: '16:15',
        return_to: '桃園',
        return_next_day: false,
        // 完整航段
        flight_segments: FLIGHT_SEGMENTS,
        is_active: true,
      },
    ])
    .select('id');
  if (insErr) throw new Error(`插入出發日期失敗: ${insErr.message}`);

  const depId = inserted[0].id;

  // 3) 組 departure_info_map（前端售價明細 Modal 讀這個）
  const departure_info_map = {
    [depId]: {
      group_code: '',
      price_detail: JSON.stringify({
        title: '團費與售價說明',
        subtitle: '雙人一室郵輪陽台艙，含機票、郵輪7晚、米蘭2晚及全程小費',
        adultPrice: PRICE_LABEL,
        childWithBedPrice: '洽詢',
        childNoBedPrice: '洽詢',
        childExtraBedPrice: '洽詢',
        infantPrice: '洽詢',
      }),
    },
  };

  // 4) 組 trip_banner
  const trip_banner = {
    code_label: '',
    price_label: PRICE_LABEL,
    tags: ['郵輪假期', '世界遺產', '海上奢旅'],
    departure_label: '桃園出發',
    duration_label: '12天11夜',
    seats_total: null,
    seats_available: null,
    deposit_label: '',
    custom_tour: false,
    min_group_size: null,
    airline: '深圳航空 / 海南航空',
    airport: '桃園國際機場',
    price_detail: `${PRICE_LABEL}\t洽詢\t洽詢\t洽詢\t洽詢`,
    departure_info_map,
  };

  // 5) 更新 trips 主欄位（cover_image_url / document_url 不動，由 DevMode 上傳）
  const { error: updErr } = await supabase
    .from('trips')
    .update({
      title: 'MSC神女號西地中海藍海假期12日',
      subtitle: '義大利·突尼西亞·瑞士·法國·西班牙　經典名城·世界遺產·海上奢旅',
      duration: '12天11夜',
      price_range: PRICE_LABEL,
      trip_banner,
      is_active: true,
    })
    .eq('id', TRIP_ID);
  if (updErr) throw new Error(`更新行程失敗: ${updErr.message}`);

  console.log('✅ 更新完成');
  console.log(`   trip_id: ${TRIP_ID}`);
  console.log(`   出發日期 id: ${depId}`);
  console.log('   標題: MSC神女號西地中海藍海假期12日');
  console.log('   團費: NT$159,000起 / 12天11夜 / 2026-11-22 出發');
  console.log('   ⚠️ 封面圖與 PDF 請於 DevMode 手動上傳');
}

main().catch((e) => {
  console.error('❌ 失敗:', e.message);
  process.exit(1);
});
