import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const getEnv = (k) => { const m = env.match(new RegExp(`^${k}=(.+)$`, 'm')); return m ? m[1].trim() : null; };
const sb = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));
const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const BASE_URL = 'https://www.pwgotravel.com.tw';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

function sanitize(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

// 1. 朋威馬爾地夫行程
const res = await fetch(BASE_URL + '/southasia/', { headers: { 'User-Agent': UA } });
const html = await res.text();
const ch = cheerio.load(html);

const pwTrips = [];
ch('.row.expand-graphics').each((_, container) => {
  const section = sanitize(ch(container).parent().find('.header-title').first().text());
  if (!section.includes('馬爾地夫')) return;
  ch(container).find('.item-box a[href*="/products/"]').each((i, link) => {
    const title = sanitize(ch(link).find('h3').text());
    const href = ch(link).attr('href') || '';
    const fullHref = href.startsWith('http') ? href : BASE_URL + href;
    const codeMatch = href.match(/mold-new\/([A-Z0-9]+)/i);
    const code = codeMatch ? codeMatch[1].split('?')[0] : '';
    const img = ch(link).find('img').attr('src') || '';
    const imgUrl = img.startsWith('http') ? img : img.startsWith('//') ? `https:${img}` : `${BASE_URL}${img}`;
    const price = sanitize(ch(link).find('h4').text());
    const tags = [];
    ch(link).find('.item_tag').each((_, t) => tags.push(sanitize(ch(t).text())));
    pwTrips.push({ order: i + 1, title, code, href: fullHref, imgUrl, price, tags });
  });
});

console.log(`朋威馬爾地夫: ${pwTrips.length} 筆`);
pwTrips.forEach(t => console.log(`  ${t.order}. ${t.title} | ${t.code} | ${t.price}`));

// 2. 我們的 DB
const DEST_ID = 'c3520acb-b12e-43b7-8ab7-d2fe44475191';
const { data: dbTrips } = await sb.from('trips')
  .select('id, title, trip_banner, is_active')
  .eq('destination_id', DEST_ID);

console.log(`\n我們 DB: ${dbTrips.filter(t => t.is_active).length} 筆 active, ${dbTrips.filter(t => !t.is_active).length} 筆 inactive`);
dbTrips.forEach(t => console.log(`  ${t.is_active ? '✅' : '❌'} ${t.title.substring(0, 40)} | ${t.trip_banner?.code_label || '?'}`));

// 3. 找缺少的
const dbCodes = new Set(dbTrips.filter(t => t.is_active).map(t => t.trip_banner?.code_label).filter(Boolean));
const missing = pwTrips.filter(t => !dbCodes.has(t.code));
console.log(`\n缺少: ${missing.length} 筆`);

// 4. 匯入缺少的
for (const m of missing) {
  // 檢查是否有 inactive 的可以恢復
  const inactive = dbTrips.find(t => !t.is_active && t.trip_banner?.code_label === m.code);
  if (inactive) {
    await sb.from('trips').update({ is_active: true }).eq('id', inactive.id);
    console.log(`  🔄 恢復: ${inactive.title.substring(0, 40)}`);
    continue;
  }

  // 上傳圖片
  let coverUrl = m.imgUrl;
  try {
    const imgRes = await fetch(m.imgUrl, { headers: { 'User-Agent': UA } });
    if (imgRes.ok) {
      const buf = Buffer.from(await imgRes.arrayBuffer());
      if (buf.length > 2000) {
        const path = `trips/new-${Date.now()}.jpg`;
        const { error } = await sb.storage.from('images').upload(path, buf, { contentType: 'image/jpeg', upsert: true });
        if (!error) coverUrl = sb.storage.from('images').getPublicUrl(path).data.publicUrl + '?v=' + Date.now();
      }
    }
  } catch {}

  const priceMatch = m.price.match(/[\d,]+/);
  const priceRange = priceMatch ? `NT$${priceMatch[0]}起` : '';
  const durationMatch = m.title.match(/(\d+)日/);
  const days = durationMatch ? Number(durationMatch[1]) : 7;

  const { data: inserted, error } = await sb.from('trips').insert({
    destination_id: DEST_ID,
    title: m.title,
    subtitle: m.tags.length ? m.tags.join('、') : m.title,
    duration: `${days}天${days - 1}夜`,
    price_range: priceRange,
    highlights: [],
    is_active: true,
    display_order: m.order,
    cover_image_url: coverUrl,
    trip_banner: {
      code_label: m.code,
      price_label: priceRange,
      tags: m.tags,
      departure_label: '桃園出發',
      duration_label: `${days}天${days - 1}夜`,
      custom_tour: true,
      sub_area: '馬爾地夫',
    },
  }).select('id').single();

  if (error) console.log(`  ❌ ${m.title.substring(0, 35)}: ${error.message}`);
  else console.log(`  ✅ 新增: ${m.title.substring(0, 35)} (${m.code})`);
}

// 驗證
const { data: final } = await sb.from('trips').select('title').eq('destination_id', DEST_ID).eq('is_active', true);
console.log(`\n最終: ${final.length} 筆 active`);
final.forEach(t => console.log(`  - ${t.title}`));
