import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const getEnv = (k) => { const m = env.match(new RegExp(`^${k}=(.+)$`, 'm')); return m ? m[1].trim() : null; };
const sb = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));
const BASE_URL = 'https://www.pwgotravel.com.tw';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// 需修復的行程
const BROKEN = [
  { id: '6a80019c-682b-4b1d-a3f9-37c08067d9ee', code: 'PJP5KJ5D' },
  { id: '07797f64-ba9d-4aea-a26c-e05d676b7b21', code: 'PVG6FTB6D' },
  { id: '2576b0f3-2645-4cef-98b5-f29771bed532', code: 'BKK4AI5D' },
  { id: 'c4374c71-2bde-4839-b7b6-081aead3e39c', code: 'DAD5BE6D' },
  { id: '5e08730c-210f-4d23-b660-6cfe2474637b', code: 'URC4AA13D' },
  { id: '8f88d121-3788-4937-bcce-abd0d455bfa2', code: 'KWE5AB9D' },
  { id: '7084e21d-1f51-4d77-838c-51a3759d3bba', code: 'BKK4AH5D' },
  { id: '5c6763a7-975a-4c03-b99a-85f96c4ab1b5', code: 'DAD5BD6D' },
  { id: '0a3912f7-ec1a-4b5b-b01e-ddd0236939d7', code: 'GSR4NW10D' },
  { id: '4306c7b6-6ded-462c-b4e1-7762a4626de3', code: 'KWE5AA9D' },
  { id: '46a88d7c-ac10-434e-8186-4e100a917865', code: 'KWE5AC9D' },
  { id: '05f2e51f-239f-4449-ac8f-9fa5a4bc64af', code: 'TAS4A11D' },
  { id: '67121a31-e0ad-4d4d-8977-75ad0cd0e8fb', code: 'CTU5FT8D' },
  { id: '744d940d-2cf4-43da-bf81-76d8a17a91e9', code: 'DYG5EC8D' },
];

// 先從所有區域頁面建立 code → image URL 的對照表
const REGION_URLS = [
  '/japan/', '/south-korea/', '/thailand/', '/vietnam/', '/indonesia/',
  '/malaysia/', '/philippines/', '/europe/', '/china/', '/asia/',
  '/southasia/', '/new/', '/kinmen/', '/mazu/', '/penghu/',
  '/freetour/', '/golf/',
];

const codeToImg = new Map();
const brokenCodes = new Set(BROKEN.map(b => b.code));

console.log('從朋威區域頁面收集圖片 URL...\n');

for (const regionUrl of REGION_URLS) {
  try {
    const res = await fetch(BASE_URL + regionUrl, { headers: { 'User-Agent': UA } });
    const html = await res.text();
    const ch = cheerio.load(html);

    ch('.item-box a[href*="/products/"]').each((_, link) => {
      const href = ch(link).attr('href') || '';
      const m = href.match(/mold-new\/([A-Z0-9]+)/i);
      if (!m) return;
      const code = m[1].split('?')[0];
      if (!brokenCodes.has(code)) return;

      const img = ch(link).find('img').attr('src') || ch(link).find('img').attr('data-src') || '';
      let imgUrl = '';
      if (img.startsWith('http')) imgUrl = img;
      else if (img.startsWith('//')) imgUrl = 'https:' + img;
      else if (img.startsWith('/')) imgUrl = BASE_URL + img;

      if (imgUrl && !codeToImg.has(code)) {
        codeToImg.set(code, imgUrl);
      }
    });
  } catch (e) {
    console.log(`  ${regionUrl} 失敗: ${e.message}`);
  }
  await new Promise(r => setTimeout(r, 300));
}

console.log(`找到 ${codeToImg.size}/${BROKEN.length} 個圖片 URL\n`);

// 對於沒找到的 code，嘗試從詳情頁抓
for (const b of BROKEN) {
  if (codeToImg.has(b.code)) continue;
  
  console.log(`嘗試從詳情頁抓 ${b.code}...`);
  try {
    const detailUrl = `${BASE_URL}/products/mold-new/${b.code}`;
    const res = await fetch(detailUrl, { headers: { 'User-Agent': UA }, redirect: 'follow' });
    if (!res.ok) {
      console.log(`  ❌ HTTP ${res.status}`);
      continue;
    }
    const html = await res.text();
    const ch = cheerio.load(html);
    
    // 找主圖
    const ogImage = ch('meta[property="og:image"]').attr('content');
    const mainImg = ch('.product-banner img, .main-img img, .hero-img img').first().attr('src');
    const anyLargeImg = ch('img[src*="dcimg"]').first().attr('src');
    
    let imgUrl = ogImage || mainImg || anyLargeImg || '';
    if (imgUrl && !imgUrl.startsWith('http')) {
      imgUrl = imgUrl.startsWith('//') ? 'https:' + imgUrl : BASE_URL + imgUrl;
    }
    
    if (imgUrl) {
      codeToImg.set(b.code, imgUrl);
      console.log(`  ✅ 找到: ${imgUrl.substring(0, 80)}`);
    } else {
      console.log(`  ⚠️ 沒找到圖片`);
    }
  } catch (e) {
    console.log(`  ❌ ${e.message}`);
  }
  await new Promise(r => setTimeout(r, 500));
}

console.log(`\n最終找到 ${codeToImg.size}/${BROKEN.length} 個圖片 URL\n`);

// 下載 → 上傳 → 更新 DB
let fixed = 0;
let failed = 0;

for (const b of BROKEN) {
  const imgUrl = codeToImg.get(b.code);
  if (!imgUrl) {
    console.log(`⏭️ ${b.code}: 沒有圖片 URL，跳過`);
    failed++;
    continue;
  }

  try {
    // 下載圖片
    const imgRes = await fetch(imgUrl, { 
      headers: { 'User-Agent': UA, 'Referer': BASE_URL },
      signal: AbortSignal.timeout(15000),
    });
    
    if (!imgRes.ok) {
      console.log(`❌ ${b.code}: 下載失敗 HTTP ${imgRes.status}`);
      failed++;
      continue;
    }

    const buf = Buffer.from(await imgRes.arrayBuffer());
    if (buf.length < 2000) {
      console.log(`❌ ${b.code}: 圖片太小 (${buf.length} bytes)`);
      failed++;
      continue;
    }

    // 判斷圖片格式
    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';

    // 先刪除舊的壞檔（如果有）
    const { data: trip } = await sb.from('trips').select('cover_image_url').eq('id', b.id).single();
    if (trip?.cover_image_url?.includes('supabase')) {
      const oldPath = trip.cover_image_url.split('/images/')[1]?.split('?')[0];
      if (oldPath) {
        await sb.storage.from('images').remove([oldPath]);
      }
    }

    // 上傳新圖
    const path = `trips/${b.code}-${Date.now()}.${ext}`;
    const { error: uploadErr } = await sb.storage.from('images').upload(path, buf, {
      contentType: contentType.includes('image') ? contentType : 'image/jpeg',
      upsert: true,
    });

    if (uploadErr) {
      console.log(`❌ ${b.code}: 上傳失敗 ${uploadErr.message}`);
      failed++;
      continue;
    }

    const publicUrl = sb.storage.from('images').getPublicUrl(path).data.publicUrl + '?v=' + Date.now();

    // 更新 DB
    const { error: updateErr } = await sb.from('trips')
      .update({ cover_image_url: publicUrl })
      .eq('id', b.id);

    if (updateErr) {
      console.log(`❌ ${b.code}: DB 更新失敗 ${updateErr.message}`);
      failed++;
    } else {
      console.log(`✅ ${b.code}: ${(buf.length / 1024).toFixed(0)}KB → ${path}`);
      fixed++;
    }
  } catch (e) {
    console.log(`❌ ${b.code}: ${e.message}`);
    failed++;
  }

  await new Promise(r => setTimeout(r, 300));
}

console.log(`\n=== 結果 ===`);
console.log(`修復: ${fixed}`);
console.log(`失敗: ${failed}`);
