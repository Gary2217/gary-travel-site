/**
 * 一次性腳本：將朋威旅行社中亞行程資料寫入 Supabase
 * 目標 destination: f1b28d9d-ecd7-4c68-97cb-cef84b417ecc
 *
 * 用法: node scripts/import-central-asia-trips.mjs
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

// 讀取 .env.local
const envContent = readFileSync('.env.local', 'utf8');
function getEnv(key) {
  const m = envContent.match(new RegExp(`^${key}=(.+)$`, 'm'));
  return m ? m[1].trim() : null;
}

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseServiceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('缺少 SUPABASE_URL 或 SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const DESTINATION_ID = 'f1b28d9d-ecd7-4c68-97cb-cef84b417ecc';

// ============================================================
// 5 個中亞行程資料（從朋威網站抓取）
// ============================================================
const tripsData = [
  {
    title: '古絲路中亞三國13日~哈薩克、吉爾吉斯、烏茲別克',
    subtitle: '韓亞航空｜恰倫大峽谷、坎迪湖、伊塞克湖、布哈拉古城、撒馬爾罕',
    duration: '13天12夜',
    price_range: 'NT$159,000起',
    highlights: ['恰倫大峽谷', '坎迪湖', '伊塞克湖遊船', '布蘭那塔', '布哈拉古城', '撒馬爾罕雷吉斯坦廣場', '兩段高鐵'],
    trip_banner: {
      code_label: 'ALA4AA13',
      price_label: 'NT$159,000起',
      tags: ['古文明', '優質深度', '文化懷古', '文化藝術', '宗教朝聖', '歷史古蹟'],
      departure_label: '桃園出發',
      duration_label: '13天12夜',
      seats_total: 16,
      seats_available: null,
      deposit_label: '',
      min_group_size: 16,
    },
    departures: [
      { date: '2026-08-24', airline: '韓亞航空', price: 159000, total: 16, avail: 15, schedule: '午去早回', city: '桃園' },
      { date: '2026-09-21', airline: '韓亞航空', price: 159000, total: 16, avail: 15, schedule: '午去早回', city: '桃園' },
      { date: '2026-10-19', airline: '韓亞航空', price: 159000, total: 16, avail: 15, schedule: '午去早回', city: '桃園' },
    ],
  },
  {
    title: '中亞藍色圓頂國度烏茲別克9日~三大城市+奇姆甘山、兩段高鐵、美食手作家訪',
    subtitle: '中國東方航空｜布哈拉、撒馬爾罕、塔什干、奇姆甘山纜車、陶瓷DIY',
    duration: '9天8夜',
    price_range: 'NT$79,000起',
    highlights: ['布哈拉古城', '撒馬爾罕古城', '奇姆甘山纜車', '兩段高鐵', '陶瓷DIY體驗', '做饢大師DIY', '傳統家訪'],
    trip_banner: {
      code_label: 'TAS4AD9D',
      price_label: 'NT$79,000起',
      tags: ['中亞', '烏茲別克', '絲路', '美食手作'],
      departure_label: '松山出發',
      duration_label: '9天8夜',
      seats_total: 16,
      seats_available: null,
      deposit_label: '',
      min_group_size: 11,
    },
    departures: [
      { date: '2026-06-22', airline: '中國東方航空', price: 79000, total: 16, avail: 15, schedule: '晚去早回', city: '松山' },
      { date: '2026-07-20', airline: '中國東方航空', price: 83000, total: 16, avail: 15, schedule: '晚去早回', city: '松山' },
      { date: '2026-08-24', airline: '中國東方航空', price: 83000, total: 16, avail: 15, schedule: '晚去早回', city: '松山' },
      { date: '2026-09-14', airline: '中國東方航空', price: 84000, total: 16, avail: 13, schedule: '晚去早回', city: '松山' },
      { date: '2026-10-12', airline: '中國東方航空', price: 84000, total: 16, avail: 10, schedule: '晚去早回', city: '松山' },
    ],
  },
  {
    title: '神秘絲路之心~中亞五國哈薩克、吉爾吉斯、烏茲別克、塔吉克、土庫曼17天',
    subtitle: '韓亞航空｜五國深度遊、地獄之門、希瓦古城、杜尚比、苦盞堡壘',
    duration: '17天16夜',
    price_range: 'NT$229,000起',
    highlights: ['中亞五國全覽', '恰倫大峽谷', '伊塞克湖', '希瓦古城', '地獄之門', '布哈拉古城', '撒馬爾罕', '杜尚比', '苦盞堡壘'],
    trip_banner: {
      code_label: 'ALA5AA18',
      price_label: 'NT$229,000起',
      tags: ['五國深度', '絲路', '古文明', '文化藝術'],
      departure_label: '桃園出發',
      duration_label: '17天16夜',
      seats_total: 16,
      seats_available: null,
      deposit_label: '',
      min_group_size: 16,
    },
    departures: [
      { date: '2026-07-05', airline: '韓亞航空', price: 229000, total: 16, avail: 15, schedule: '午去早回', city: '桃園' },
      { date: '2026-07-26', airline: '韓亞航空', price: 229000, total: 16, avail: 15, schedule: '午去早回', city: '桃園' },
      { date: '2026-08-16', airline: '韓亞航空', price: 229000, total: 16, avail: 15, schedule: '午去早回', city: '桃園' },
      { date: '2026-09-06', airline: '韓亞航空', price: 229000, total: 16, avail: 11, schedule: '午去早回', city: '桃園' },
      { date: '2026-10-19', airline: '中國東方航空', price: 229000, total: 16, avail: 16, schedule: '午去早回', city: '桃園' },
    ],
  },
  {
    title: '古絲路中亞三國15日~哈薩克、吉爾吉斯、烏茲別克',
    subtitle: '中國國際航空｜布哈拉、撒馬爾罕、伊塞克湖、恰倫大峽谷、坎迪湖',
    duration: '15天14夜',
    price_range: 'NT$159,000起',
    highlights: ['布哈拉古城', '撒馬爾罕雷吉斯坦廣場', '伊塞克湖獵鷹秀', '恰倫大峽谷', '坎迪湖', '騎馬體驗', '兩段高鐵'],
    trip_banner: {
      code_label: 'ALA4AA15',
      price_label: 'NT$159,000起',
      tags: ['古文明', '優質深度', '文化懷古'],
      departure_label: '桃園出發',
      duration_label: '15天14夜',
      seats_total: 16,
      seats_available: null,
      deposit_label: '',
      min_group_size: 10,
    },
    departures: [
      { date: '2026-06-29', airline: '中國國際航空', price: 159000, total: 16, avail: 15, schedule: '午去早回', city: '桃園' },
      { date: '2026-07-20', airline: '中國國際航空', price: 159000, total: 16, avail: 15, schedule: '午去早回', city: '桃園' },
      { date: '2026-08-24', airline: '中國國際航空', price: 159000, total: 16, avail: 15, schedule: '午去早回', city: '桃園' },
      { date: '2026-09-28', airline: '中國國際航空', price: 159000, total: 16, avail: 15, schedule: '午去早回', city: '桃園' },
    ],
  },
  {
    title: '走訪中亞之心烏茲別克8日~三大城市、兩段高鐵',
    subtitle: '韓亞航空｜布哈拉、撒馬爾罕、塔什干、陶瓷DIY、做饢體驗、啤酒工廠',
    duration: '8天7夜',
    price_range: 'NT$82,000起',
    highlights: ['布哈拉古城', '撒馬爾罕古城', '塔什干', '兩段高鐵', '陶瓷DIY體驗', '做饢大師DIY', '啤酒工廠體驗'],
    trip_banner: {
      code_label: 'TAS4AC8D',
      price_label: 'NT$82,000起',
      tags: ['中亞', '烏茲別克', '絲路', '美食體驗'],
      departure_label: '桃園出發',
      duration_label: '8天7夜',
      seats_total: 16,
      seats_available: null,
      deposit_label: '',
      min_group_size: 11,
    },
    departures: [
      { date: '2026-06-11', airline: '韓亞航空', price: 82000, total: 16, avail: 15, schedule: '午去午回', city: '桃園' },
      { date: '2026-07-16', airline: '韓亞航空', price: 82000, total: 16, avail: 15, schedule: '午去午回', city: '桃園' },
      { date: '2026-08-20', airline: '韓亞航空', price: 82000, total: 16, avail: 15, schedule: '午去午回', city: '桃園' },
      { date: '2026-09-17', airline: '韓亞航空', price: 82000, total: 16, avail: 15, schedule: '午去午回', city: '桃園' },
    ],
  },
];

// ============================================================
// 主程式
// ============================================================
async function main() {
  console.log(`目標 destination: ${DESTINATION_ID}`);
  console.log(`準備寫入 ${tripsData.length} 個行程...\n`);

  // 先取得現有 display_order
  const { data: existing } = await supabase
    .from('trips')
    .select('display_order')
    .eq('destination_id', DESTINATION_ID)
    .order('display_order', { ascending: false })
    .limit(1);

  let nextOrder = (existing?.[0]?.display_order || 0) + 1;

  for (const trip of tripsData) {
    console.log(`\n📦 建立行程: ${trip.title}`);

    // 1. 建立行程
    const { data: newTrip, error: insertErr } = await supabase
      .from('trips')
      .insert({
        destination_id: DESTINATION_ID,
        title: trip.title,
        subtitle: trip.subtitle,
        duration: trip.duration,
        price_range: trip.price_range,
        cover_image_url: '',
        highlights: trip.highlights,
        trip_banner: trip.trip_banner,
        is_active: true,
        display_order: nextOrder++,
      })
      .select()
      .single();

    if (insertErr) {
      console.error(`  ❌ 建立失敗: ${insertErr.message}`);
      continue;
    }

    console.log(`  ✅ 已建立 trip ID: ${newTrip.id}`);

    // 2. 新增出發日期
    for (const dep of trip.departures) {
      const { error: depErr } = await supabase
        .from('trip_departure_dates')
        .insert({
          trip_id: newTrip.id,
          departure_date: dep.date,
          departure_city: dep.city,
          airline: dep.airline,
          price: dep.price,
          label: dep.schedule,
          seats_total: dep.total,
          seats_available: dep.avail,
          is_active: true,
        });

      if (depErr) {
        console.error(`  ❌ 出發日期 ${dep.date} 失敗: ${depErr.message}`);
      } else {
        console.log(`  📅 ${dep.date} | ${dep.airline} | NT$${dep.price.toLocaleString()} | ${dep.avail}/${dep.total}席`);
      }
    }
  }

  console.log('\n✅ 全部完成！');
}

main().catch(console.error);
