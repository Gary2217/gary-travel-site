/**
 * 修復剩餘未上傳的行程圖片
 * 執行：node scripts/fix-remaining-images.mjs
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

// 從 .env.local 讀取（禁止硬編碼金鑰）
const _env = readFileSync('.env.local', 'utf8');
const _getEnv = (k) => { const m = _env.match(new RegExp(`^${k}=(.+)$`, 'm')); return m ? m[1].trim() : null; };

const supabase = createClient(
  _getEnv('NEXT_PUBLIC_SUPABASE_URL'),
  _getEnv('SUPABASE_SERVICE_ROLE_KEY')
);

// 用確認存在的 Unsplash 圖片（都是 800x600 旅遊主題）
const fixes = [
  { id: 'd4bec7b0-f975-4294-8c90-a8f1aa63de05', url: 'https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=800&h=600&fit=crop' }, // 北海道
  { id: 'a25d7db6-a90e-4f47-b156-ad360377d9db', url: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=800&h=600&fit=crop' }, // 北海道
  { id: '510d9643-0782-406a-8034-f094446381bc', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop' }, // 沖繩
  { id: 'fd389ef5-b8ba-425c-8ad3-f916e341ffdb', url: 'https://images.unsplash.com/photo-1480796927426-f609979314bd?w=800&h=600&fit=crop' }, // 九州
  { id: 'a84e331e-b495-4ce8-9aab-48e1435746f5', url: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=800&h=600&fit=crop' }, // 名古屋
  { id: '7000bc33-cf10-4841-99ed-5fc003eb449e', url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&h=600&fit=crop' }, // 名古屋
  { id: 'ae170bff-c91e-4e40-9c66-cda1c261ed42', url: 'https://images.unsplash.com/photo-1524413840807-0c3cb6fa808d?w=800&h=600&fit=crop' }, // 神戶
  { id: 'faa3ae1b-8294-4c0c-bd0b-1bb124902c12', url: 'https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=800&h=600&fit=crop' }, // 首爾
  { id: 'a26175ff-472a-47f2-be82-201169812620', url: 'https://images.unsplash.com/photo-1546874177718-15bf84d14c09?w=800&h=600&fit=crop' }, // 首爾
  { id: '5720b7ac-2bbd-44f6-898f-73735672d939', url: 'https://images.unsplash.com/photo-1573044093982-8c1aabc3aa17?w=800&h=600&fit=crop' }, // 釜山
  { id: '8909e36a-5ce0-4447-a565-944c92db5063', url: 'https://images.unsplash.com/photo-1541411438265-4cb4687110f2?w=800&h=600&fit=crop' }, // 釜山
  { id: 'd3d3fdd1-d466-47d7-b42e-9290cb9a650d', url: 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=800&h=600&fit=crop' }, // 釜山
  { id: 'c604dc7a-6ab4-4aad-8935-20eaa5d0b9a5', url: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&h=600&fit=crop' }, // 濟州
  { id: 'e12fc968-586a-49f8-91c0-12b53644c915', url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop' }, // 張家界
  { id: 'f867e657-c5ae-4a61-95e6-01ae657d7814', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop' }, // 張家界
  { id: 'bb6790ca-10d5-4ea3-8fcf-f8bad5c21b7e', url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=600&fit=crop' }, // 九寨溝
  { id: 'd0c794d7-221e-4b81-9a96-24f9a3703a61', url: 'https://images.unsplash.com/photo-1528127269322-539801943592?w=800&h=600&fit=crop' }, // 廈門
  { id: '90021c17-6447-42c9-be28-9a1c7c156630', url: 'https://images.unsplash.com/photo-1552733407-5d5c46c3bb3b?w=800&h=600&fit=crop' }, // 廈門
  { id: 'd7b9909e-0598-4572-ba04-5322fd543c19', url: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&h=600&fit=crop' }, // 安徽
  { id: 'c7045dd4-f348-433a-af7d-3a564165786f', url: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800&h=600&fit=crop' }, // 曼谷
  { id: 'a05b7c75-60a4-4f6a-b997-875432c4ba1a', url: 'https://images.unsplash.com/photo-1518509562904-e7ef99cdcc86?w=800&h=600&fit=crop' }, // 宿霧
  { id: '965d7798-6458-4d65-bb73-decd0052812d', url: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=800&h=600&fit=crop' }, // 清邁
  { id: '78d889d9-1fb7-43bc-b398-15a6dc95801a', url: 'https://images.unsplash.com/photo-1504457047772-27faf1c00561?w=800&h=600&fit=crop' }, // 芽莊
  { id: 'e2b84d5d-e2a4-4821-be55-e7dab4d6e01a', url: 'https://images.unsplash.com/photo-1512453913667-52e46f6ec3a5?w=800&h=600&fit=crop' }, // 杜拜
  { id: '13bdcb88-e45a-4614-a139-0d0543cdf442', url: 'https://images.unsplash.com/photo-1518684079-3c830dcef090?w=800&h=600&fit=crop' }, // 杜拜
];

async function main() {
  console.log(`🔧 修復 ${fixes.length} 張圖片...`);
  let ok = 0, fail = 0;

  for (let i = 0; i < fixes.length; i++) {
    const { id, url } = fixes[i];
    const p = `[${i+1}/${fixes.length}]`;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'follow' });
      if (!res.ok) { console.log(`${p} ⚠️ 下載失敗 ${res.status}`); fail++; continue; }
      const ct = res.headers.get('content-type') || 'image/jpeg';
      const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg';
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 1000) { console.log(`${p} ⚠️ 太小`); fail++; continue; }

      const path = `trips/${id}-${Date.now()}.${ext}`;
      const { error: ue } = await supabase.storage.from('images').upload(path, buf, { contentType: ct, cacheControl: 'public, max-age=31536000', upsert: true });
      if (ue) { console.log(`${p} ❌ 上傳失敗: ${ue.message}`); fail++; continue; }

      const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(path);
      const { error: de } = await supabase.from('trips').update({ cover_image_url: `${publicUrl}?v=${Date.now()}` }).eq('id', id);
      if (de) { console.log(`${p} ❌ DB失敗: ${de.message}`); fail++; continue; }

      console.log(`${p} ✅`);
      ok++;
      await new Promise(r => setTimeout(r, 300));
    } catch(e) { console.log(`${p} ❌ ${e.message}`); fail++; }
  }
  console.log(`\n🎉 成功: ${ok}, 失敗: ${fail}`);
}
main().catch(console.error);
