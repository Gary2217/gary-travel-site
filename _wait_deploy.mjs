import { readFileSync } from 'fs';
const env = readFileSync('.env.local', 'utf8');
const g = (k) => (env.match(new RegExp(`^${k}=(.+)$`, 'm')) || [])[1]?.trim();
const pat = g('GH_PAT');
// 用 GitHub commit + Vercel 沒有 API token，改用「輪詢正式站直到行為改變」：
// 最可靠的訊號是這支端點的行為——舊碼會寫入 Supabase Storage，新碼寫 R2。
// 直接輪詢一個不影響資料的訊號：等待幾輪 + 每次檢查 headers 裡有沒有新的 deployment id 變化不可靠，
// 改用簡單延遲＋之後人工再測更穩妥。這裡先做 60 秒等待。
console.log('waiting for deploy propagation...');
await new Promise(r => setTimeout(r, 75000));
console.log('done waiting');
