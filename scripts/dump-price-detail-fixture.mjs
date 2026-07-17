/**
 * 從 DB 撈出全部真實的 price_detail 字串，產生測試 fixture。
 *
 * 用途：src/lib/trip-format.test.ts 用這批真實資料做 characterization test —
 * 證明修改 parsePriceDetail 前後，客人看到的顯示輸出逐筆一致。
 *
 * 只輸出 price_detail 字串本身（售價與說明文字），不含行程 ID、標題或任何個資。
 * 重跑方式：node scripts/dump-price-detail-fixture.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = readFileSync('.env.local', 'utf8');
const getEnv = (k) => {
  const m = env.match(new RegExp(`^${k}=(.+)$`, 'm'));
  return m ? m[1].trim() : null;
};

const sb = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));

const { data, error } = await sb.from('trips').select('trip_banner');
if (error) {
  console.error('查詢失敗:', error.message);
  process.exit(1);
}

const seen = new Set();
for (const t of data) {
  const map = t.trip_banner?.departure_info_map || {};
  for (const info of Object.values(map)) {
    const pd = info?.price_detail;
    if (typeof pd === 'string' && pd.trim()) seen.add(pd);
  }
}

// 排序讓輸出穩定，避免 DB 回傳順序變動造成 fixture diff
const rows = [...seen].sort();

mkdirSync('src/lib/__fixtures__', { recursive: true });
writeFileSync('src/lib/__fixtures__/price-detail-real.json', JSON.stringify(rows, null, 2) + '\n');

console.log('行程數           :', data.length);
console.log('唯一 price_detail:', rows.length);
console.log('已寫入           : src/lib/__fixtures__/price-detail-real.json');
