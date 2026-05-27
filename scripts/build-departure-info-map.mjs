/**
 * 為中東/西伯利亞/高雄行程建立 departure_info_map
 * 用法: node scripts/build-departure-info-map.mjs
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = readFileSync('.env.local', 'utf8');
const getEnv = (k) => { const m = env.match(new RegExp(`^${k}=(.+)$`, 'm')); return m ? m[1].trim() : null; };
const sb = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));

// 每行程的售價明細（從朋威抓取）
// 格式: [大人, 小孩佔床, 小孩不佔床, 加床, 嬰兒]
const tripPriceInfo = {
  // === 杜拜 ===
  'e2b84d5d-e2a4-4821-be55-e7dab4d6e01a': { // AUH4AG7D
    code: 'AUH4AG7D',
    prices: ['49,900', '49,900', '46,900', '49,900', '10,000'],
  },
  '7f4f2e55-8dd8-487d-b91c-03bd57955276': { // AUH5AD7D
    code: 'AUH5AD7D',
    prices: ['99,000', '99,000', '96,000', '99,000', '10,000'],
  },
  '20e3f08c-10a1-486d-8af1-8a847bc1b436': { // AUH4AB7D
    code: 'AUH4AB7D',
    prices: ['39,900', '39,900', '37,900', '39,900', '9,000'],
  },
  '3f5666df-3f63-456d-b6a3-c3a3acfca6ee': { // AUH5AA6D
    code: 'AUH5AA6D',
    prices: ['39,900', '39,900', '37,900', '39,900', '9,000'],
  },
  '13bdcb88-e45a-4614-a139-0d0543cdf442': { // DXB4ZA8D
    code: 'DXB4ZA8D',
    prices: ['49,900', '49,900', '洽詢', '洽詢', '洽詢'],
  },
  'fc9af03d-0c15-4c9e-b5e2-f01d2c744242': { // DXB57KH7D（高雄）
    code: 'DXB57KH7D',
    prices: ['49,900', '49,900', '47,900', '49,900', '9,000'],
  },
  // === 土耳其 ===
  'a437ee1e-c591-4d54-983a-24ded6e20c9b': { // IKA5AA10D
    code: 'IKA5AA10D',
    prices: ['130,000', '130,000', '洽詢', '洽詢', '洽詢'],
  },
  // === 埃及 ===
  '685a3d0f-9c5b-4d98-9056-1f24824703a5': { // CAI5AA10D
    code: 'CAI5AA10D',
    prices: ['59,900', '59,900', '57,900', '59,900', '7,000'],
  },
  // === 阿布達比 ===
  '8a00d559-0734-4213-ac0a-4037e96e24ee': { // AUH4AG7D（阿布達比）
    code: 'AUH4AG7D',
    prices: ['49,900', '49,900', '46,900', '49,900', '10,000'],
  },
  'cd566e29-0936-48aa-b770-b8c33f1b8ded': { // AUH5AD7D（阿布達比）
    code: 'AUH5AD7D',
    prices: ['99,000', '99,000', '96,000', '99,000', '10,000'],
  },
  // === 西伯利亞 ===
  '7a1c39f2-d49f-4751-8489-69fa64ef8652': { // UBN5A10D
    code: 'UBN5A10D',
    prices: ['185,000', '185,000', '洽詢', '洽詢', '洽詢'],
  },
  'cab8ae49-e001-4b5b-8ab7-136634e7d22d': { // UBN5AA9D
    code: 'UBN5AA9D',
    prices: ['89,900', '89,900', '洽詢', '洽詢', '洽詢'],
  },
};

function buildPriceDetail(prices) {
  return JSON.stringify({
    title: '團費與售價說明',
    subtitle: '依航空與房型不同，價格略有調整',
    adultPrice: prices[0],
    childWithBedPrice: prices[1],
    childNoBedPrice: prices[2],
    childExtraBedPrice: prices[3],
    infantPrice: prices[4],
    pricingNote: '＊ 年齡以「團體回國日」計算',
    deposit: '洽詢',
    singleRoom: '洽詢',
    visaFee: '洽詢',
    surcharge: '含機場稅燃油附加費',
    groupNote: '',
    quoteNote: '',
    visaNote: '',
  });
}

async function main() {
  for (const [tripId, info] of Object.entries(tripPriceInfo)) {
    // 取得此行程的所有 departure_date IDs
    const { data: deps, error } = await sb
      .from('trip_departure_dates')
      .select('id, departure_date')
      .eq('trip_id', tripId)
      .order('departure_date');

    if (error) { console.error(`❌ ${info.code}: ${error.message}`); continue; }
    if (!deps || deps.length === 0) { console.log(`⏭️ ${info.code}: 無出發日期`); continue; }

    // 建立 departure_info_map
    const dim = {};
    const priceDetail = buildPriceDetail(info.prices);
    for (const dep of deps) {
      dim[dep.id] = {
        group_code: info.code,
        price_detail: priceDetail,
        waitlist_count: 0,
      };
    }

    // 更新 trip_banner（merge 保留既有欄位）
    const { data: trip } = await sb.from('trips').select('trip_banner').eq('id', tripId).single();
    const banner = { ...(trip?.trip_banner || {}), departure_info_map: dim };

    const { error: upErr } = await sb.from('trips').update({ trip_banner: banner }).eq('id', tripId);
    if (upErr) { console.error(`❌ ${info.code}: ${upErr.message}`); continue; }
    console.log(`✅ ${info.code}: ${deps.length} 個梯次已建立 departure_info_map`);
  }

  console.log('\n✅ 全部完成！');
}

main().catch(console.error);
