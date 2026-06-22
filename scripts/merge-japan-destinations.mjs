/**
 * 日本 sub_area tabs 整理：
 * 1. 高松/小豆島 → sub_area 改為「四國」（合併 tab）
 * 2. 札幌 → sub_area 改為「北海道」（合併 tab）
 * 3. 名古屋/小松 → sub_area 改為「名古屋」
 *
 * 用法: node scripts/merge-japan-destinations.mjs
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = readFileSync('.env.local', 'utf8');
const getEnv = (k) => {
  const m = env.match(new RegExp(`^${k}=(.+)$`, 'm'));
  return m ? m[1].trim() : null;
};

const sb = createClient(
  getEnv('NEXT_PUBLIC_SUPABASE_URL'),
  getEnv('SUPABASE_SERVICE_ROLE_KEY')
);

async function updateSubArea(fromPattern, toValue) {
  const { data: trips, error } = await sb
    .from('trips')
    .select('id, title, trip_banner')
    .eq('is_active', true);

  if (error) { console.error('查詢失敗:', error.message); return; }

  const matched = trips.filter(t => {
    const sa = t.trip_banner?.sub_area || '';
    return sa === fromPattern || sa.startsWith(fromPattern + ',');
  });

  console.log(`\n--- "${fromPattern}" → "${toValue}" (${matched.length} 筆) ---`);

  for (const t of matched) {
    const oldSa = t.trip_banner?.sub_area || '';
    const newSa = oldSa.replace(fromPattern, toValue);
    const newBanner = { ...t.trip_banner, sub_area: newSa };

    const { error: updateErr } = await sb
      .from('trips')
      .update({ trip_banner: newBanner })
      .eq('id', t.id);

    if (updateErr) {
      console.log(`  ❌ ${t.title}: ${updateErr.message}`);
    } else {
      console.log(`  ✅ ${t.title} | "${oldSa}" → "${newSa}"`);
    }
  }
}

async function main() {
  await updateSubArea('高松/小豆島', '四國');
  await updateSubArea('札幌', '北海道');
  await updateSubArea('名古屋/小松', '名古屋');
  console.log('\n=== 完成 ===');
}

main().catch(e => { console.error(e); process.exit(1); });
