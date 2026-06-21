/**
 * 修正港澳大陸所有 destination 的 sub_area 資料
 * 用法: node scripts/fix-china-sub-areas.mjs
 *
 * 修改項目：
 * 1. 張家界/九寨溝 (18 trips)：西南地區→九寨溝/貴州、華中地區→張家界、西北地區→甘南
 * 2. 江南/廈門 (14 trips)：華東地區→廈門/金廈/武夷山/黃山/青島/江南
 * 3. 桂林 (1 trip)：華南地區→桂林
 * 4. 北疆 (2 trips)：西北地區→北疆
 * 5. 哈爾濱 (1 trip)：東北地區→哈爾濱
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

const DEST_IDS = {
  zhangjiajie: 'ce46019d-9435-4e52-99f7-90ae53d093bb',
  jiangnan: '7f2da132-9162-4424-9da6-c4055b5cf9ba',
  guilin: '4bf0ca5f-fbad-4154-8bb7-3ae804277067',
  beijiang: '79a0f340-f223-4d05-a6e0-648aaa053c2b',
  harbin: 'c6d6d483-a328-4d36-a706-b88e4b1b466e',
};

function getCorrectSubArea(title, currentSubArea, destKey) {
  const t = title;

  if (destKey === 'zhangjiajie') {
    if (['張家界', '重慶,長江三峽', '長江三峽'].includes(currentSubArea)) return null;
    if (currentSubArea === '高雄出發' && t.includes('張家界')) return null;

    if (t.includes('九寨溝')) {
      if (t.includes('高雄出發') || t.startsWith('高雄出發')) return '九寨溝,高雄出發';
      return '九寨溝';
    }
    if (t.includes('貴州') || t.includes('黔')) return '貴州';
    if (t.includes('甘南')) return '甘南';
    if (t.includes('張家界') || t.includes('鳳凰古城') || t.includes('天門山')) return '張家界';
    return null;
  }

  if (destKey === 'jiangnan') {
    if (currentSubArea === '江南') return null;

    if (t.includes('金廈')) return '金廈';
    if (t.includes('武夷山')) {
      if (t.includes('廈門') && t.indexOf('廈門') < t.indexOf('武夷山')) return '廈門';
      return '武夷山';
    }
    if (t.includes('黃山')) return '黃山';
    if (t.includes('青島')) return '青島';
    if (t.includes('江南') || t.includes('蘇杭')) return '江南';
    if (t.includes('廈門') || t.includes('鷺島') || t.includes('閩南') || t.includes('泉州')) return '廈門';
    return null;
  }

  if (destKey === 'guilin') return '桂林';
  if (destKey === 'beijiang') return '北疆';
  if (destKey === 'harbin') return '哈爾濱';
  return null;
}

async function main() {
  console.log('📦 開始修正港澳大陸 sub_area 資料...\n');

  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  for (const [destKey, destId] of Object.entries(DEST_IDS)) {
    console.log(`\n--- ${destKey} (${destId.slice(0, 8)}) ---`);

    const { data: trips, error } = await sb
      .from('trips')
      .select('id, title, trip_banner')
      .eq('destination_id', destId)
      .eq('is_active', true)
      .order('display_order');

    if (error || !trips) {
      console.error(`❌ 讀取失敗: ${error?.message || '無資料'}`);
      failCount++;
      continue;
    }

    for (const trip of trips) {
      const currentSubArea = trip.trip_banner?.sub_area || '';
      const newSubArea = getCorrectSubArea(trip.title, currentSubArea, destKey);

      if (!newSubArea || newSubArea === currentSubArea) {
        console.log(`⏭️  [${currentSubArea}] ${trip.title.substring(0, 50)}`);
        skipCount++;
        continue;
      }

      const mergedBanner = { ...(trip.trip_banner || {}), sub_area: newSubArea };
      const { error: updateErr } = await sb
        .from('trips')
        .update({ trip_banner: mergedBanner })
        .eq('id', trip.id);

      if (updateErr) {
        console.error(`❌ 更新失敗 ${trip.id}: ${updateErr.message}`);
        failCount++;
      } else {
        console.log(`✅ [${currentSubArea} → ${newSubArea}] ${trip.title.substring(0, 50)}`);
        successCount++;
      }
    }
  }

  console.log(`\n🏁 完成！成功: ${successCount}，跳過: ${skipCount}，失敗: ${failCount}`);
}

main().catch((err) => {
  console.error('💥 腳本執行失敗:', err);
  process.exit(1);
});
