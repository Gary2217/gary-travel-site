/**
 * 更新既有中亞行程：title/price/trip_banner/departures（圖片不動）
 * 用法: node scripts/update-central-asia-trips.mjs
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = readFileSync('.env.local', 'utf8');
const getEnv = (k) => { const m = env.match(new RegExp(`^${k}=(.+)$`, 'm')); return m ? m[1].trim() : null; };
const sb = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));

// 既有 trip ID → 朋威資料 mapping
const updates = [
  {
    tripId: '666a117d-485c-4d27-9bfc-22fcdb28f71a',
    title: '古絲路中亞三國13日~哈薩克、吉爾吉斯、烏茲別克',
    subtitle: '韓亞航空｜恰倫大峽谷、坎迪湖、伊塞克湖、布哈拉古城、撒馬爾罕',
    duration: '13天12夜',
    price_range: 'NT$159,000起',
    trip_banner: {
      code_label: 'ALA4AA13', price_label: 'NT$159,000起',
      tags: ['古文明', '優質深度', '文化懷古', '文化藝術', '宗教朝聖', '歷史古蹟'],
      departure_label: '桃園出發', duration_label: '13天12夜',
      seats_total: 16, seats_available: null, deposit_label: '', min_group_size: 16,
    },
    flightSegments: [
      { date: '', airline: '韓亞航空（OZ）', flight_number: 'OZ712', dep_time: '12:55', dep_airport: '桃園國際機場', arr_time: '16:30', arr_airport: '仁川機場', next_day: false },
      { date: '', airline: '韓亞航空（OZ）', flight_number: 'OZ577', dep_time: '18:05', dep_airport: '仁川機場', arr_time: '20:40', arr_airport: '阿拉木圖國際機場', next_day: false },
      { date: '', airline: '韓亞航空（OZ）', flight_number: 'OZ574', dep_time: '22:05', dep_airport: '塔什干國際機場', arr_time: '08:35', arr_airport: '仁川機場', next_day: true },
      { date: '', airline: '韓亞航空（OZ）', flight_number: 'OZ711', dep_time: '10:00', dep_airport: '仁川機場', arr_time: '11:30', arr_airport: '桃園國際機場', next_day: false },
    ],
    departures: [
      { date: '2026-08-24', airline: '韓亞航空（OZ）', price: 159000, total: 16, avail: 15, label: '午去早回', city: '桃園' },
      { date: '2026-09-21', airline: '韓亞航空（OZ）', price: 159000, total: 16, avail: 15, label: '午去早回', city: '桃園' },
      { date: '2026-10-19', airline: '韓亞航空（OZ）', price: 159000, total: 16, avail: 15, label: '午去早回', city: '桃園' },
    ],
  },
  {
    tripId: 'f971807d-2391-4f1c-afff-ebb44b5cfba2',
    title: '中亞藍色圓頂國度烏茲別克9日~三大城市+奇姆甘山、兩段高鐵、美食手作家訪',
    subtitle: '中國東方航空｜布哈拉、撒馬爾罕、塔什干、奇姆甘山纜車、陶瓷DIY',
    duration: '9天8夜',
    price_range: 'NT$79,000起',
    trip_banner: {
      code_label: 'TAS4AD9D', price_label: 'NT$79,000起',
      tags: ['古文明', '特別推薦', '文化懷古', '文化知性', '歷史古蹟'],
      departure_label: '松山出發', duration_label: '9天8夜',
      seats_total: 16, seats_available: null, deposit_label: '', min_group_size: 11,
    },
    flightSegments: [
      { date: '', airline: '中國東方航空（MU）', flight_number: 'MU5098', dep_time: '17:15', dep_airport: '台北松山機場', arr_time: '18:55', arr_airport: '虹橋機場', next_day: false },
      { date: '', airline: '中國東方航空（MU）', flight_number: 'MU6037', dep_time: '13:45', dep_airport: '浦東機場', arr_time: '18:40', arr_airport: '塔什干國際機場', next_day: false },
      { date: '', airline: '中國東方航空（MU）', flight_number: 'MU6038', dep_time: '20:20', dep_airport: '塔什干國際機場', arr_time: '05:50', arr_airport: '浦東機場', next_day: true },
      { date: '', airline: '上海航空（FM）', flight_number: 'FM801', dep_time: '09:10', dep_airport: '浦東機場', arr_time: '11:00', arr_airport: '台北松山機場', next_day: false },
    ],
    departures: [
      { date: '2026-06-22', airline: '中國東方航空（MU）', price: 79000, total: 16, avail: 15, label: '晚去早回', city: '松山' },
      { date: '2026-07-20', airline: '中國東方航空（MU）', price: 83000, total: 16, avail: 15, label: '晚去早回', city: '松山' },
      { date: '2026-08-24', airline: '中國東方航空（MU）', price: 83000, total: 16, avail: 15, label: '晚去早回', city: '松山' },
      { date: '2026-09-14', airline: '中國東方航空（MU）', price: 84000, total: 16, avail: 13, label: '晚去早回', city: '松山' },
      { date: '2026-10-12', airline: '中國東方航空（MU）', price: 84000, total: 16, avail: 10, label: '晚去早回', city: '松山' },
    ],
  },
  {
    tripId: '58e35dd2-6229-4af6-a99a-b671f8beaf35',
    title: '神秘絲路之心~中亞五國哈薩克、吉爾吉斯、烏茲別克、塔吉克、土庫曼17天',
    subtitle: '韓亞航空｜五國深度遊、地獄之門、希瓦古城、杜尚比、苦盞堡壘',
    duration: '17天16夜',
    price_range: 'NT$229,000起',
    trip_banner: {
      code_label: 'ALA5AA18', price_label: 'NT$229,000起',
      tags: ['古文明', '特別推薦', '優質深度', '文化懷古', '自然生態', '城市巡禮', '歷史古蹟'],
      departure_label: '桃園出發', duration_label: '17天16夜',
      seats_total: 16, seats_available: null, deposit_label: '', min_group_size: 16,
    },
    flightSegments: [
      { date: '', airline: '韓亞航空（OZ）', flight_number: 'OZ712', dep_time: '13:50', dep_airport: '桃園國際機場', arr_time: '17:25', arr_airport: '仁川機場', next_day: false },
      { date: '', airline: '韓亞航空（OZ）', flight_number: 'OZ577', dep_time: '18:15', dep_airport: '仁川機場', arr_time: '20:50', arr_airport: '阿拉木圖國際機場', next_day: false },
      { date: '', airline: '韓亞航空（OZ）', flight_number: 'OZ574', dep_time: '21:40', dep_airport: '塔什干國際機場', arr_time: '07:55', arr_airport: '仁川機場', next_day: true },
      { date: '', airline: '韓亞航空（OZ）', flight_number: 'OZ711', dep_time: '10:15', dep_airport: '仁川機場', arr_time: '11:50', arr_airport: '桃園國際機場', next_day: false },
    ],
    departures: [
      { date: '2026-07-05', airline: '韓亞航空（OZ）', price: 229000, total: 16, avail: 15, label: '午去早回', city: '桃園' },
      { date: '2026-07-26', airline: '韓亞航空（OZ）', price: 229000, total: 16, avail: 15, label: '午去早回', city: '桃園' },
      { date: '2026-08-16', airline: '韓亞航空（OZ）', price: 229000, total: 16, avail: 15, label: '午去早回', city: '桃園' },
      { date: '2026-09-06', airline: '韓亞航空（OZ）', price: 229000, total: 16, avail: 11, label: '午去早回', city: '桃園' },
      { date: '2026-10-19', airline: '中國東方航空（MU）', price: 229000, total: 16, avail: 16, label: '午去早回', city: '桃園' },
    ],
  },
  {
    tripId: '67b87216-1d8b-4d7b-a88b-1f0f59ab964f',
    title: '古絲路中亞三國15日~哈薩克、吉爾吉斯、烏茲別克',
    subtitle: '中國國際航空｜布哈拉、撒馬爾罕、伊塞克湖、恰倫大峽谷、坎迪湖',
    duration: '15天14夜',
    price_range: 'NT$159,000起',
    trip_banner: {
      code_label: 'ALA4AA15', price_label: 'NT$159,000起',
      tags: ['古文明', '優質深度', '文化懷古', '文化藝術', '宗教朝聖', '歷史古蹟'],
      departure_label: '桃園出發', duration_label: '15天14夜',
      seats_total: 16, seats_available: null, deposit_label: '', min_group_size: 10,
    },
    flightSegments: [
      { date: '', airline: '中國國際航空（CA）', flight_number: 'CA186', dep_time: '13:15', dep_airport: '桃園國際機場', arr_time: '16:25', arr_airport: '北京首都機場', next_day: false },
      { date: '', airline: '中國國際航空（CA）', flight_number: 'CA777', dep_time: '16:15', dep_airport: '北京首都機場', arr_time: '19:30', arr_airport: '塔什干國際機場', next_day: false },
      { date: '', airline: '中國國際航空（CA）', flight_number: 'CA800', dep_time: '21:30', dep_airport: '阿拉木圖國際機場', arr_time: '05:20', arr_airport: '北京首都機場', next_day: true },
      { date: '', airline: '中國國際航空（CA）', flight_number: 'CA185', dep_time: '08:20', dep_airport: '北京首都機場', arr_time: '11:40', arr_airport: '桃園國際機場', next_day: false },
    ],
    departures: [
      { date: '2026-06-29', airline: '中國國際航空（CA）', price: 159000, total: 16, avail: 15, label: '午去早回', city: '桃園' },
      { date: '2026-07-20', airline: '中國國際航空（CA）', price: 159000, total: 16, avail: 15, label: '午去早回', city: '桃園' },
      { date: '2026-08-24', airline: '中國國際航空（CA）', price: 159000, total: 16, avail: 15, label: '午去早回', city: '桃園' },
      { date: '2026-09-28', airline: '中國國際航空（CA）', price: 159000, total: 16, avail: 15, label: '午去早回', city: '桃園' },
    ],
  },
  {
    tripId: '0f448466-0962-43b5-9443-2cecf744a5d8',
    title: '走訪中亞之心烏茲別克8日~三大城市、兩段高鐵',
    subtitle: '韓亞航空｜布哈拉、撒馬爾罕、塔什干、陶瓷DIY、做饢體驗、啤酒工廠',
    duration: '8天7夜',
    price_range: 'NT$82,000起',
    trip_banner: {
      code_label: 'TAS4AC8D', price_label: 'NT$82,000起',
      tags: ['古文明', '特別推薦', '文化懷古', '文化知性', '歷史古蹟'],
      departure_label: '桃園出發', duration_label: '8天7夜',
      seats_total: 16, seats_available: null, deposit_label: '', min_group_size: 11,
    },
    flightSegments: [
      { date: '', airline: '韓亞航空（OZ）', flight_number: 'OZ714', dep_time: '16:30', dep_airport: '桃園國際機場', arr_time: '19:50', arr_airport: '仁川機場', next_day: false },
      { date: '', airline: '韓亞航空（OZ）', flight_number: 'OZ573', dep_time: '16:15', dep_airport: '仁川機場', arr_time: '20:00', arr_airport: '塔什干國際機場', next_day: false },
      { date: '', airline: '韓亞航空（OZ）', flight_number: 'OZ574', dep_time: '21:40', dep_airport: '塔什干國際機場', arr_time: '07:55', arr_airport: '仁川機場', next_day: true },
      { date: '', airline: '韓亞航空（OZ）', flight_number: 'OZ713', dep_time: '13:50', dep_airport: '仁川機場', arr_time: '15:30', arr_airport: '桃園國際機場', next_day: false },
    ],
    departures: [
      { date: '2026-06-11', airline: '韓亞航空（OZ）', price: 82000, total: 16, avail: 15, label: '午去午回', city: '桃園' },
      { date: '2026-07-16', airline: '韓亞航空（OZ）', price: 82000, total: 16, avail: 15, label: '午去午回', city: '桃園' },
      { date: '2026-08-20', airline: '韓亞航空（OZ）', price: 82000, total: 16, avail: 15, label: '午去午回', city: '桃園' },
      { date: '2026-09-17', airline: '韓亞航空（OZ）', price: 82000, total: 16, avail: 15, label: '午去午回', city: '桃園' },
    ],
  },
];

async function main() {
  for (const u of updates) {
    console.log(`\n📦 更新: ${u.title}`);

    // 1. 更新 trip（保留既有 trip_banner 中的 side_image_url 等欄位）
    const { data: existing } = await sb.from('trips').select('trip_banner').eq('id', u.tripId).single();
    const mergedBanner = { ...(existing?.trip_banner || {}), ...u.trip_banner };
    // 保留 side_image_url 和 departure_info_map
    if (existing?.trip_banner?.side_image_url) mergedBanner.side_image_url = existing.trip_banner.side_image_url;
    if (existing?.trip_banner?.departure_info_map) mergedBanner.departure_info_map = existing.trip_banner.departure_info_map;

    const { error: updateErr } = await sb.from('trips').update({
      title: u.title,
      subtitle: u.subtitle,
      duration: u.duration,
      price_range: u.price_range,
      trip_banner: mergedBanner,
    }).eq('id', u.tripId);

    if (updateErr) { console.error(`  ❌ 更新失敗: ${updateErr.message}`); continue; }
    console.log('  ✅ trip 欄位已更新');

    // 2. 刪除舊出發日期
    const { error: delErr } = await sb.from('trip_departure_dates').delete().eq('trip_id', u.tripId);
    if (delErr) console.error(`  ⚠️ 刪除舊日期失敗: ${delErr.message}`);
    else console.log('  🗑️ 舊出發日期已清除');

    // 3. 插入新出發日期（含 flight_segments + label）
    for (const dep of u.departures) {
      const out = u.flightSegments[0];
      const ret = u.flightSegments[u.flightSegments.length - 1];
      const { error: insErr } = await sb.from('trip_departure_dates').insert({
        trip_id: u.tripId,
        departure_date: dep.date,
        departure_city: dep.city,
        airline: dep.airline,
        price: dep.price,
        label: dep.label,
        seats_total: dep.total,
        seats_available: dep.avail,
        outbound_flight: out?.flight_number || null,
        outbound_time: out?.dep_time || null,
        outbound_from: out?.dep_airport || null,
        outbound_arrival_time: out?.arr_time || null,
        outbound_to: out?.arr_airport || null,
        outbound_next_day: out?.next_day || false,
        return_date: null,
        return_flight: ret?.flight_number || null,
        return_time: ret?.dep_time || null,
        return_from: ret?.dep_airport || null,
        return_arrival_time: ret?.arr_time || null,
        return_to: ret?.arr_airport || null,
        return_next_day: ret?.next_day || false,
        flight_segments: u.flightSegments,
        is_active: true,
      });
      if (insErr) console.error(`  ❌ ${dep.date} 失敗: ${insErr.message}`);
      else console.log(`  📅 ${dep.date} | ${dep.airline} | NT$${dep.price.toLocaleString()} | ${dep.label}`);
    }
  }

  // 第6個 (b8d1f7ff TAS4A10D) 朋威已下架，只更新 trip_banner code
  console.log('\n📦 TAS4A10D (朋威已下架) - 僅更新 code_label');
  const { data: t6 } = await sb.from('trips').select('trip_banner').eq('id', 'b8d1f7ff-7635-41fe-a969-2b2f9b8fcd23').single();
  const b6 = { ...(t6?.trip_banner || {}), code_label: 'TAS4A10D', custom_tour: true };
  await sb.from('trips').update({ trip_banner: b6 }).eq('id', 'b8d1f7ff-7635-41fe-a969-2b2f9b8fcd23');
  console.log('  ✅ 已設為包團/客製');

  console.log('\n✅ 全部完成！');
}

main().catch(console.error);
