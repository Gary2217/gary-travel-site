import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = readFileSync('.env.local', 'utf8');
const getEnv = (k) => { const m = env.match(new RegExp(`^${k}=(.+)$`, 'm')); return m ? m[1].trim() : null; };
const sb = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));

const { data: region } = await sb.from('regions').select('id').eq('title', '中東亞非').single();
const { data: dests } = await sb.from('destinations')
  .select('id, title, sub_region, display_order, is_active')
  .eq('region_id', region.id)
  .order('display_order');

console.log('=== 中東亞非 destinations ===');
for (const d of dests) {
  // 全部行程（不過濾 is_active）
  const { data: trips, error } = await sb.from('trips')
    .select('id, title, is_active')
    .eq('destination_id', d.id);

  if (error) { console.log(`${d.title}: ERROR ${error.message}`); continue; }
  const active = trips?.filter(t => t.is_active) || [];
  const inactive = trips?.filter(t => !t.is_active) || [];
  const flag = d.is_active ? '✓' : '✗';
  console.log(`[${flag}] "${d.sub_region || '(無sub_region)'}"/title="${d.title}" | 行程: ${active.length}筆active, ${inactive.length}筆inactive`);
  for (const t of (trips || [])) {
    console.log(`     [${t.is_active ? 'active' : 'inactive'}] ${t.title.slice(0, 50)}`);
  }
}
