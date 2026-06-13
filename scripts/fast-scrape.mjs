/**
 * 輕量版行程抓取器 — 用 fetch + cheerio 取代 Puppeteer
 * 速度比 auto-scrape.mjs 快 10-50 倍
 *
 * 用法：
 *   node scripts/fast-scrape.mjs --regions=japan,vietnam     # 指定區域
 *   node scripts/fast-scrape.mjs --regions=all               # 全部區域
 *   node scripts/fast-scrape.mjs --dry-run --regions=japan   # 只看結果不寫 DB
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';

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
  '桃園國際機場': '桃園', '高雄-小港機場': '高雄', '高雄國際機場': '高雄',
  '台北松山機場': '松山', '台中清泉崗機場': '台中',
};

const ALIASES = new Map([
  ['濟州島', '濟州'], ['宿霧薄荷島', '宿霧'], ['馬來西亞/新加坡', '新加坡'],
  ['廈門', '華東'], ['江南', '華東'], ['上海', '華東'], ['山東', '華東'],
  ['黃山', '華東'], ['浙江', '華東'], ['福建', '華東'], ['江蘇', '華東'],
  ['江西', '華東'], ['安徽', '華東'], ['小三通', '華東'],
  ['成都', '西南'], ['九寨溝', '西南'], ['張家界', '西南'], ['重慶', '西南'],
  ['貴州', '西南'], ['貴州(貴陽)', '西南'], ['雲南', '西南'], ['雲南(昆明)', '西南'],
  ['西藏', '西南'], ['四川', '西南'], ['閬中', '西南'], ['宜昌', '西南'],
  ['鄭州', '華中'], ['湖南', '華中'], ['湖北', '華中'],
  ['廣東', '華南'], ['海南', '華南'], ['香港', '華南'], ['澳門', '華南'],
  ['瀋陽', '東北'], ['吉林', '東北'], ['黑龍江', '東北'], ['北京', '東北'],
  ['西北地區', '西北'], ['青海', '西北'], ['陝西', '西北'], ['甘肅', '西北'], ['寧夏', '西北'],
  ['埃及', '中東'], ['土耳其', '中東'], ['阿布達比', '中東'],
  ['名古屋', '中部'],
]);

// ── 工具函式（與 auto-scrape.mjs 一致）──

const clean = (v) => String(v || '').replace(/\s+/g, ' ').trim();
const normalizeTitle = (t) => String(t || '').replace(/[～~\-–—|｜×✕✖＋+&＆]/g, '').replace(/\s+/g, '').replace(/[，,。.、！!？?：:；;（）()【】\[\]「」『』"'']/g, '').toLowerCase().trim();
const normalizeTag = (v) => clean(v).replace(/^#/, '').replace(/^\((國外|國內)\)/, '').trim();

function similarity(a, b) {
  const na = normalizeTitle(a), nb = normalizeTitle(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.9;
  const setA = new Set(na), setB = new Set(nb);
  let common = 0;
  for (const c of setA) if (setB.has(c)) common++;
  return common / Math.max(setA.size, setB.size, 1);
}

function normalizePriceText(v) {
  const text = clean(v).replace(/\s+/g, '');
  if (!text) return '';
  if (text.includes('洽詢')) return '洽詢';
  const m = text.match(/NT\$?\s*([\d,]+)/i);
  if (!m) return text;
  const suffix = text.includes('元起') ? '元起' : text.includes('起') ? '起' : '';
  return `NT$${m[1]}${suffix}`;
}

function formatPriceRange(p) {
  const n = normalizePriceText(p);
  if (!n || n === '洽詢') return n;
  return n.replace(/元起$/, '起');
}

function padDate(d) {
  const parts = clean(d).replace(/\//g, '-').split('-');
  if (parts.length !== 3) return clean(d);
  return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
}

function getAirlineCode(fn) {
  const m = String(fn || '').trim().match(/^([A-Z]{2}[A-Z]?|\d[A-Z])/i);
  return m ? m[0].toUpperCase() : '';
}

function formatAirline(airline, fn) {
  const t = clean(airline);
  if (!t) return '';
  if (/[（(][A-Z0-9]{2,3}[)）]/.test(t)) return t;
  const code = getAirlineCode(fn);
  return code ? `${t}（${code}）` : t;
}

function getDepartureCity(airport) {
  const t = clean(airport);
  if (CITY_BY_AIRPORT[t]) return CITY_BY_AIRPORT[t];
  if (t.includes('高雄')) return '高雄';
  if (t.includes('松山')) return '松山';
  if (t.includes('台中')) return '台中';
  return '桃園';
}

function buildSubtitle({ title, airline, tags }) {
  const a = clean(airline);
  const ct = clean(title).replace(/\d+天\d+夜/g, '').trim();
  const segs = ct.split(/[~～｜|]/).map(s => clean(s)).filter(Boolean);
  const src = segs[1] || segs[0] || '';
  const parts = src.split(/[、,，]/).map(s => clean(s)).filter(Boolean).slice(0, 4);
  const fb = Array.isArray(tags) ? tags.slice(0, 4) : [];
  const summary = (parts.length ? parts : fb).join('、');
  if (a && summary) return `${a}｜${summary}`;
  return a || summary || ct;
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchHTML(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

// ── 列表頁解析 ──

function parseListingPage(html, regionKey) {
  const $ = cheerio.load(html);
  const sections = [];

  // 每個 .row.expand-graphics 是一個 section（tab 區塊）
  $('.row.expand-graphics').each((_, container) => {
    const parent = $(container).parent();
    const label = clean(parent.find('.header-title').first().text());

    const trips = [];
    const seen = new Set();

    // 支援 group 和 domestic（國內行程：金門/澎湖/馬祖）
    $(container).find('.item-box a[href*="/products/group/"], .item-box a[href*="/products/domestic/"]').each((idx, link) => {
      const href = $(link).attr('href') || '';
      const absHref = href.startsWith('http') ? href : `${BASE_URL}${href}`;
      if (seen.has(absHref)) return;
      seen.add(absHref);

      // 從 URL 提取 code_label（group 或 domestic）
      const codeFromUrl = (href.match(/mold-new\/([A-Z0-9]+)/i) || href.match(/\/mold\/([A-Z0-9]+)/i))?.[1] || '';

      const title = clean($(link).find('h3').text());
      const listPrice = clean($(link).find('h4').text());
      const listingTags = [];
      $(link).find('.item_tag').each((_, tag) => {
        const t = clean($(tag).text());
        if (t) listingTags.push(t);
      });

      trips.push({
        title,
        list_price: listPrice,
        href: absHref,
        code_from_url: codeFromUrl,
        section_label: label,
        display_order: idx + 1,
        listing_tags: listingTags,
      });
    });

    if (trips.length > 0) {
      sections.push({ label, trips });
    }
  });

  return sections;
}

// ── 詳情頁解析 ──

function parseDetailPage(html, tripSummary) {
  const $ = cheerio.load(html);

  // ① 基本資訊
  const title = clean($('h1').first().text());
  const coverImg = $('#BasicCarousel img').first().attr('src') || '';
  const coverUrl = coverImg.startsWith('http') ? coverImg : coverImg.startsWith('//') ? `https:${coverImg}` : coverImg.startsWith('/') ? `${BASE_URL}${coverImg}` : '';

  const rawCode = clean($('.GroupNumber').text());
  const codeMatch = rawCode.match(/[A-Z][A-Z0-9]{4,}/);
  const codeLabel = codeMatch ? codeMatch[0] : tripSummary.code_from_url || '';

  // PriceBlock 基本資訊
  const basicInfo = {};
  $('.PriceBlock li').each((_, item) => {
    const key = clean($(item).find('strong').text());
    if (!key) return;
    const spans = [];
    $(item).find('.fontEg').each((_, s) => {
      const t = clean($(s).text());
      if (t && t !== '航班資訊') spans.push(t);
    });
    basicInfo[key] = spans.length ? spans.join(' ') : clean($(item).text().replace(key, ''));
  });

  const durationRaw = clean(basicInfo['旅遊天數'] || '');
  const durMatch = durationRaw.match(/(\d+)\s*天?\s*(\d+)\s*夜?/) || durationRaw.match(/(\d+)\D+(\d+)/);
  let duration = durMatch ? `${durMatch[1]}天${durMatch[2]}夜` : '';
  if (!durMatch) {
    const nums = durationRaw.match(/\d+/g);
    if (nums && nums.length >= 2) duration = `${nums[0]}天${nums[1]}夜`;
    else if (nums?.length === 1) duration = `${nums[0]}天${Number(nums[0]) - 1}夜`;
  }

  const minGroupSize = parseInt(String(basicInfo['成團人數'] || '').replace(/[^\d]/g, ''), 10) || null;
  const airport = clean(basicInfo['出發機場'] || '');
  const airlineRaw = clean(basicInfo['航空公司'] || '');

  // ② 售價明細
  const priceDetails = [];
  $('.LowestPrice table tbody tr td').each((_, cell) => {
    priceDetails.push(clean($(cell).text()));
  });
  const priceDetail = [0, 1, 2, 3, 4].map(i => normalizePriceText(priceDetails[i] || '')).join('\t');
  const adultPrice = normalizePriceText(priceDetails[0] || '');
  const priceRange = formatPriceRange(adultPrice);

  // ③ 標籤
  const tags = [];
  $('.KeyFeatures li a').each((_, a) => {
    const t = normalizeTag($(a).text());
    if (t) tags.push(t);
  });
  // listing_tags 優先
  const finalTags = tripSummary.listing_tags?.length ? tripSummary.listing_tags.map(normalizeTag).filter(Boolean) : tags;

  // ④ 航班資訊
  const flightSegments = [];
  $('#flightModal li').each((_, item) => {
    const fullText = clean($(item).find('.detail_airline span').text());
    const fMatch = fullText.match(/^(.+?)([A-Z]{2}\d{1,4}[A-Z]?)$/i);
    const airline = fMatch ? fMatch[1].trim() : fullText;
    const flightNumber = fMatch ? fMatch[2].trim() : '';
    const goText = clean($(item).find('.go').text());
    const toText = clean($(item).find('.to').text());
    const dayMatch = goText.match(/第\s*(\d+)\s*天/);
    const depTimeMatch = goText.match(/(\d{1,2}:\d{2})/);
    const arrTimeMatch = toText.match(/(\d{1,2}:\d{2})/);
    const depAirport = clean($(item).find('.go div').text());
    const arrAirport = clean($(item).find('.to div').text());

    if (!airline && !flightNumber && !depAirport && !arrAirport) return;

    flightSegments.push({
      day_text: dayMatch ? `第${dayMatch[1]}天` : '',
      airline: formatAirline(airline, flightNumber),
      flight_number: clean(flightNumber),
      dep_time: depTimeMatch ? depTimeMatch[1] : '',
      dep_airport: clean(depAirport),
      arr_time: arrTimeMatch ? arrTimeMatch[1] : '',
      arr_airport: clean(arrAirport),
      next_day: /\+\s*1天/.test(toText),
    });
  });

  // ⑤ 出發日期
  const departures = [];
  const primaryAirline = formatAirline(airlineRaw, flightSegments[0]?.flight_number || '');

  $('#search-table tbody tr').each((_, row) => {
    const date = padDate(clean($(row).find('.YMD').text()));
    if (!date) return;
    departures.push({
      date,
      departure_city: getDepartureCity(clean($(row).find('.airport').text()) || airport),
      airline: formatAirline(clean($(row).find('.plane-abbr').text()) || primaryAirline, flightSegments[0]?.flight_number || ''),
      label: clean($(row).find('.plane-sche').text()),
      seats_total: parseInt(String($(row).find('.TotalSeat').text()).replace(/[^\d]/g, ''), 10) || 0,
      seats_available: parseInt(String($(row).find('.AvailableSeat').text()).replace(/[^\d]/g, ''), 10) || 0,
      price: parseInt(String($(row).find('.TourPrice').text()).replace(/[^\d]/g, ''), 10) || 0,
    });
  });

  const subtitle = buildSubtitle({ title, airline: primaryAirline, tags: finalTags });
  const seatsTotal = departures.find(d => d.seats_total)?.seats_total ?? null;
  const customTour = departures.length === 0;

  // breadcrumb → destination label
  const breadcrumbs = [];
  $('.breadcrumb-item a').each((_, a) => breadcrumbs.push(clean($(a).text())));
  const destinationLabel = breadcrumbs[breadcrumbs.length - 1] || tripSummary.section_label || '';

  return {
    destination_label: clean(destinationLabel),
    region_label: clean(tripSummary.section_label),
    source_url: tripSummary.href,
    title: clean(title),
    subtitle,
    duration,
    price_range: priceRange,
    cover_image_url: clean(coverUrl),
    code_label: clean(codeLabel),
    min_group_size: minGroupSize,
    airport: clean(airport),
    airline: primaryAirline,
    tags: finalTags,
    price_detail: priceDetail,
    flight_segments: flightSegments,
    flightSegments,
    departures,
    departure_label: `${getDepartureCity(airport)}出發`,
    display_order: tripSummary.display_order,
    custom_tour: customTour,
    trip_banner: {
      code_label: clean(codeLabel),
      price_label: priceRange,
      tags: finalTags,
      departure_label: `${getDepartureCity(airport)}出發`,
      duration_label: duration,
      seats_total: seatsTotal,
      seats_available: departures.find(d => d.seats_available != null)?.seats_available ?? null,
      deposit_label: '',
      custom_tour: customTour,
      min_group_size: minGroupSize,
      airport: clean(airport),
      airline: primaryAirline,
      price_detail: priceDetail,
    },
  };
}

// ── DB 操作 ──

function loadEnv() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY };
  }
  const env = readFileSync('.env.local', 'utf8');
  const get = (k) => { const m = env.match(new RegExp(`^${k}=(.+)$`, 'm')); return m ? m[1].trim() : null; };
  return { supabaseUrl: get('NEXT_PUBLIC_SUPABASE_URL'), serviceRoleKey: get('SUPABASE_SERVICE_ROLE_KEY') };
}

// ── 主程式 ──

async function main() {
  const args = process.argv.slice(2);
  const regionsArg = args.find(a => a.startsWith('--regions='))?.split('=')[1] || '';
  const dryRun = args.includes('--dry-run');
  const regionKeys = regionsArg === 'all' ? REGION_PAGES.map(r => r.key) : regionsArg.split(',').filter(Boolean);

  if (!regionKeys.length) {
    console.log('用法: node scripts/fast-scrape.mjs --regions=japan,vietnam');
    process.exit(1);
  }

  const selectedRegions = REGION_PAGES.filter(r => regionKeys.includes(r.key));
  const invalidKeys = regionKeys.filter(k => !selectedRegions.some(r => r.key === k));
  if (invalidKeys.length) {
    console.error(`找不到區域: ${invalidKeys.join(', ')}`);
    process.exit(1);
  }

  const { supabaseUrl, serviceRoleKey } = loadEnv();
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // 載入 destinations 和既有 trips
  const { data: destinations } = await supabase.from('destinations').select('id, title, sub_region, source_url').eq('is_active', true);
  const { data: existingTrips } = await supabase.from('trips').select('id, destination_id, title, subtitle, duration, price_range, display_order, is_active, trip_banner, cover_image_url, document_url');

  // 建立 destination resolver
  const destByTitle = new Map();
  for (const d of destinations || []) {
    const key = normalizeTitle(d.title);
    destByTitle.set(key, d);
    if (d.sub_region) {
      const subKey = normalizeTitle(d.sub_region);
      if (subKey !== key) destByTitle.set(subKey, d);
    }
  }
  const resolveDest = (label) => {
    const n = normalizeTitle(label);
    if (destByTitle.has(n)) return destByTitle.get(n);
    const alias = ALIASES.get(clean(label));
    if (alias) return destByTitle.get(normalizeTitle(alias)) || null;
    return null;
  };

  const tripsByDest = new Map();
  for (const t of existingTrips || []) {
    const list = tripsByDest.get(t.destination_id) || [];
    list.push(t);
    tripsByDest.set(t.destination_id, list);
  }

  let totalScraped = 0;
  let totalMatched = 0;
  let totalUpdated = 0;
  let totalNew = 0;
  let totalErrors = 0;

  console.log(`🚀 快速抓取開始 (${dryRun ? 'DRY RUN' : '實際寫入'})，區域: ${selectedRegions.map(r => r.key).join(', ')}\n`);

  for (const region of selectedRegions) {
    const listingUrl = `${BASE_URL}${region.url}`;
    console.log(`\n🌐 ${region.key}: ${listingUrl}`);

    let listingHtml;
    try {
      listingHtml = await fetchHTML(listingUrl);
    } catch (err) {
      console.log(`  ❌ 列表頁載入失敗: ${err.message}`);
      totalErrors++;
      continue;
    }

    const sections = parseListingPage(listingHtml, region.key);
    const allTrips = sections.flatMap(s => s.trips);
    console.log(`  📋 ${sections.length} 區塊, ${allTrips.length} 筆行程`);

    const matchedIds = new Map(); // destinationId -> Set<tripId>

    for (let i = 0; i < allTrips.length; i++) {
      const tripSummary = allTrips[i];
      console.log(`  [${i + 1}/${allTrips.length}] ${tripSummary.title.substring(0, 50)}`);

      let detailHtml;
      try {
        detailHtml = await fetchHTML(tripSummary.href);
      } catch (err) {
        console.log(`    ❌ 詳情頁失敗: ${err.message}`);
        totalErrors++;
        continue;
      }

      let scraped;
      try {
        scraped = parseDetailPage(detailHtml, tripSummary);
      } catch (err) {
        console.log(`    ❌ 解析失敗: ${err.message}`);
        totalErrors++;
        continue;
      }

      totalScraped++;

      // 過濾無效資料 — 用列表頁標題作 fallback
      if (!scraped.title || scraped.title.length < 3) {
        if (tripSummary.title && tripSummary.title.length >= 3) {
          scraped.title = tripSummary.title;
          scraped.code_label = scraped.code_label || tripSummary.code_from_url;
          if (scraped.trip_banner) scraped.trip_banner.code_label = scraped.code_label;
        } else {
          console.log(`    ⚠️ 無效資料，跳過`);
          continue;
        }
      }

      // 找到對應 destination
      let dest = resolveDest(scraped.destination_label) || resolveDest(tripSummary.section_label);

      // Fallback: 用標題在全部 DB trips 中搜尋匹配
      if (!dest) {
        let bestScore = 0, bestTrip = null;
        for (const t of existingTrips || []) {
          if (!t.is_active) continue;
          const score = similarity(scraped.title, t.title);
          if (score > bestScore) { bestScore = score; bestTrip = t; }
        }
        if (bestScore >= 0.7 && bestTrip) {
          dest = (destinations || []).find(d => d.id === bestTrip.destination_id) || null;
          if (dest) console.log(`    🔗 標題匹配到 ${dest.title} (score=${bestScore.toFixed(2)})`);
        }
      }

      if (!dest) {
        console.log(`    🟣 找不到 destination: ${scraped.destination_label || tripSummary.section_label}`);
        continue;
      }

      // 匹配既有行程
      const destTrips = tripsByDest.get(dest.id) || [];
      const consumed = matchedIds.get(dest.id) || new Set();

      // 先用 code_label 匹配
      let matched = destTrips.find(t => {
        if (consumed.has(t.id)) return false;
        return clean(t.trip_banner?.code_label) && clean(t.trip_banner.code_label) === clean(scraped.code_label);
      });

      // 再用標題相似度
      if (!matched) {
        let bestScore = 0, bestMatch = null;
        for (const t of destTrips) {
          if (consumed.has(t.id)) continue;
          const score = similarity(scraped.title, t.title);
          if (score > bestScore) { bestScore = score; bestMatch = t; }
        }
        if (bestScore >= 0.7) matched = bestMatch;
      }

      if (matched) {
        consumed.add(matched.id);
        matchedIds.set(dest.id, consumed);
        totalMatched++;

        // 組合更新資料 — 只更新有值且不同的欄位
        const updates = {};
        const bannerUpdates = { ...(matched.trip_banner || {}) };
        let hasChange = false;

        const maybeUpdate = (field, oldVal, newVal) => {
          if (newVal && clean(String(newVal)) !== clean(String(oldVal || ''))) {
            updates[field] = newVal;
            hasChange = true;
          }
        };

        maybeUpdate('title', matched.title, scraped.title);
        maybeUpdate('subtitle', matched.subtitle, scraped.subtitle);
        maybeUpdate('duration', matched.duration, scraped.duration);
        maybeUpdate('price_range', matched.price_range, scraped.price_range);

        // 封面圖：只在 DB 沒圖時才更新
        if (!matched.cover_image_url && scraped.cover_image_url) {
          updates.cover_image_url = scraped.cover_image_url;
          hasChange = true;
        }

        // trip_banner 內的欄位
        const ob = matched.trip_banner || {};
        const setBanner = (key, val) => {
          if (val !== undefined && val !== null && clean(String(val)) !== clean(String(ob[key] || ''))) {
            bannerUpdates[key] = val;
            hasChange = true;
          }
        };

        setBanner('code_label', scraped.code_label);
        setBanner('price_label', scraped.price_range);
        setBanner('tags', scraped.tags);
        setBanner('departure_label', scraped.departure_label);
        setBanner('duration_label', scraped.duration);
        setBanner('seats_total', scraped.trip_banner.seats_total);
        setBanner('seats_available', scraped.trip_banner.seats_available);
        setBanner('custom_tour', scraped.custom_tour);
        setBanner('min_group_size', scraped.min_group_size);
        setBanner('airport', scraped.airport);
        setBanner('airline', scraped.airline);
        setBanner('price_detail', scraped.price_detail);

        if (hasChange) {
          updates.trip_banner = bannerUpdates;

          if (dryRun) {
            console.log(`    🔄 [DRY] 會更新: ${Object.keys(updates).join(', ')}`);
          } else {
            const { error } = await supabase.from('trips').update(updates).eq('id', matched.id);
            if (error) {
              console.log(`    ❌ 更新失敗: ${error.message}`);
              totalErrors++;
            } else {
              console.log(`    ✅ 已更新 (code=${scraped.code_label})`);
            }
          }
          totalUpdated++;
        } else {
          console.log(`    ✔ 無變更`);
        }

        // 更新出發日期
        if (scraped.departures.length > 0 && !dryRun) {
          const outbound = scraped.flight_segments[0] || null;
          const inbound = scraped.flight_segments[scraped.flight_segments.length - 1] || null;

          // 先刪舊的
          await supabase.from('trip_departure_dates').delete().eq('trip_id', matched.id);

          const depRows = scraped.departures.map(d => ({
            trip_id: matched.id,
            departure_date: d.date,
            departure_city: d.departure_city,
            airline: d.airline,
            price: d.price || null,
            seats_total: d.seats_total ?? null,
            seats_available: d.seats_available ?? null,
            label: d.label,
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
            is_active: true,
          }));

          const { data: newDeps, error: depErr } = await supabase.from('trip_departure_dates').insert(depRows).select('id');
          if (depErr) {
            console.log(`    ⚠️ 出發日期寫入失敗: ${depErr.message}`);
          } else {
            // 更新 departure_info_map
            const dim = {};
            for (const dep of newDeps || []) {
              dim[dep.id] = {
                group_code: scraped.code_label || '',
                price_detail: JSON.stringify({
                  title: '團費與售價說明',
                  subtitle: '依航空與房型不同，價格略有調整',
                  adultPrice: normalizePriceText(scraped.trip_banner.price_detail?.split('\t')[0] || ''),
                  childWithBedPrice: normalizePriceText(scraped.trip_banner.price_detail?.split('\t')[1] || ''),
                  childNoBedPrice: normalizePriceText(scraped.trip_banner.price_detail?.split('\t')[2] || ''),
                  childExtraBedPrice: normalizePriceText(scraped.trip_banner.price_detail?.split('\t')[3] || ''),
                  infantPrice: normalizePriceText(scraped.trip_banner.price_detail?.split('\t')[4] || ''),
                }),
              };
            }
            // 保留既有 side_image_url
            const existingBanner = matched.trip_banner || {};
            const mergedBanner = { ...bannerUpdates, departure_info_map: dim };
            if (existingBanner.side_image_url) mergedBanner.side_image_url = existingBanner.side_image_url;
            await supabase.from('trips').update({ trip_banner: mergedBanner }).eq('id', matched.id);
          }
        }

      } else {
        totalNew++;
        console.log(`    🆕 新行程 (code=${scraped.code_label}, dest=${dest.title})`);

        if (!dryRun) {
          // 寫入 pending_changes
          await supabase.from('pending_changes').insert({
            destination_id: dest.id,
            trip_id: null,
            change_type: 'new_trip',
            field_name: 'trip',
            old_value: null,
            new_value: scraped.title,
            trip_title: scraped.title,
            source_code: scraped.code_label || '',
            source_url: scraped.source_url,
            region_label: region.key,
            scraped_data: { ...scraped, destination_id: dest.id },
            status: 'pending',
          });
        }
      }

      // 小延遲避免被封
      await new Promise(r => setTimeout(r, 200));
    }
  }

  console.log(`\n📊 抓取完成`);
  console.log(`  抓取: ${totalScraped} | 配對: ${totalMatched} | 更新: ${totalUpdated} | 新行程: ${totalNew} | 錯誤: ${totalErrors}`);
  if (dryRun) console.log(`  ⚠️ DRY RUN 模式，未實際寫入 DB`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
