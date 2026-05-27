/**
 * 修正中東/西伯利亞/高雄出發行程的 flight_segments：
 *   1. 補齊 arr_time（從朋威航班資訊抓取）
 *   2. 計算 date 欄位（出發日期 + 天數偏移）
 *
 * 用法: node scripts/fix-middle-east-flights.mjs
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = readFileSync('.env.local', 'utf8');
const getEnv = (k) => { const m = env.match(new RegExp(`^${k}=(.+)$`, 'm')); return m ? m[1].trim() : null; };
const sb = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 完整航段資料（含正確的 arr_time）+ 天數偏移
const tripFlights = {
  // === 杜拜 ===
  // AUH4AG7D - 閃耀阿布達比、杜拜7日
  'e2b84d5d-e2a4-4821-be55-e7dab4d6e01a': {
    offsets: [0, 5],
    segments: [
      { airline: '阿提哈德航空（EY）', flight_number: 'EY899', dep_time: '18:40', dep_airport: '桃園國際機場', arr_time: '00:30', arr_airport: '阿布達比機場', next_day: true },
      { airline: '阿提哈德航空（EY）', flight_number: 'EY898', dep_time: '21:25', dep_airport: '阿布達比機場', arr_time: '09:00', arr_airport: '桃園國際機場', next_day: true },
    ],
  },
  // AUH5AD7D - F1賽道狂熱7日
  '7f4f2e55-8dd8-487d-b91c-03bd57955276': {
    offsets: [0, 5],
    segments: [
      { airline: '阿提哈德航空（EY）', flight_number: 'EY899', dep_time: '19:25', dep_airport: '桃園國際機場', arr_time: '00:15', arr_airport: '阿布達比機場', next_day: true },
      { airline: '阿提哈德航空（EY）', flight_number: 'EY898', dep_time: '21:20', dep_airport: '阿布達比機場', arr_time: '09:35', arr_airport: '桃園國際機場', next_day: true },
    ],
  },
  // AUH4AB7D - 超值杜拜經典7日
  '20e3f08c-10a1-486d-8af1-8a847bc1b436': {
    offsets: [0, 5],
    segments: [
      { airline: '阿提哈德航空（EY）', flight_number: 'EY899', dep_time: '19:25', dep_airport: '桃園國際機場', arr_time: '00:15', arr_airport: '阿布達比機場', next_day: true },
      { airline: '阿提哈德航空（EY）', flight_number: 'EY898', dep_time: '21:20', dep_airport: '阿布達比機場', arr_time: '09:35', arr_airport: '桃園國際機場', next_day: true },
    ],
  },
  // AUH5AA6D - 小資樂活6日
  '3f5666df-3f63-456d-b6a3-c3a3acfca6ee': {
    offsets: [0, 4],
    segments: [
      { airline: '阿提哈德航空（EY）', flight_number: 'EY899', dep_time: '19:25', dep_airport: '桃園國際機場', arr_time: '00:15', arr_airport: '阿布達比機場', next_day: true },
      { airline: '阿提哈德航空（EY）', flight_number: 'EY898', dep_time: '21:20', dep_airport: '阿布達比機場', arr_time: '09:35', arr_airport: '桃園國際機場', next_day: true },
    ],
  },
  // DXB4ZA8D - 黑金三國8日
  '13bdcb88-e45a-4614-a139-0d0543cdf442': {
    offsets: [0, 0, 4, 7],
    segments: [
      { airline: '汶萊航空（BI）', flight_number: 'BI452', dep_time: '15:05', dep_airport: '桃園國際機場', arr_time: '18:35', arr_airport: '汶萊機場', next_day: false },
      { airline: '汶萊航空（BI）', flight_number: 'BI1097', dep_time: '20:25', dep_airport: '汶萊機場', arr_time: '01:10', arr_airport: '杜拜機場', next_day: false },
      { airline: '汶萊航空（BI）', flight_number: 'BI1098', dep_time: '05:45', dep_airport: '杜拜機場', arr_time: '17:45', arr_airport: '汶萊機場', next_day: false },
      { airline: '汶萊航空（BI）', flight_number: 'BI451', dep_time: '10:00', dep_airport: '汶萊機場', arr_time: '13:35', arr_airport: '桃園國際機場', next_day: false },
    ],
  },
  // DXB57KH7D - 高雄出發杜拜7日 (阿聯酋)
  'fc9af03d-0c15-4c9e-b5e2-f01d2c744242': {
    offsets: [0, 0, 6, 6],
    segments: [
      { airline: '長榮航空（BR）', flight_number: 'BR845', dep_time: '09:15', dep_airport: '高雄-小港機場', arr_time: '10:55', arr_airport: '香港-赤鱲角機場', next_day: false },
      { airline: '阿聯酋航空（EK）', flight_number: 'EK383', dep_time: '18:05', dep_airport: '香港-赤鱲角機場', arr_time: '23:00', arr_airport: '杜拜機場', next_day: false },
      { airline: '阿聯酋航空（EK）', flight_number: 'EK382', dep_time: '03:30', dep_airport: '杜拜機場', arr_time: '14:25', arr_airport: '香港-赤鱲角機場', next_day: false },
      { airline: '長榮航空（BR）', flight_number: 'BR850', dep_time: '19:25', dep_airport: '香港-赤鱲角機場', arr_time: '21:00', arr_airport: '高雄-小港機場', next_day: false },
    ],
  },

  // === 土耳其 ===
  // IKA5AA10D - 伊朗10日
  'a437ee1e-c591-4d54-983a-24ded6e20c9b': {
    offsets: [0, 0, 2, 8, 9],
    segments: [
      { airline: '泰國航空（TG）', flight_number: 'TG633', dep_time: '13:55', dep_airport: '桃園國際機場', arr_time: '16:50', arr_airport: '曼谷-蘇凡納布機場', next_day: false },
      { airline: '伊朗滿漢航空（W5）', flight_number: 'W5050', dep_time: '22:20', dep_airport: '曼谷-蘇凡納布機場', arr_time: '02:10', arr_airport: '伊瑪目霍梅尼機場', next_day: true },
      { airline: '伊朗滿漢航空（W5）', flight_number: 'W51089', dep_time: '07:00', dep_airport: '梅赫拉巴德國際機場', arr_time: '08:40', arr_airport: '設拉子機場', next_day: false },
      { airline: '伊朗滿漢航空（W5）', flight_number: 'W5051', dep_time: '21:45', dep_airport: '伊瑪目霍梅尼機場', arr_time: '08:20', arr_airport: '曼谷-蘇凡納布機場', next_day: true },
      { airline: '泰國航空（TG）', flight_number: 'TG634', dep_time: '12:50', dep_airport: '曼谷-蘇凡納布機場', arr_time: '17:20', arr_airport: '桃園國際機場', next_day: false },
    ],
  },

  // === 埃及 ===
  // CAI5AA10D - 漫步埃及10日
  '685a3d0f-9c5b-4d98-9056-1f24824703a5': {
    offsets: [0, 1, 8, 9],
    segments: [
      { airline: '中國東方航空（MU）', flight_number: 'MU5006', dep_time: '18:40', dep_airport: '桃園國際機場', arr_time: '20:40', arr_airport: '浦東機場', next_day: false },
      { airline: '中國東方航空（MU）', flight_number: 'MU223', dep_time: '01:50', dep_airport: '浦東機場', arr_time: '08:00', arr_airport: '開羅機場', next_day: false },
      { airline: '中國東方航空（MU）', flight_number: 'MU224', dep_time: '13:30', dep_airport: '開羅機場', arr_time: '05:50', arr_airport: '浦東機場', next_day: true },
      { airline: '上海航空（FM）', flight_number: 'FM819', dep_time: '10:50', dep_airport: '浦東機場', arr_time: '12:40', arr_airport: '台北松山機場', next_day: false },
    ],
  },

  // === 阿布達比 (同杜拜的行程資料) ===
  '8a00d559-0734-4213-ac0a-4037e96e24ee': {
    offsets: [0, 5],
    segments: [
      { airline: '阿提哈德航空（EY）', flight_number: 'EY899', dep_time: '18:40', dep_airport: '桃園國際機場', arr_time: '00:30', arr_airport: '阿布達比機場', next_day: true },
      { airline: '阿提哈德航空（EY）', flight_number: 'EY898', dep_time: '21:25', dep_airport: '阿布達比機場', arr_time: '09:00', arr_airport: '桃園國際機場', next_day: true },
    ],
  },
  'cd566e29-0936-48aa-b770-b8c33f1b8ded': {
    offsets: [0, 5],
    segments: [
      { airline: '阿提哈德航空（EY）', flight_number: 'EY899', dep_time: '19:25', dep_airport: '桃園國際機場', arr_time: '00:15', arr_airport: '阿布達比機場', next_day: true },
      { airline: '阿提哈德航空（EY）', flight_number: 'EY898', dep_time: '21:20', dep_airport: '阿布達比機場', arr_time: '09:35', arr_airport: '桃園國際機場', next_day: true },
    ],
  },

  // === 西伯利亞 ===
  // UBN5A10D - 蒙古貝加爾湖10日
  '7a1c39f2-d49f-4751-8489-69fa64ef8652': {
    offsets: [0, 1, 8, 9, 9],
    segments: [
      { airline: '國泰航空（CX）', flight_number: 'CX407', dep_time: '08:00', dep_airport: '桃園國際機場', arr_time: '10:00', arr_airport: '香港-赤鱲角機場', next_day: false },
      { airline: '蒙古航空（OM）', flight_number: 'OM298', dep_time: '12:25', dep_airport: '香港-赤鱲角機場', arr_time: '17:05', arr_airport: '新烏蘭巴托國際機場', next_day: false },
      { airline: '伊爾航空（IO）', flight_number: 'IO230', dep_time: '00:05', dep_airport: '伊爾庫次克機場', arr_time: '01:00', arr_airport: '新烏蘭巴托國際機場', next_day: false },
      { airline: '蒙古航空（OM）', flight_number: 'OM297', dep_time: '06:45', dep_airport: '新烏蘭巴托國際機場', arr_time: '11:25', arr_airport: '香港-赤鱲角機場', next_day: false },
      { airline: '國泰航空（CX）', flight_number: 'CX420', dep_time: '13:35', dep_airport: '香港-赤鱲角機場', arr_time: '15:30', arr_airport: '桃園國際機場', next_day: false },
    ],
  },
  // UBN5AA9D - 蒙古西伯利亞鐵路9日
  'cab8ae49-e001-4b5b-8ab7-136634e7d22d': {
    offsets: [0, 1, 8, 8],
    segments: [
      { airline: '長榮航空（BR）', flight_number: 'BR722', dep_time: '16:30', dep_airport: '桃園國際機場', arr_time: '18:25', arr_airport: '浦東機場', next_day: false },
      { airline: '春秋航空（9C）', flight_number: '9C7057', dep_time: '08:00', dep_airport: '浦東機場', arr_time: '12:00', arr_airport: '新烏蘭巴托國際機場', next_day: false },
      { airline: '春秋航空（9C）', flight_number: '9C7058', dep_time: '13:00', dep_airport: '新烏蘭巴托國際機場', arr_time: '16:45', arr_airport: '浦東機場', next_day: false },
      { airline: '長榮航空（BR）', flight_number: 'BR7721', dep_time: '20:10', dep_airport: '浦東機場', arr_time: '22:10', arr_airport: '桃園國際機場', next_day: false },
    ],
  },
};

async function main() {
  for (const [tripId, config] of Object.entries(tripFlights)) {
    const { data: deps, error } = await sb
      .from('trip_departure_dates')
      .select('id, departure_date, flight_segments')
      .eq('trip_id', tripId);

    if (error || !deps) { console.error(tripId, error?.message); continue; }
    if (deps.length === 0) { console.log(`⏭️ ${tripId}: 無出發日期，跳過`); continue; }

    console.log(`\n✈️ ${tripId}: ${deps.length} 個出發日期`);

    for (const dep of deps) {
      const updated = config.segments.map((seg, i) => ({
        ...seg,
        date: addDays(dep.departure_date, config.offsets[i] ?? 0),
      }));

      const { error: upErr } = await sb
        .from('trip_departure_dates')
        .update({ flight_segments: updated })
        .eq('id', dep.id);

      if (upErr) console.error(`  ❌ ${dep.id}: ${upErr.message}`);
      else console.log(`  ✅ ${dep.departure_date} → ${updated.map(s => s.date + ' ' + s.flight_number).join(' | ')}`);
    }
  }
  console.log('\n✅ 全部完成！');
}

main().catch(console.error);
