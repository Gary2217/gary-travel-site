import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const getEnv = (k) => {
  const m = env.match(new RegExp(`^${k}=(.+)$`, 'm'));
  return m ? m[1].trim() : null;
};

const SUPABASE_URL = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const SUPABASE_SERVICE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY');

const R2_ACCOUNT_ID = 'a85c4f2e46761d22faa6ad37731d6d92';
const R2_ACCESS_KEY_ID = '497e72faeee79a92131728721db2eaba';
const R2_SECRET_ACCESS_KEY = 'f61c4806fc4af2e861eda1ec6948bc5cfca5b59f3c615aba1d5b006edb41573e';
const R2_BUCKET = 'gary-travel-media';
const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const r2 = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

async function listAllFiles(bucket, prefix = '') {
  const files = [];
  const { data, error } = await sb.storage.from(bucket).list(prefix, {
    limit: 1000,
    sortBy: { column: 'name', order: 'asc' },
  });
  if (error) throw error;
  for (const item of data || []) {
    if (item.id === null) {
      // folder
      const sub = await listAllFiles(bucket, prefix ? `${prefix}/${item.name}` : item.name);
      files.push(...sub);
    } else {
      files.push(prefix ? `${prefix}/${item.name}` : item.name);
    }
  }
  return files;
}

async function fileExistsInR2(key) {
  try {
    await r2.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function migrate() {
  console.log('🔍 列出 Supabase Storage 所有檔案...');
  const files = await listAllFiles('images');
  console.log(`📁 共 ${files.length} 個檔案`);

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (const filePath of files) {
    const r2Key = `images/${filePath}`;

    // 檢查是否已上傳
    const exists = await fileExistsInR2(r2Key);
    if (exists) {
      console.log(`⏭️  跳過（已存在）: ${filePath}`);
      skipped++;
      continue;
    }

    // 從 Supabase 下載
    const { data, error } = await sb.storage.from('images').download(filePath);
    if (error || !data) {
      console.error(`❌ 下載失敗: ${filePath}`, error?.message);
      failed++;
      continue;
    }

    // 偵測 content type
    const ext = filePath.split('.').pop()?.toLowerCase();
    const contentTypeMap = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
      gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
      pdf: 'application/pdf', mp4: 'video/mp4', mov: 'video/quicktime',
    };
    const contentType = contentTypeMap[ext] || 'application/octet-stream';

    // 上傳到 R2
    const buffer = Buffer.from(await data.arrayBuffer());
    try {
      await r2.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: r2Key,
        Body: buffer,
        ContentType: contentType,
      }));
      console.log(`✅ 上傳成功: ${filePath}`);
      success++;
    } catch (err) {
      console.error(`❌ 上傳失敗: ${filePath}`, err.message);
      failed++;
    }
  }

  console.log(`\n🎉 完成！成功: ${success}，跳過: ${skipped}，失敗: ${failed}`);
  console.log(`\n📌 R2 公開 URL 格式（啟用 public access 後）:`);
  console.log(`   舊：${SUPABASE_URL}/storage/v1/object/public/images/<路徑>`);
  console.log(`   新：https://<your-r2-public-domain>/images/<路徑>`);
}

migrate().catch(console.error);
