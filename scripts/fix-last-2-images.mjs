import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const getEnv = (k) => { const m = env.match(new RegExp(`^${k}=(.+)$`, 'm')); return m ? m[1].trim() : null; };
const sb = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));
const BASE = 'https://www.pwgotravel.com.tw';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const TRIPS = [
  { code: 'CTUKHH8D', regionUrl: '/china/' },
  { code: 'DAD5BE5D', regionUrl: '/vietnam/' },
];

for (const trip of TRIPS) {
  console.log(`\n=== ${trip.code} ===`);

  // 找 trip ID
  const { data: dbTrips } = await sb.from('trips')
    .select('id, title, cover_image_url')
    .eq('is_active', true)
    .contains('trip_banner', { code_label: trip.code });

  if (!dbTrips?.length) {
    console.log('DB 找不到');
    continue;
  }

  const dbTrip = dbTrips[0];
  console.log(`DB: ${dbTrip.title.substring(0, 50)}`);

  // 從朋威找圖
  let imgUrl = '';
  const res = await fetch(BASE + trip.regionUrl, { headers: { 'User-Agent': UA } });
  const html = await res.text();
  const ch = cheerio.load(html);

  ch('a').each((_, link) => {
    if (imgUrl) return;
    const href = ch(link).attr('href') || '';
    if (!href.includes(trip.code)) return;
    const img = ch(link).find('img');
    const src = img.attr('data-src') || img.attr('data-original') || img.attr('data-lazy') || img.attr('src') || '';
    console.log(`  img: src="${img.attr('src')?.substring(0, 50)}" data-src="${img.attr('data-src')?.substring(0, 80)}"`);
    if (src && src.length > 20 && src.includes('/')) {
      imgUrl = src.startsWith('http') ? src : src.startsWith('//') ? `https:${src}` : `${BASE}${src}`;
    }
  });

  // fallback: 詳情頁
  if (!imgUrl) {
    console.log('  嘗試詳情頁...');
    try {
      const dr = await fetch(`${BASE}/products/mold-new/${trip.code}`, { headers: { 'User-Agent': UA } });
      const dh = await dr.text();
      const dc = cheerio.load(dh);
      const og = dc('meta[property="og:image"]').attr('content') || '';
      if (og && og.length > 20) {
        imgUrl = og.startsWith('http') ? og : og.startsWith('//') ? `https:${og}` : `${BASE}${og}`;
      }
      if (!imgUrl) {
        dc('img').each((_, el) => {
          if (imgUrl) return;
          const s = dc(el).attr('src') || dc(el).attr('data-src') || '';
          if (s.includes('dcimg') || s.includes('material-alias')) {
            imgUrl = s.startsWith('http') ? s : s.startsWith('//') ? `https:${s}` : `${BASE}${s}`;
          }
        });
      }
    } catch (e) {
      console.log('  詳情頁失敗:', e.message);
    }
  }

  if (!imgUrl) {
    console.log('  ❌ 找不到圖片');
    continue;
  }

  console.log(`  圖片: ${imgUrl.substring(0, 80)}`);

  // 下載
  const imgRes = await fetch(imgUrl, { headers: { 'User-Agent': UA, 'Referer': BASE } });
  const buf = Buffer.from(await imgRes.arrayBuffer());
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8;
  const isPng = buf[0] === 0x89 && buf[1] === 0x50;
  console.log(`  下載: ${buf.length} bytes, ${isJpeg ? 'JPEG' : isPng ? 'PNG' : 'UNKNOWN ' + buf.slice(0, 4).toString('hex')}`);

  if (buf.length < 2000 || (!isJpeg && !isPng)) {
    console.log('  ❌ 不是有效圖片');
    continue;
  }

  // 刪舊 + 上傳
  if (dbTrip.cover_image_url?.includes('supabase')) {
    const oldPath = dbTrip.cover_image_url.split('/images/')[1]?.split('?')[0];
    if (oldPath) await sb.storage.from('images').remove([oldPath]);
  }

  const ext = isPng ? 'png' : 'jpg';
  const path = `trips/${trip.code}-${Date.now()}.${ext}`;
  const { error: upErr } = await sb.storage.from('images').upload(path, buf, {
    contentType: isJpeg ? 'image/jpeg' : 'image/png',
    upsert: true,
  });

  if (upErr) { console.log(`  ❌ 上傳: ${upErr.message}`); continue; }

  const publicUrl = sb.storage.from('images').getPublicUrl(path).data.publicUrl + '?v=' + Date.now();
  const { error } = await sb.from('trips').update({ cover_image_url: publicUrl }).eq('id', dbTrip.id);
  if (error) console.log(`  ❌ DB: ${error.message}`);
  else console.log(`  ✅ 修好了 (${(buf.length / 1024).toFixed(0)}KB)`);
}

// 最終驗證
console.log('\n=== 最終驗證 ===');
for (const trip of TRIPS) {
  const { data } = await sb.from('trips')
    .select('cover_image_url')
    .eq('is_active', true)
    .contains('trip_banner', { code_label: trip.code });
  if (data?.[0]) {
    const r = await fetch(data[0].cover_image_url, { signal: AbortSignal.timeout(5000) });
    const b = Buffer.from(await r.arrayBuffer());
    const ok = (b[0] === 0xff && b[1] === 0xd8) || (b[0] === 0x89 && b[1] === 0x50);
    console.log(`${trip.code}: ${ok ? '✅' : '❌'} ${b.length} bytes`);
  }
}
