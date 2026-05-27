/**
 * 更新中東 / 西伯利亞行程：title/price/trip_banner/departures（圖片不動）
 * 用法: node scripts/update-middle-east-siberia-trips.mjs
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = readFileSync('.env.local', 'utf8');
const getEnv = (k) => {
  const m = env.match(new RegExp(`^${k}=(.+)$`, 'm'));
  return m ? m[1].trim() : null;
};

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY，請確認 .env.local');
}

const sb = createClient(supabaseUrl, serviceRoleKey);

const DESTINATIONS = {
  dubai: '2b1e1dac-4b61-4113-8a64-8cfb3861dc03',
  turkey: 'bcbbec2b-c38b-408b-9842-a4cbf12af4a6',
  egypt: '7c66c83e-24cb-40f1-a9a9-6a228b51b42b',
  abuDhabi: '00b7a80f-a5de-47e0-a3f7-8b91495266ed',
  siberia: '36e6e058-4920-4ce5-9368-fe558fa1abe7',
};

const cityByAirport = {
  '桃園國際機場': '桃園',
  '高雄-小港機場': '高雄',
  '台北松山機場': '松山',
};

const weeklyDates = (dates) => dates.map((date) => ({ date }));

const tripCatalog = {
  AUH4AG7D: {
    title: '閃耀阿布達比、杜拜7日~季節限定地球村、奇蹟花園、國家宮殿總統府',
    subtitle: '阿提哈德航空｜地球村、奇蹟花園、杜拜之框、沙漠衝沙、國家宮殿總統府',
    duration: '7天6夜',
    price_range: 'NT$49,900起',
    priceDetail: 'NT$49,900元起\tNT$49,900元起\tNT$46,900元起\tNT$49,900元起\tNT$10,000元起',
    trip_banner: {
      code_label: 'AUH4AG7D',
      price_label: 'NT$49,900起',
      tags: ['特別推薦', '優質深度', '城市巡禮', '文化知性', '主題樂園', '購物'],
      departure_label: '桃園出發',
      duration_label: '7天6夜',
      seats_total: 20,
      seats_available: null,
      deposit_label: '',
      min_group_size: 16,
      airport: '桃園國際機場',
      airline: '阿提哈德航空（EY）',
      price_detail: 'NT$49,900元起\tNT$49,900元起\tNT$46,900元起\tNT$49,900元起\tNT$10,000元起',
    },
    flightSegments: [
      { date: '', airline: '阿提哈德航空（EY）', flight_number: 'EY899', dep_time: '18:40', dep_airport: '桃園國際機場', arr_time: '00:30', arr_airport: '阿布達比機場', next_day: true },
      { date: '', airline: '阿提哈德航空（EY）', flight_number: 'EY898', dep_time: '21:25', dep_airport: '阿布達比機場', arr_time: '09:00', arr_airport: '桃園國際機場', next_day: true },
    ],
    departures: [
      { date: '2026-10-09', airline: '阿提哈德航空（EY）', price: 50900, total: 20, avail: 19, label: '晚去晚回', city: '桃園' },
      { date: '2026-10-16', airline: '阿提哈德航空（EY）', price: 49900, total: 20, avail: 19, label: '晚去晚回', city: '桃園' },
      { date: '2026-10-22', airline: '阿提哈德航空（EY）', price: 49900, total: 20, avail: 19, label: '晚去晚回', city: '桃園' },
      { date: '2026-10-28', airline: '阿提哈德航空（EY）', price: 49900, total: 20, avail: 19, label: '晚去晚回', city: '桃園' },
      { date: '2026-11-07', airline: '阿提哈德航空（EY）', price: 49900, total: 20, avail: 19, label: '晚去晚回', city: '桃園' },
      { date: '2026-11-14', airline: '阿提哈德航空（EY）', price: 49900, total: 20, avail: 19, label: '晚去晚回', city: '桃園' },
      { date: '2026-11-21', airline: '阿提哈德航空（EY）', price: 49900, total: 20, avail: 19, label: '晚去晚回', city: '桃園' },
      { date: '2026-11-28', airline: '阿提哈德航空（EY）', price: 49900, total: 20, avail: 19, label: '晚去晚回', city: '桃園' },
      { date: '2026-12-05', airline: '阿提哈德航空（EY）', price: 49900, total: 20, avail: 19, label: '晚去晚回', city: '桃園' },
      { date: '2026-12-12', airline: '阿提哈德航空（EY）', price: 49900, total: 20, avail: 19, label: '晚去晚回', city: '桃園' },
      { date: '2026-12-19', airline: '阿提哈德航空（EY）', price: 49900, total: 20, avail: 19, label: '晚去晚回', city: '桃園' },
    ],
  },
  AUH5AD7D: {
    title: 'F1賽道狂熱．阿布達比盛典7日~哈里發塔124層樓、法拉利樂園、八星皇宮自助餐',
    subtitle: '阿提哈德航空｜F1阿布達比大獎賽、哈里發塔124層、法拉利樂園、八星皇宮',
    duration: '7天6夜',
    price_range: 'NT$99,000起',
    priceDetail: 'NT$99,000元起\tNT$99,000元起\tNT$96,000元起\tNT$99,000元起\tNT$10,000元起',
    trip_banner: {
      code_label: 'AUH5AD7D',
      price_label: 'NT$99,000起',
      tags: ['特別推薦', '優質深度', '城市巡禮', '文化知性', '主題樂園', '購物'],
      departure_label: '桃園出發',
      duration_label: '7天6夜',
      seats_total: 20,
      seats_available: null,
      deposit_label: '',
      min_group_size: 16,
      airport: '桃園國際機場',
      airline: '阿提哈德航空（EY）',
      price_detail: 'NT$99,000元起\tNT$99,000元起\tNT$96,000元起\tNT$99,000元起\tNT$10,000元起',
    },
    flightSegments: [
      { date: '', airline: '阿提哈德航空（EY）', flight_number: 'EY899', dep_time: '19:25', dep_airport: '桃園國際機場', arr_time: '', arr_airport: '阿布達比機場', next_day: true },
      { date: '', airline: '阿提哈德航空（EY）', flight_number: 'EY898', dep_time: '21:20', dep_airport: '阿布達比機場', arr_time: '', arr_airport: '桃園國際機場', next_day: true },
    ],
    departures: [
      { date: '2026-12-03', airline: '阿提哈德航空（EY）', price: 99000, total: 20, avail: 17, label: '晚去晚回', city: '桃園' },
    ],
  },
  AUH4AB7D: {
    title: '阿提哈德超值杜拜經典7日~杜拜之框、藍色市集、AL SEEF阿拉伯建築群、沙漠衝沙',
    subtitle: '阿提哈德航空｜杜拜之框、藍色市集、AL SEEF建築群、沙漠衝沙',
    duration: '7天6夜',
    price_range: 'NT$39,900起',
    priceDetail: 'NT$39,900元起\tNT$39,900元起\tNT$37,900元起\tNT$39,900元起\tNT$9,000元起',
    trip_banner: {
      code_label: 'AUH4AB7D',
      price_label: 'NT$39,900起',
      tags: ['特別推薦', '超值行程', '自然生態', '城市巡禮', '文化知性', '購物'],
      departure_label: '桃園出發',
      duration_label: '7天6夜',
      seats_total: 20,
      seats_available: null,
      deposit_label: '',
      min_group_size: 16,
      airport: '桃園國際機場',
      airline: '阿提哈德航空（EY）',
      price_detail: 'NT$39,900元起\tNT$39,900元起\tNT$37,900元起\tNT$39,900元起\tNT$9,000元起',
    },
    flightSegments: [
      { date: '', airline: '阿提哈德航空（EY）', flight_number: 'EY899', dep_time: '19:25', dep_airport: '桃園國際機場', arr_time: '', arr_airport: '阿布達比機場', next_day: true },
      { date: '', airline: '阿提哈德航空（EY）', flight_number: 'EY898', dep_time: '21:20', dep_airport: '阿布達比機場', arr_time: '', arr_airport: '桃園國際機場', next_day: true },
    ],
    departures: [
      { date: '2026-07-10', airline: '阿提哈德航空（EY）', price: 39900, total: 20, avail: 19, label: '晚去晚回', city: '桃園' },
      { date: '2026-07-17', airline: '阿提哈德航空（EY）', price: 39900, total: 20, avail: 18, label: '晚去晚回', city: '桃園' },
      { date: '2026-07-24', airline: '阿提哈德航空（EY）', price: 39900, total: 20, avail: 18, label: '晚去晚回', city: '桃園' },
      { date: '2026-07-31', airline: '阿提哈德航空（EY）', price: 39900, total: 20, avail: 17, label: '晚去晚回', city: '桃園' },
      { date: '2026-08-07', airline: '阿提哈德航空（EY）', price: 39900, total: 20, avail: 18, label: '晚去晚回', city: '桃園' },
      { date: '2026-08-14', airline: '阿提哈德航空（EY）', price: 39900, total: 20, avail: 17, label: '晚去晚回', city: '桃園' },
      { date: '2026-08-21', airline: '阿提哈德航空（EY）', price: 39900, total: 20, avail: 19, label: '晚去晚回', city: '桃園' },
      { date: '2026-08-28', airline: '阿提哈德航空（EY）', price: 39900, total: 20, avail: 19, label: '晚去晚回', city: '桃園' },
      { date: '2026-09-04', airline: '阿提哈德航空（EY）', price: 39900, total: 20, avail: 19, label: '晚去晚回', city: '桃園' },
      { date: '2026-09-11', airline: '阿提哈德航空（EY）', price: 39900, total: 20, avail: 19, label: '晚去晚回', city: '桃園' },
      { date: '2026-09-22', airline: '阿提哈德航空（EY）', price: 39900, total: 20, avail: 15, label: '晚去晚回', city: '桃園' },
      { date: '2026-09-25', airline: '阿提哈德航空（EY）', price: 39900, total: 20, avail: 17, label: '晚去晚回', city: '桃園' },
    ],
  },
  AUH5AA6D: {
    title: '6人成行｜杜拜・阿布達比小資樂活自由行6日~飯店來回接送、加贈八星酋長皇宮自助餐',
    subtitle: '阿提哈德航空｜杜拜、阿布達比自由行、飯店接送、八星酋長皇宮',
    duration: '6天5夜',
    price_range: 'NT$39,900起',
    priceDetail: 'NT$39,900元起\tNT$39,900元起\tNT$37,900元起\tNT$39,900元起\tNT$9,000元起',
    trip_banner: {
      code_label: 'AUH5AA6D',
      price_label: 'NT$39,900起',
      tags: ['特別推薦', '超值行程', '自然生態', '城市巡禮', '文化知性', '購物'],
      departure_label: '桃園出發',
      duration_label: '6天5夜',
      seats_total: 6,
      seats_available: null,
      deposit_label: '',
      min_group_size: 6,
      airport: '桃園國際機場',
      airline: '阿提哈德航空（EY）',
      price_detail: 'NT$39,900元起\tNT$39,900元起\tNT$37,900元起\tNT$39,900元起\tNT$9,000元起',
    },
    flightSegments: [
      { date: '', airline: '阿提哈德航空（EY）', flight_number: 'EY899', dep_time: '19:25', dep_airport: '桃園國際機場', arr_time: '', arr_airport: '阿布達比機場', next_day: true },
      { date: '', airline: '阿提哈德航空（EY）', flight_number: 'EY898', dep_time: '21:20', dep_airport: '阿布達比機場', arr_time: '', arr_airport: '桃園國際機場', next_day: true },
    ],
    departures: [
      { date: '2026-06-13', airline: '阿提哈德航空（EY）', price: 39900, total: 6, avail: 6, label: '晚去晚回', city: '桃園' },
      { date: '2026-06-15', airline: '阿提哈德航空（EY）', price: 39900, total: 6, avail: 6, label: '晚去晚回', city: '桃園' },
      { date: '2026-06-29', airline: '阿提哈德航空（EY）', price: 39900, total: 6, avail: 6, label: '晚去晚回', city: '桃園' },
    ],
  },
  DXB4ZA8D: {
    title: '黑金三國-杜拜、阿布達比、汶萊、阿拉伯之夜、吉普車歷險8日沙漠衝沙 羅浮宮 天空之鏡 長鼻猴生態之旅',
    subtitle: '汶萊航空｜杜拜、阿布達比、汶萊三國、沙漠衝沙、羅浮宮、天空之鏡',
    duration: '8天7夜',
    price_range: 'NT$49,900起',
    trip_banner: {
      code_label: 'DXB4ZA8D',
      price_label: 'NT$49,900起',
      tags: [],
      departure_label: '桃園出發',
      duration_label: '8天7夜',
      seats_total: 21,
      seats_available: null,
      deposit_label: '',
      min_group_size: 15,
      airport: '桃園國際機場',
      airline: '汶萊航空（BI）',
    },
    flightSegments: [
      { date: '', airline: '汶萊航空（BI）', flight_number: 'BI452', dep_time: '15:05', dep_airport: '桃園國際機場', arr_time: '18:35', arr_airport: '汶萊機場', next_day: false },
      { date: '', airline: '汶萊航空（BI）', flight_number: 'BI1097', dep_time: '20:25', dep_airport: '汶萊機場', arr_time: '01:10', arr_airport: '杜拜機場', next_day: false },
      { date: '', airline: '汶萊航空（BI）', flight_number: 'BI1098', dep_time: '05:45', dep_airport: '杜拜機場', arr_time: '17:45', arr_airport: '汶萊機場', next_day: false },
      { date: '', airline: '汶萊航空（BI）', flight_number: 'BI451', dep_time: '10:00', dep_airport: '汶萊機場', arr_time: '13:35', arr_airport: '桃園國際機場', next_day: false },
    ],
    departures: [
      { date: '2026-06-11', airline: '汶萊航空（BI）', price: 49900, total: 21, avail: 20, label: '午去早回', city: '桃園' },
      { date: '2026-06-25', airline: '汶萊航空（BI）', price: 49900, total: 21, avail: 20, label: '午去早回', city: '桃園' },
    ],
  },
  CAI5AA10D: {
    title: '漫步埃及10日-探索被遺忘的古文明',
    subtitle: '中國東方航空｜金字塔、人面獅身、路克索神殿、尼羅河遊輪',
    duration: '10天7夜',
    price_range: 'NT$59,900起',
    priceDetail: 'NT$59,900元起\tNT$59,900元起\tNT$57,900元起\tNT$59,900元起\tNT$7,000元起',
    trip_banner: {
      code_label: 'CAI5AA10D',
      price_label: 'NT$59,900起',
      tags: [],
      departure_label: '桃園出發',
      duration_label: '10天7夜',
      seats_total: 26,
      seats_available: null,
      deposit_label: '',
      min_group_size: 15,
      airport: '桃園國際機場',
      airline: '中國東方航空（MU）',
      price_detail: 'NT$59,900元起\tNT$59,900元起\tNT$57,900元起\tNT$59,900元起\tNT$7,000元起',
    },
    flightSegments: [
      { date: '', airline: '中國東方航空（MU）', flight_number: 'MU5006', dep_time: '18:40', dep_airport: '桃園國際機場', arr_time: '20:40', arr_airport: '浦東機場', next_day: false },
      { date: '', airline: '中國東方航空（MU）', flight_number: 'MU223', dep_time: '01:50', dep_airport: '浦東機場', arr_time: '08:00', arr_airport: '開羅機場', next_day: false },
      { date: '', airline: '中國東方航空（MU）', flight_number: 'MU224', dep_time: '13:30', dep_airport: '開羅機場', arr_time: '05:50', arr_airport: '浦東機場', next_day: true },
      { date: '', airline: '上海航空（FM）', flight_number: 'FM819', dep_time: '10:50', dep_airport: '浦東機場', arr_time: '12:40', arr_airport: '台北松山機場', next_day: false },
    ],
    departures: [
      { date: '2026-06-18', airline: '中國東方航空（MU）', price: 59900, total: 26, avail: 25, label: '晚去早回', city: '桃園' },
      { date: '2026-06-22', airline: '中國東方航空（MU）', price: 59900, total: 26, avail: 25, label: '晚去早回', city: '桃園' },
      { date: '2026-06-30', airline: '中國東方航空（MU）', price: 59900, total: 26, avail: 25, label: '晚去早回', city: '桃園' },
      { date: '2026-07-04', airline: '中國東方航空（MU）', price: 59900, total: 26, avail: 25, label: '晚去早回', city: '桃園' },
      { date: '2026-07-12', airline: '中國東方航空（MU）', price: 59900, total: 26, avail: 25, label: '晚去早回', city: '桃園' },
      { date: '2026-07-19', airline: '中國東方航空（MU）', price: 59900, total: 26, avail: 25, label: '晚去早回', city: '桃園' },
      { date: '2026-07-25', airline: '中國東方航空（MU）', price: 59900, total: 26, avail: 25, label: '晚去早回', city: '桃園' },
      { date: '2026-07-31', airline: '中國東方航空（MU）', price: 59900, total: 26, avail: 25, label: '晚去早回', city: '桃園' },
      { date: '2026-08-06', airline: '中國東方航空（MU）', price: 59900, total: 26, avail: 25, label: '晚去早回', city: '桃園' },
      { date: '2026-08-08', airline: '中國東方航空（MU）', price: 59900, total: 26, avail: 25, label: '晚去早回', city: '桃園' },
      { date: '2026-08-23', airline: '中國東方航空（MU）', price: 59900, total: 26, avail: 25, label: '晚去早回', city: '桃園' },
      { date: '2026-08-28', airline: '中國東方航空（MU）', price: 59900, total: 26, avail: 25, label: '晚去早回', city: '桃園' },
      { date: '2026-09-04', airline: '中國東方航空（MU）', price: 59900, total: 26, avail: 25, label: '晚去早回', city: '桃園' },
      { date: '2026-09-11', airline: '中國東方航空（MU）', price: 59900, total: 26, avail: 25, label: '晚去早回', city: '桃園' },
    ],
  },
  IKA5AA10D: {
    title: '滿漢波斯假期~伊朗10日【神祕、壯麗、矛盾、熱情、時光交錯】',
    subtitle: '泰國航空+伊朗滿漢航空｜伊斯法罕、設拉子、亞茲德、波斯波利斯',
    duration: '10天7夜',
    price_range: 'NT$130,000起',
    trip_banner: {
      code_label: 'IKA5AA10D',
      price_label: 'NT$130,000起',
      tags: [],
      departure_label: '桃園出發',
      duration_label: '10天7夜',
      seats_total: 20,
      seats_available: null,
      deposit_label: '',
      min_group_size: 15,
      airport: '桃園國際機場',
      airline: '泰國航空（TG）',
    },
    flightSegments: [
      { date: '', airline: '泰國航空（TG）', flight_number: 'TG633', dep_time: '13:55', dep_airport: '桃園國際機場', arr_time: '16:50', arr_airport: '曼谷-蘇凡納布機場', next_day: false },
      { date: '', airline: '伊朗滿漢航空（W5）', flight_number: 'W5050', dep_time: '22:20', dep_airport: '曼谷-蘇凡納布機場', arr_time: '02:10', arr_airport: '伊瑪目霍梅尼機場', next_day: true },
      { date: '', airline: '伊朗滿漢航空（W5）', flight_number: 'W51089', dep_time: '07:00', dep_airport: '梅赫拉巴德國際機場', arr_time: '08:40', arr_airport: '設拉子機場', next_day: false },
      { date: '', airline: '伊朗滿漢航空（W5）', flight_number: 'W5051', dep_time: '21:45', dep_airport: '伊瑪目霍梅尼機場', arr_time: '08:20', arr_airport: '曼谷-蘇凡納布機場', next_day: true },
      { date: '', airline: '泰國航空（TG）', flight_number: 'TG634', dep_time: '12:50', dep_airport: '曼谷-蘇凡納布機場', arr_time: '17:20', arr_airport: '桃園國際機場', next_day: false },
    ],
    departures: [
      { date: '2026-06-17', airline: '泰國航空（TG）', price: 130000, total: 20, avail: 19, label: '午去午回', city: '桃園' },
      { date: '2026-07-08', airline: '泰國航空（TG）', price: 130000, total: 20, avail: 19, label: '午去午回', city: '桃園' },
      { date: '2026-07-22', airline: '泰國航空（TG）', price: 130000, total: 20, avail: 19, label: '午去午回', city: '桃園' },
      { date: '2026-08-05', airline: '泰國航空（TG）', price: 130000, total: 20, avail: 19, label: '午去午回', city: '桃園' },
      { date: '2026-08-19', airline: '泰國航空（TG）', price: 130000, total: 20, avail: 19, label: '午去午回', city: '桃園' },
      { date: '2026-09-09', airline: '泰國航空（TG）', price: 130000, total: 20, avail: 19, label: '午去午回', city: '桃園' },
      { date: '2026-09-23', airline: '泰國航空（TG）', price: 130000, total: 20, avail: 19, label: '午去午回', city: '桃園' },
      { date: '2026-10-07', airline: '泰國航空（TG）', price: 130000, total: 20, avail: 19, label: '午去午回', city: '桃園' },
      { date: '2026-10-21', airline: '泰國航空（TG）', price: 130000, total: 20, avail: 19, label: '午去午回', city: '桃園' },
    ],
  },
  UBN5A10D: {
    title: '馬背上的國度×世界之藍｜蒙古・貝加爾湖10日~西伯利亞鐵路、特勒吉公園、蒙古包體驗',
    subtitle: '蒙古航空+國泰航空+伊爾航空｜西伯利亞鐵路、特勒吉、蒙古包、貝加爾湖',
    duration: '10天9夜',
    price_range: 'NT$185,000起',
    trip_banner: {
      code_label: 'UBN5A10D',
      price_label: 'NT$185,000起',
      tags: ['特別推薦', '優質深度', '火車之旅', '自然生態', '自然景觀', '宗教朝聖', '歷史古蹟'],
      departure_label: '桃園出發',
      duration_label: '10天9夜',
      seats_total: 11,
      seats_available: null,
      deposit_label: '',
      min_group_size: 10,
      airport: '桃園國際機場',
      airline: '蒙古航空',
    },
    flightSegments: [
      { date: '', airline: '國泰航空（CX）', flight_number: 'CX407', dep_time: '08:00', dep_airport: '桃園國際機場', arr_time: '10:00', arr_airport: '香港-赤鱲角機場', next_day: false },
      { date: '', airline: '蒙古航空（OM）', flight_number: 'OM298', dep_time: '12:25', dep_airport: '香港-赤鱲角機場', arr_time: '17:05', arr_airport: '新烏蘭巴托國際機場', next_day: false },
      { date: '', airline: '伊爾航空（IO）', flight_number: 'IO230', dep_time: '00:05', dep_airport: '伊爾庫次克機場', arr_time: '01:00', arr_airport: '新烏蘭巴托國際機場', next_day: false },
      { date: '', airline: '蒙古航空（OM）', flight_number: 'OM297', dep_time: '06:45', dep_airport: '新烏蘭巴托國際機場', arr_time: '11:25', arr_airport: '香港-赤鱲角機場', next_day: false },
      { date: '', airline: '國泰航空（CX）', flight_number: 'CX420', dep_time: '13:35', dep_airport: '香港-赤鱲角機場', arr_time: '15:30', arr_airport: '桃園國際機場', next_day: false },
    ],
    departures: [
      { date: '2026-06-24', airline: '蒙古航空', price: 185000, total: 11, avail: 10, label: '早去早回', city: '桃園' },
      { date: '2026-07-15', airline: '蒙古航空', price: 185000, total: 11, avail: 10, label: '早去早回', city: '桃園' },
      { date: '2026-08-19', airline: '蒙古航空', price: 185000, total: 11, avail: 10, label: '早去早回', city: '桃園' },
      { date: '2026-09-16', airline: '蒙古航空', price: 185000, total: 11, avail: 10, label: '早去早回', city: '桃園' },
      { date: '2026-10-21', airline: '蒙古航空', price: 185000, total: 11, avail: 10, label: '早去早回', city: '桃園' },
    ],
  },
  UBN5AA9D: {
    title: '塞外風情蒙古西伯利亞鐵路9日~特吉勒蒙古包、賽音山達恐龍化石、藏傳佛教甘丹寺',
    subtitle: '長榮航空+春秋航空｜西伯利亞鐵路、蒙古包、恐龍化石、甘丹寺',
    duration: '9天8夜',
    price_range: 'NT$89,900起',
    trip_banner: {
      code_label: 'UBN5AA9D',
      price_label: 'NT$89,900起',
      tags: ['特別推薦', '優質深度', '火車之旅', '自然生態', '自然景觀', '宗教朝聖', '歷史古蹟'],
      departure_label: '桃園出發',
      duration_label: '9天8夜',
      seats_total: 11,
      seats_available: null,
      deposit_label: '',
      min_group_size: 10,
      airport: '桃園國際機場',
      airline: '長榮航空',
    },
    flightSegments: [
      { date: '', airline: '長榮航空（BR）', flight_number: 'BR722', dep_time: '16:30', dep_airport: '桃園國際機場', arr_time: '18:25', arr_airport: '浦東機場', next_day: false },
      { date: '', airline: '春秋航空（9C）', flight_number: '9C7057', dep_time: '08:00', dep_airport: '浦東機場', arr_time: '12:00', arr_airport: '新烏蘭巴托國際機場', next_day: false },
      { date: '', airline: '春秋航空（9C）', flight_number: '9C7058', dep_time: '13:00', dep_airport: '新烏蘭巴托國際機場', arr_time: '16:45', arr_airport: '浦東機場', next_day: false },
      { date: '', airline: '長榮航空（BR）', flight_number: 'BR7721', dep_time: '20:10', dep_airport: '浦東機場', arr_time: '22:10', arr_airport: '桃園國際機場', next_day: false },
    ],
    departures: [
      { date: '2026-06-25', airline: '長榮航空', price: 89900, total: 11, avail: 10, label: '午去午回', city: '桃園' },
      { date: '2026-07-09', airline: '長榮航空', price: 89900, total: 11, avail: 10, label: '午去午回', city: '桃園' },
      { date: '2026-07-23', airline: '長榮航空', price: 89900, total: 11, avail: 10, label: '午去午回', city: '桃園' },
      { date: '2026-08-06', airline: '長榮航空', price: 89900, total: 11, avail: 10, label: '午去午回', city: '桃園' },
      { date: '2026-08-20', airline: '長榮航空', price: 89900, total: 11, avail: 10, label: '午去午回', city: '桃園' },
      { date: '2026-09-03', airline: '長榮航空', price: 89900, total: 11, avail: 10, label: '午去午回', city: '桃園' },
      { date: '2026-09-17', airline: '長榮航空', price: 89900, total: 11, avail: 10, label: '午去午回', city: '桃園' },
      { date: '2026-10-01', airline: '長榮航空', price: 89900, total: 11, avail: 10, label: '午去午回', city: '桃園' },
      { date: '2026-10-15', airline: '長榮航空', price: 89900, total: 11, avail: 10, label: '午去午回', city: '桃園' },
    ],
  },
  DXB57KH7D: {
    title: '高雄出發 | 阿聯酋航空 | 阿聯風華杜拜、阿布達比7日',
    subtitle: '阿聯酋航空（高雄出發）｜杜拜、阿布達比、沙漠衝沙、阿布達比五星酒店',
    duration: '7天6夜',
    price_range: 'NT$49,900起',
    priceDetail: 'NT$49,900元起\tNT$49,900元起\tNT$47,900元起\tNT$49,900元起\tNT$9,000元起',
    trip_banner: {
      code_label: 'DXB57KH7D',
      price_label: 'NT$49,900起',
      tags: ['特別推薦', '超值行程', '自然生態', '城市巡禮', '文化知性', '購物'],
      departure_label: '高雄出發',
      duration_label: '7天6夜',
      seats_total: 20,
      seats_available: null,
      deposit_label: '',
      min_group_size: 16,
      airport: '高雄-小港機場',
      airline: '阿聯酋航空（EK）',
      price_detail: 'NT$49,900元起\tNT$49,900元起\tNT$47,900元起\tNT$49,900元起\tNT$9,000元起',
    },
    flightSegments: [
      { date: '', airline: '長榮航空（BR）', flight_number: 'BR845', dep_time: '09:15', dep_airport: '高雄-小港機場', arr_time: '', arr_airport: '香港-赤鱲角機場', next_day: false },
      { date: '', airline: '阿聯酋航空（EK）', flight_number: 'EK383', dep_time: '18:05', dep_airport: '香港-赤鱲角機場', arr_time: '', arr_airport: '杜拜機場', next_day: false },
      { date: '', airline: '阿聯酋航空（EK）', flight_number: 'EK382', dep_time: '03:30', dep_airport: '杜拜機場', arr_time: '', arr_airport: '香港-赤鱲角機場', next_day: false },
      { date: '', airline: '長榮航空（BR）', flight_number: 'BR850', dep_time: '19:25', dep_airport: '香港-赤鱲角機場', arr_time: '', arr_airport: '高雄-小港機場', next_day: false },
    ],
    departures: [
      { date: '2026-06-16', airline: '長榮航空（BR）', price: 49900, total: 20, avail: 19, label: '早去晚回', city: '高雄' },
      { date: '2026-06-19', airline: '長榮航空（BR）', price: 49900, total: 20, avail: 19, label: '早去晚回', city: '高雄' },
      { date: '2026-06-26', airline: '長榮航空（BR）', price: 49900, total: 20, avail: 19, label: '早去晚回', city: '高雄' },
      { date: '2026-06-30', airline: '長榮航空（BR）', price: 49900, total: 20, avail: 19, label: '早去晚回', city: '高雄' },
      { date: '2026-07-03', airline: '長榮航空（BR）', price: 49900, total: 20, avail: 19, label: '早去晚回', city: '高雄' },
      { date: '2026-07-10', airline: '長榮航空（BR）', price: 49900, total: 20, avail: 19, label: '早去晚回', city: '高雄' },
      { date: '2026-07-24', airline: '長榮航空（BR）', price: 49900, total: 20, avail: 19, label: '早去晚回', city: '高雄' },
    ],
  },
  AUH57KH7D: {
    title: '高雄出發 | 阿提哈德航空 | 阿聯風華杜拜、阿布達比7日',
    subtitle: '',
    duration: '7天6夜',
    price_range: '',
    trip_banner: {
      code_label: 'AUH57KH7D',
      price_label: '',
      tags: [],
      departure_label: '高雄出發',
      duration_label: '7天6夜',
      seats_total: null,
      seats_available: null,
      deposit_label: '',
      min_group_size: null,
      airport: '高雄-小港機場',
      airline: '阿提哈德航空（EY）',
      custom_tour: true,
    },
    flightSegments: [],
    departures: [],
  },
};

const updateTargets = [
  { destinationId: DESTINATIONS.dubai, codeLabel: 'AUH4AG7D', tripId: 'e2b84d5d-e2a4-4821-be55-e7dab4d6e01a' },
  { destinationId: DESTINATIONS.dubai, codeLabel: 'AUH5AD7D', tripId: '7f4f2e55-8dd8-487d-b91c-03bd57955276' },
  { destinationId: DESTINATIONS.dubai, codeLabel: 'AUH4AB7D', tripId: '20e3f08c-10a1-486d-8af1-8a847bc1b436' },
  { destinationId: DESTINATIONS.dubai, codeLabel: 'AUH5AA6D', tripId: '3f5666df-3f63-456d-b6a3-c3a3acfca6ee' },
  { destinationId: DESTINATIONS.dubai, codeLabel: 'DXB4ZA8D', tripId: '13bdcb88-e45a-4614-a139-0d0543cdf442' },
  { destinationId: DESTINATIONS.turkey, codeLabel: 'IKA5AA10D', tripId: 'a437ee1e-c591-4d54-983a-24ded6e20c9b' },
  { destinationId: DESTINATIONS.egypt, codeLabel: 'CAI5AA10D', tripId: '685a3d0f-9c5b-4d98-9056-1f24824703a5' },
  { destinationId: DESTINATIONS.abuDhabi, codeLabel: 'AUH4AG7D', tripId: '8a00d559-0734-4213-ac0a-4037e96e24ee' },
  { destinationId: DESTINATIONS.abuDhabi, codeLabel: 'AUH5AD7D', tripId: 'cd566e29-0936-48aa-b770-b8c33f1b8ded' },
  { destinationId: DESTINATIONS.siberia, codeLabel: 'UBN5A10D', tripId: '7a1c39f2-d49f-4751-8489-69fa64ef8652' },
  { destinationId: DESTINATIONS.siberia, codeLabel: 'UBN5AA9D', tripId: 'cab8ae49-e001-4b5b-8ab7-136634e7d22d' },
  { destinationId: DESTINATIONS.dubai, codeLabel: 'DXB57KH7D', tripId: 'fc9af03d-0c15-4c9e-b5e2-f01d2c744242' },
  { destinationId: DESTINATIONS.dubai, codeLabel: 'AUH57KH7D', tripId: 'fe9e24d2-94f5-442d-b9e5-021a2ffcee8d' },
];

const customTourOnlyTargets = [
  { destinationId: DESTINATIONS.dubai, codeLabel: 'IST5AA11D', tripId: '610c7f0c-5326-4c64-bb83-ce22dd141f1f' },
  { destinationId: DESTINATIONS.turkey, codeLabel: 'IST5AA9D', tripId: '542a0e30-c63c-4277-9c4f-da20a59c613b' },
  { destinationId: DESTINATIONS.dubai, codeLabel: 'AUH34KH7D', insertIfMissing: true },
];

function normalize(value) {
  return String(value || '').replace(/\s+/g, '').trim();
}

function getDepartureCity(plan) {
  const airport = plan.trip_banner?.airport || plan.flightSegments?.[0]?.dep_airport || '';
  return cityByAirport[airport] || '桃園';
}

function buildInsertPayload(plan, destinationId) {
  return {
    destination_id: destinationId,
    title: plan.title,
    subtitle: plan.subtitle,
    duration: plan.duration,
    price_range: plan.price_range,
    highlights: [],
    is_active: true,
    display_order: 99,
    trip_banner: plan.trip_banner,
  };
}

function buildMergedBanner(existingBanner, nextBanner) {
  const mergedBanner = { ...(existingBanner || {}), ...(nextBanner || {}) };
  if (existingBanner?.side_image_url) mergedBanner.side_image_url = existingBanner.side_image_url;
  if (existingBanner?.departure_info_map) mergedBanner.departure_info_map = existingBanner.departure_info_map;
  return mergedBanner;
}

async function loadTripsByDestinations(destinationIds) {
  const { data, error } = await sb
    .from('trips')
    .select('id, destination_id, title, trip_banner')
    .in('destination_id', destinationIds);

  if (error) throw new Error(`讀取既有 trips 失敗：${error.message}`);
  return data || [];
}

function findTrip(trips, destinationId, codeLabel, title, tripId) {
  // 1. 明確 ID 對應 (最可靠)
  if (tripId) {
    const byId = trips.find((trip) => trip.id === tripId);
    if (byId) return byId;
  }
  // 2. code_label 匹配
  const byCode = trips.find((trip) =>
    trip.destination_id === destinationId && normalize(trip.trip_banner?.code_label) === normalize(codeLabel)
  );
  if (byCode) return byCode;
  // 3. title 精確匹配
  return trips.find((trip) =>
    trip.destination_id === destinationId && normalize(trip.title) === normalize(title)
  ) || null;
}

async function ensureTrip(trips, target, plan) {
  const existing = findTrip(trips, target.destinationId, target.codeLabel, plan.title, target.tripId);
  if (existing) {
    console.log(`  🔎 已找到 trip: ${existing.id} (${target.codeLabel})`);
    return existing;
  }

  if (!target.insertIfMissing) {
    console.log(`  ⚠️ 找不到既有 trip，且未設定可新增：${target.codeLabel}`);
    return null;
  }

  console.log(`  ➕ 建立新 trip: ${target.codeLabel}`);
  const { data: inserted, error: insertErr } = await sb
    .from('trips')
    .insert(buildInsertPayload(plan, target.destinationId))
    .select('id, destination_id, title, trip_banner')
    .single();

  if (insertErr) throw new Error(`新增 ${target.codeLabel} 失敗：${insertErr.message}`);
  trips.push(inserted);
  console.log(`  ✅ 已新增 trip: ${inserted.id}`);
  return inserted;
}

async function updateTripAndDepartures(trips, target) {
  const plan = tripCatalog[target.codeLabel];
  if (!plan) throw new Error(`找不到 plan: ${target.codeLabel}`);

  console.log(`\n📦 更新 ${target.codeLabel} | ${plan.title}`);
  const trip = await ensureTrip(trips, target, plan);
  if (!trip) return;

  const mergedBanner = buildMergedBanner(trip.trip_banner, plan.trip_banner);
  const updatePayload = {
    title: plan.title,
    subtitle: plan.subtitle,
    duration: plan.duration,
    price_range: plan.price_range,
    trip_banner: mergedBanner,
  };

  console.log('  🛠️ 更新 trip 主資料（保留 cover_image_url / side_image_url）');
  const { error: updateErr } = await sb.from('trips').update(updatePayload).eq('id', trip.id);
  if (updateErr) throw new Error(`更新 ${target.codeLabel} trip 失敗：${updateErr.message}`);
  console.log('  ✅ trip 欄位已更新');

  console.log('  🗑️ 刪除舊出發日期');
  const { error: delErr } = await sb.from('trip_departure_dates').delete().eq('trip_id', trip.id);
  if (delErr) throw new Error(`刪除 ${target.codeLabel} 舊出發日期失敗：${delErr.message}`);
  console.log('  ✅ 舊出發日期已清除');

  if (!plan.departures.length) {
    console.log('  ℹ️ 無出發日期，保留為 custom_tour / 空班表');
    return;
  }

  const out = plan.flightSegments[0] || null;
  const ret = plan.flightSegments[plan.flightSegments.length - 1] || null;
  for (const dep of plan.departures) {
    const departureCity = dep.city || getDepartureCity(plan);
    console.log(`  ➕ 插入出發日 ${dep.date} | ${dep.airline} | NT$${dep.price.toLocaleString()} | ${dep.label}`);

    const { error: insErr } = await sb.from('trip_departure_dates').insert({
      trip_id: trip.id,
      departure_date: dep.date,
      departure_city: departureCity,
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
      flight_segments: plan.flightSegments,
      is_active: true,
    });

    if (insErr) throw new Error(`插入 ${target.codeLabel} ${dep.date} 失敗：${insErr.message}`);
    console.log(`  ✅ 已插入 ${dep.date}`);
  }
}

async function markCustomTourOnly(trips, target) {
  console.log(`\n📦 下架 / 客製處理 ${target.codeLabel}`);
  let trip = findTrip(trips, target.destinationId, target.codeLabel, target.codeLabel, target.tripId);
  if (!trip && target.insertIfMissing) {
    console.log(`  ➕ 建立新 custom_tour trip: ${target.codeLabel}`);
    const { data: inserted, error: insertErr } = await sb.from('trips').insert({
      destination_id: target.destinationId, title: target.codeLabel + ' (包團/客製)',
      subtitle: '', duration: '', price_range: '', highlights: [], is_active: true, display_order: 99,
      trip_banner: { code_label: target.codeLabel, custom_tour: true },
    }).select('id, destination_id, title, trip_banner').single();
    if (insertErr) { console.error(`  ❌ 新增失敗: ${insertErr.message}`); return; }
    trip = inserted; trips.push(inserted);
    console.log(`  ✅ 已新增: ${inserted.id}`);
  }
  if (!trip) {
    console.log(`  ⚠️ 找不到既有 trip，略過 ${target.codeLabel}`);
    return;
  }

  const mergedBanner = buildMergedBanner(trip.trip_banner, {
    code_label: target.codeLabel,
    custom_tour: true,
  });

  const { error: updateErr } = await sb.from('trips').update({ trip_banner: mergedBanner }).eq('id', trip.id);
  if (updateErr) throw new Error(`設定 ${target.codeLabel} custom_tour 失敗：${updateErr.message}`);
  console.log(`  ✅ ${target.codeLabel} 已設為 custom_tour: true`);
}

async function main() {
  console.log('🚀 開始更新中東 / 西伯利亞行程...');
  const destinationIds = Array.from(new Set([
    ...updateTargets.map((item) => item.destinationId),
    ...customTourOnlyTargets.map((item) => item.destinationId),
  ]));

  console.log(`📥 讀取既有 trips，destination 數量: ${destinationIds.length}`);
  const trips = await loadTripsByDestinations(destinationIds);
  console.log(`✅ 已載入 ${trips.length} 筆 trip`);

  for (const target of updateTargets) {
    await updateTripAndDepartures(trips, target);
  }

  for (const target of customTourOnlyTargets) {
    await markCustomTourOnly(trips, target);
  }

  console.log('\n✅ 全部完成！');
}

main().catch((error) => {
  console.error('\n❌ 腳本執行失敗');
  console.error(error);
  process.exit(1);
});
