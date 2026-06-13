import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const getEnv = (k) => { const m = env.match(new RegExp(`^${k}=(.+)$`, 'm')); return m ? m[1].trim() : null; };
const sb = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));
const BASE = 'https://www.pwgotravel.com.tw';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0';

// ===== 1. URCFT8D: 設 custom_tour + 清除出發日期 =====
console.log('=== 1. URCFT8D: 設 custom_tour ===');
const { data: urcft } = await sb.from('trips')
  .select('id, title, trip_banner')
  .eq('is_active', true)
  .contains('trip_banner', { code_label: 'URCFT8D' });

if (urcft?.length) {
  const t = urcft[0];
  const banner = { ...t.trip_banner, custom_tour: true };
  await sb.from('trips').update({ trip_banner: banner }).eq('id', t.id);
  // 刪除出發日期
  const { data: dates } = await sb.from('trip_departure_dates').select('id').eq('trip_id', t.id);
  if (dates?.length) {
    await sb.from('trip_departure_dates').delete().eq('trip_id', t.id);
    console.log(`  刪除 ${dates.length} 筆出發日期`);
  }
  console.log(`  ✅ URCFT8D → custom_tour=true`);
}

// ===== 2. URC4AA13D: 加出發日期 9/12, 9/14, 9/18 + 取消 custom_tour =====
console.log('\n=== 2. URC4AA13D: 加出發日期 ===');
const { data: urc13 } = await sb.from('trips')
  .select('id, title, trip_banner, price_range')
  .eq('is_active', true)
  .contains('trip_banner', { code_label: 'URC4AA13D' });

if (urc13?.length) {
  const t = urc13[0];
  const banner = { ...t.trip_banner, custom_tour: false };
  await sb.from('trips').update({ trip_banner: banner }).eq('id', t.id);
  
  // 先刪舊日期
  await sb.from('trip_departure_dates').delete().eq('trip_id', t.id);
  
  // 加新日期（從 PDF: 9/12, 9/14, 9/18）
  const departures = [
    { trip_id: t.id, departure_date: '2025-09-12', price: null, seats_available: 0, seats_total: 0, label: null, departure_city: '桃園', airline: '南方航空' },
    { trip_id: t.id, departure_date: '2025-09-14', price: null, seats_available: 0, seats_total: 0, label: null, departure_city: '桃園', airline: '南方航空' },
    { trip_id: t.id, departure_date: '2025-09-18', price: null, seats_available: 0, seats_total: 0, label: null, departure_city: '桃園', airline: '南方航空' },
  ];
  const { error } = await sb.from('trip_departure_dates').insert(departures);
  if (error) console.log(`  ❌ ${error.message}`);
  else console.log(`  ✅ URC4AA13D → custom_tour=false, 3 筆出發日期`);
}

// ===== 3. 掃描朋威 /china/ 所有行程的出團狀態 =====
console.log('\n=== 3. 掃描朋威出團狀態 ===\n');

const REGION_ID = '101d01ad-832d-405a-9625-48a08b44349c';
const { data: dests } = await sb.from('destinations').select('id').eq('region_id', REGION_ID).eq('is_active', true);
const { data: dbTrips } = await sb.from('trips')
  .select('id, title, trip_banner')
  .eq('is_active', true)
  .in('destination_id', dests.map(d => d.id));

// 抓朋威 china 頁面所有行程詳情頁，檢查出團狀態
const res = await fetch(BASE + '/china/', { headers: { 'User-Agent': UA } });
const html = await res.text();
const ch = cheerio.load(html);

const pwTrips = [];
ch('.item-box a[href*="/products/"]').each((_, link) => {
  const href = ch(link).attr('href') || '';
  const m = href.match(/mold-new\/([A-Z0-9]+)/i);
  if (m) pwTrips.push({ code: m[1].split('?')[0], href: href.startsWith('http') ? href : BASE + href });
});

console.log(`朋威 china: ${pwTrips.length} 個行程\n`);

// 逐一檢查詳情頁的出團狀態
const needCustomTour = [];

for (const pw of pwTrips) {
  try {
    const r = await fetch(pw.href, { headers: { 'User-Agent': UA } });
    const h = await r.text();
    const dc = cheerio.load(h);
    
    // 找出發日期表格中的「出團狀態」欄
    let allCallInquiry = false;
    const statusTexts = [];
    dc('table').each((_, table) => {
      dc(table).find('tr').each((_, row) => {
        const cells = dc(row).find('td');
        cells.each((_, cell) => {
          const text = dc(cell).text().trim();
          if (text.includes('請來電') || text.includes('洽詢') || text.includes('電洽')) {
            statusTexts.push(text);
          }
        });
      });
    });
    
    // 也檢查整個頁面的出團狀態
    const pageText = h;
    const hasNormalDates = pageText.includes('可報名') || pageText.includes('報名中') || pageText.includes('收訂中');
    const hasCallInquiry = statusTexts.length > 0;
    
    // 如果有出發日期但全部都是「請來電洽詢」
    if (hasCallInquiry && !hasNormalDates) {
      allCallInquiry = true;
    }
    
    const dbTrip = dbTrips.find(t => t.trip_banner?.code_label === pw.code);
    const currentCustom = dbTrip?.trip_banner?.custom_tour || false;
    
    if (allCallInquiry && !currentCustom && dbTrip) {
      needCustomTour.push({ code: pw.code, title: dbTrip.title, id: dbTrip.id, statusCount: statusTexts.length });
      console.log(`🔒 ${pw.code} | 全部「請來電洽詢」(${statusTexts.length}筆) | ${dbTrip.title.substring(0, 40)}`);
    } else if (dbTrip) {
      const status = allCallInquiry ? '全洽詢' : hasCallInquiry ? '部分洽詢' : '正常';
      if (currentCustom) {
        console.log(`⏭️ ${pw.code} | 已是 custom_tour | ${dbTrip.title.substring(0, 40)}`);
      }
    }
  } catch (e) {
    console.log(`❌ ${pw.code}: ${e.message?.substring(0, 50)}`);
  }
  await new Promise(r => setTimeout(r, 500));
}

console.log(`\n=== 需設 custom_tour: ${needCustomTour.length} 筆 ===`);
for (const t of needCustomTour) {
  console.log(`  ${t.code} | ${t.title.substring(0, 50)}`);
}

// 執行設定
if (needCustomTour.length > 0) {
  console.log('\n執行設定...');
  for (const t of needCustomTour) {
    const trip = dbTrips.find(x => x.id === t.id);
    const banner = { ...(trip?.trip_banner || {}), custom_tour: true };
    const { error } = await sb.from('trips').update({ trip_banner: banner }).eq('id', t.id);
    if (error) console.log(`  ❌ ${t.code}: ${error.message}`);
    else console.log(`  ✅ ${t.code} → custom_tour=true`);
  }
}

// 最終統計
const { data: finalTrips } = await sb.from('trips')
  .select('trip_banner')
  .eq('is_active', true)
  .in('destination_id', dests.map(d => d.id));
const customCount = finalTrips.filter(t => t.trip_banner?.custom_tour).length;
const normalCount = finalTrips.filter(t => !t.trip_banner?.custom_tour).length;
console.log(`\n最終: custom_tour=${customCount}, 正常=${normalCount}, 共${finalTrips.length}`);
