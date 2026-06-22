/**
 * 目的地整理：
 * 1. 紐澳美加：9 個城市級合併為 紐澳 + 美加 兩個
 * 2. 自由行：停用 0 行程的 destination（首爾/曼谷/新加坡）
 *
 * 用法: node scripts/cleanup-destinations.mjs
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

async function moveTripsToDest(fromId, fromTitle, toId, toTitle) {
  const { data: trips } = await sb.from('trips').select('id, title').eq('destination_id', fromId).eq('is_active', true);
  if (!trips || trips.length === 0) {
    console.log(`  ⏭ ${fromTitle}: 0 行程，跳過`);
    return 0;
  }
  // 查目標最大 display_order
  const { data: existing } = await sb.from('trips').select('display_order').eq('destination_id', toId).order('display_order', { ascending: false }).limit(1);
  let order = (existing?.[0]?.display_order || 0);

  for (const t of trips) {
    order++;
    const { error } = await sb.from('trips').update({ destination_id: toId, display_order: order }).eq('id', t.id);
    console.log(error ? `  ❌ ${t.title}: ${error.message}` : `  ✅ ${t.title} → ${toTitle} (order ${order})`);
  }
  return trips.length;
}

async function deactivateDest(id, title) {
  const { error } = await sb.from('destinations').update({ is_active: false }).eq('id', id);
  console.log(error ? `  ❌ 停用 ${title} 失敗: ${error.message}` : `  ✅ ${title} 已停用`);
}

async function renameDest(id, newTitle, newSubRegion) {
  const { error } = await sb.from('destinations').update({ title: newTitle, sub_region: newSubRegion }).eq('id', id);
  console.log(error ? `  ❌ 改名失敗: ${error.message}` : `  ✅ 已改名為 ${newTitle}`);
}

async function main() {
  const { data: dests } = await sb.from('destinations').select('id, title, sub_region, region_id, display_order').eq('is_active', true);
  const find = (title) => dests.find(d => d.title === title);

  // =============== 紐澳美加 整併 ===============
  console.log('\n=== 紐澳美加 整併 ===');

  const sydney = find('雪梨');
  const queenstown = find('皇后鎮');
  const melbourne = find('墨爾本');
  const losAngeles = find('洛杉磯');
  const newYork = find('紐約');
  const vancouver = find('溫哥華');
  const hawaii = find('夏威夷');
  const sanFran = find('舊金山');
  const toronto = find('多倫多');

  // 紐澳：雪梨為主 ← 皇后鎮
  if (sydney && queenstown) {
    console.log('\n--- 紐澳（雪梨 ← 皇后鎮）---');
    await moveTripsToDest(queenstown.id, '皇后鎮', sydney.id, '雪梨→紐澳');
    await deactivateDest(queenstown.id, '皇后鎮');
    await renameDest(sydney.id, '紐澳', '紐澳');
  }

  // 美加：洛杉磯為主 ← 紐約, 溫哥華
  if (losAngeles) {
    console.log('\n--- 美加（洛杉磯 ← 紐約, 溫哥華）---');
    if (newYork) {
      await moveTripsToDest(newYork.id, '紐約', losAngeles.id, '洛杉磯→美加');
      await deactivateDest(newYork.id, '紐約');
    }
    if (vancouver) {
      await moveTripsToDest(vancouver.id, '溫哥華', losAngeles.id, '洛杉磯→美加');
      await deactivateDest(vancouver.id, '溫哥華');
    }
    await renameDest(losAngeles.id, '美加', '美加');
  }

  // 停用 0 行程 destinations
  console.log('\n--- 停用 0 行程 destinations ---');
  for (const d of [melbourne, hawaii, sanFran, toronto]) {
    if (d) await deactivateDest(d.id, d.title);
  }

  // =============== 自由行 停用空 destinations ===============
  console.log('\n=== 自由行 停用空 destinations ===');
  const freeSeoul = find('首爾');
  const freeBangkok = find('曼谷');
  const freeSingapore = find('新加坡');

  // 檢查是否真的 0 行程再停用
  for (const d of [freeSeoul, freeBangkok, freeSingapore]) {
    if (!d) continue;
    const { count } = await sb.from('trips').select('id', { count: 'exact', head: true }).eq('destination_id', d.id).eq('is_active', true);
    if (count === 0) {
      await deactivateDest(d.id, d.title);
    } else {
      console.log(`  ⏭ ${d.title} 有 ${count} 行程，保留`);
    }
  }

  console.log('\n=== 完成 ===');
}

main().catch(e => { console.error(e); process.exit(1); });
