import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const DESTINATION_SOURCE_URLS = {
  '2b1e1dac-4b61-4113-8a64-8cfb3861dc03': 'https://www.pwgotravel.com.tw/asia/#blk-8ea78fe0-04d8-41c4-b7c7-8bd05b0ecc6f',
  'f1b28d9d-ecd7-4c68-97cb-cef84b417ecc': 'https://www.pwgotravel.com.tw/asia/#blk-36932788-b72a-40b2-92e6-a97dae528a24',
  '36e6e058-4920-4ce5-9368-fe558fa1abe7': 'https://www.pwgotravel.com.tw/asia/#blk-be9e06cf-7f9c-4748-8e3c-dc35aa719a51',
  '77b3f2ad-4251-4bc8-b4e2-bf71c71a773c': 'https://www.pwgotravel.com.tw/asia/#blk-dd802727-1ff6-4e59-bbd0-aacf61e7c14f',
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
