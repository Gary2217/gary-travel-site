import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('.env.local', 'utf8');
const getEnv = (k) => { const m = env.match(new RegExp(`^${k}=(.+)$`, 'm')); return m ? m[1].trim() : null; };
const sb = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));
const BASE = 'https://www.pwgotravel.com.tw';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0';

const res = await fetch(BASE + '/china/', { headers: { 'User-Agent': UA } });
const html = await res.text();
const ch = cheerio.load(html);

console.log('=== 西南地區: 所有行程連結 ===\n');

ch('.row.expand-graphics').each((_, container) => {
  const section = ch(container).parent().find('.header-title').first().text().replace(/\s+/g, ' ').trim();
  if (!section.includes('西南')) return;
  
  ch(container).find('.item-box a').each((i, link) => {
    const href = ch(link).attr('href') || '';
    const title = ch(link).find('h3').text().replace(/\s+/g, ' ').trim();
    const codeMatch = href.match(/mold-new\/([A-Z0-9]+)/i);
    const code = codeMatch ? codeMatch[1].split('?')[0] : null;
    
    // 嘗試其他方式取 code
    const altMatch = href.match(/\/([A-Z0-9]{6,})/i);
    
    console.log(`${i + 1}. ${code || '❌ NO CODE'}`);
    console.log(`   title: ${title.substring(0, 60)}`);
    console.log(`   href: ${href}`);
    if (!code) console.log(`   alt match: ${altMatch ? altMatch[1] : 'none'}`);
    console.log();
  });
});

// 查我們 DB 裡的 inactive 西南行程
console.log('\n=== DB inactive 西南行程 ===');
const ZJJ_ID = 'ce46019d-9435-4e52-99f7-90ae53d093bb';
const { data: inactive } = await sb.from('trips')
  .select('id, title, trip_banner, is_active')
  .eq('destination_id', ZJJ_ID)
  .eq('is_active', false);

for (const t of inactive) {
  console.log(`⛔ ${t.trip_banner?.code_label || '?'} | ${t.title}`);
}
