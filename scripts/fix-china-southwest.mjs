import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const getEnv = (k) => { const m = env.match(new RegExp(`^${k}=(.+)$`, 'm')); return m ? m[1].trim() : null; };
const sb = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));

const ZJJ_ID = 'ce46019d-9435-4e52-99f7-90ae53d093bb';

// 查所有 inactive 的西南行程
const { data: inactive } = await sb.from('trips')
  .select('id, title, trip_banner, is_active')
  .eq('destination_id', ZJJ_ID)
  .eq('is_active', false);

console.log(`inactive: ${inactive.length} 筆`);
inactive.forEach(t => console.log(`  ${t.trip_banner?.code_label || '?'} | ${t.title}`));

// 需要恢復的 3 筆
const toRestore = [
  { title: '人間仙境~九寨溝+黃龍雙秀八日', code: 'CTU5SHL8D', order: 2 },
  { title: '桃園出發【雙城奇景】九寨黃龍、張家界天門山10日', code: 'CTUDYGTP', order: 12 },
  { title: '高雄出發【雙城奇景】九寨黃龍、張家界天門山10日', code: 'CTUDYGKH', order: 13 },
];

for (const r of toRestore) {
  // 用標題匹配
  const match = inactive.find(t => t.title.includes(r.title.substring(0, 15)));
  if (!match) {
    console.log(`❌ 找不到: ${r.title.substring(0, 30)}`);
    continue;
  }

  // 更新：恢復 active + 設 code + display_order
  const banner = { ...(match.trip_banner || {}), code_label: r.code };
  const { error } = await sb.from('trips')
    .update({
      is_active: true,
      display_order: r.order,
      trip_banner: banner,
    })
    .eq('id', match.id);

  if (error) console.log(`❌ ${r.code}: ${error.message}`);
  else console.log(`✅ 恢復: ${r.code} | ${match.title.substring(0, 40)} → order ${r.order}`);
}

// 驗證
const { data: active } = await sb.from('trips')
  .select('title, trip_banner, display_order')
  .eq('destination_id', ZJJ_ID)
  .eq('is_active', true)
  .order('display_order');

console.log(`\n張家界/九寨溝: ${active.length} active`);
active.forEach(t => console.log(`  #${t.display_order} ${t.trip_banner?.code_label || '?'} | ${t.title.substring(0, 50)}`));
