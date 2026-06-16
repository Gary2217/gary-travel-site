/**
 * 清理 Supabase Storage 中不再被任何行程引用的舊圖片
 * 執行：node scripts/cleanup-old-images.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://soujehqympampczeiwcz.supabase.co';
// ⚠️ 已移除硬編碼金鑰，改從 .env.local 讀取
import { readFileSync } from 'fs';
const _env = readFileSync('.env.local', 'utf8');
const _getEnv = (k) => { const m = _env.match(new RegExp(`^${k}=(.+)$`, 'm')); return m ? m[1].trim() : null; };
const SERVICE_ROLE_KEY = _getEnv('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function listAllFiles(bucket, prefix) {
  const allFiles = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, { limit, offset, sortBy: { column: 'name', order: 'asc' } });

    if (error) {
      console.error(`列舉 ${prefix} 失敗:`, error.message);
      break;
    }
    if (!data || data.length === 0) break;

    for (const file of data) {
      if (file.name && !file.id?.includes('/')) {
        allFiles.push(`${prefix}/${file.name}`);
      }
    }
    offset += limit;
    if (data.length < limit) break;
  }

  return allFiles;
}

async function main() {
  console.log('🔍 取得所有行程的圖片 URL...');

  const { data: trips, error: tripErr } = await supabase
    .from('trips')
    .select('id, cover_image_url, trip_banner');

  if (tripErr) {
    console.error('取得行程失敗:', tripErr.message);
    process.exit(1);
  }

  // 收集所有正在使用中的 Storage 路徑
  const usedPaths = new Set();

  for (const trip of trips) {
    // cover_image_url
    if (trip.cover_image_url?.includes('/storage/v1/object/public/images/')) {
      const path = trip.cover_image_url.split('/storage/v1/object/public/images/')[1]?.split('?')[0];
      if (path) usedPaths.add(path);
    }
    // trip_banner.side_image_url
    const banner = trip.trip_banner;
    if (banner?.side_image_url?.includes('/storage/v1/object/public/images/')) {
      const path = banner.side_image_url.split('/storage/v1/object/public/images/')[1]?.split('?')[0];
      if (path) usedPaths.add(path);
    }
  }

  console.log(`  使用中的圖片: ${usedPaths.size}`);

  // 列出 Storage 中所有檔案
  console.log('\n📂 列舉 Storage 中的檔案...');

  const coverFiles = await listAllFiles('images', 'trips');
  // 過濾掉子目錄的結果
  const flatCoverFiles = coverFiles.filter(f => !f.includes('trips/banner/'));

  const bannerFiles = await listAllFiles('images', 'trips/banner');

  const allStorageFiles = [...flatCoverFiles, ...bannerFiles];
  console.log(`  Storage 中共 ${allStorageFiles.length} 個檔案 (封面: ${flatCoverFiles.length}, 形象: ${bannerFiles.length})`);

  // 找出孤兒檔案（不被任何行程引用）
  const orphans = allStorageFiles.filter(path => !usedPaths.has(path));
  console.log(`  孤兒檔案: ${orphans.length}`);

  if (orphans.length === 0) {
    console.log('\n✅ 沒有需要清理的孤兒圖片');
    return;
  }

  // 分批刪除
  console.log(`\n🗑️  刪除 ${orphans.length} 個孤兒檔案...\n`);

  const BATCH_SIZE = 50;
  let deleted = 0;
  let failed = 0;

  for (let i = 0; i < orphans.length; i += BATCH_SIZE) {
    const batch = orphans.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.storage
      .from('images')
      .remove(batch);

    if (error) {
      console.log(`  ❌ 批次 ${Math.floor(i / BATCH_SIZE) + 1} 刪除失敗: ${error.message}`);
      failed += batch.length;
    } else {
      deleted += batch.length;
      console.log(`  ✅ 已刪除 ${deleted}/${orphans.length}`);
    }
  }

  console.log(`\n🎉 清理完成！刪除: ${deleted}, 失敗: ${failed}`);
}

main().catch(console.error);
