/**
 * 修正 sub_area tabs 資料
 * 用法: node scripts/fix-sub-area-tabs.mjs
 *
 * 修改項目：
 * 1. 越南：中越→峴港 (5筆)，沙壩行程跨tab (1筆)
 * 2. 北海道：放飛東北亞→北海道 (1筆)
 * 3. 不丹：幸福王國不丹之旅→不丹 (2筆)
 * 4. 馬祖：全部行程→馬祖 (2筆)
 * 5. 哈爾濱：停用 9 筆日本東北行程（歸錯 destination）
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

// ── 修改 sub_area 的行程 ──────────────────────────────────
const subAreaUpdates = [
  // 越南：中越 → 峴港
  { id: '4e70d36f-f9e7-46be-bb31-620892cb9407', newSubArea: '峴港', reason: '越南 中越→峴港' },
  { id: '41fc90ba-39ed-4336-98a3-e0fc5f2ffd62', newSubArea: '峴港', reason: '越南 中越→峴港' },
  { id: 'b8686b22-cde0-4b92-b650-bd93dc24b6cd', newSubArea: '峴港', reason: '越南 中越→峴港' },
  { id: '1f82be8f-a407-4357-a9d3-3eee0d40f00e', newSubArea: '峴港', reason: '越南 中越→峴港' },
  { id: '8349b0d2-d677-4038-9df5-1b88e40fa9b6', newSubArea: '峴港', reason: '越南 中越→峴港' },

  // 越南：沙壩行程跨 tab（北越 + 沙壩/芽莊/大叻）
  { id: '78d889d9-1fb7-43bc-b398-15a6dc95801a', newSubArea: '北越,沙壩/芽莊/大叻', reason: '越南 沙壩行程跨tab' },

  // 北海道：放飛東北亞 → 北海道
  { id: 'e15d05f9-2e74-4f02-8db0-213bcba099bc', newSubArea: '北海道', reason: '北海道 放飛東北亞→北海道' },

  // 不丹：幸福王國不丹之旅 → 不丹
  { id: '8ad810fe-6318-4d43-86dd-422407279eeb', newSubArea: '不丹', reason: '不丹 統一為不丹' },
  { id: 'acc812cf-10af-4087-9f16-aa5c77652d27', newSubArea: '不丹', reason: '不丹 統一為不丹' },

  // 馬祖：全部行程 → 馬祖
  { id: '95b31e99-2b83-4964-9053-e0824cd1412d', newSubArea: '馬祖', reason: '馬祖 全部行程→馬祖' },
  { id: 'db51b678-13c2-46c0-9406-0ffc476b35ea', newSubArea: '馬祖', reason: '馬祖 全部行程→馬祖' },
];

// ── 停用的行程（哈爾濱裡歸錯的日本東北行程）──────────────
const deactivateIds = [
  'cefe9f05-85aa-40c8-8f93-d88b14ea2196', // 東北藏王樹冰+藏王狐狸村3晚
  '1e601fd0-28fb-43cf-bb1c-ac0e535b10bf', // 東北藏王樹冰+藏王狐狸村兩晚
  '93ab68e4-365d-43a4-863a-2268ab9b4afb', // 期間限定!日本東北三大秋祭
  'f553c5bf-a194-4145-b4dc-c04270e71f29', // 星野集團～東北會津鐵道
  '94c633f4-6b22-42da-a85c-505eb8f622d4', // 東北森吉山阿仁樹冰
  '0420fbd8-962e-41dc-86c6-4fc6b32b7792', // 東北藏王樹冰+銀山溫泉
  'a5c9e3a3-b02a-48c4-8896-8a64d0dd5539', // 櫻雪飛舞～猊鼻溪輕舟
  '5b098a69-4914-4b26-8153-f99038b72d31', // 櫻雪飛舞～會津鐵道賞櫻
  '6c20d7d1-c1cf-4076-b3b9-9ac227b1e139', // 初夏戀東北採果樂
];

async function main() {
  console.log('📦 開始修正 sub_area tabs 資料...\n');

  // ── 1. 修改 sub_area ──
  let successCount = 0;
  let failCount = 0;

  for (const { id, newSubArea, reason } of subAreaUpdates) {
    // 先讀取既有 trip_banner（保留其他欄位）
    const { data: trip, error: readErr } = await sb
      .from('trips')
      .select('id, title, trip_banner')
      .eq('id', id)
      .single();

    if (readErr || !trip) {
      console.error(`❌ 讀取失敗 ${id}: ${readErr?.message || '找不到行程'}`);
      failCount++;
      continue;
    }

    const mergedBanner = { ...(trip.trip_banner || {}), sub_area: newSubArea };

    const { error: updateErr } = await sb
      .from('trips')
      .update({ trip_banner: mergedBanner })
      .eq('id', id);

    if (updateErr) {
      console.error(`❌ 更新失敗 ${id}: ${updateErr.message}`);
      failCount++;
    } else {
      console.log(`✅ [${reason}] ${trip.title.substring(0, 40)}... → sub_area="${newSubArea}"`);
      successCount++;
    }
  }

  // ── 2. 停用哈爾濱的日本東北行程 ──
  console.log('\n📦 停用哈爾濱歸錯的日本東北行程...');

  for (const id of deactivateIds) {
    const { data: trip } = await sb
      .from('trips')
      .select('id, title')
      .eq('id', id)
      .single();

    const { error } = await sb
      .from('trips')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error(`❌ 停用失敗 ${id}: ${error.message}`);
      failCount++;
    } else {
      console.log(`✅ 已停用: ${trip?.title?.substring(0, 50) || id}`);
      successCount++;
    }
  }

  console.log(`\n🏁 完成！成功: ${successCount}，失敗: ${failCount}`);
}

main().catch((err) => {
  console.error('💥 腳本執行失敗:', err);
  process.exit(1);
});
