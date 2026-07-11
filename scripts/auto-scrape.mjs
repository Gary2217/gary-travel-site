import { readFileSync } from 'fs';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

// Puppeteer fallback：cheerio 抓不到航班時，用 headless browser 重試
let _puppeteerBrowser = null;

async function getPuppeteerBrowser() {
  if (_puppeteerBrowser) return _puppeteerBrowser;
  try {
    const puppeteer = await import('puppeteer');
    _puppeteerBrowser = await puppeteer.default.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    return _puppeteerBrowser;
  } catch {
    return null; // Puppeteer 不可用（本地開發可能沒裝）
  }
}

async function closePuppeteerBrowser() {
  if (_puppeteerBrowser) {
    await _puppeteerBrowser.close().catch(() => {});
    _puppeteerBrowser = null;
  }
}

/**
 * Puppeteer fallback：從 JS 渲染的頁面提取航空公司、航班資訊和出發日期
 * 在 cheerio 無法取得航班或出發日期時呼叫
 */
async function scrapeAirlineWithPuppeteer(pageUrl) {
  const browser = await getPuppeteerBrowser();
  if (!browser) return null;

  let page;
  try {
    page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('.PriceBlock, #flightModal, #search-table', { timeout: 8000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 3000)); // 等 JS 渲染（出發日期表通常比航班慢）

    const result = await page.evaluate(() => {
      // 從 PriceBlock 取航空公司
      let airline = '';
      document.querySelectorAll('.PriceBlock li').forEach(li => {
        const strong = li.querySelector('strong');
        if (strong && strong.textContent.trim() === '航空公司') {
          const spans = li.querySelectorAll('.fontEg');
          const texts = Array.from(spans).map(s => s.textContent.trim()).filter(t => t && t !== '航班資訊');
          if (texts.length) airline = texts.join(' ');
        }
      });

      // 從 flight modal 取航段
      const segments = [];
      document.querySelectorAll('#flightModal li').forEach(li => {
        const airlineSpan = li.querySelector('.detail_airline span');
        if (!airlineSpan) return;
        const fullText = airlineSpan.textContent.trim();
        const match = fullText.match(/^(.+?)([A-Z]{2}\d{1,4}[A-Z]?)$/i);
        segments.push({
          airline: match ? match[1].trim() : fullText,
          flight_number: match ? match[2].trim() : '',
        });
      });

      // 從出發日期表取完整資料（JS 渲染）
      const departures = [];
      document.querySelectorAll('#search-table tbody tr').forEach(tr => {
        const date = tr.querySelector('.YMD')?.textContent?.trim() || '';
        if (!date) return;
        const rowText = tr.textContent?.trim() || '';
        departures.push({
          date,
          departure_airport: tr.querySelector('.airport')?.textContent?.trim() || '',
          airline: tr.querySelector('.plane-abbr')?.textContent?.trim() || '',
          label: tr.querySelector('.plane-sche')?.textContent?.trim() || '',
          seats_total: Number((tr.querySelector('.TotalSeat')?.textContent || '').replace(/[^\d]/g, '') || 0),
          seats_available: Number((tr.querySelector('.AvailableSeat')?.textContent || '').replace(/[^\d]/g, '') || 0),
          price: Number((tr.querySelector('.TourPrice')?.textContent || '').replace(/[^\d]/g, '') || 0),
          inquiry_only: rowText.includes('請來電洽詢'),
        });
      });

      const departurePlane = document.querySelector('.plane-abbr');
      const planeAbbr = departurePlane ? departurePlane.textContent.trim() : '';

      return { airline, segments, planeAbbr, departures };
    });

    return result;
  } catch (e) {
    console.log(`    ⚠️ Puppeteer fallback 失敗：${e.message}`);
    return null;
  } finally {
    if (page) await page.close().catch(() => {});
  }
}

const BASE_URL = 'https://www.pwgotravel.com.tw';
const REGION_PAGES = [
  { key: 'asia', url: '/asia/', tabs: ['中東', '中亞', '西伯利亞', '高雄出發'] },
  { key: 'japan', url: '/japan/', tabs: ['北海道', '東北', '關東', '中部', '關西', '四國', '九州', '沖繩'] },
  { key: 'south-korea', url: '/south-korea/', tabs: ['首爾', '釜山', '濟州島'] },
  { key: 'thailand', url: '/thailand/', tabs: ['曼谷', '泰北', '普吉'] },
  { key: 'vietnam', url: '/vietnam/', tabs: ['富國島', '芽莊', '中越', '北越'] },
  { key: 'indonesia', url: '/indonesia/', tabs: ['峇里島', '雅加達'] },
  { key: 'malaysia', url: '/malaysia/', tabs: ['馬來西亞/新加坡'] },
  { key: 'philippines', url: '/philippines/', tabs: ['長灘島', '宿霧薄荷島'] },
  { key: 'europe', url: '/europe/', tabs: ['中西歐', '東歐', '南歐', '北歐'] },
  { key: 'china', url: '/china/', tabs: ['東北', '華東', '華中', '華南', '西南', '西北'] },
  { key: 'southasia', url: '/southasia/', tabs: ['不丹', '馬爾地夫', '斯里蘭卡'] },
  { key: 'new', url: '/new/', tabs: ['紐澳', '美加'] },
  { key: 'kinmen', url: '/kinmen/', tabs: ['金門'] },
  { key: 'mazu', url: '/mazu/', tabs: ['馬祖'] },
  { key: 'penghu', url: '/penghu/', tabs: ['澎湖'] },
  { key: 'freetour', url: '/freetour/', tabs: [] },
  { key: 'golf', url: '/golf/', tabs: [] },
];

const CITY_BY_AIRPORT = {
  '桃園國際機場': '桃園',
  '高雄-小港機場': '高雄',
  '高雄國際機場': '高雄',
  '台北松山機場': '松山',
  '台中清泉崗機場': '台中',
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const FETCH_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchHTML(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { headers: { 'User-Agent': FETCH_UA }, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
    return response.text();
  } finally {
    clearTimeout(timer);
  }
}

function loadEnv() {
  // 優先讀 process.env（GitHub Actions），fallback 讀 .env.local（本機）
  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    try {
      const env = readFileSync('.env.local', 'utf8');
      const getEnv = (key) => {
        const matched = env.match(new RegExp(`^${key}=(.+)$`, 'm'));
        return matched ? matched[1].trim() : null;
      };
      supabaseUrl = supabaseUrl || getEnv('NEXT_PUBLIC_SUPABASE_URL');
      serviceRoleKey = serviceRoleKey || getEnv('SUPABASE_SERVICE_ROLE_KEY');
    } catch {
      // .env.local 不存在（GitHub Actions 環境）
    }
  }

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY');
  }

  return { supabaseUrl, serviceRoleKey };
}

function parseArgs(argv) {
  const args = { regions: null, logId: null, destinationId: null, tripIds: null };

  for (const arg of argv) {
    if (arg.startsWith('--regions=')) {
      args.regions = arg
        .slice('--regions='.length)
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    } else if (arg.startsWith('--log-id=')) {
      args.logId = arg.slice('--log-id='.length).trim() || null;
    } else if (arg.startsWith('--destination-id=')) {
      args.destinationId = arg.slice('--destination-id='.length).trim() || null;
    } else if (arg.startsWith('--trip-ids=')) {
      args.tripIds = arg
        .slice('--trip-ids='.length)
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    }
  }

  return args;
}

function normalizeTitle(title) {
  return String(title || '')
    .replace(/[～~\-–—|｜×✕✖＋+&＆]/g, '')
    .replace(/\s+/g, '')
    .replace(/[，,。.、！!？?：:；;（）()【】\[\]「」『』"'']/g, '')
    .toLowerCase()
    .trim();
}

// 相鄰字元對（bigram）多重集合，保留字元順序資訊
function bigrams(str) {
  const map = new Map();
  for (let i = 0; i < str.length - 1; i += 1) {
    const bg = str.slice(i, i + 2);
    map.set(bg, (map.get(bg) || 0) + 1);
  }
  return map;
}

// 字串相似度：使用 bigram Dice 係數（考慮字元順序，比純字元集合準確）。
// 舊版用「字元集合重疊 + substring=0.9」會把不同行程誤配（如杜拜阿提哈德↔阿聯酋、
// 泰國曼谷↔泰國普吉），因為只看字元有無、不看順序。改用 bigram 後這類誤配大幅降低。
// 注意：code_label 精確比對永遠優先於此函式，similarity 僅作低信心 fallback。
function similarity(a, b) {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  // 太短（<2 字）無法產生 bigram，退回精確比對
  if (na.length < 2 || nb.length < 2) return na === nb ? 1 : 0;

  const bgA = bigrams(na);
  const bgB = bigrams(nb);
  let intersection = 0;
  let totalA = 0;
  let totalB = 0;
  for (const count of bgA.values()) totalA += count;
  for (const count of bgB.values()) totalB += count;
  for (const [bg, countA] of bgA) {
    const countB = bgB.get(bg);
    if (countB) intersection += Math.min(countA, countB);
  }
  // Dice 係數：2 * 交集 / (|A| + |B|)
  return (2 * intersection) / (totalA + totalB);
}

function toAbsoluteUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('/')) return `${BASE_URL}${url}`;
  return `${BASE_URL}/${url.replace(/^\//, '')}`;
}

function sanitizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeTag(value) {
  const t = sanitizeText(value)
    .replace(/^#/, '')
    .replace(/^\((國外|國內|首頁)\)/, '')
    .trim();
  if (!t) return '';
  if (t.length > 14) return ''; // 過長非賣點（多為備註/贈品說明）
  // 過濾雜訊標籤（非賣點）：航空公司名、贈品/備品/服務備註
  // 註：下午茶/按摩/貴賓室等「可能是正當體驗賣點」的詞不硬濾，改靠「贈」攔截贈品版本
  if (t.includes('航空') || /航$/.test(t)) return '';
  if (/網卡|SIM|上網|分享器|插頭|束帶|收納|盥洗|傳輸線|礦泉水|翻譯機|WIFI|wifi|無限供應|價值[\d]|贈/.test(t)) return '';
  return t;
}

// 從行程標題拆出精選賣點當標籤（取 ~/～ 後、以標點/空格分隔、過濾雜訊、限 5 個）
function extractSellingPoints(title) {
  if (!title) return [];
  let t = title.includes('|') ? title.split('|').pop().trim() : title;
  t = t.replace(/[【[][^】\]]*[】\]]/g, '');
  const tildeIdx = t.search(/[~～]/);
  let pointsPart = tildeIdx >= 0 ? t.slice(tildeIdx + 1) : t;
  const paren = pointsPart.match(/[（(]([^）)]+)[）)]/);
  if (/^\S*\d+\s*[天日]/.test(pointsPart.trim()) && paren) {
    pointsPart = paren[1];
  } else {
    pointsPart = pointsPart.replace(/[（(][^）)]*[）)]/g, '');
  }
  const rawPoints = pointsPart.split(/[、，,／/.．\s{}｛｝+]+/).map((s) => s.trim()).filter(Boolean);
  const out = [];
  const seen = new Set();
  for (let p of rawPoints) {
    p = p.replace(/^[\u4e00-\u9fa5]{2,4}(進出|出發)-?/, '');
    p = p.replace(/^季節限定/, '');
    p = p.replace(/[一二三四五六七八九十\d]+\s*[天日晚](遊|自由行)?/g, '');
    p = p.replace(/自由行/g, '');
    p = p.replace(/[-－總]+$/, '').trim();
    if (!p || p.length < 2 || p.length > 12) continue;
    if (/^\d+$/.test(p)) continue;
    if (p.includes('航空') || /航$/.test(p)) continue;
    if (/(出發|直飛|飛往)$/.test(p)) continue;
    if (seen.has(p)) continue;
    seen.add(p);
    out.push(p);
    if (out.length >= 5) break;
  }
  return out;
}

function normalizePriceText(value) {
  const text = sanitizeText(value).replace(/\s+/g, '');
  if (!text) return '';
  if (text.includes('洽詢')) return '洽詢';

  const matched = text.match(/NT\$?\s*([\d,]+)/i);
  if (!matched) return text;
  const suffix = text.includes('元起') ? '元起' : text.includes('起') ? '起' : '';
  return `NT$${matched[1]}${suffix}`;
}

function formatPriceRange(adultPrice) {
  const normalized = normalizePriceText(adultPrice);
  if (!normalized || normalized === '洽詢') return normalized;
  return normalized.replace(/元起$/, '起');
}

function padDate(dateStr) {
  const normalized = sanitizeText(dateStr).replace(/\//g, '-');
  const parts = normalized.split('-');
  if (parts.length !== 3) return normalized;
  return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
}

function parseNumber(value) {
  const digits = String(value || '').replace(/[^\d-]/g, '');
  return digits ? Number(digits) : null;
}

function getAirlineCodeFromFlightNumber(flightNumber) {
  // 航班號碼格式：2-3 碼英文字母 + 數字，如 MH367、CI123、7C1234
  const matched = String(flightNumber || '').trim().match(/^([A-Z]{2}[A-Z]?|\d[A-Z])/i);
  return matched ? matched[0].toUpperCase() : '';
}

// 航空公司名稱 → 正確 IATA 代碼對照。
// 用途：驗證「從航班號取到的代碼」是否真的屬於這家航空公司，避免張冠李戴。
// （例：高雄杜拜行程第一段是國泰 CX 轉機，但主航空是阿提哈德 EY，不可把 CX 拼給阿提哈德）
const AIRLINE_NAME_TO_CODE = {
  // ── 台灣 ──
  中華航空: 'CI', 長榮航空: 'BR', 星宇航空: 'JX', 台灣虎航: 'IT', 立榮航空: 'B7', 華信航空: 'AE',
  // ── 日本 ──
  日本航空: 'JL', 全日空: 'NH', 樂桃航空: 'MM', 捷星日本: 'GK', 春秋航空日本: 'IJ', 亞洲天網航空: '7G',
  // ── 韓國 ──
  大韓航空: 'KE', 韓亞航空: 'OZ', 濟州航空: '7C', 真航空: 'LJ', 德威航空: 'TW', 釜山航空: 'BX',
  首爾航空: 'RS', 易斯達航空: 'ZE', 韓國天空航空: 'RF',
  // ── 東南亞 ──
  泰國航空: 'TG', 新加坡航空: 'SQ', 馬來西亞航空: 'MH', 馬來西亞國際航空: 'MH', 印尼航空: 'GA',
  菲律賓航空: 'PR', 越南航空: 'VN', 越捷航空: 'VJ', 泰國越捷航空: 'VZ', 酷航: 'TR', 亞洲航空: 'AK',
  宿霧太平洋航空: '5J', 泰國獅子航空: 'SL', 皇雀航空: 'DD', 曼谷航空: 'PG', 太陽富國航空: '9G',
  越捷航空越南: 'VJ', 汶萊皇家航空: 'BI', 老撾航空: 'QV', 柬埔寨吳哥航空: 'K6', 緬甸國際航空: 'UB',
  // ── 兩岸/港澳 ──
  國泰航空: 'CX', 香港航空: 'HX', 大灣區航空: 'HB', 香港快運: 'UO', 澳門航空: 'NX',
  中國國際航空: 'CA', 中國東方航空: 'MU', 中國南方航空: 'CZ', 廈門航空: 'MF', 四川航空: '3U',
  海南航空: 'HU', 深圳航空: 'ZH', 上海航空: 'FM', 山東航空: 'SC', 吉祥航空: 'HO', 春秋航空: '9C',
  // ── 中東 ──
  阿提哈德航空: 'EY', 阿聯酋航空: 'EK', 卡達航空: 'QR', 土耳其航空: 'TK', 以色列航空: 'LY',
  阿曼航空: 'WY', 沙烏地阿拉伯航空: 'SV', 伊朗滿漢航空: 'W5', 科威特航空: 'KU',
  // ── 歐洲 ──
  荷蘭皇家航空: 'KL', 法國航空: 'AF', 德國漢莎航空: 'LH', 英國航空: 'BA', 瑞士國際航空: 'LX',
  奧地利航空: 'OS', 義大利航空: 'AZ', 芬蘭航空: 'AY', 北歐航空: 'SK', 西班牙國家航空: 'IB',
  波蘭航空: 'LO', 愛爾蘭航空: 'EI', 葡萄牙航空: 'TP',
  // ── 美加/紐澳 ──
  美國聯合航空: 'UA', 美國航空: 'AA', 達美航空: 'DL', 加拿大航空: 'AC', 紐西蘭航空: 'NZ',
  澳洲航空: 'QF', 斐濟航空: 'FJ', 夏威夷航空: 'HA',
  // ── 其他 ──
  不丹航空: 'B3', 尼泊爾喜馬拉雅航空: 'H9', 斯里蘭卡航空: 'UL', 印度航空: 'AI',
  蒙古航空: 'OM', 烏茲別克航空: 'HY', 哈薩克航空: 'KC', 西伯利亞航空: 'S7', 俄羅斯航空: 'SU',
};

// 從「航空名可能黏航班號或帶括號代碼」的字串，拆出乾淨航空名 + 代碼
function cleanAirlineName(raw) {
  const s = sanitizeText(raw);
  if (!s) return { name: '', code: '' };
  // 已有括號代碼 → 取括號前名稱 + 代碼
  const parenMatch = s.match(/^(.+?)[（(]([A-Z0-9]{2,3})[)）]/);
  if (parenMatch) return { name: parenMatch[1].trim(), code: parenMatch[2] };
  // 名稱結尾黏航班號（如「不丹航空B3701」「太陽富國航空9G511」）→ 取代碼、去掉航班號
  const flightMatch = s.match(/^(.+?)([A-Z0-9]{2}[A-Z]?)\d{2,4}$/i);
  if (flightMatch) return { name: flightMatch[1].trim(), code: flightMatch[2].toUpperCase() };
  return { name: s, code: '' };
}

// 單一航段：航空公司名稱 + 正確代碼（優先用名稱對照表，避免拼錯代碼；並清掉黏著的航班號）
function formatAirlineLabel(airline, flightNumber) {
  const { name, code: codeFromRaw } = cleanAirlineName(airline);
  if (!name) return '';

  // 優先用「航空公司名稱」對應的正確代碼（最可靠，不會張冠李戴）
  const codeByName = AIRLINE_NAME_TO_CODE[name];
  if (codeByName) return `${name}（${codeByName}）`;

  // 名稱不在對照表 → 用航段自己的代碼（先用原字串黏著的，再退回傳入的 flightNumber）
  const code = codeFromRaw || getAirlineCodeFromFlightNumber(flightNumber);
  return code ? `${name}（${code}）` : name;
}

// 主航空公司欄：轉機行程會有多家航空，全部列出（去重、保留順序）。
// 例：高雄轉香港到阿布達比 → 「國泰航空（CX）＋阿提哈德航空（EY）」
function buildPrimaryAirlineLabel(flightSegments) {
  const seen = new Set();
  const labels = [];
  for (const seg of flightSegments || []) {
    const { name, code: codeFromRaw } = cleanAirlineName(seg.airline);
    if (!name) continue;
    // 用乾淨航空名去重（同一家航空的去回程只算一次）
    if (seen.has(name)) continue;
    seen.add(name);
    const code = AIRLINE_NAME_TO_CODE[name] || codeFromRaw;
    labels.push(code ? `${name}（${code}）` : name);
  }
  return labels.join('＋');
}

function getDepartureCity(airport) {
  const text = sanitizeText(airport);
  if (CITY_BY_AIRPORT[text]) return CITY_BY_AIRPORT[text];
  if (text.includes('高雄')) return '高雄';
  if (text.includes('松山')) return '松山';
  if (text.includes('台中')) return '台中';
  return '桃園';
}

function getDepartureLabel(airport) {
  return `${getDepartureCity(airport)}出發`;
}

function buildSubtitle({ title, airline, tags }) {
  const airlineLabel = sanitizeText(airline);
  const cleanedTitle = sanitizeText(title).replace(/\d+天\d+夜/g, '').trim();
  const titleSegments = cleanedTitle
    .split(/[~～｜|]/)
    .map((segment) => sanitizeText(segment))
    .filter(Boolean);

  const summarySource = titleSegments[1] || titleSegments[0] || '';
  const summaryParts = summarySource
    .split(/[、,，]/)
    .map((segment) => sanitizeText(segment))
    .filter(Boolean)
    .slice(0, 4);

  const fallbackTags = Array.isArray(tags) ? tags.slice(0, 4) : [];
  const summary = (summaryParts.length ? summaryParts : fallbackTags).join('、');

  if (airlineLabel && summary) return `${airlineLabel}｜${summary}`;
  return airlineLabel || summary || cleanedTitle;
}

// 我們的售價明細固定 5 欄順序：大人、小孩佔床、小孩不佔床、加床、嬰兒
const PRICE_DETAIL_COLUMNS = ['大人', '小孩佔床', '小孩不佔床', '加床', '嬰兒'];

// 從朋威售價表用 thead 欄名對應到我們的 5 欄（朋威可能只有 4 欄、無加床）。
// 只取第一個 .LowestPrice table，避免頁面簡表與 Modal 重複。
function extractPriceDetailByHeader($) {
  const table = $('.LowestPrice table').first();
  if (!table.length) return [];

  const headers = [];
  table.find('thead tr th').each((_, th) => headers.push(sanitizeText($(th).text())));
  const values = [];
  table.find('tbody tr td').each((_, td) => values.push(sanitizeText($(td).text())));

  // 建立「欄名 → 價格」對照
  const priceByLabel = {};
  headers.forEach((label, i) => {
    const key = label.replace(/\s/g, '');
    if (key && values[i] != null) priceByLabel[key] = values[i];
  });

  // 依我們固定的 5 欄順序取值；朋威沒有的欄（如加床）留空
  return PRICE_DETAIL_COLUMNS.map((label) => priceByLabel[label] || '');
}

function buildPriceDetailText(priceDetails) {
  return [0, 1, 2, 3, 4].map((index) => normalizePriceText(priceDetails[index] || '')).join('\t');
}

function sortObject(value) {
  if (Array.isArray(value)) {
    return value.map(sortObject);
  }

  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((accumulator, key) => {
        accumulator[key] = sortObject(value[key]);
        return accumulator;
      }, {});
  }

  return value ?? null;
}

function stableStringify(value) {
  return JSON.stringify(sortObject(value));
}

function normalizeDepartureRow(row) {
  return {
    departure_date: sanitizeText(row.departure_date || row.date),
    departure_city: sanitizeText(row.departure_city || row.city),
    airline: sanitizeText(row.airline),
    price: row.price == null ? null : Number(row.price),
    seats_total: row.seats_total == null ? null : Number(row.seats_total),
    seats_available: row.seats_available == null ? null : Number(row.seats_available),
    label: sanitizeText(row.label),
    outbound_flight: sanitizeText(row.outbound_flight),
    outbound_time: sanitizeText(row.outbound_time),
    outbound_from: sanitizeText(row.outbound_from),
    outbound_arrival_time: sanitizeText(row.outbound_arrival_time),
    outbound_to: sanitizeText(row.outbound_to),
    outbound_next_day: Boolean(row.outbound_next_day),
    return_flight: sanitizeText(row.return_flight),
    return_time: sanitizeText(row.return_time),
    return_from: sanitizeText(row.return_from),
    return_arrival_time: sanitizeText(row.return_arrival_time),
    return_to: sanitizeText(row.return_to),
    return_next_day: Boolean(row.return_next_day),
    flight_segments: (row.flight_segments || []).map((segment) => ({
      airline: sanitizeText(segment.airline),
      flight_number: sanitizeText(segment.flight_number),
      dep_time: sanitizeText(segment.dep_time),
      dep_airport: sanitizeText(segment.dep_airport),
      arr_time: sanitizeText(segment.arr_time),
      arr_airport: sanitizeText(segment.arr_airport),
      next_day: Boolean(segment.next_day),
    })),
  };
}

function extractExistingFlightSegments(trip) {
  const departureWithSegments = (trip.departure_dates || []).find(
    (departure) => Array.isArray(departure.flight_segments) && departure.flight_segments.length > 0,
  );

  if (departureWithSegments) {
    return departureWithSegments.flight_segments.map((segment) => ({
      airline: sanitizeText(segment.airline),
      flight_number: sanitizeText(segment.flight_number),
      dep_time: sanitizeText(segment.dep_time),
      dep_airport: sanitizeText(segment.dep_airport),
      arr_time: sanitizeText(segment.arr_time),
      arr_airport: sanitizeText(segment.arr_airport),
      next_day: Boolean(segment.next_day),
    }));
  }

  const sample = trip.departure_dates?.[0];
  if (!sample) return [];

  const segments = [];
  if (sample.outbound_flight || sample.outbound_time || sample.outbound_from || sample.outbound_to) {
    segments.push({
      airline: sanitizeText(sample.airline),
      flight_number: sanitizeText(sample.outbound_flight),
      dep_time: sanitizeText(sample.outbound_time),
      dep_airport: sanitizeText(sample.outbound_from),
      arr_time: sanitizeText(sample.outbound_arrival_time),
      arr_airport: sanitizeText(sample.outbound_to),
      next_day: Boolean(sample.outbound_next_day),
    });
  }
  if (sample.return_flight || sample.return_time || sample.return_from || sample.return_to) {
    segments.push({
      airline: sanitizeText(sample.airline),
      flight_number: sanitizeText(sample.return_flight),
      dep_time: sanitizeText(sample.return_time),
      dep_airport: sanitizeText(sample.return_from),
      arr_time: sanitizeText(sample.return_arrival_time),
      arr_airport: sanitizeText(sample.return_to),
      next_day: Boolean(sample.return_next_day),
    });
  }

  return segments;
}

function buildExistingDepartureSnapshot(trip) {
  return (trip.departure_dates || [])
    .map((departure) => normalizeDepartureRow(departure))
    .sort((left, right) => left.departure_date.localeCompare(right.departure_date));
}

function buildScrapedDepartureSnapshot(scraped) {
  const outbound = scraped.flight_segments[0] || null;
  const inbound = scraped.flight_segments[scraped.flight_segments.length - 1] || null;

  return (scraped.departures || [])
    .map((departure) =>
      normalizeDepartureRow({
        departure_date: departure.date,
        departure_city: departure.departure_city,
        airline: departure.airline,
        price: departure.price,
        seats_total: departure.seats_total,
        seats_available: departure.seats_available,
        label: departure.label,
        outbound_flight: outbound?.flight_number || null,
        outbound_time: outbound?.dep_time || null,
        outbound_from: outbound?.dep_airport || null,
        outbound_arrival_time: outbound?.arr_time || null,
        outbound_to: outbound?.arr_airport || null,
        outbound_next_day: outbound?.next_day || false,
        return_flight: inbound?.flight_number || null,
        return_time: inbound?.dep_time || null,
        return_from: inbound?.dep_airport || null,
        return_arrival_time: inbound?.arr_time || null,
        return_to: inbound?.arr_airport || null,
        return_next_day: inbound?.next_day || false,
        flight_segments: scraped.flight_segments,
      }),
    )
    .sort((left, right) => left.departure_date.localeCompare(right.departure_date));
}

function selectRegions(regionKeys) {
  if (!regionKeys?.length) return REGION_PAGES;

  const selected = REGION_PAGES.filter((region) => regionKeys.includes(region.key));
  const invalid = regionKeys.filter((key) => !selected.some((region) => region.key === key));

  if (invalid.length) {
    throw new Error(`找不到區域設定：${invalid.join(', ')}`);
  }

  return selected;
}

function buildRegionDetails(regions) {
  return regions.map((region) => ({
    key: region.key,
    name: region.key,
    url: region.url,
    tabs: region.tabs,
    status: 'pending',
    trip_count: 0,
    completed: 0,
  }));
}

function mergeRegionDetail(regionDetails, key, patch) {
  return regionDetails.map((detail) =>
    detail.key === key
      ? {
          ...detail,
          ...patch,
        }
      : detail,
  );
}



async function createOrResetLog(supabase, requestedLogId, totalRegions, regionDetails) {
  const payload = {
    status: 'running',
    current_region: '',
    current_trip: '',
    total_regions: totalRegions,
    completed_regions: 0,
    total_trips: 0,
    completed_trips: 0,
    changes_found: 0,
    error_message: null,
    region_details: regionDetails,
    started_at: new Date().toISOString(),
    finished_at: null,
  };

  if (requestedLogId) {
    const { error } = await supabase.from('scrape_logs').upsert({ id: requestedLogId, ...payload });
    if (error) throw new Error(`建立 scrape_logs 失敗：${error.message}`);

    const { error: cleanupError } = await supabase.from('pending_changes').delete().eq('scrape_log_id', requestedLogId);
    if (cleanupError) throw new Error(`清除既有 pending_changes 失敗：${cleanupError.message}`);
    return requestedLogId;
  }

  const { data, error } = await supabase.from('scrape_logs').insert(payload).select('id').single();
  if (error) throw new Error(`建立 scrape_logs 失敗：${error.message}`);
  return data.id;
}

async function updateLog(supabase, logId, patch) {
  const { error } = await supabase.from('scrape_logs').update(patch).eq('id', logId);
  if (error) throw new Error(`更新 scrape_logs 失敗：${error.message}`);
}

async function loadDestinations(supabase) {
  const { data, error } = await supabase
    .from('destinations')
    .select('id, title, subtitle, display_order, is_active, source_url, sub_region')
    .eq('is_active', true);

  if (error) throw new Error(`讀取 destinations 失敗：${error.message}`);
  return data || [];
}

function getRegionConfigBySourceUrl(sourceUrl) {
  const normalized = sanitizeText(sourceUrl);
  if (!normalized) return null;

  let parsedUrl;
  try {
    parsedUrl = new URL(normalized);
  } catch {
    return null;
  }

  const pathname = parsedUrl.pathname.endsWith('/') ? parsedUrl.pathname : `${parsedUrl.pathname}/`;
  return REGION_PAGES.find((region) => region.url === pathname) || null;
}

function getSourceBlockId(sourceUrl) {
  const normalized = sanitizeText(sourceUrl);
  if (!normalized) return '';

  try {
    const parsedUrl = new URL(normalized);
    return parsedUrl.hash.replace(/^#/, '').trim();
  } catch {
    return '';
  }
}

async function loadExistingTrips(supabase) {
  const { data, error } = await supabase
    .from('trips')
    .select(`
      id,
      destination_id,
      title,
      subtitle,
      duration,
      price_range,
      display_order,
      is_active,
      source_url,
      scrape_managed,
      trip_banner,
      departure_dates:trip_departure_dates (
        trip_id,
        departure_date,
        departure_city,
        airline,
        price,
        seats_total,
        seats_available,
        label,
        outbound_flight,
        outbound_time,
        outbound_from,
        outbound_arrival_time,
        outbound_to,
        outbound_next_day,
        return_flight,
        return_time,
        return_from,
        return_arrival_time,
        return_to,
        return_next_day,
        flight_segments,
        is_active
      )
    `)
    ; // 不篩選 is_active，停用行程也要比對

  if (error) throw new Error(`讀取 trips 失敗：${error.message}`);
  return data || [];
}

function buildDestinationResolver(destinations, existingTrips) {
  const tripCountByDestinationId = existingTrips.reduce((accumulator, trip) => {
    accumulator.set(trip.destination_id, (accumulator.get(trip.destination_id) || 0) + 1);
    return accumulator;
  }, new Map());

  const titleMap = new Map();
  for (const destination of destinations) {
    // 用 title 索引
    const key = normalizeTitle(destination.title);
    const list = titleMap.get(key) || [];
    list.push(destination);
    titleMap.set(key, list);

    // 也用 sub_region 索引（讓抓取器能透過 sub_region 配對）
    if (destination.sub_region) {
      const subKey = normalizeTitle(destination.sub_region);
      if (subKey !== key) {
        const subList = titleMap.get(subKey) || [];
        subList.push(destination);
        titleMap.set(subKey, subList);
      }
    }
  }

  const aliases = new Map([
    ['濟州島', '濟州'],
    ['普吉', '普吉島'],
    ['宿霧薄荷島', '宿霧'],
    ['馬來西亞/新加坡', '新加坡'],
    // 港澳大陸：朋威 tab/breadcrumb → 我們的 sub_region（已改名）
    // 朋威 tab 名 → 新 sub_region
    ['華東', '江南'], ['華中', '重慶'], ['華南', '桂林'], ['西南', '張家界'], ['西北', '新疆'],
    // 朋威 breadcrumb 城市名 → 新 sub_region
    ['廈門', '江南'], ['上海', '江南'], ['山東', '江南'],
    ['黃山', '江南'], ['浙江', '江南'], ['福建', '江南'], ['江蘇', '江南'],
    ['江西', '江南'], ['安徽', '江南'], ['小三通', '江南'],
    ['成都', '張家界'], ['九寨溝', '張家界'],
    ['貴州', '張家界'], ['貴州(貴陽)', '張家界'], ['雲南', '張家界'], ['雲南(昆明)', '張家界'],
    ['西藏', '張家界'], ['四川', '張家界'], ['閬中', '張家界'], ['宜昌', '張家界'],
    ['鄭州', '重慶'], ['湖南', '重慶'], ['湖北', '重慶'],
    ['廣東', '桂林'], ['海南', '桂林'], ['香港', '桂林'], ['澳門', '桂林'],
    ['瀋陽', '東北'], ['吉林', '東北'], ['黑龍江', '東北'], ['北京', '東北'],
    ['西北地區', '新疆'], ['青海', '新疆'], ['陝西', '新疆'], ['甘肅', '新疆'], ['寧夏', '新疆'],
    // 中東亞非（土耳其/埃及/伊朗已有獨立 destination，直接匹配）
    ['阿布達比', '杜拜+阿布達比'],
    // 歐洲：朋威 tab 名 → 新 sub_region
    ['中西歐', '英法德瑞'], ['東歐', '奧捷匈'], ['南歐', '義大利/希臘'], ['北歐', '芬蘭/瑞典'],
    // 日本（title 未改，sub_region 改名但 title 仍可匹配）
    ['名古屋', '中部'],
  ]);

  return (label, regionUrl) => {
    const normalized = normalizeTitle(label);
    const fallback = aliases.get(sanitizeText(label));
    let candidates = titleMap.get(normalized) || (fallback ? titleMap.get(normalizeTitle(fallback)) || [] : []);

    if (!candidates.length) return null;
    if (candidates.length === 1) return candidates[0];

    // 多個候選時，用 region URL 篩選（解決「東北」同時匹配日本東北和港澳大陸東北的問題）
    if (regionUrl && candidates.length > 1) {
      const regionPath = regionUrl.replace(/\/$/, '');
      const regionFiltered = candidates.filter((d) =>
        d.source_url && d.source_url.includes(regionPath),
      );
      if (regionFiltered.length > 0) {
        candidates = regionFiltered;
      }
    }

    if (candidates.length === 1) return candidates[0];

    return [...candidates].sort((left, right) => {
      const tripDiff = (tripCountByDestinationId.get(right.id) || 0) - (tripCountByDestinationId.get(left.id) || 0);
      if (tripDiff !== 0) return tripDiff;
      return left.display_order - right.display_order;
    })[0];
  };
}

// 從朋威行程 URL 取路徑末段的團號（如 …/mold-new/CAI5AA10D?sacct_no=x → CAI5AA10D），忽略 query 參數
function extractUrlCode(url) {
  try {
    const parts = new URL(url, BASE_URL).pathname.split('/').filter(Boolean);
    const last = parts[parts.length - 1] || '';
    return /^[A-Z][A-Z0-9]{4,}$/i.test(last) ? last.toUpperCase() : '';
  } catch {
    return '';
  }
}

function findExistingTripForScrapedTrip(scrapedTrip, destinationTrips, consumedTripIds) {
  const scrapedCode = sanitizeText(scrapedTrip.code_label);

  // ⓪ 來源網址團號比對（最強）：手動卡片貼了來源網址、但還沒抓過（無 code_label）時，
  // 用網址路徑末段的團號比對，忽略 ?sacct_no= 等 query 差異，避免全區抓取重複建卡。
  const scrapedUrlCode = extractUrlCode(scrapedTrip.source_url);
  if (scrapedUrlCode) {
    const byUrl = destinationTrips.find((trip) => {
      if (consumedTripIds.has(trip.id)) return false;
      return extractUrlCode(trip.source_url) === scrapedUrlCode;
    });
    if (byUrl) return byUrl;
  }

  // ① 團型編號精確比對（最可靠）。兩邊都必須非空，避免空 code_label 互相誤配。
  if (scrapedCode) {
    const byCode = destinationTrips.find((trip) => {
      if (consumedTripIds.has(trip.id)) return false;
      const tripCode = sanitizeText(trip.trip_banner?.code_label);
      return tripCode && tripCode === scrapedCode;
    });
    if (byCode) return byCode;
  }

  // ② 標題相似度 fallback（bigram Dice）
  let bestMatch = null;
  let bestScore = 0;
  for (const trip of destinationTrips) {
    if (consumedTripIds.has(trip.id)) continue;
    const score = similarity(scrapedTrip.title, trip.title);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = trip;
    }
  }

  if (!bestMatch || bestScore < 0.7) return null;

  // ③ 航空公司一致性防線：標題高度相似但航空公司明顯不同 → 視為不同行程，不配對。
  // 這擋住「同名不同航空」的誤配（如杜拜行程：阿提哈德版 vs 阿聯酋版，標題只差航空名）。
  const scrapedAirline = sanitizeText(scrapedTrip.airline);
  const existingAirline = sanitizeText(bestMatch.trip_banner?.airline);
  if (scrapedAirline && existingAirline && similarity(scrapedAirline, existingAirline) < 0.5) {
    return null;
  }

  return bestMatch;
}

async function scrapeRegionListings(regionConfig, targetSourceUrl = '', targetDestinationTitle = '', targetSubRegion = '') {
  const url = `${BASE_URL}${regionConfig.url}`;
  console.log(`\n🌐 區域頁：${url}`);

  let html;
  try {
    html = await fetchHTML(url);
  } catch (fetchErr) {
    console.log(`  ⚠️ 區域頁載入失敗：${fetchErr.message}`);
    return [];
  }

  const $ = cheerio.load(html);
  const targetBlockId = getSourceBlockId(targetSourceUrl);
  const seenHref = new Set();
  const sections = [];

  $('.row.expand-graphics').each((_, container) => {
    const $container = $(container);
    const $parent = $container.parent();
    const sectionLabel = sanitizeText($parent.find('.header-title').first().text());

    // 優先使用穩定的 blk-* ID（伺服器產生，不會每次刷新改變）
    const $blkAncestor = $container.closest('[id^="blk-"]');
    const blockId = sanitizeText(
      ($blkAncestor.length ? $blkAncestor.attr('id') : '') ||
      $parent.attr('id') ||
      $container.attr('id') ||
      $parent.closest('[id]').attr('id') || ''
    );

    // 如果有指定 blockId，只取匹配的
    if (targetBlockId && blockId !== targetBlockId) return;

    const trips = [];
    // 支援 group 和 domestic（國內行程：金門/澎湖/馬祖）
    $container.find('.item-box a[href*="/products/group/"], .item-box a[href*="/products/domestic/"]').each((index, link) => {
      const href = $(link).attr('href') || '';
      const absoluteHref = href.startsWith('http') ? href : `${BASE_URL}${href}`;
      if (!href || seenHref.has(absoluteHref)) return;
      seenHref.add(absoluteHref);

      const title = sanitizeText($(link).find('h3').text());
      const priceText = sanitizeText($(link).find('h4').text());
      const listingTags = [];
      $(link).find('.item_tag').each((_, tag) => {
        const t = sanitizeText($(tag).text());
        if (t) listingTags.push(t);
      });

      trips.push({
        title,
        list_price: priceText,
        href: absoluteHref,
        section_label: sectionLabel,
        display_order: index + 1,
        listing_tags: listingTags,
      });
    });

    if (trips.length > 0) {
      sections.push({ label: sectionLabel, block_id: blockId, trips });
    }
  });

  // 若有指定 destination，用 title 或 sub_region 比對 section label
  if (!targetBlockId && (targetDestinationTitle || targetSubRegion)) {
    const candidates = [targetDestinationTitle, targetSubRegion].filter(Boolean);
    for (const candidate of candidates) {
      const normalized = normalizeTitle(candidate);
      const matched = sections.filter((s) => {
        const normalizedLabel = normalizeTitle(s.label);
        return normalizedLabel === normalized || normalizedLabel.includes(normalized) || normalized.includes(normalizedLabel);
      });
      if (matched.length > 0) {
        console.log(`  🎯 用「${candidate}」篩選到 ${matched.length} 個區塊`);
        return matched;
      }
    }
    console.log(`  ⚠️ 找不到匹配「${targetSubRegion || targetDestinationTitle}」的區塊，使用全部 ${sections.length} 個`);
  }

  const allTrips = sections.flatMap((section) => section.trips);
  console.log(`  📋 找到 ${sections.length} 個區塊，${allTrips.length} 筆行程`);

  return sections;
}

async function scrapeTripDetail(tripSummary) {
  let html;
  try {
    html = await fetchHTML(tripSummary.href);
  } catch (fetchErr) {
    throw new Error(`詳情頁載入失敗：${fetchErr.message}`);
  }

  const $ = cheerio.load(html);

  // breadcrumb → destination label
  const breadcrumbLinks = [];
  $('.breadcrumb-item a').each((_, node) => breadcrumbLinks.push(sanitizeText($(node).text())));
  const destinationLabel = breadcrumbLinks[breadcrumbLinks.length - 1] || tripSummary.section_label || '';

  // ① 基本資訊
  const basicInfo = {};
  $('.PriceBlock li').each((_, item) => {
    const key = sanitizeText($(item).find('strong').text());
    if (!key) return;
    const spans = [];
    $(item).find('.fontEg').each((_, s) => {
      const t = sanitizeText($(s).text());
      if (t && t !== '航班資訊') spans.push(t);
    });
    basicInfo[key] = spans.length ? spans.join(' ') : sanitizeText($(item).text().replace(key, ''));
  });

  // ② 售價明細
  // 頁面有 2 個 .LowestPrice table（頁面簡表 + Modal），只取第一個避免重複。
  // 用 thead 欄名對應，而非死位置（朋威通常 4 欄：大人/小孩佔床/小孩不佔床/嬰兒，無「加床」）。
  const priceDetails = extractPriceDetailByHeader($);

  // ③ 標籤
  const rawTags = [];
  $('.KeyFeatures li a').each((_, a) => rawTags.push(sanitizeText($(a).text())));

  // ④ 航班資訊
  const rawFlightSegments = [];
  $('#flightModal li').each((_, item) => {
    const fullText = sanitizeText($(item).find('.detail_airline span').text());
    const flightMatch = fullText.match(/^(.+?)([A-Z]{2}\d{1,4}[A-Z]?)$/i);
    const airline = flightMatch ? flightMatch[1].trim() : fullText;
    const flightNumber = flightMatch ? flightMatch[2].trim() : '';
    const goText = sanitizeText($(item).find('.go').text());
    const toText = sanitizeText($(item).find('.to').text());
    const dayMatch = goText.match(/第\s*(\d+)\s*天/);
    const depTimeMatch = goText.match(/(\d{1,2}:\d{2})/);
    const arrTimeMatch = toText.match(/(\d{1,2}:\d{2})/);
    const depAirport = sanitizeText($(item).find('.go div').text());
    const arrAirport = sanitizeText($(item).find('.to div').text());

    if (!airline && !flightNumber && !depAirport && !arrAirport) return;

    rawFlightSegments.push({
      day_text: dayMatch ? `第${dayMatch[1]}天` : '',
      airline,
      flight_number: flightNumber,
      dep_time: depTimeMatch ? depTimeMatch[1] : '',
      dep_airport: depAirport,
      arr_time: arrTimeMatch ? arrTimeMatch[1] : '',
      arr_airport: arrAirport,
      next_day: /\+\s*1天/.test(toText),
    });
  });

  // ⑤ 促銷資訊
  const $promoEl = $('#marketing .MarketingContent');
  const promoText = $promoEl.length ? sanitizeText($promoEl.text()) : '';

  // ⑥ 出發日期（含出團狀態偵測）
  const rawDepartures = [];
  $('#search-table tbody tr').each((_, row) => {
    const date = padDate(sanitizeText($(row).find('.YMD').text()));
    if (!date) return;
    // 偵測出團狀態：整列文字含「請來電洽詢」→ 表示未確定出團
    const rowText = sanitizeText($(row).text());
    const isInquiryOnly = rowText.includes('請來電洽詢');
    rawDepartures.push({
      date,
      departure_airport: sanitizeText($(row).find('.airport').text()),
      airline: sanitizeText($(row).find('.plane-abbr').text()),
      label: sanitizeText($(row).find('.plane-sche').text()),
      seats_total: Number(String($(row).find('.TotalSeat').text() || '').replace(/[^\d]/g, '') || 0),
      seats_available: Number(String($(row).find('.AvailableSeat').text() || '').replace(/[^\d]/g, '') || 0),
      price: Number(String($(row).find('.TourPrice').text() || '').replace(/[^\d]/g, '') || 0),
      inquiry_only: isInquiryOnly,
    });
  });

  // 過濾掉全部「請來電洽詢」的出發日（表示未確定出團，不顯示在前端）
  const allInquiryOnly = rawDepartures.length > 0 && rawDepartures.every(d => d.inquiry_only);
  const validDepartures = allInquiryOnly ? [] : rawDepartures;

  // 頁面標題和封面圖
  const title = sanitizeText($('h1').first().text());
  const coverImg = $('#BasicCarousel img').first().attr('src') || '';
  const coverUrl = toAbsoluteUrl(coverImg);
  const rawCode = sanitizeText($('.GroupNumber').text());
  const codeMatch = rawCode.match(/[A-Z][A-Z0-9]{4,}/);
  const codeLabel = codeMatch ? codeMatch[0] : rawCode;

  // === 後處理（與原版一致）===
  const durationRaw = sanitizeText(basicInfo['旅遊天數'] || '');
  const durationMatch = durationRaw.match(/(\d+)\s*天?\s*(\d+)\s*夜?/) || durationRaw.match(/(\d+)\D+(\d+)/);
  let duration = durationMatch ? `${durationMatch[1]}天${durationMatch[2]}夜` : (durationRaw.includes('天') ? durationRaw : '');
  if (!durationMatch) {
    const nums = durationRaw.match(/\d+/g);
    if (nums && nums.length >= 2) duration = `${nums[0]}天${nums[1]}夜`;
    else if (nums && nums.length === 1) duration = `${nums[0]}天${Number(nums[0]) - 1}夜`;
  }
  const minGroupSize = parseNumber(basicInfo['成團人數'] || '');
  const enrichedFlightSegments = rawFlightSegments.map((segment) => ({
    day_text: sanitizeText(segment.day_text || ''),
    airline: formatAirlineLabel(segment.airline, segment.flight_number),
    flight_number: sanitizeText(segment.flight_number),
    dep_time: sanitizeText(segment.dep_time),
    dep_airport: sanitizeText(segment.dep_airport),
    arr_time: sanitizeText(segment.arr_time),
    arr_airport: sanitizeText(segment.arr_airport),
    next_day: Boolean(segment.next_day),
  }));

  // primaryAirline（主航空公司欄）：
  // 有航段資料時，列出所有航段的航空公司（轉機行程會有多家，如「國泰航空（CX）＋阿提哈德航空（EY）」），
  // 各段用自己的航班號取代碼，不會張冠李戴。
  // 沒有航段資料時，才退回朋威 PriceBlock 的「航空公司」欄（但不硬拼第一段的代碼，避免錯配）。
  let primaryAirline = buildPrimaryAirlineLabel(enrichedFlightSegments)
    || formatAirlineLabel(basicInfo['航空公司'] || '', '')
    || '';

  // Puppeteer fallback：cheerio 解析不到航班或出發日期時，用 headless browser 重試
  const needPuppeteer = (!primaryAirline && enrichedFlightSegments.length === 0) || rawDepartures.length === 0;
  if (needPuppeteer) {
    const fullUrl = tripSummary.href?.startsWith('http') ? tripSummary.href : `${BASE_URL}${tripSummary.href}`;
    const reason = rawDepartures.length === 0 ? '無出發日期' : '無航班資料';
    console.log(`    🔄 Cheerio ${reason}，嘗試 Puppeteer fallback...`);
    const puppeteerResult = await scrapeAirlineWithPuppeteer(fullUrl);
    if (puppeteerResult) {
      // 補充航班資訊（若 cheerio 沒拿到）
      if (!primaryAirline && puppeteerResult.airline) {
        primaryAirline = puppeteerResult.airline;
        console.log(`    ✅ Puppeteer 取得航空公司：${primaryAirline}`);
      }
      if (enrichedFlightSegments.length === 0 && puppeteerResult.segments.length > 0) {
        const seg = puppeteerResult.segments[0];
        primaryAirline = primaryAirline || formatAirlineLabel(seg.airline, seg.flight_number);
        for (const seg of puppeteerResult.segments) {
          enrichedFlightSegments.push({
            day_text: '',
            airline: formatAirlineLabel(seg.airline, seg.flight_number),
            flight_number: sanitizeText(seg.flight_number),
            dep_time: '', dep_airport: '', arr_time: '', arr_airport: '',
            next_day: false,
          });
        }
        console.log(`    ✅ Puppeteer 取得 ${puppeteerResult.segments.length} 個航段`);
      }
      // 補充出發日期（cheerio 沒拿到時，回填 rawDepartures，補 padDate 正規化）
      if (rawDepartures.length === 0 && puppeteerResult.departures?.length > 0) {
        for (const dep of puppeteerResult.departures) {
          rawDepartures.push({ ...dep, date: padDate(sanitizeText(dep.date)) });
        }
        console.log(`    ✅ Puppeteer 取得 ${puppeteerResult.departures.length} 筆出發日期`);
      }
    }
  }
  // 標籤：朋威有 .item_tag 就以朋威為準（權威來源）；朋威沒有時才用標題賣點當 fallback
  const ponwayTags = rawTags.map(normalizeTag).filter(Boolean);
  const tags = ponwayTags.length > 0 ? ponwayTags : extractSellingPoints(title);
  const priceDetail = buildPriceDetailText(priceDetails);
  const adultPrice = normalizePriceText(priceDetails[0] || '');
  const priceRange = formatPriceRange(adultPrice);
  const departures = validDepartures.map((departure) => ({
    date: sanitizeText(departure.date),
    departure_city: getDepartureCity(departure.departure_airport || basicInfo['出發機場'] || ''),
    airline: formatAirlineLabel(departure.airline || primaryAirline, enrichedFlightSegments[0]?.flight_number || ''),
    price: departure.price || null,
    seats_total: departure.seats_total ?? null,
    seats_available: departure.seats_available ?? null,
    label: sanitizeText(departure.label),
  }));

  const subtitle = buildSubtitle({ title, airline: primaryAirline, tags });
  const seatsTotal = departures.find((departure) => departure.seats_total)?.seats_total ?? null;
  const seatsAvailable = departures.find((departure) => departure.seats_available != null)?.seats_available ?? null;
  const customTour = departures.length === 0;

  return {
    destination_label: sanitizeText(destinationLabel || tripSummary.section_label),
    region_label: sanitizeText(tripSummary.section_label),
    source_url: tripSummary.href,
    title: sanitizeText(title),
    subtitle,
    duration,
    price_range: priceRange,
    cover_image_url: sanitizeText(coverUrl),
    code_label: sanitizeText(codeLabel),
    min_group_size: minGroupSize,
    airport: sanitizeText(basicInfo['出發機場'] || ''),
    airline: primaryAirline,
    tags,
    price_detail: priceDetail,
    flight_segments: enrichedFlightSegments,
    flightSegments: enrichedFlightSegments,
    departures,
    departure_label: getDepartureLabel(basicInfo['出發機場'] || ''),
    display_order: tripSummary.display_order,
    custom_tour: customTour,
    all_inquiry_only: allInquiryOnly,
    promo_text: sanitizeText(promoText),
    trip_banner: {
      code_label: sanitizeText(codeLabel),
      price_label: priceRange,
      tags,
      departure_label: getDepartureLabel(basicInfo['出發機場'] || ''),
      duration_label: duration,
      seats_total: seatsTotal,
      seats_available: seatsAvailable,
      deposit_label: '',
      custom_tour: customTour,
      min_group_size: minGroupSize,
      airport: sanitizeText(basicInfo['出發機場'] || ''),
      airline: primaryAirline,
      price_detail: priceDetail,
      promo_text: sanitizeText(promoText),
      sub_area: cleanSubArea(tripSummary.section_label || ''),
    },
  };
}

// 清洗 sub_area：強制單值（地點）。朋威 section_label 常有逗號多值或混入出發城市，
// 這裡拆逗號取「非城市」的第一段當地點，避免污染子標籤分類（配合前端單值邏輯）。
function cleanSubArea(raw) {
  const CITY_WORDS = ['高雄出發', '台中出發', '桃園出發', '台北出發'];
  const s = sanitizeText(raw || '');
  if (!s) return '';
  const parts = s.split(/[,，]/).map((p) => p.trim()).filter(Boolean);
  const place = parts.find((p) => !CITY_WORDS.includes(p)) || parts[0] || '';
  return place;
}

function buildPendingChangeBase({ logId, destinationId, tripId, tripTitle, sourceCode, sourceUrl, regionLabel, scrapedData }) {
  return {
    scrape_log_id: logId,
    destination_id: destinationId,
    trip_id: tripId,
    trip_title: tripTitle,
    source_code: sourceCode,
    source_url: sourceUrl,
    region_label: regionLabel,
    scraped_data: scrapedData,
    status: 'pending',
  };
}

function createNewTripChange(context) {
  return {
    ...buildPendingChangeBase(context),
    change_type: 'new_trip',
    field_name: 'trip',
    old_value: null,
    new_value: context.scrapedData.title,
  };
}

function createRemovedTripChange(context, trip) {
  return {
    ...buildPendingChangeBase({
      ...context,
      tripId: trip.id,
      tripTitle: trip.title,
      sourceCode: trip.trip_banner?.code_label || null,
      sourceUrl: context.sourceUrl,
      regionLabel: context.regionLabel,
      scrapedData: context.scrapedData,
    }),
    change_type: 'removed',
    field_name: 'trip',
    old_value: trip.title,
    new_value: null,
  };
}

function buildComparisonChanges({ logId, destinationId, existingTrip, scrapedTrip }) {
  const scrapedData = {
    ...scrapedTrip,
    destination_id: destinationId,
  };
  const context = {
    logId,
    destinationId,
    tripId: existingTrip.id,
    tripTitle: scrapedTrip.title,
    sourceCode: scrapedTrip.code_label,
    sourceUrl: scrapedTrip.source_url,
    regionLabel: scrapedTrip.region_label || scrapedTrip.destination_label,
    scrapedData,
  };

  const changes = [];
  const existingBanner = existingTrip.trip_banner || {};

  // 正規化比對：統一格式後才比較，避免假陽性
  const normalize = (v) => sanitizeText(String(v ?? '')).replace(/\t/g, ' ').replace(/\s+/g, ' ').trim();
  const normalizeTags = (tags) => JSON.stringify((Array.isArray(tags) ? tags : []).map(t => normalizeTag(t)).filter(Boolean).sort());

  const pushChange = (changeType, fieldName, oldValue, newValue) => {
    // 用正規化後的值比較
    const oldNorm = typeof oldValue === 'object' ? stableStringify(oldValue) : normalize(oldValue);
    const newNorm = typeof newValue === 'object' ? stableStringify(newValue) : normalize(newValue);
    if (oldNorm === newNorm) return;
    // 兩邊都是空值也跳過
    if (!oldNorm && !newNorm) return;
    // 新值是空的（朋威沒抓到）→ 跳過，不要清掉我們已有的資料
    if (!newNorm && oldNorm) return;
    changes.push({
      ...buildPendingChangeBase(context),
      change_type: changeType,
      field_name: fieldName,
      old_value: oldValue == null ? null : typeof oldValue === 'string' ? oldValue : stableStringify(oldValue),
      new_value: newValue == null ? null : typeof newValue === 'string' ? newValue : stableStringify(newValue),
    });
  };

  // 價格：只比較數字部分
  const oldPriceNum = normalize(existingTrip.price_range).replace(/[^\d]/g, '');
  const newPriceNum = normalize(scrapedTrip.price_range).replace(/[^\d]/g, '');
  if (oldPriceNum !== newPriceNum && newPriceNum) {
    pushChange('price', 'price_range', sanitizeText(existingTrip.price_range), scrapedTrip.price_range);
  }

  // 標題：核心欄位，嚴格比對
  pushChange('info', 'title', sanitizeText(existingTrip.title), scrapedTrip.title);
  pushChange('info', 'subtitle', sanitizeText(existingTrip.subtitle), scrapedTrip.subtitle);
  // display_order：跳過（手動排序為準）
  // departure_label：跳過（不影響顯示）
  // duration_label：跳過（跟 duration 重複）

  // 封面圖：只在 DB 完全沒圖片且朋威有圖時通知（已上傳 Supabase 的不比對）
  const oldCover = sanitizeText(existingTrip.cover_image_url);
  const newCover = sanitizeText(scrapedTrip.cover_image_url);
  if (!oldCover && newCover) {
    pushChange('info', 'cover_image_url', null, newCover);
  }

  pushChange('info', 'duration', sanitizeText(existingTrip.duration), scrapedTrip.duration);
  pushChange('info', 'code_label', sanitizeText(existingBanner.code_label), scrapedTrip.code_label);
  pushChange('info', 'airport', sanitizeText(existingBanner.airport), scrapedTrip.airport);
  pushChange('info', 'airline', sanitizeText(existingBanner.airline), scrapedTrip.airline);
  pushChange('info', 'min_group_size', existingBanner.min_group_size, scrapedTrip.min_group_size);

  // 標籤：排序後比較，忽略順序差異和 (國外)/(國內) 前綴
  if (normalizeTags(existingBanner.tags) !== normalizeTags(scrapedTrip.tags)) {
    pushChange('info', 'tags', existingBanner.tags || [], scrapedTrip.tags);
  }

  // custom_tour：只在從 false→true 時通知（有出發日變無出發日）
  if (!Boolean(existingBanner.custom_tour) && Boolean(scrapedTrip.custom_tour)) {
    pushChange('info', 'custom_tour', false, true);
  }

  // 註：「請來電洽詢」的行程已在主迴圈提前跳過（不新增/不更新/不下架），此處不再處理

  // 售價明細：統一用 tab 分隔後比較
  const oldPD = normalize(existingBanner.price_detail);
  const newPD = normalize(scrapedTrip.price_detail);
  if (oldPD !== newPD && newPD && newPD !== '    ') {
    pushChange('price_detail', 'price_detail', sanitizeText(existingBanner.price_detail), scrapedTrip.price_detail);
  }

  const oldPromo = sanitizeText(existingBanner.promo_content || existingBanner.promo_text || '');
  const newPromo = sanitizeText(scrapedTrip.promo_text || '');
  if (oldPromo !== newPromo) {
    pushChange('promotion', 'promo_text', oldPromo || null, newPromo || null);
  }

  // 航班比對：只比核心欄位（忽略 day_text/date 等 metadata）
  const normalizeFlightForCompare = (seg) => ({
    airline: sanitizeText(seg.airline),
    flight_number: sanitizeText(seg.flight_number),
    dep_time: sanitizeText(seg.dep_time),
    dep_airport: sanitizeText(seg.dep_airport),
    arr_time: sanitizeText(seg.arr_time),
    arr_airport: sanitizeText(seg.arr_airport),
    next_day: Boolean(seg.next_day),
  });
  const existingFlights = extractExistingFlightSegments(existingTrip);
  const existingFlightsNorm = existingFlights.map(normalizeFlightForCompare);
  const scrapedFlightsNorm = (scrapedTrip.flight_segments || []).map(normalizeFlightForCompare);
  if (stableStringify(existingFlightsNorm) !== stableStringify(scrapedFlightsNorm)) {
    pushChange('flight', 'flight_segments', existingFlights, scrapedTrip.flight_segments);
  }

  const existingDepartures = buildExistingDepartureSnapshot(existingTrip);
  const scrapedDepartures = buildScrapedDepartureSnapshot(scrapedTrip);
  // 比對出發日期時忽略機位數（seats_total/seats_available），只比影響前端顯示的欄位
  const stripSeats = (deps) => deps.map(({ seats_total, seats_available, ...rest }) => rest);
  if (stableStringify(stripSeats(existingDepartures)) !== stableStringify(stripSeats(scrapedDepartures))) {
    pushChange('departure', 'departures', existingDepartures, scrapedDepartures);
  }

  // 驗證護欄：只加 warning，不影響既有比對結果
  const pushWarning = (fieldName, oldValue, newValue) => {
    changes.push({
      ...buildPendingChangeBase(context),
      change_type: 'warning',
      field_name: fieldName,
      old_value: oldValue == null ? null : typeof oldValue === 'string' ? oldValue : stableStringify(oldValue),
      new_value: newValue == null ? null : typeof newValue === 'string' ? newValue : stableStringify(newValue),
    });
  };

  const scrapedPriceDetail = sanitizeText(scrapedTrip.price_detail || '');
  const priceDetailColumns = scrapedPriceDetail ? scrapedPriceDetail.split('\t').length : 0;
  if (scrapedPriceDetail && priceDetailColumns < 5) {
    pushWarning(
      'validation_check_price_detail',
      `售價明細欄位數：${priceDetailColumns}/5`,
      `⚠️ price_detail 不足 5 欄（目前 ${priceDetailColumns} 欄）`
    );
  }

  const scrapedCodeLabel = sanitizeText(scrapedTrip.code_label || '');
  if (!scrapedCodeLabel) {
    pushWarning(
      'validation_check_code_label',
      sanitizeText(existingBanner.code_label) || '無既有 code_label',
      '⚠️ code_label 為空'
    );
  }

  if (existingDepartures.length > 2 && scrapedDepartures.length === 0) {
    pushWarning(
      'validation_check_departures',
      `原本 ${existingDepartures.length} 筆出發日期`,
      '⚠️ 出發日期從 N 筆驟減到 0 筆'
    );
  }

  const oldPriceValue = Number.parseInt(oldPriceNum, 10);
  const newPriceValue = Number.parseInt(newPriceNum, 10);
  if (Number.isFinite(oldPriceValue) && oldPriceValue > 0 && Number.isFinite(newPriceValue)) {
    const priceChangeRatio = Math.abs(newPriceValue - oldPriceValue) / oldPriceValue;
    if (priceChangeRatio > 0.5) {
      pushWarning(
        'validation_check_price_spike',
        `原價 ${oldPriceValue.toLocaleString('zh-TW')}、新價 ${newPriceValue.toLocaleString('zh-TW')}`,
        `⚠️ 價格變動超過 50%（${Math.round(priceChangeRatio * 100)}%）`
      );
    }
  }

  return changes;
}

const insertedChangeKeys = new Set();

async function insertPendingChanges(supabase, changes) {
  if (!changes.length) return 0;

  // 去重 Step 1：記憶體去重（同次執行 + dismissed 記憶）
  const deduped = changes.filter((c) => {
    let key = `${c.trip_id || c.destination_id || 'unknown'}_${c.change_type}_${c.field_name || ''}`;
    if (c.change_type === 'new_trip') {
      key += `_${c.source_code || c.trip_title || ''}`;
    }
    if (insertedChangeKeys.has(key)) return false;
    insertedChangeKeys.add(key);
    return true;
  });

  if (!deduped.length) return 0;

  // 去重 Step 2：DB 查詢去重（防止跨次執行重複寫入仍為 pending 的相同變更）
  const tripIds = [...new Set(deduped.map(c => c.trip_id).filter(Boolean))];
  const destIds = [...new Set(deduped.map(c => c.destination_id).filter(Boolean))];
  const existingKeys = new Set();
  if (tripIds.length > 0 || destIds.length > 0) {
    let query = supabase.from('pending_changes').select('trip_id, destination_id, change_type, field_name, source_code, trip_title').eq('status', 'pending');
    if (tripIds.length > 0) query = query.in('trip_id', tripIds);
    const { data: existing } = await query;
    (existing || []).forEach(c => {
      let key = `${c.trip_id || c.destination_id || 'unknown'}_${c.change_type}_${c.field_name || ''}`;
      if (c.change_type === 'new_trip') key += `_${c.source_code || c.trip_title || ''}`;
      existingKeys.add(key);
    });
  }
  const finalDeduped = deduped.filter(c => {
    let key = `${c.trip_id || c.destination_id || 'unknown'}_${c.change_type}_${c.field_name || ''}`;
    if (c.change_type === 'new_trip') key += `_${c.source_code || c.trip_title || ''}`;
    return !existingKeys.has(key);
  });

  if (!finalDeduped.length) return 0;
  const { error } = await supabase.from('pending_changes').insert(finalDeduped);
  if (error) {
    console.log(`  ⚠️ 寫入 pending_changes 失敗：${error.message}`);
    return 0;
  }
  return finalDeduped.length;
}

const BATCH_SIZE = 1; // 每次自動抓取只處理 1 個區域（2 個以上會超時 30 分鐘）

/** 讀取每個區域的抓取狀態（last_scraped / last_applied） */
async function getRegionStatus(supabase) {
  const { data } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'scrape_region_status')
    .single();
  return (data?.value && typeof data.value === 'object') ? data.value : {};
}

/** 更新單一區域的 last_scraped 時間戳 */
async function updateRegionScraped(supabase, regionKey) {
  const status = await getRegionStatus(supabase);
  if (!status[regionKey]) status[regionKey] = {};
  status[regionKey].last_scraped = new Date().toISOString();
  await supabase
    .from('site_settings')
    .upsert({ key: 'scrape_region_status', value: status, updated_at: new Date().toISOString() });
}

/** 載入已 dismissed 的變更 key，用於去重（最近 30 天內的） */
async function loadDismissedKeys(supabase) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data } = await supabase
    .from('pending_changes')
    .select('trip_id, destination_id, change_type, field_name, source_code, trip_title')
    .eq('status', 'dismissed')
    .gte('created_at', thirtyDaysAgo);
  const keys = new Set();
  (data || []).forEach(c => {
    // key 包含 destination_id + source_code，避免 new_trip 共用同一個 key
    let key = `${c.trip_id || c.destination_id || 'unknown'}_${c.change_type}_${c.field_name || ''}`;
    if (c.change_type === 'new_trip') key += `_${c.source_code || c.trip_title || ''}`;
    keys.add(key);
  });
  return keys;
}

async function main() {
  const { supabaseUrl, serviceRoleKey } = loadEnv();
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { regions, logId: requestedLogId, destinationId, tripIds } = parseArgs(process.argv.slice(2));
  let selectedRegions = selectRegions(regions);

  // 載入 dismissed 記憶，用於跳過已忽略的相同差異
  const dismissedKeys = await loadDismissedKeys(supabase);
  if (dismissedKeys.size > 0) {
    console.log(`📝 已載入 ${dismissedKeys.size} 筆 dismissed 記憶，相同差異將跳過`);
    // 注入到全域去重集合
    for (const key of dismissedKeys) {
      insertedChangeKeys.add(key);
    }
  }

  // 智慧輪轉：自動排程時，按 last_scraped 排序，優先抓最久沒更新的區域
  const isFullAuto = !regions && !destinationId;
  if (isFullAuto && selectedRegions.length > BATCH_SIZE) {
    const regionStatus = await getRegionStatus(supabase);

    // 按 last_scraped 時間排序（null/最早的排前面）
    const sorted = [...selectedRegions].sort((a, b) => {
      const aTime = regionStatus[a.key]?.last_scraped || '1970-01-01';
      const bTime = regionStatus[b.key]?.last_scraped || '1970-01-01';
      return aTime.localeCompare(bTime);
    });

    selectedRegions = sorted.slice(0, BATCH_SIZE);
    console.log(`🔄 智慧輪轉：優先抓最久沒更新的 ${BATCH_SIZE} 個區域`);
    selectedRegions.forEach((r, i) => {
      const lastTime = regionStatus[r.key]?.last_scraped;
      console.log(`   ${i + 1}. ${r.key} — 上次抓取: ${lastTime ? new Date(lastTime).toLocaleDateString('zh-TW') : '從未抓過'}`);
    });
  }

  let logId = null;

  try {
    const [destinations, existingTrips] = await Promise.all([
      loadDestinations(supabase),
      loadExistingTrips(supabase),
    ]);

    let targetDestination = null;
    if (destinationId) {
      targetDestination = destinations.find((destination) => destination.id === destinationId) || null;

      // 前置檢查 — 先建 log 再 throw，確保 admin 能看到錯誤
      // tripIds 模式下不強制要求 destination.source_url（行程有自己的 source_url）
      const needsDestSourceUrl = !tripIds?.length;
      const earlyError = !targetDestination
        ? `找不到指定目的地：${destinationId}`
        : (needsDestSourceUrl && !sanitizeText(targetDestination.source_url))
          ? `指定目的地缺少 source_url：${targetDestination?.title || destinationId}。請到 Supabase 設定此目的地的 source_url。`
          : null;

      if (earlyError) {
        // 建立 scrape_log 紀錄錯誤，讓 admin 頁面能顯示
        const { data: earlyLog } = await supabase.from('scrape_logs').insert({
          status: 'failed',
          error_message: earlyError,
          started_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
          total_regions: 0,
          completed_regions: 0,
          total_trips: 0,
          completed_trips: 0,
          changes_found: 0,
        }).select('id').single();
        console.error(`\n❌ ${earlyError}`);
        if (earlyLog) console.log(`log_id=${earlyLog.id}`);
        process.exit(1);
      }

      const targetRegion = getRegionConfigBySourceUrl(targetDestination.source_url);
      if (!targetRegion) {
        throw new Error(`無法從 source_url 判斷區域頁：${targetDestination.source_url}`);
      }

      selectedRegions = [targetRegion];
    }

    // --trip-ids 模式：建立選取行程的識別集合（必須在 log 建立之前，避免雙重 log）
    const tripIdSet = tripIds?.length ? new Set(tripIds) : null;
    let selectedTripIdentifiers = null;

    // --trip-ids 直接抓取模式：若所有選取行程都有 source_url，跳過區域列表頁
    if (tripIdSet && tripIdSet.size > 0) {
      const selectedTrips = existingTrips.filter((trip) => tripIdSet.has(trip.id));
      const tripsWithUrl = selectedTrips.filter((trip) => trip.source_url);
      const tripsWithoutUrl = selectedTrips.filter((trip) => !trip.source_url);

      if (tripsWithUrl.length > 0 && tripsWithoutUrl.length === 0) {
        // 所有行程都有 source_url → 直接打詳情頁
        const directRegionDetails = [{
          key: 'direct',
          name: 'direct-scrape',
          url: '',
          tabs: [],
          status: 'pending',
          trip_count: tripsWithUrl.length,
          completed: 0,
        }];

        logId = await createOrResetLog(supabase, requestedLogId, 1, directRegionDetails);
        console.log(`🚀 直接抓取模式，log_id=${logId}，共 ${tripsWithUrl.length} 筆行程`);

        let completedTrips = 0;
        let changesFound = 0;

        await updateLog(supabase, logId, {
          current_region: 'direct',
          total_trips: tripsWithUrl.length,
          region_details: [{ ...directRegionDetails[0], status: 'running' }],
        });

        for (const trip of tripsWithUrl) {
          console.log(`  🔍 [${completedTrips + 1}/${tripsWithUrl.length}] ${trip.title}`);

          const tripSummary = {
            title: trip.title,
            href: trip.source_url,
            section_label: '',
            display_order: trip.display_order,
            listing_tags: [],
          };

          let scrapedTrip;
          try {
            scrapedTrip = await scrapeTripDetail(tripSummary);
          } catch (detailErr) {
            const reason = detailErr.message || '未知錯誤';
            console.log(`  ⚠️ 抓取失敗：${reason}`);
            changesFound += await insertPendingChanges(supabase, [{
              scrape_log_id: logId,
              destination_id: trip.destination_id,
              trip_id: trip.id,
              trip_title: trip.title,
              source_code: sanitizeText(trip.trip_banner?.code_label),
              source_url: trip.source_url,
              region_label: 'direct',
              scraped_data: { error: reason, source_url: trip.source_url },
              status: 'pending',
              change_type: 'warning',
              field_name: 'scrape_failed',
              old_value: trip.source_url,
              new_value: `⚠️ 抓取失敗：${reason}`,
            }]);
            completedTrips += 1;
            continue;
          }

          if (!scrapedTrip.title || scrapedTrip.title.length < 3) {
            console.log(`  ⚠️ 無效資料，跳過`);
            changesFound += await insertPendingChanges(supabase, [{
              scrape_log_id: logId,
              destination_id: trip.destination_id,
              trip_id: trip.id,
              trip_title: trip.title,
              source_code: sanitizeText(trip.trip_banner?.code_label),
              source_url: trip.source_url,
              region_label: 'direct',
              scraped_data: { error: '頁面回傳無效資料（空標題或頁面不存在）', source_url: trip.source_url },
              status: 'pending',
              change_type: 'warning',
              field_name: 'scrape_invalid',
              old_value: trip.title,
              new_value: '⚠️ 朋威頁面回傳無效資料，行程可能已下架或 URL 已變更',
            }]);
            completedTrips += 1;
            continue;
          }

          const changes = buildComparisonChanges({
            logId,
            destinationId: trip.destination_id,
            existingTrip: trip,
            scrapedTrip,
          });
          changesFound += await insertPendingChanges(supabase, changes);

          completedTrips += 1;
          await updateLog(supabase, logId, {
            current_trip: scrapedTrip.title,
            completed_trips: completedTrips,
            changes_found: changesFound,
          });

          await sleep(300);
        }

        await updateLog(supabase, logId, {
          status: 'completed',
          current_trip: '',
          completed_trips: completedTrips,
          completed_regions: 1,
          changes_found: changesFound,
          region_details: [{ ...directRegionDetails[0], status: 'completed', completed: completedTrips }],
          finished_at: new Date().toISOString(),
        });

        console.log(`\n✅ 直接抓取完成，共 ${completedTrips} 筆行程，發現 ${changesFound} 筆待確認變更`);
        return;
      }

      // 部分或全部缺 source_url → 降級為區域列表 + 過濾模式
      if (tripsWithoutUrl.length > 0) {
        console.log(`⚠️ ${tripsWithoutUrl.length} 筆行程缺少 source_url，使用區域列表比對模式`);
        tripsWithoutUrl.forEach((t) => console.log(`   - ${t.title}`));
      }

      selectedTripIdentifiers = selectedTrips.map((trip) => ({
        id: trip.id,
        code_label: sanitizeText(trip.trip_banner?.code_label),
        title: sanitizeText(trip.title),
      }));
      console.log(`🎯 指定抓取 ${selectedTripIdentifiers.length} 筆行程（區域列表比對模式）`);
    }

    // 正常流程（含降級路徑）：建立 log
    const initialRegionDetails = buildRegionDetails(selectedRegions);
    logId = await createOrResetLog(supabase, requestedLogId, selectedRegions.length, initialRegionDetails);
    console.log(`🚀 開始自動抓取，log_id=${logId}`);

    const resolveDestination = buildDestinationResolver(destinations, existingTrips);
    // blk-* ID → destination 反查：朋威改版後 section 標題與 breadcrumb 目的地層級都失效，
    // 改用 source_url 的 blk ID（同 region 內唯一）精準定位 destination。
    const resolveDestinationByBlockId = (blockId, regionCfg) => {
      const bid = sanitizeText(blockId);
      if (!bid || !regionCfg) return null;
      const matches = destinations.filter((d) => {
        if (getSourceBlockId(d.source_url) !== bid) return false;
        const dr = getRegionConfigBySourceUrl(d.source_url);
        return dr && dr.url === regionCfg.url;
      });
      return matches.length === 1 ? matches[0] : null;
    };
    const tripsByDestinationId = existingTrips.reduce((accumulator, trip) => {
      const list = accumulator.get(trip.destination_id) || [];
      list.push(trip);
      accumulator.set(trip.destination_id, list);
      return accumulator;
    }, new Map());

    const matchedTripIdsByDestination = new Map();
    let regionDetails = initialRegionDetails;
    let totalTrips = 0;
    let completedTrips = 0;
    let completedRegions = 0;
    let changesFound = 0;

    for (const regionConfig of selectedRegions) {
      regionDetails = mergeRegionDetail(regionDetails, regionConfig.key, {
        status: 'running',
      });
      await updateLog(supabase, logId, {
        current_region: regionConfig.key,
        current_trip: '',
        region_details: regionDetails,
      });

      const sections = await scrapeRegionListings(regionConfig, targetDestination?.source_url || '', targetDestination?.title || '', targetDestination?.sub_region || '');
      const tripSummaries = sections.flatMap((section) =>
        section.trips.map((trip) => ({ ...trip, block_id: section.block_id })),
      );

      // 本區域抓取是否不完整（有詳情頁抓取失敗/逾時/無效資料）。
      // 只要不完整，就跳過本區域的下架偵測，避免既有行程被誤判下架而消失（保守策略）。
      let regionScrapeIncomplete = false;
      totalTrips += tripSummaries.length;
      regionDetails = mergeRegionDetail(regionDetails, regionConfig.key, {
        trip_count: tripSummaries.length,
        completed: 0,
      });

      await updateLog(supabase, logId, {
        total_trips: totalTrips,
        region_details: regionDetails,
      });

      const scrapedByDestination = new Map();

      for (let index = 0; index < tripSummaries.length; index += 1) {
        const tripSummary = tripSummaries[index];

        // --trip-ids 模式：列表階段預過濾（從 href 取 code + 標題比對），跳過不相關的行程
        if (selectedTripIdentifiers) {
          const hrefCodeMatch = tripSummary.href.match(/\/products\/(?:group|domestic)\/([A-Z][A-Z0-9]{4,})\b/i);
          const listingCode = hrefCodeMatch ? hrefCodeMatch[1].toUpperCase() : '';
          const listingTitle = sanitizeText(tripSummary.title);
          const matchesAtListing = selectedTripIdentifiers.some((sel) => {
            if (listingCode && sel.code_label && listingCode === sel.code_label) return true;
            return similarity(listingTitle, sel.title) >= 0.5;
          });
          if (!matchesAtListing) {
            completedTrips += 1;
            continue;
          }
        }

        console.log(`  🔍 [${index + 1}/${tripSummaries.length}] ${tripSummary.title}`);

        let scrapedTrip;
        try {
          scrapedTrip = await scrapeTripDetail(tripSummary);
        } catch (detailErr) {
          console.log(`  ⚠️ 抓取失敗，跳過：${tripSummary.title} (${detailErr.message})`);
          regionScrapeIncomplete = true; // 抓取失敗 → 本區域不完整，稍後跳過下架偵測
          completedTrips += 1;
          continue;
        }

        // 列表頁 item_tag 標籤優先於詳情頁 KeyFeatures 標籤
        if (tripSummary.listing_tags?.length) {
          scrapedTrip.tags = tripSummary.listing_tags;
          scrapedTrip.trip_banner.tags = tripSummary.listing_tags;
          // 用列表頁標籤重新產生 subtitle
          scrapedTrip.subtitle = buildSubtitle({
            title: scrapedTrip.title,
            airline: scrapedTrip.airline,
            tags: tripSummary.listing_tags,
          });
        }

        // --trip-ids 模式：詳情頁二次確認（code_label 精確比對）
        if (selectedTripIdentifiers) {
          const scrapedCode = sanitizeText(scrapedTrip.code_label);
          const matchesSelected = selectedTripIdentifiers.some((sel) => {
            if (scrapedCode && sel.code_label && scrapedCode === sel.code_label) return true;
            return similarity(scrapedTrip.title, sel.title) >= 0.7;
          });
          if (!matchesSelected) {
            console.log(`  ⏭️ 跳過（詳情頁確認不匹配）：${scrapedTrip.title}`);
            completedTrips += 1;
            continue;
          }
        }

        // 過濾垃圾資料（頁面載入失敗、空標題等）
        if (!scrapedTrip.title || scrapedTrip.title.includes('can\'t be reached') || scrapedTrip.title.includes('not found') || scrapedTrip.title.length < 3) {
          console.log(`  ⚠️ 無效資料，跳過：${scrapedTrip.title || '(空標題)'}`);
          regionScrapeIncomplete = true; // 無效資料（多為逾時/載入失敗）→ 本區域不完整，稍後跳過下架偵測
          completedTrips += 1;
          continue;
        }

        const destination = targetDestination
          || resolveDestinationByBlockId(tripSummary.block_id, regionConfig)
          || resolveDestination(scrapedTrip.destination_label, regionConfig.url)
          || resolveDestination(tripSummary.section_label, regionConfig.url);
        if (!destination) {
          // 找不到 destination → 可能是朋威新增的 tab/區域，寫通知不中斷
          const missingLabel = scrapedTrip.destination_label || tripSummary.section_label;
          console.log(`  🟣 找不到 destination：${missingLabel}，寫入 new_tab 通知`);
          const alertChange = {
            scrape_log_id: logId,
            destination_id: null,
            trip_id: null,
            change_type: 'new_tab',
            field_name: 'destination',
            old_value: null,
            new_value: missingLabel,
            trip_title: scrapedTrip.title,
            source_code: scrapedTrip.code_label || '',
            source_url: scrapedTrip.source_url || tripSummary.href,
            region_label: regionConfig.key,
            scraped_data: {
              alert_type: 'new_tab',
              missing_destination_label: missingLabel,
              region_key: regionConfig.key,
              region_url: `${BASE_URL}${regionConfig.url}`,
              trip_title: scrapedTrip.title,
              trip_code: scrapedTrip.code_label || '',
              trip_price: scrapedTrip.price_range || '',
              trip_duration: scrapedTrip.duration || '',
              message: `[新分頁/區域] 朋威的「${missingLabel}」在我們的 DB 找不到對應的目的地。\n[來源] ${BASE_URL}${regionConfig.url}\n[行程] ${scrapedTrip.title}\n[原因] 可能是朋威新增了路線，或 destination 名稱不匹配。\n[建議] 到 Supabase 新增 destination（title="${missingLabel}"），或手動對應現有 destination。`,
            },
            status: 'pending',
          };
          const { error: alertErr } = await supabase.from('pending_changes').insert(alertChange);
          if (alertErr) console.log(`  ⚠️ 寫入 new_tab 通知失敗：${alertErr.message}`);
          changesFound += 1;
          completedTrips += 1;
          continue;
        }

        // 朋威改版後 section 標題移除、breadcrumb 只到 region 層級，sub_area 抓到空字串
        // → 用解析到的 destination sub_region 補上目的地層級分類（更細的子分頁仍手動維護）。
        // 既有行程的 sub_area 不在 buildComparisonChanges 比對範圍，不會被覆蓋；僅影響新行程。
        if (scrapedTrip.trip_banner && !sanitizeText(scrapedTrip.trip_banner.sub_area)) {
          scrapedTrip.trip_banner.sub_area = sanitizeText(destination.sub_region) || sanitizeText(destination.title) || '';
        }

        const destinationTrips = tripsByDestinationId.get(destination.id) || [];
        const consumedTripIds = matchedTripIdsByDestination.get(destination.id) || new Set();
        const matchedTrip = findExistingTripForScrapedTrip(scrapedTrip, destinationTrips, consumedTripIds);

        const bucket = scrapedByDestination.get(destination.id) || [];
        bucket.push(scrapedTrip);
        scrapedByDestination.set(destination.id, bucket);

        // 全部「請來電洽詢」→ 完全跳過此行程：不新增、不更新、不下架
        // 洽詢行程維持現狀（既有的保持顯示、新的不自動加入），是否隱藏由人工在 DevMode 決定
        // 若已有既有行程，標記為「已匹配」避免被下架偵測誤判
        if (scrapedTrip.all_inquiry_only) {
          if (matchedTrip) {
            consumedTripIds.add(matchedTrip.id);
            matchedTripIdsByDestination.set(destination.id, consumedTripIds);
          }
          console.log(`  ⏭️ 全部洽詢價，跳過此行程（不新增/不更新/不下架）：${scrapedTrip.title}`);
          completedTrips += 1;
          continue;
        }

        if (matchedTrip) {
          consumedTripIds.add(matchedTrip.id);
          matchedTripIdsByDestination.set(destination.id, consumedTripIds);

          // 自動回填 source_url（metadata，不走 pending_changes）
          if (scrapedTrip.source_url && scrapedTrip.source_url !== matchedTrip.source_url) {
            await supabase.from('trips').update({ source_url: scrapedTrip.source_url }).eq('id', matchedTrip.id);
          }

          const changes = buildComparisonChanges({
            logId,
            destinationId: destination.id,
            existingTrip: matchedTrip,
            scrapedTrip,
          });
          changesFound += await insertPendingChanges(supabase, changes);
        } else {
          // 防重複：檢查 code_label 是否已存在
          // 目標抓取模式：只跳過同一 destination 的重複（不同 destination 允許新增）
          // 全區域模式：跳過整個 DB 的重複
          const scrapedCode = sanitizeText(scrapedTrip.code_label);
          if (scrapedCode) {
            const existingByCode = existingTrips.find(
              (t) => sanitizeText(t.trip_banner?.code_label) === scrapedCode,
            );
            if (existingByCode) {
              const sameDestination = existingByCode.destination_id === destination.id;
              if (sameDestination || !targetDestination) {
                console.log(`  ⏭️ 跳過新增（code_label ${scrapedCode} 已存在於 ${sanitizeText(existingByCode.title)}）`);
                completedTrips += 1;
                continue;
              }
              console.log(`  ℹ️ code_label ${scrapedCode} 存在於其他 destination，但目標模式下允許新增`);
            }
          }

          // sub_area 統一：新行程繼承「同目的地既有行程」的 sub_area，保持子標籤分類一致。
          // 朋威的區塊標籤（section_label）不統一（如杜拜/杜拜+阿布達比/高雄出發混用），
          // 直接用會導致同目的地行程散落在不同子標籤，故改繼承既有行程的一致值。
          const siblingSubArea = (destinationTrips.find((t) => t.trip_banner?.sub_area)?.trip_banner?.sub_area) || '';
          if (siblingSubArea) {
            scrapedTrip.trip_banner = { ...(scrapedTrip.trip_banner || {}), sub_area: siblingSubArea };
          }

          const newTripChange = createNewTripChange({
            logId,
            destinationId: destination.id,
            tripId: null,
            tripTitle: scrapedTrip.title,
            sourceCode: scrapedTrip.code_label,
            sourceUrl: scrapedTrip.source_url,
            regionLabel: scrapedTrip.region_label || scrapedTrip.destination_label,
            scrapedData: {
              ...scrapedTrip,
              destination_id: destination.id,
            },
          });
          changesFound += await insertPendingChanges(supabase, [newTripChange]);
        }

        completedTrips += 1;
        regionDetails = mergeRegionDetail(regionDetails, regionConfig.key, {
          completed: completedTrips - (totalTrips - tripSummaries.length),
        });

        await updateLog(supabase, logId, {
          current_region: regionConfig.key,
          current_trip: scrapedTrip.title,
          completed_trips: completedTrips,
          changes_found: changesFound,
          region_details: regionDetails,
        });

        await sleep(300);
      }

      // --trip-ids 模式：檢查哪些選取行程沒在朋威頁面找到
      if (tripIdSet && selectedTripIdentifiers) {
        console.log('  ⏭️ 指定行程模式，跳過下架偵測');
        const allMatchedIds = new Set();
        for (const [, ids] of matchedTripIdsByDestination) {
          for (const id of ids) allMatchedIds.add(id);
        }
        const unmatchedTrips = selectedTripIdentifiers.filter((sel) => !allMatchedIds.has(sel.id));
        for (const unmatched of unmatchedTrips) {
          console.log(`  ⚠️ 選取行程未匹配到朋威：${unmatched.title}`);
          changesFound += await insertPendingChanges(supabase, [{
            scrape_log_id: logId,
            destination_id: targetDestination?.id || null,
            trip_id: unmatched.id,
            trip_title: unmatched.title,
            source_code: unmatched.code_label || '',
            source_url: `${BASE_URL}${regionConfig.url}`,
            region_label: regionConfig.key,
            scraped_data: {
              error: '在朋威區域頁面找不到此行程（code_label 和標題都無法匹配）',
              source_url: `${BASE_URL}${regionConfig.url}`,
            },
            status: 'pending',
            change_type: 'warning',
            field_name: 'scrape_not_found',
            old_value: unmatched.title,
            new_value: '⚠️ 在朋威頁面找不到此行程，可能已下架、改名或移至其他區域',
          }]);
        }
      } else if (!tripIdSet && regionScrapeIncomplete) {
        // 本區域抓取不完整（有失敗/逾時/無效資料）→ 完全跳過下架偵測。
        // 因為抓取不完整時，既有行程可能只是「這次沒抓到」而非真的下架，
        // 若照樣標記 removed，套用後會讓仍在販售的行程從前台消失（西伯利亞事件的根因）。
        console.warn(`  ⚠️ 跳過下架偵測：${regionConfig.key} 本次抓取不完整（有失敗/逾時），避免誤判既有行程下架`);
      } else if (!tripIdSet) {

      const destinationEntries = targetDestination
        ? [[targetDestination.id, tripsByDestinationId.get(targetDestination.id) || []]]
        : [...tripsByDestinationId.entries()];

      for (const [destinationId, destinationTrips] of destinationEntries) {
        const scrapedTrips = scrapedByDestination.get(destinationId);
        if (!scrapedTrips?.length) continue;

        // 跨區域保護：只檢查屬於當前區域的 destination（防止日本東北/港澳大陸東北 誤判）
        const destRecord = destinations.find((d) => d.id === destinationId);
        if (destRecord?.source_url) {
          const regionPath = regionConfig.url.replace(/\/$/, '');
          if (!destRecord.source_url.includes(regionPath)) {
            console.log(`  ⏭️ 跳過下架偵測：${destRecord.title}（source_url 不屬於 ${regionConfig.key} 區域）`);
            continue;
          }
        }

        const matchedIds = matchedTripIdsByDestination.get(destinationId) || new Set();
        // 收集此區域所有已抓取的行程（跨 destination），用於反查防誤判
        const allScrapedInRegion = [...scrapedByDestination.values()].flat();

        for (const trip of destinationTrips) {
          if (matchedIds.has(trip.id)) continue;
          if (!trip.is_active) continue; // 已隱藏的行程不重複標記下架
          if (!trip.scrape_managed) continue; // 手動卡（員工搶先建、朋威未上架）不做下架偵測

          // 下架保護：先跨 destination 反查，確認此行程在整個區域都找不到才標記下架
          const tripCode = sanitizeText(trip.trip_banner?.code_label);
          const matchesElsewhere = allScrapedInRegion.some((scraped) => {
            if (tripCode && sanitizeText(scraped.code_label) === tripCode) return true;
            return similarity(scraped.title, trip.title) >= 0.7;
          });

          if (matchesElsewhere) {
            console.log(`  ⏭️ 跳過下架：${trip.title}（在其他目的地有匹配）`);
            continue;
          }

          const removedChange = createRemovedTripChange(
            {
              logId,
              destinationId,
              sourceUrl: `${BASE_URL}${regionConfig.url}`,
              regionLabel: regionConfig.key,
              scrapedData: {
                destination_id: destinationId,
                destination_label: scrapedTrips[0]?.destination_label || '',
                source_region_key: regionConfig.key,
                source_region_url: `${BASE_URL}${regionConfig.url}`,
              },
            },
            trip,
          );
          changesFound += await insertPendingChanges(supabase, [removedChange]);
        }
      }

      } // end of removed-detection / unmatched-warning block

      completedRegions += 1;
      regionDetails = mergeRegionDetail(regionDetails, regionConfig.key, {
        status: 'completed',
        completed: tripSummaries.length,
      });

      // 更新此區域的 last_scraped 時間戳
      await updateRegionScraped(supabase, regionConfig.key).catch(() => {});

      await updateLog(supabase, logId, {
        current_region: regionConfig.key,
        completed_regions: completedRegions,
        changes_found: changesFound,
        region_details: regionDetails,
      });
    }

    await updateLog(supabase, logId, {
      status: 'completed',
      current_trip: '',
      completed_trips: completedTrips,
      completed_regions: completedRegions,
      changes_found: changesFound,
      region_details: regionDetails,
      finished_at: new Date().toISOString(),
    });

    console.log(`\n✅ 抓取完成，共 ${completedTrips} 筆行程，發現 ${changesFound} 筆待確認變更`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (logId) {
      await updateLog(supabase, logId, {
        status: 'failed',
        error_message: message,
        finished_at: new Date().toISOString(),
      });
    }

    console.error('\n❌ 自動抓取失敗');
    console.error(message);
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => closePuppeteerBrowser());
