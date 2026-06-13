import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const getEnv = (k) => { const m = env.match(new RegExp(`^${k}=(.+)$`, 'm')); return m ? m[1].trim() : null; };
const sb = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));

const { data: trips } = await sb.from('trips')
  .select('id, title, cover_image_url, trip_banner, destination_id')
  .eq('is_active', true);

const { data: dests } = await sb.from('destinations').select('id, title, region_id');
const { data: regions } = await sb.from('regions').select('id, title');
const destMap = new Map(dests.map(d => [d.id, d]));
const regionMap = new Map(regions.map(r => [r.id, r]));

console.log(`檢查 ${trips.length} 個行程的封面圖片...\n`);

const broken = [];
const batch = 10; // 同時檢查數量

for (let i = 0; i < trips.length; i += batch) {
  const chunk = trips.slice(i, i + batch);
  const results = await Promise.all(chunk.map(async (t) => {
    const url = t.cover_image_url;
    const code = t.trip_banner?.code_label || '?';
    const dest = destMap.get(t.destination_id);
    const region = dest ? regionMap.get(dest.region_id) : null;
    const label = `${region?.title || '?'} > ${dest?.title || '?'}`;

    if (!url || url === '') {
      return { t, code, label, issue: '無 URL', broken: true };
    }

    try {
      const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(8000) });
      const contentType = res.headers.get('content-type') || '';
      const contentLength = parseInt(res.headers.get('content-length') || '0');
      
      if (!res.ok) {
        return { t, code, label, issue: `HTTP ${res.status}`, broken: true, url };
      }
      if (contentLength > 0 && contentLength < 1000) {
        return { t, code, label, issue: `太小 (${contentLength} bytes)`, broken: true, url };
      }
      if (!contentType.includes('image')) {
        return { t, code, label, issue: `非圖片 (${contentType})`, broken: true, url };
      }
      return { broken: false };
    } catch (e) {
      return { t, code, label, issue: `存取失敗: ${e.message?.substring(0, 50)}`, broken: true, url };
    }
  }));

  for (const r of results) {
    if (r.broken) broken.push(r);
  }
  
  if ((i + batch) % 50 === 0) process.stdout.write(`  ${i + batch}/${trips.length}...\n`);
}

console.log(`\n=== 結果 ===`);
console.log(`正常: ${trips.length - broken.length}`);
console.log(`有問題: ${broken.length}\n`);

if (broken.length > 0) {
  // 按 destination 分組
  const byDest = new Map();
  for (const b of broken) {
    const list = byDest.get(b.label) || [];
    list.push(b);
    byDest.set(b.label, list);
  }

  for (const [label, items] of [...byDest.entries()].sort()) {
    console.log(`${label}: ${items.length} 筆`);
    for (const b of items) {
      console.log(`  ${b.code} | ${b.t.title.substring(0, 45)} | ${b.issue}`);
      if (b.url) console.log(`    URL: ${b.url.substring(0, 100)}`);
    }
    console.log();
  }

  // 輸出 IDs 供修復用
  console.log('=== 需修復的 trip IDs ===');
  for (const b of broken) {
    console.log(`${b.code}\t${b.t.id}\t${b.t.title.substring(0, 50)}`);
  }
}
