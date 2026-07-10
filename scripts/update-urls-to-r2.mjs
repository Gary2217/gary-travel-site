import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const getEnv = (k) => {
  const m = env.match(new RegExp(`^${k}=(.+)$`, 'm'));
  return m ? m[1].trim() : null;
};

const sb = createClient(
  getEnv('NEXT_PUBLIC_SUPABASE_URL'),
  getEnv('SUPABASE_SERVICE_ROLE_KEY')
);

const OLD = 'https://soujehqympampczeiwcz.supabase.co/storage/v1/object/public/images/';
const NEW = 'https://pub-3881231e994f4158b5d05c0ec109b3ef.r2.dev/images/';

function replaceUrl(url) {
  if (!url || typeof url !== 'string') return url;
  return url.replace(OLD, NEW);
}

async function updateColumn(table, column) {
  const { data, error } = await sb
    .from(table)
    .select(`id, ${column}`)
    .like(column, `${OLD}%`);

  if (error) { console.error(`❌ 查詢 ${table}.${column} 失敗:`, error.message); return 0; }
  if (!data?.length) { console.log(`⏭️  ${table}.${column}：無需更新`); return 0; }

  let count = 0;
  for (const row of data) {
    const { error: updateError } = await sb
      .from(table)
      .update({ [column]: replaceUrl(row[column]) })
      .eq('id', row.id);
    if (updateError) {
      console.error(`❌ 更新 ${table}.${column} id=${row.id} 失敗:`, updateError.message);
    } else {
      count++;
    }
  }
  console.log(`✅ ${table}.${column}：更新 ${count} 筆`);
  return count;
}

async function updateTripBannerJson() {
  // trip_banner is a JSONB column inside trips table
  const { data, error } = await sb
    .from('trips')
    .select('id, trip_banner')
    .not('trip_banner', 'is', null);

  if (error) { console.error('❌ 查詢 trips.trip_banner 失敗:', error.message); return 0; }

  let count = 0;
  for (const row of data) {
    const banner = row.trip_banner;
    if (!banner || typeof banner !== 'object') continue;

    let changed = false;
    const updated = { ...banner };

    // Check side_image_url
    if (banner.side_image_url?.includes(OLD)) {
      updated.side_image_url = replaceUrl(banner.side_image_url);
      changed = true;
    }

    // Check departure_info_map (nested JSON with image URLs)
    if (banner.departure_info_map && typeof banner.departure_info_map === 'object') {
      const dim = { ...banner.departure_info_map };
      let dimChanged = false;
      for (const [key, val] of Object.entries(dim)) {
        if (val && typeof val === 'object') {
          const entry = { ...val };
          if (entry.image_url?.includes(OLD)) { entry.image_url = replaceUrl(entry.image_url); dimChanged = true; }
          if (entry.cover_image_url?.includes(OLD)) { entry.cover_image_url = replaceUrl(entry.cover_image_url); dimChanged = true; }
          dim[key] = entry;
        }
      }
      if (dimChanged) { updated.departure_info_map = dim; changed = true; }
    }

    if (!changed) continue;

    const { error: updateError } = await sb
      .from('trips')
      .update({ trip_banner: updated })
      .eq('id', row.id);
    if (!updateError) count++;
    else console.error(`❌ 更新 trips.trip_banner id=${row.id}:`, updateError.message);
  }
  console.log(`✅ trips.trip_banner (side_image_url / departure_info_map)：更新 ${count} 筆`);
  return count;
}

async function main() {
  console.log('🔄 開始更新 DB 圖片/文件 URL...\n');
  let total = 0;

  // trips 表（普通欄位 - 已在上次跑過，這次應該回報無需更新）
  total += await updateColumn('trips', 'cover_image_url');
  total += await updateColumn('trips', 'document_url');

  // destinations 表（欄位名是 image_url）
  total += await updateColumn('destinations', 'image_url');

  // trips.trip_banner JSONB 欄位內的 side_image_url
  total += await updateTripBannerJson();

  console.log(`\n🎉 完成！共更新 ${total} 筆資料`);
  console.log('\n⚠️  提醒：Supabase Storage 的舊檔案還沒刪除，確認網站正常後再手動刪除');
}

main().catch(console.error);
