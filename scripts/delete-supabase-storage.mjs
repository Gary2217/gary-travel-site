import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const getEnv = (k) => {
  const m = env.match(new RegExp(`^${k}=(.+)$`, 'm'));
  return m ? m[1].trim() : null;
};

const sb = createClient(
  getEnv('NEXT_PUBLIC_SUPABASE_URL'),
  getEnv('SUPABASE_SERVICE_ROLE_KEY')
);

async function listAllFiles(prefix = '') {
  const files = [];
  const { data, error } = await sb.storage.from('images').list(prefix, {
    limit: 1000,
    offset: 0,
    sortBy: { column: 'name', order: 'asc' },
  });
  if (error) throw error;
  for (const item of data || []) {
    if (item.id === null) {
      const sub = await listAllFiles(prefix ? `${prefix}/${item.name}` : item.name);
      files.push(...sub);
    } else {
      files.push(prefix ? `${prefix}/${item.name}` : item.name);
    }
  }
  return files;
}

async function main() {
  console.log('🔍 列出 Supabase Storage 所有檔案...');
  const files = await listAllFiles();
  console.log(`📁 共 ${files.length} 個檔案，開始刪除...\n`);

  let deleted = 0;
  let failed = 0;
  const BATCH = 100;

  for (let i = 0; i < files.length; i += BATCH) {
    const batch = files.slice(i, i + BATCH);
    const { error } = await sb.storage.from('images').remove(batch);
    if (error) {
      console.error(`❌ 刪除失敗 (batch ${i}-${i + BATCH}):`, error.message);
      failed += batch.length;
    } else {
      deleted += batch.length;
      console.log(`🗑️  已刪除 ${deleted}/${files.length}`);
    }
  }

  console.log(`\n🎉 完成！刪除: ${deleted}  失敗: ${failed}`);
}

main().catch(console.error);
