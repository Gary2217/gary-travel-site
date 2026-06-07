/**
 * 自動抓取朋威行程 PDF 並上傳 Supabase Storage
 *
 * 用法：
 *   node scripts/scrape-pdfs.mjs                    # 抓取所有缺 PDF 的行程
 *   node scripts/scrape-pdfs.mjs --batch=30         # 每次最多 30 筆
 *   node scripts/scrape-pdfs.mjs --trip-id=UUID     # 指定單一行程
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import puppeteer from 'puppeteer';

// ── 環境變數 ──
function loadEnv() {
  // GitHub Actions 用 env，本地用 .env.local
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── 朋威行程頁 URL ──
const PWGO_BASE = 'https://www.pwgotravel.com.tw/products/group/mold-new/';

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
    // 只抓有團號但沒有 PDF 的
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

  // 啟動 Puppeteer
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  let success = 0;
  let failed = 0;

  for (const trip of eligible) {
    const code = trip.trip_banner.code_label;
    const pageUrl = `${PWGO_BASE}${code}`;
    console.log(`\n[${success + failed + 1}/${eligible.length}] ${code} — ${trip.title.substring(0, 40)}`);

    let page = null;
    try {
      page = await browser.newPage();
      page.setDefaultTimeout(45000);
      page.setDefaultNavigationTimeout(45000);
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      );

      // 導航到朋威行程頁
      console.log(`  → 開啟 ${pageUrl}`);
      await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 45000 });

      // 找到「下載」按鈕的連結
      // 朋威的下載按鈕會開啟 pengwai.voyage.com.tw 的 PDF 頁面
      const pdfUrl = await page.evaluate(() => {
        // 方法 1: 找 .sticker-bar 裡的下載連結
        const links = document.querySelectorAll('a[href*="MGroupDetailPDF"], a[onclick*="MGroupDetailPDF"]');
        for (const link of links) {
          if (link.href && link.href.includes('MGroupDetailPDF')) return link.href;
        }
        // 方法 2: 找含有「下載」文字的按鈕
        const allLinks = document.querySelectorAll('a');
        for (const link of allLinks) {
          const text = link.textContent?.trim() || '';
          if (text.includes('下載') && link.href && link.href.includes('PDF')) return link.href;
        }
        // 方法 3: 找 onclick 含有 PDF 的元素
        const clickables = document.querySelectorAll('[onclick*="PDF"]');
        for (const el of clickables) {
          const onclick = el.getAttribute('onclick') || '';
          const match = onclick.match(/window\.open\(['"]([^'"]+)['"]/);
          if (match) return match[1];
        }
        return null;
      });

      let pdfBuffer;

      if (pdfUrl) {
        // 有找到 PDF 預覽 URL → 導航到該頁面生成 PDF
        console.log(`  → 找到 PDF URL，導航中...`);
        const pdfPage = await browser.newPage();
        pdfPage.setDefaultTimeout(60000);
        await pdfPage.goto(pdfUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        await sleep(2000); // 等待渲染完成

        pdfBuffer = await pdfPage.pdf({
          format: 'A3',
          printBackground: true,
          margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
        });
        await pdfPage.close();
      } else {
        // 沒找到 PDF URL → 直接把行程頁面存成 PDF
        console.log(`  → 未找到 PDF 連結，直接截取頁面為 PDF`);
        pdfBuffer = await page.pdf({
          format: 'A3',
          printBackground: true,
          margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
        });
      }

      // 上傳到 Supabase Storage
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

      // 取得公開 URL
      const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName);
      const publicUrl = urlData?.publicUrl;

      if (!publicUrl) {
        throw new Error('無法取得公開 URL');
      }

      // 更新行程的 document_url
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
    } finally {
      if (page) await page.close().catch(() => {});
    }

    await sleep(500); // 避免太快被擋
  }

  await browser.close();
  console.log(`\n📊 完成：${success} 成功，${failed} 失敗，共 ${eligible.length} 筆`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
