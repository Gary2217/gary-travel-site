/**
 * 自動抓取朋威行程 PDF 並上傳 Supabase Storage
 * fetch HTML + Puppeteer page.setContent() 渲染 PDF（保留外部 CSS/字型載入）
 *
 * 用法：
 *   node scripts/scrape-pdfs.mjs                    # 抓取所有缺 PDF 的行程
 *   node scripts/scrape-pdfs.mjs --batch=30         # 每次最多 30 筆
 *   node scripts/scrape-pdfs.mjs --trip-id=UUID     # 指定單一行程
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import puppeteer from 'puppeteer';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const PWGO_GROUP = 'https://www.pwgotravel.com.tw/products/group/mold-new/';
const PWGO_DOMESTIC = 'https://www.pwgotravel.com.tw/products/domestic/mold/';
const DOMESTIC_PREFIXES = ['KM', 'KNH', 'PPH', 'PMZ'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── 環境變數 ──
function loadEnv() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    };
  }
  const env = readFileSync('.env.local', 'utf8');
  const get = (k) => {
    const m = env.match(new RegExp(`^${k}=(.+)$`, 'm'));
    return m ? m[1].trim() : null;
  };
  return {
    supabaseUrl: get('NEXT_PUBLIC_SUPABASE_URL'),
    serviceRoleKey: get('SUPABASE_SERVICE_ROLE_KEY'),
  };
}

// ── 參數解析 ──
function parseArgs(argv) {
  let batchSize = 30;
  let tripId = null;
  for (const arg of argv) {
    if (arg.startsWith('--batch=')) batchSize = parseInt(arg.split('=')[1], 10) || 30;
    if (arg.startsWith('--trip-id=')) tripId = arg.split('=')[1];
  }
  return { batchSize, tripId };
}

async function fetchHTML(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function makeAbsoluteUrls(html, baseUrl) {
  return html
    .replace(/(href|src|action)="\/([^"]*)/g, `$1="${baseUrl}/$2`)
    .replace(/(href|src|action)="(?!http|\/\/|data:|#)([^"]*)/g, `$1="${baseUrl}/$2`);
}

function generateFallbackHtml(trip, code) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body { font-family: "Microsoft JhengHei", "PingFang TC", sans-serif; padding: 40px; }
    h1 { color: #0284c7; font-size: 24px; margin-bottom: 10px; }
    .info { color: #666; font-size: 14px; line-height: 2; }
    .banner { background: linear-gradient(135deg, #0284c7, #0ea5e9); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; }
    .banner h1 { color: white; margin: 0; }
    .contact { margin-top: 30px; padding: 20px; background: #f0f9ff; border-radius: 8px; border: 1px solid #bae6fd; }
  </style></head><body>
    <div class="banner"><h1>${trip.title}</h1></div>
    <div class="info">
      <p>團號：${code}</p>
      <p>天數：${trip.trip_banner?.duration_label || ''}</p>
      <p>售價：${trip.trip_banner?.price_label || ''}</p>
      <p>航空：${trip.trip_banner?.airline || ''}</p>
      <p>標籤：${(trip.trip_banner?.tags || []).join('、')}</p>
    </div>
    <div class="contact">
      <p style="font-size:16px;font-weight:bold;color:#0284c7;">詳細行程請洽旅遊規劃師蓋瑞</p>
      <p style="font-size:14px;color:#666;">LINE 官方帳號：@jsh9321p</p>
    </div>
  </body></html>`;
}

async function main() {
  const { supabaseUrl, serviceRoleKey } = loadEnv();
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { batchSize, tripId } = parseArgs(process.argv.slice(2));

  // 查詢需要抓 PDF 的行程
  let query = supabase
    .from('trips')
    .select('id, title, trip_banner, document_url')
    .eq('is_active', true);

  if (tripId) {
    query = query.eq('id', tripId);
  } else {
    query = query.or('document_url.is.null,document_url.eq.');
  }

  const { data: trips, error } = await query.limit(batchSize);
  if (error) {
    console.error('查詢失敗:', error.message);
    process.exit(1);
  }

  // 過濾出有 code_label 的行程
  const eligible = (trips || []).filter((t) => {
    const code = t.trip_banner?.code_label;
    return code && code.length >= 4;
  });

  if (eligible.length === 0) {
    console.log('✅ 沒有需要抓取 PDF 的行程');
    process.exit(0);
  }

  console.log(`📄 找到 ${eligible.length} 筆需要抓取 PDF 的行程`);

  // Puppeteer 用 setContent 渲染 HTML（保留網路存取以載入外部 CSS/字型）
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  let success = 0;
  let failed = 0;

  for (const trip of eligible) {
    const code = trip.trip_banner.code_label;
    const isDomestic = DOMESTIC_PREFIXES.some((p) => code.startsWith(p));
    const pageUrl = `${isDomestic ? PWGO_DOMESTIC : PWGO_GROUP}${code}`;
    console.log(`\n[${success + failed + 1}/${eligible.length}] ${code} — ${trip.title.substring(0, 40)}`);

    try {
      // Step 1: fetch HTML（快速取得，不靠 Puppeteer 遠端導航）
      console.log(`  → fetch HTML...`);
      let html = await fetchHTML(pageUrl);

      // 檢查是否有實際內容（h1 標籤）
      const hasContent = /<h1[^>]*>[\s\S]*?\S[\s\S]*?<\/h1>/.test(html);
      if (!hasContent) {
        console.log(`  → 朋威頁面無內容，生成簡易行程 PDF`);
        html = generateFallbackHtml(trip, code);
      } else {
        html = makeAbsoluteUrls(html, 'https://www.pwgotravel.com.tw');
      }

      // Step 2: Puppeteer setContent → 渲染 PDF（保留網路存取載入外部 CSS/字型）
      console.log(`  → 渲染 PDF...`);
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

      const pdfBuffer = await page.pdf({
        format: 'A3',
        printBackground: true,
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
      });
      await page.close();

      // Step 4: 上傳到 Supabase Storage
      const fileName = `trip-documents/${trip.id}/${code}.pdf`;
      console.log(`  → 上傳 PDF (${(pdfBuffer.length / 1024).toFixed(0)} KB)...`);

      const { error: uploadErr } = await supabase.storage
        .from('images')
        .upload(fileName, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadErr) {
        throw new Error(`上傳失敗: ${uploadErr.message}`);
      }

      const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName);
      const publicUrl = urlData?.publicUrl;

      if (!publicUrl) {
        throw new Error('無法取得公開 URL');
      }

      // Step 5: 更新行程的 document_url
      const { error: updateErr } = await supabase
        .from('trips')
        .update({ document_url: publicUrl })
        .eq('id', trip.id);

      if (updateErr) {
        throw new Error(`更新 DB 失敗: ${updateErr.message}`);
      }

      console.log(`  ✅ 完成！${publicUrl.substring(publicUrl.lastIndexOf('/') + 1)}`);
      success++;
    } catch (err) {
      console.log(`  ❌ 失敗: ${err.message}`);
      failed++;
    }

    await sleep(300);
  }

  await browser.close();
  console.log(`\n📊 完成：${success} 成功，${failed} 失敗，共 ${eligible.length} 筆`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
