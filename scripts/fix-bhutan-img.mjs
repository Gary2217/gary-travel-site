import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const getEnv = (k) => { const m = env.match(new RegExp(`^${k}=(.+)$`, 'm')); return m ? m[1].trim() : null; };
const sb = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));
const BASE = 'https://www.pwgotravel.com.tw';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const TRIP_ID = '73e9f89b-d407-4028-a6f3-fe1b77550b39';
const CODE = 'PBH3AA6D';

// ===== Step 1: 找圖片 URL =====
// 方法 A: 列表頁（嘗試 data-src 等 lazy load 屬性）
let imgUrl = '';
const res = await fetch(BASE + '/southasia/', { headers: { 'User-Agent': UA } });
const html = await res.text();
const ch = cheerio.load(html);

ch('a').each((_, link) => {
  const href = ch(link).attr('href') || '';
  if (!href.includes(CODE)) return;
  const img = ch(link).find('img');
  const src = img.attr('data-src') || img.attr('data-original') || img.attr('data-lazy') || img.attr('src') || '';
  console.log(`列表頁 img: src="${img.attr('src')?.substring(0, 60)}" data-src="${img.attr('data-src')?.substring(0, 60)}"`);
  if (src && src.length > 20 && src.includes('/')) {
    imgUrl = src.startsWith('http') ? src : src.startsWith('//') ? `https:${src}` : `${BASE}${src}`;
  }
});

// 方法 B: 詳情頁 og:image
if (!imgUrl || imgUrl.length < 30) {
  console.log('嘗試詳情頁...');
  try {
    const dr = await fetch(`${BASE}/products/mold-new/${CODE}`, { headers: { 'User-Agent': UA }, redirect: 'follow' });
    const dh = await dr.text();
    const dc = cheerio.load(dh);
    const og = dc('meta[property="og:image"]').attr('content') || '';
    if (og && og.length > 20) {
      imgUrl = og.startsWith('http') ? og : `${BASE}${og}`;
      console.log('og:image:', imgUrl.substring(0, 80));
    }
    // 找 dcimg 圖片
    dc('img').each((_, el) => {
      if (imgUrl) return;
      const s = dc(el).attr('src') || '';
      if (s.includes('dcimg')) {
        imgUrl = s.startsWith('http') ? s : `https:${s}`;
        console.log('dcimg:', imgUrl.substring(0, 80));
      }
    });
  } catch (e) {
    console.log('詳情頁失敗:', e.message);
  }
}

// 方法 C: 用同系列的圖（四星版 PBH4AA6D）
if (!imgUrl || imgUrl.length < 30) {
  console.log('嘗試同系列不丹行程的圖片...');
  const { data: siblings } = await sb.from('trips')
    .select('id, title, cover_image_url, trip_banner')
    .eq('is_active', true)
    .ilike('title', '%不丹%');
  
  for (const s of siblings) {
    if (s.id === TRIP_ID || !s.cover_image_url) continue;
    try {
      const r = await fetch(s.cover_image_url, { signal: AbortSignal.timeout(5000) });
      const b = Buffer.from(await r.arrayBuffer());
      if ((b[0] === 0xff && b[1] === 0xd8) || (b[0] === 0x89 && b[1] === 0x50)) {
        imgUrl = s.cover_image_url;
        console.log(`✅ 用 ${s.trip_banner?.code_label} 的圖: ${imgUrl.substring(0, 80)}`);
        break;
      }
    } catch {}
  }
}

console.log('\n最終 URL:', imgUrl?.substring(0, 100) || '找不到');

// ===== Step 2: 處理圖片 =====
if (imgUrl && imgUrl.includes('supabase')) {
  // 已在 Supabase，直接用
  const { error } = await sb.from('trips').update({ cover_image_url: imgUrl }).eq('id', TRIP_ID);
  if (error) console.log('❌', error.message);
  else console.log('✅ 直接套用同系列圖');
} else if (imgUrl) {
  // 下載 + 上傳
  const imgRes = await fetch(imgUrl, { headers: { 'User-Agent': UA, 'Referer': BASE } });
  const buf = Buffer.from(await imgRes.arrayBuffer());
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8;
  const isPng = buf[0] === 0x89 && buf[1] === 0x50;
  console.log(`下載: ${buf.length} bytes, ${isJpeg ? 'JPEG' : isPng ? 'PNG' : '未知'}`);
  
  if (buf.length < 2000 || (!isJpeg && !isPng)) {
    console.log('❌ 不是有效圖片');
  } else {
    await sb.storage.from('images').remove(['trips/new-1781272607870.jpg']);
    const ext = isPng ? 'png' : 'jpg';
    const path = `trips/${CODE}-${Date.now()}.${ext}`;
    const { error: upErr } = await sb.storage.from('images').upload(path, buf, {
      contentType: isJpeg ? 'image/jpeg' : 'image/png', upsert: true,
    });
    if (upErr) { console.log('❌ 上傳:', upErr.message); }
    else {
      const url = sb.storage.from('images').getPublicUrl(path).data.publicUrl + '?v=' + Date.now();
      const { error } = await sb.from('trips').update({ cover_image_url: url }).eq('id', TRIP_ID);
      if (error) console.log('❌', error.message);
      else console.log('✅ 新圖上傳成功');
    }
  }
} else {
  console.log('❌ 所有方法都找不到圖片');
}

// ===== Step 3: 全站深度掃描 =====
console.log('\n=== 全站深度掃描（驗證實際內容） ===');
const { data: allTrips } = await sb.from('trips')
  .select('id, title, cover_image_url, trip_banner')
  .eq('is_active', true);

let fakeCount = 0;
for (let i = 0; i < allTrips.length; i++) {
  const t = allTrips[i];
  if (!t.cover_image_url) { fakeCount++; continue; }
  try {
    const r = await fetch(t.cover_image_url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) { fakeCount++; continue; }
    const b = Buffer.from(await r.arrayBuffer());
    const ok = (b[0] === 0xff && b[1] === 0xd8) || (b[0] === 0x89 && b[1] === 0x50) ||
               (b[0] === 0x52 && b[1] === 0x49) || (b[0] === 0x47 && b[1] === 0x49);
    if (!ok && b.length > 100) {
      fakeCount++;
      console.log(`❌ ${t.trip_banner?.code_label || '?'} | ${t.title.substring(0, 40)} | ${b.slice(0, 8).toString('hex')}`);
    }
  } catch { fakeCount++; }
  if ((i + 1) % 50 === 0) console.log(`  ${i + 1}/${allTrips.length}...`);
}

console.log(`\n假/壞圖片: ${fakeCount} 筆`);
