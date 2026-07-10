import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const getEnv = (k) => {
  const m = env.match(new RegExp(`^${k}=(.+)$`, 'm'));
  return m ? m[1].trim() : null;
};

const sb = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));

const R2_ACCOUNT_ID = 'a85c4f2e46761d22faa6ad37731d6d92';
const R2_BUCKET = 'gary-travel-media';
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: '497e72faeee79a92131728721db2eaba',
    secretAccessKey: 'f61c4806fc4af2e861eda1ec6948bc5cfca5b59f3c615aba1d5b006edb41573e',
  },
});

const R2_BASE = 'https://pub-3881231e994f4158b5d05c0ec109b3ef.r2.dev/';
const EXT_CONTENT_TYPE = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
  pdf: 'application/pdf', mp4: 'video/mp4', mov: 'video/quicktime',
};

// Strip ?v=... and extract clean r2 key from URL
function urlToR2Key(url) {
  const parsed = new URL(url);
  return parsed.pathname.slice(1);  // remove leading "/"
}

// Supabase storage path = r2Key without "images/" prefix
function r2KeyToSupabasePath(r2Key) {
  return r2Key.startsWith('images/') ? r2Key.slice('images/'.length) : r2Key;
}

async function r2KeyExists(key) {
  try {
    await r2.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function collectUrls() {
  const urls = new Set();
  const { data: trips } = await sb.from('trips').select('cover_image_url,document_url,trip_banner');
  for (const t of trips || []) {
    if (t.cover_image_url?.startsWith(R2_BASE)) urls.add(t.cover_image_url);
    if (t.document_url?.startsWith(R2_BASE)) urls.add(t.document_url);
    const b = t.trip_banner;
    if (b?.side_image_url?.startsWith(R2_BASE)) urls.add(b.side_image_url);
  }
  const { data: dests } = await sb.from('destinations').select('image_url');
  for (const d of dests || []) {
    if (d.image_url?.startsWith(R2_BASE)) urls.add(d.image_url);
  }
  return [...urls];
}

async function checkAndFix(url) {
  const r2Key = urlToR2Key(url);          // clean path, no query string
  const exists = await r2KeyExists(r2Key);
  if (exists) return 'ok';

  const supabasePath = r2KeyToSupabasePath(r2Key);
  const { data, error } = await sb.storage.from('images').download(supabasePath);
  if (error || !data) {
    return `miss_supabase: ${supabasePath} — ${error?.message}`;
  }

  const ext = supabasePath.split('.').pop()?.toLowerCase();
  const contentType = EXT_CONTENT_TYPE[ext] || 'application/octet-stream';
  const buffer = Buffer.from(await data.arrayBuffer());

  await r2.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: r2Key,           // clean key, no "?v=..."
    Body: buffer,
    ContentType: contentType,
  }));

  return 'fixed';
}

async function main() {
  console.log('📋 收集 DB 中所有 R2 URL...');
  const urls = await collectUrls();
  console.log(`共 ${urls.length} 個 URL，開始逐一檢查...\n`);

  let ok = 0, fixed = 0, missing = 0;
  const CONCURRENCY = 8;

  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    const batch = urls.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(checkAndFix));
    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      if (r === 'ok') { ok++; }
      else if (r === 'fixed') { fixed++; console.log(`✅ 修復: ${urlToR2Key(batch[j])}`); }
      else { missing++; console.log(`❌ ${r}`); }
    }
    if (i > 0 && (i + CONCURRENCY) % 100 === 0) {
      console.log(`進度: ${Math.min(i + CONCURRENCY, urls.length)}/${urls.length}  ok=${ok} fixed=${fixed} missing=${missing}`);
    }
  }

  console.log(`\n🎉 完成！正常: ${ok}  修復: ${fixed}  Supabase 也找不到: ${missing}`);
}

main().catch(console.error);
