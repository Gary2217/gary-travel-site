import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const getEnv = (k) => { const m = env.match(new RegExp(`^${k}=(.+)$`, 'm')); return m ? m[1].trim() : null; };
const sb = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));
const BASE_URL = 'https://www.pwgotravel.com.tw';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

// ===== 1. CTUKHH8D: 高雄出發 九寨溝 → 張家界/九寨溝 destination =====
// 從 china 西南地區
const chinaRes = await fetch(BASE_URL + '/china/', { headers: { 'User-Agent': UA } });
const chinaHtml = await chinaRes.text();
const ch = cheerio.load(chinaHtml);

let ctuTrip = null;
ch('.row.expand-graphics').each((_, container) => {
  ch(container).find('.item-box a[href*="/products/"]').each((_, link) => {
    const href = ch(link).attr('href') || '';
    if (href.includes('CTUKHH8D')) {
      const title = ch(link).find('h3').text().replace(/\s+/g, ' ').trim();
      const price = ch(link).find('h4').text().replace(/\s+/g, ' ').trim();
      const img = ch(link).find('img').attr('src') || '';
      const imgUrl = img.startsWith('http') ? img : img.startsWith('//') ? `https:${img}` : `${BASE_URL}${img}`;
      const tags = [];
      ch(link).find('.item_tag').each((_, t) => tags.push(ch(t).text().replace(/\s+/g, ' ').trim()));
      ctuTrip = { code: 'CTUKHH8D', title, price, imgUrl, tags };
    }
  });
});

console.log('CTUKHH8D:', ctuTrip);

// ===== 2. DAD5BE5D: 春節限定峴港 → 越南 destination =====
const vnRes = await fetch(BASE_URL + '/vietnam/', { headers: { 'User-Agent': UA } });
const vnHtml = await vnRes.text();
const vch = cheerio.load(vnHtml);

let dadTrip = null;
vch('.row.expand-graphics').each((_, container) => {
  vch(container).find('.item-box a[href*="/products/"]').each((_, link) => {
    const href = vch(link).attr('href') || '';
    if (href.includes('DAD5BE5D')) {
      const title = vch(link).find('h3').text().replace(/\s+/g, ' ').trim();
      const price = vch(link).find('h4').text().replace(/\s+/g, ' ').trim();
      const img = vch(link).find('img').attr('src') || '';
      const imgUrl = img.startsWith('http') ? img : img.startsWith('//') ? `https:${img}` : `${BASE_URL}${img}`;
      const tags = [];
      vch(link).find('.item_tag').each((_, t) => tags.push(vch(t).text().replace(/\s+/g, ' ').trim()));
      dadTrip = { code: 'DAD5BE5D', title, price, imgUrl, tags };
    }
  });
});

console.log('DAD5BE5D:', dadTrip);

// ===== 3. 找 destination IDs =====
// 張家界/九寨溝
const { data: zjjDest } = await sb.from('destinations')
  .select('id, title')
  .ilike('title', '%張家界%')
  .single();

// 越南
const { data: vnDest } = await sb.from('destinations')
  .select('id, title')
  .eq('title', '越南')
  .single();

console.log('張家界 dest:', zjjDest?.id, zjjDest?.title);
console.log('越南 dest:', vnDest?.id, vnDest?.title);

// ===== 4. 上傳圖片並新增行程 =====
async function uploadImg(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) return url;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 2000) return url;
    const path = `trips/new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.jpg`;
    const { error } = await sb.storage.from('images').upload(path, buf, { contentType: 'image/jpeg', upsert: true });
    if (error) return url;
    return sb.storage.from('images').getPublicUrl(path).data.publicUrl + '?v=' + Date.now();
  } catch { return url; }
}

async function addTrip(destId, trip, subArea) {
  const coverUrl = await uploadImg(trip.imgUrl);
  const priceMatch = trip.price.match(/[\d,]+/);
  const priceRange = priceMatch ? `NT$${priceMatch[0]}起` : '';
  const durationMatch = trip.title.match(/(\d+)[日天]/);
  const days = durationMatch ? Number(durationMatch[1]) : 8;

  // 取得目前最大 display_order
  const { data: existing } = await sb.from('trips')
    .select('display_order')
    .eq('destination_id', destId)
    .eq('is_active', true)
    .order('display_order', { ascending: false })
    .limit(1);
  
  const maxOrder = existing?.[0]?.display_order || 0;
  const newOrder = maxOrder + 1;

  const { data, error } = await sb.from('trips').insert({
    destination_id: destId,
    title: trip.title,
    subtitle: trip.tags.length ? trip.tags.join('、') : trip.title,
    duration: `${days}天${days - 1}夜`,
    price_range: priceRange,
    highlights: [],
    is_active: true,
    display_order: newOrder,
    cover_image_url: coverUrl,
    trip_banner: {
      code_label: trip.code,
      price_label: priceRange,
      tags: trip.tags,
      departure_label: trip.title.includes('高雄') ? '高雄出發' : '桃園出發',
      duration_label: `${days}天${days - 1}夜`,
      custom_tour: true,
      sub_area: subArea,
    },
  }).select('id').single();

  if (error) console.log(`  ❌ ${trip.code}: ${error.message}`);
  else console.log(`  ✅ 新增: ${trip.title.substring(0, 50)} (${trip.code}) → order ${newOrder}`);
}

// 新增
if (ctuTrip && zjjDest) {
  console.log('\n新增 CTUKHH8D 到 張家界/九寨溝...');
  await addTrip(zjjDest.id, ctuTrip, '九寨溝');
}

if (dadTrip && vnDest) {
  console.log('\n新增 DAD5BE5D 到 越南...');
  await addTrip(vnDest.id, dadTrip, '中越');
}

// ===== 5. 驗證 =====
console.log('\n=== 驗證 ===');

const { data: zjjTrips } = await sb.from('trips')
  .select('title, trip_banner, is_active')
  .eq('destination_id', zjjDest.id)
  .eq('is_active', true);
console.log(`張家界/九寨溝: ${zjjTrips.length} active trips`);

const { data: vnTrips } = await sb.from('trips')
  .select('title, trip_banner, is_active')
  .eq('destination_id', vnDest.id)
  .eq('is_active', true);
console.log(`越南: ${vnTrips.length} active trips`);

// 最終全域 code 比對
const { data: allActive } = await sb.from('trips')
  .select('trip_banner')
  .eq('is_active', true);
const allCodes = new Set(allActive.map(t => t.trip_banner?.code_label).filter(Boolean));
console.log(`\n全站 active codes: ${allCodes.size}`);
