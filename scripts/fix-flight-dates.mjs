/**
 * 修正 flight_segments 的 date 欄位：根據出發日期 + 天數偏移計算
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = readFileSync('.env.local', 'utf8');
const getEnv = (k) => { const m = env.match(new RegExp(`^${k}=(.+)$`, 'm')); return m ? m[1].trim() : null; };
const sb = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));

// 每個行程的航段天數偏移（第N天 → offset = N-1）
const dayOffsets = {
  // === 中亞 ===
  '666a117d-485c-4d27-9bfc-22fcdb28f71a': [0, 0, 11, 12],   // ALA4AA13: 第1,1,12,13天
  'f971807d-2391-4f1c-afff-ebb44b5cfba2': [0, 1, 7, 8],      // TAS4AD9D: 第1,2,8,9天
  '58e35dd2-6229-4af6-a99a-b671f8beaf35': [0, 0, 15, 16],    // ALA5AA18: 第1,1,16,17天
  '67b87216-1d8b-4d7b-a88b-1f0f59ab964f': [0, 1, 13, 14],    // ALA4AA15: 第1,2,14,15天
  '0f448466-0962-43b5-9443-2cecf744a5d8': [0, 1, 6, 7],      // TAS4AC8D: 第1,2,7,8天
  // === 杜拜 ===
  'e2b84d5d-e2a4-4821-be55-e7dab4d6e01a': [0, 5],            // AUH4AG7D: 第1,6天
  '7f4f2e55-8dd8-487d-b91c-03bd57955276': [0, 5],            // AUH5AD7D: 第1,6天
  '20e3f08c-10a1-486d-8af1-8a847bc1b436': [0, 5],            // AUH4AB7D: 第1,6天
  '3f5666df-3f63-456d-b6a3-c3a3acfca6ee': [0, 4],            // AUH5AA6D: 第1,5天
  '13bdcb88-e45a-4614-a139-0d0543cdf442': [0, 0, 4, 7],      // DXB4ZA8D: 第1,1,5,8天
  'fc9af03d-0c15-4c9e-b5e2-f01d2c744242': [0, 0, 6, 6],      // DXB57KH7D: 第1,1,7,7天（高雄）
  // === 土耳其 ===
  'a437ee1e-c591-4d54-983a-24ded6e20c9b': [0, 0, 2, 8, 9],   // IKA5AA10D: 第1,1,3,9,10天
  // === 埃及 ===
  '685a3d0f-9c5b-4d98-9056-1f24824703a5': [0, 1, 8, 9],      // CAI5AA10D: 第1,2,9,10天
  // === 阿布達比 ===
  '8a00d559-0734-4213-ac0a-4037e96e24ee': [0, 5],            // AUH4AG7D（阿布達比）: 第1,6天
  'cd566e29-0936-48aa-b770-b8c33f1b8ded': [0, 5],            // AUH5AD7D（阿布達比）: 第1,6天
  // === 西伯利亞 ===
  '7a1c39f2-d49f-4751-8489-69fa64ef8652': [0, 1, 8, 9, 9],   // UBN5A10D: 第1,2,9,10,10天
  'cab8ae49-e001-4b5b-8ab7-136634e7d22d': [0, 1, 8, 8],      // UBN5AA9D: 第1,2,9,9天
};

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

async function main() {
  for (const [tripId, offsets] of Object.entries(dayOffsets)) {
    const { data: dates, error } = await sb
      .from('trip_departure_dates')
      .select('id, departure_date, flight_segments')
      .eq('trip_id', tripId);

    if (error || !dates) { console.error(tripId, error?.message); continue; }

    for (const dep of dates) {
      if (!dep.flight_segments || dep.flight_segments.length === 0) continue;

      const updated = dep.flight_segments.map((seg, i) => ({
        ...seg,
        date: addDays(dep.departure_date, offsets[i] ?? 0),
      }));

      const { error: upErr } = await sb
        .from('trip_departure_dates')
        .update({ flight_segments: updated })
        .eq('id', dep.id);

      if (upErr) console.error(`  ❌ ${dep.id}: ${upErr.message}`);
      else console.log(`✅ ${dep.departure_date} → 航段日期: ${updated.map(s => s.date).join(', ')}`);
    }
  }
  console.log('\n完成！');
}

main().catch(console.error);
