/**
 * 批次上傳行程封面圖片到 Supabase Storage
 * 執行：node scripts/upload-trip-images.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://soujehqympampczeiwcz.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvdWplaHF5bXBhbXBjemVpd2N6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjkyMTEyNywiZXhwIjoyMDkyNDk3MTI3fQ.7wgfFZ_RSHEmTKEJGGpg1lDK10N6doom_n_2os4E8pI';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  console.log('📦 取得所有行程...');
  const { data: trips, error } = await supabase
    .from('trips')
    .select('id, title, cover_image_url')
    .eq('is_active', true);

  if (error) {
    console.error('❌ 取得行程失敗:', error.message);
    process.exit(1);
  }

  // 篩選需要處理的行程（有 Unsplash 或外部圖片）
  const toProcess = trips.filter(t => {
    const url = t.cover_image_url || '';
    return url.includes('unsplash.com') || url.includes('dcimg.travel.net.tw') || url.includes('pwgotravel.com.tw');
  });

  console.log(`🔍 總行程: ${trips.length}, 需上傳: ${toProcess.length}`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const trip = toProcess[i];
    const progress = `[${i + 1}/${toProcess.length}]`;

    try {
      // 1. 下載圖片
      console.log(`${progress} ⬇️  下載: ${trip.title.substring(0, 30)}...`);
      const imgRes = await fetch(trip.cover_image_url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        redirect: 'follow',
      });

      if (!imgRes.ok) {
        console.log(`${progress} ⚠️  下載失敗 (${imgRes.status}), 跳過`);
        failed++;
        continue;
      }

      const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
      const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
      const buffer = Buffer.from(await imgRes.arrayBuffer());

      if (buffer.length < 1000) {
        console.log(`${progress} ⚠️  圖片太小 (${buffer.length} bytes), 跳過`);
        failed++;
        continue;
      }

      // 2. 上傳到 Supabase Storage
      const fileName = `${trip.id}-${Date.now()}.${ext}`;
      const filePath = `trips/${fileName}`;

      console.log(`${progress} ⬆️  上傳: ${filePath}`);
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, buffer, {
          contentType,
          cacheControl: 'public, max-age=31536000',
          upsert: true,
        });

      if (uploadError) {
        console.log(`${progress} ❌ 上傳失敗: ${uploadError.message}`);
        failed++;
        continue;
      }

      // 3. 取得公開 URL
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      const versionedUrl = `${publicUrl}?v=${Date.now()}`;

      // 4. 更新資料庫
      const { error: updateError } = await supabase
        .from('trips')
        .update({ cover_image_url: versionedUrl })
        .eq('id', trip.id);

      if (updateError) {
        console.log(`${progress} ❌ 更新 DB 失敗: ${updateError.message}`);
        failed++;
        continue;
      }

      console.log(`${progress} ✅ 完成: ${trip.title.substring(0, 30)}`);
      success++;

      // 避免太快被限速
      await new Promise(r => setTimeout(r, 300));

    } catch (err) {
      console.log(`${progress} ❌ 錯誤: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n🎉 完成！成功: ${success}, 失敗: ${failed}`);
}

main().catch(console.error);
