import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const DESTINATION_SOURCE_URLS = {
  // ── 中東亞非（已驗證正確）──
  '2b1e1dac-4b61-4113-8a64-8cfb3861dc03': 'https://www.pwgotravel.com.tw/asia/#blk-8ea78fe0-04d8-41c4-b7c7-8bd05b0ecc6f', // 中東
  'f1b28d9d-ecd7-4c68-97cb-cef84b417ecc': 'https://www.pwgotravel.com.tw/asia/#blk-36932788-b72a-40b2-92e6-a97dae528a24', // 中亞
  '36e6e058-4920-4ce5-9368-fe558fa1abe7': 'https://www.pwgotravel.com.tw/asia/#blk-be9e06cf-7f9c-4748-8e3c-dc35aa719a51', // 西伯利亞
  '77b3f2ad-4251-4bc8-b4e2-bf71c71a773c': 'https://www.pwgotravel.com.tw/asia/#blk-dd802727-1ff6-4e59-bbd0-aacf61e7c14f', // 高雄出發

  // ── 日本 ──
  'e00a038e-cbc2-43e5-a7e3-d312fb90bc6c': 'https://www.pwgotravel.com.tw/japan/#blk-49fc4698-6f3b-4645-8d8d-9e1150998c78', // 北海道（札幌）
  'b7c82352-8239-48dc-9c15-17d31ef01833': 'https://www.pwgotravel.com.tw/japan/#blk-cd7ca0b2-e9d9-45e2-bfc8-c156a5f10636', // 東北（仙台）
  'd762f0dc-4643-42a4-8eec-285f136fde00': 'https://www.pwgotravel.com.tw/japan/#blk-1b547943-a586-4983-a518-8ec36c517cf2', // 關東（東京）
  '4809033e-59dd-477b-9fe9-29de562acf41': 'https://www.pwgotravel.com.tw/japan/#blk-be9e06cf-7f9c-4748-8e3c-dc35aa719a51', // 中部（名古屋/小松）
  '69409768-618f-42a1-9787-f6d689cd3583': 'https://www.pwgotravel.com.tw/japan/#blk-bc33fc4d-2400-4780-aeaf-2c7d5bc192e9', // 關西（京都/大阪）
  '50812963-7fd8-4156-a89f-b46a25ace224': 'https://www.pwgotravel.com.tw/japan/#blk-11328534-a885-4cc1-bc0d-039b634fd123', // 四國（高松/小豆島）
  'c5edad39-d9ae-4739-823a-d644e0142944': 'https://www.pwgotravel.com.tw/japan/#blk-8ea78fe0-04d8-41c4-b7c7-8bd05b0ecc6f', // 九州（北九州/福岡/熊本）
  'f33041d7-9d20-4093-bdb1-daa7e2d35d38': 'https://www.pwgotravel.com.tw/japan/#blk-83ef92d6-6520-486d-8b08-bd329570fe40', // 沖繩

  // ── 韓國 ──
  'b258781f-0763-485a-b9b6-7aba31e281dd': 'https://www.pwgotravel.com.tw/south-korea/#blk-8ea78fe0-04d8-41c4-b7c7-8bd05b0ecc6f', // 首爾
  'b57ad889-d6c2-466d-8993-b83d0c37d832': 'https://www.pwgotravel.com.tw/south-korea/#blk-36932788-b72a-40b2-92e6-a97dae528a24', // 釜山
  '6b8a2256-1615-4ddf-a1f6-8a3e0deae9ac': 'https://www.pwgotravel.com.tw/south-korea/#blk-be9e06cf-7f9c-4748-8e3c-dc35aa719a51', // 濟州

  // ── 歐洲 ──
  '3309f8d1-396f-452b-8d52-5f98a21cc075': 'https://www.pwgotravel.com.tw/europe/#blk-8ea78fe0-04d8-41c4-b7c7-8bd05b0ecc6f', // 中西歐
  '474d4f67-1855-4647-8352-a26844f72346': 'https://www.pwgotravel.com.tw/europe/#blk-36932788-b72a-40b2-92e6-a97dae528a24', // 東歐
  '2074b87a-afbb-4489-8086-43b02d242de5': 'https://www.pwgotravel.com.tw/europe/#blk-be9e06cf-7f9c-4748-8e3c-dc35aa719a51', // 南歐
  '2744da5c-5c1d-413f-8cb0-cd53a1865f7e': 'https://www.pwgotravel.com.tw/europe/#blk-514a3cc0-3bd1-4cf2-b6ea-c50d9cbce9c3', // 北歐

  // ── 港澳大陸 ──
  'c6d6d483-a328-4d36-a706-b88e4b1b466e': 'https://www.pwgotravel.com.tw/china/#blk-7b3198f5-5a87-4720-9efc-95aac4038915', // 東北
  '7f2da132-9162-4424-9da6-c4055b5cf9ba': 'https://www.pwgotravel.com.tw/china/#blk-572ab6f1-54c1-4e73-9f85-6b35fdb38003', // 華東
  '3964daed-a4ec-4966-9c95-105ea900f1bf': 'https://www.pwgotravel.com.tw/china/#blk-be9e06cf-7f9c-4748-8e3c-dc35aa719a51', // 華中
  '4bf0ca5f-fbad-4154-8bb7-3ae804277067': 'https://www.pwgotravel.com.tw/china/#blk-44a0fbb3-4c6e-4f92-8789-2b14bf024227', // 華南
  'ce46019d-9435-4e52-99f7-90ae53d093bb': 'https://www.pwgotravel.com.tw/china/#blk-36932788-b72a-40b2-92e6-a97dae528a24', // 西南
  '79a0f340-f223-4d05-a6e0-648aaa053c2b': 'https://www.pwgotravel.com.tw/china/#blk-8ea78fe0-04d8-41c4-b7c7-8bd05b0ecc6f', // 西北

  // ── 南亞 ──
  '9f4ea7ed-fd2e-4297-8c56-52f7041acb2c': 'https://www.pwgotravel.com.tw/southasia/#blk-e26a432c-53e8-45de-8821-81646af0267e', // 斯里蘭卡
  'c3520acb-b12e-43b7-8ab7-d2fe44475191': 'https://www.pwgotravel.com.tw/southasia/#blk-5dbdfb20-bc13-4304-a2e1-05c9230a81fe', // 馬爾地夫
  'f76b0e94-e053-45df-ae14-bdcdc37f9c81': 'https://www.pwgotravel.com.tw/southasia/#blk-7b3198f5-5a87-4720-9efc-95aac4038915', // 不丹

  // ── 紐澳美加（按區塊分：紐澳 / 美加）──
  // 紐澳區塊
  'fc3275df-4d7e-41bb-8636-6dfe30bbdad7': 'https://www.pwgotravel.com.tw/new/#blk-387a5da1-5ebd-4244-81af-18b4bda02833', // 雪梨
  '891c19ef-16fd-42ad-9a66-e4ed38bafe05': 'https://www.pwgotravel.com.tw/new/#blk-387a5da1-5ebd-4244-81af-18b4bda02833', // 墨爾本
  '46e92468-da69-4a94-a198-89d8ef7bd4ff': 'https://www.pwgotravel.com.tw/new/#blk-387a5da1-5ebd-4244-81af-18b4bda02833', // 皇后鎮
  // 美加區塊
  '73a63c1f-2f77-4ff7-b552-4fa94e81014d': 'https://www.pwgotravel.com.tw/new/#blk-be9e06cf-7f9c-4748-8e3c-dc35aa719a51', // 紐約
  '0f423ec8-37d7-43d9-9d73-7f56f3c74974': 'https://www.pwgotravel.com.tw/new/#blk-be9e06cf-7f9c-4748-8e3c-dc35aa719a51', // 洛杉磯
  '4999aa30-4843-43a8-bf41-6f12b4fd3f4a': 'https://www.pwgotravel.com.tw/new/#blk-be9e06cf-7f9c-4748-8e3c-dc35aa719a51', // 夏威夷
  'e2712681-a2e5-4397-b46b-43a015db630c': 'https://www.pwgotravel.com.tw/new/#blk-be9e06cf-7f9c-4748-8e3c-dc35aa719a51', // 溫哥華
  '9dd7c813-2213-4a9e-8e38-cffd8cd4685a': 'https://www.pwgotravel.com.tw/new/#blk-be9e06cf-7f9c-4748-8e3c-dc35aa719a51', // 舊金山
  '74db7470-7515-4dee-bca2-ab15cec30f38': 'https://www.pwgotravel.com.tw/new/#blk-be9e06cf-7f9c-4748-8e3c-dc35aa719a51', // 多倫多

  // ── 自由行（按區塊分：東北亞 / 東南亞）──
  '08d690d2-4033-4bdc-804d-7468e72afd0e': 'https://www.pwgotravel.com.tw/freetour/#blk-36932788-b72a-40b2-92e6-a97dae528a24', // 東京
  '15d4672d-a157-4a09-a401-eff7067a303f': 'https://www.pwgotravel.com.tw/freetour/#blk-36932788-b72a-40b2-92e6-a97dae528a24', // 大阪
  'd00d299f-9ad4-48f3-b22d-6fe43f48e012': 'https://www.pwgotravel.com.tw/freetour/#blk-36932788-b72a-40b2-92e6-a97dae528a24', // 首爾
  '9aee1556-f28b-420e-980f-326230f39b6c': 'https://www.pwgotravel.com.tw/freetour/#blk-be9e06cf-7f9c-4748-8e3c-dc35aa719a51', // 曼谷
  '74a8b089-e493-4aa6-bc6e-34ee11ad2e1e': 'https://www.pwgotravel.com.tw/freetour/#blk-be9e06cf-7f9c-4748-8e3c-dc35aa719a51', // 新加坡
  '4d0df97b-2def-4799-9396-f5cf2c050f9c': 'https://www.pwgotravel.com.tw/freetour/#blk-36932788-b72a-40b2-92e6-a97dae528a24', // 香港
};

function loadEnv() {
  const env = readFileSync('.env.local', 'utf8');
  const getEnv = (key) => {
    const matched = env.match(new RegExp(`^${key}=(.+)$`, 'm'));
    return matched ? matched[1].trim() : null;
  };

  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY，請確認 .env.local');
  }

  return { supabaseUrl, serviceRoleKey };
}

async function main() {
  const { supabaseUrl, serviceRoleKey } = loadEnv();
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const destinationIds = Object.keys(DESTINATION_SOURCE_URLS);

  const { error: selectError } = await supabase
    .from('destinations')
    .select('id, source_url')
    .in('id', destinationIds);

  if (selectError) {
    if (selectError.message.includes('source_url')) {
      console.error('destinations.source_url 欄位尚未建立。');
      console.error('請先執行 supabase/migrations/20260528_destination_source_url.sql：');
      console.error('ALTER TABLE destinations ADD COLUMN IF NOT EXISTS source_url TEXT;');
      process.exitCode = 1;
      return;
    }

    throw new Error(`讀取 destinations 失敗：${selectError.message}`);
  }

  for (const [destinationId, sourceUrl] of Object.entries(DESTINATION_SOURCE_URLS)) {
    const { error } = await supabase
      .from('destinations')
      .update({ source_url: sourceUrl })
      .eq('id', destinationId);

    if (error) {
      throw new Error(`更新 ${destinationId} 失敗：${error.message}`);
    }
  }

  console.log(`✅ 已更新 ${destinationIds.length} 筆 destination source_url`);
}

main().catch((error) => {
  console.error('❌ 設定 destination source_url 失敗');
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
