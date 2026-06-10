import { readFileSync } from 'fs';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

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

async function fetchHTML(url) {
  const response = await fetch(url, { headers: { 'User-Agent': FETCH_UA } });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.text();
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
  const args = { regions: null, logId: null, destinationId: null };

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

function similarity(a, b) {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.9;

  const setA = new Set(na);
  const setB = new Set(nb);
  let common = 0;

  for (const char of setA) {
    if (setB.has(char)) common += 1;
  }

  return common / Math.max(setA.size, setB.size, 1);
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
  return sanitizeText(value)
    .replace(/^#/, '')
    .replace(/^\((國外|國內)\)/, '')
    .trim();
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

function formatAirlineLabel(airline, flightNumber) {
  const text = sanitizeText(airline);
  if (!text) return '';
  if (/[（(][A-Z0-9]{2,3}[)）]/.test(text)) return text;

  const code = getAirlineCodeFromFlightNumber(flightNumber);
  return code ? `${text}（${code}）` : text;
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
    ['宿霧薄荷島', '宿霧'],
    ['馬來西亞/新加坡', '新加坡'],
    // 港澳大陸：朋威 breadcrumb 城市名 → 我們的 sub_region
    ['廈門', '華東'], ['江南', '華東'], ['上海', '華東'], ['山東', '華東'],
    ['黃山', '華東'], ['浙江', '華東'], ['福建', '華東'], ['江蘇', '華東'],
    ['江西', '華東'], ['安徽', '華東'], ['小三通', '華東'],
    ['成都', '西南'], ['九寨溝', '西南'], ['張家界', '西南'], ['重慶', '西南'],
    ['貴州', '西南'], ['貴州(貴陽)', '西南'], ['雲南', '西南'], ['雲南(昆明)', '西南'],
    ['西藏', '西南'], ['四川', '西南'], ['閬中', '西南'],
    ['鄭州', '華中'], ['湖南', '華中'], ['湖北', '華中'],
    ['廣東', '華南'], ['海南', '華南'], ['香港', '華南'], ['澳門', '華南'],
    ['瀋陽', '東北'], ['吉林', '東北'], ['黑龍江', '東北'], ['北京', '東北'],
    ['西北地區', '西北'], ['青海', '西北'], ['陝西', '西北'], ['甘肅', '西北'], ['寧夏', '西北'],
    ['宜昌', '西南'],
    // 中東亞非
    ['埃及', '中東'], ['土耳其', '中東'], ['阿布達比', '中東'],
    // 日本
    ['名古屋', '中部'],
  ]);

  return (label) => {
    const normalized = normalizeTitle(label);
    const fallback = aliases.get(sanitizeText(label));
    const candidates = titleMap.get(normalized) || (fallback ? titleMap.get(normalizeTitle(fallback)) || [] : []);

    if (!candidates.length) return null;
    if (candidates.length === 1) return candidates[0];

    return [...candidates].sort((left, right) => {
      const tripDiff = (tripCountByDestinationId.get(right.id) || 0) - (tripCountByDestinationId.get(left.id) || 0);
      if (tripDiff !== 0) return tripDiff;
      return left.display_order - right.display_order;
    })[0];
  };
}

function findExistingTripForScrapedTrip(scrapedTrip, destinationTrips, consumedTripIds) {
  const byCode = destinationTrips.find((trip) => {
    if (consumedTripIds.has(trip.id)) return false;
    return sanitizeText(trip.trip_banner?.code_label) === sanitizeText(scrapedTrip.code_label);
  });
  if (byCode) return byCode;

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

  return bestScore >= 0.7 ? bestMatch : null;
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
    const candidates = [targetSubRegion, targetDestinationTitle].filter(Boolean);
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
  const priceDetails = [];
  $('.LowestPrice table tbody tr td').each((_, cell) => priceDetails.push(sanitizeText($(cell).text())));

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

  // ⑥ 出發日期
  const rawDepartures = [];
  $('#search-table tbody tr').each((_, row) => {
    const date = padDate(sanitizeText($(row).find('.YMD').text()));
    if (!date) return;
    rawDepartures.push({
      date,
      departure_airport: sanitizeText($(row).find('.airport').text()),
      airline: sanitizeText($(row).find('.plane-abbr').text()),
      label: sanitizeText($(row).find('.plane-sche').text()),
      seats_total: Number(String($(row).find('.TotalSeat').text() || '').replace(/[^\d]/g, '') || 0),
      seats_available: Number(String($(row).find('.AvailableSeat').text() || '').replace(/[^\d]/g, '') || 0),
      price: Number(String($(row).find('.TourPrice').text() || '').replace(/[^\d]/g, '') || 0),
    });
  });

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

  const primaryAirline = formatAirlineLabel(basicInfo['航空公司'] || '', enrichedFlightSegments[0]?.flight_number || '');
  const tags = rawTags.map(normalizeTag).filter(Boolean);
  const priceDetail = buildPriceDetailText(priceDetails);
  const adultPrice = normalizePriceText(priceDetails[0] || '');
  const priceRange = formatPriceRange(adultPrice);
  const departures = rawDepartures.map((departure) => ({
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
    },
  };
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
  if (stableStringify(existingDepartures) !== stableStringify(scrapedDepartures)) {
    pushChange('departure', 'departures', existingDepartures, scrapedDepartures);
  }

  return changes;
}

const insertedChangeKeys = new Set();

async function insertPendingChanges(supabase, changes) {
  if (!changes.length) return 0;

  // 去重：同一個 trip/destination + 同一個 change_type + 同一個 field_name 只建一筆
  const deduped = changes.filter((c) => {
    const key = `${c.trip_id || c.destination_id || 'unknown'}_${c.change_type}_${c.field_name || ''}`;
    if (insertedChangeKeys.has(key)) return false;
    insertedChangeKeys.add(key);
    return true;
  });

  if (!deduped.length) return 0;
  const { error } = await supabase.from('pending_changes').insert(deduped);
  if (error) {
    console.log(`  ⚠️ 寫入 pending_changes 失敗：${error.message}`);
    return 0;
  }
  return deduped.length;
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
    .select('trip_id, destination_id, change_type, field_name')
    .eq('status', 'dismissed')
    .gte('created_at', thirtyDaysAgo);
  const keys = new Set();
  (data || []).forEach(c => {
    // key 包含 destination_id，避免 new_trip (trip_id=null) 共用同一個 key
    keys.add(`${c.trip_id || c.destination_id || 'unknown'}_${c.change_type}_${c.field_name || ''}`);
  });
  return keys;
}

async function main() {
  const { supabaseUrl, serviceRoleKey } = loadEnv();
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { regions, logId: requestedLogId, destinationId } = parseArgs(process.argv.slice(2));
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
      const earlyError = !targetDestination
        ? `找不到指定目的地：${destinationId}`
        : !sanitizeText(targetDestination.source_url)
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

    const initialRegionDetails = buildRegionDetails(selectedRegions);
    logId = await createOrResetLog(supabase, requestedLogId, selectedRegions.length, initialRegionDetails);
    console.log(`🚀 開始自動抓取，log_id=${logId}`);

    const resolveDestination = buildDestinationResolver(destinations, existingTrips);
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
      const tripSummaries = sections.flatMap((section) => section.trips);
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
        console.log(`  🔍 [${index + 1}/${tripSummaries.length}] ${tripSummary.title}`);

        let scrapedTrip;
        try {
          scrapedTrip = await scrapeTripDetail(tripSummary);
        } catch (detailErr) {
          console.log(`  ⚠️ 抓取失敗，跳過：${tripSummary.title} (${detailErr.message})`);
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

        // 過濾垃圾資料（頁面載入失敗、空標題等）
        if (!scrapedTrip.title || scrapedTrip.title.includes('can\'t be reached') || scrapedTrip.title.includes('not found') || scrapedTrip.title.length < 3) {
          console.log(`  ⚠️ 無效資料，跳過：${scrapedTrip.title || '(空標題)'}`);
          completedTrips += 1;
          continue;
        }

        const destination = targetDestination || resolveDestination(scrapedTrip.destination_label) || resolveDestination(tripSummary.section_label);
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

        const destinationTrips = tripsByDestinationId.get(destination.id) || [];
        const consumedTripIds = matchedTripIdsByDestination.get(destination.id) || new Set();
        const matchedTrip = findExistingTripForScrapedTrip(scrapedTrip, destinationTrips, consumedTripIds);

        const bucket = scrapedByDestination.get(destination.id) || [];
        bucket.push(scrapedTrip);
        scrapedByDestination.set(destination.id, bucket);

        if (matchedTrip) {
          consumedTripIds.add(matchedTrip.id);
          matchedTripIdsByDestination.set(destination.id, consumedTripIds);
          const changes = buildComparisonChanges({
            logId,
            destinationId: destination.id,
            existingTrip: matchedTrip,
            scrapedTrip,
          });
          changesFound += await insertPendingChanges(supabase, changes);
        } else {
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

      const destinationEntries = targetDestination
        ? [[targetDestination.id, tripsByDestinationId.get(targetDestination.id) || []]]
        : [...tripsByDestinationId.entries()];

      for (const [destinationId, destinationTrips] of destinationEntries) {
        const scrapedTrips = scrapedByDestination.get(destinationId);
        if (!scrapedTrips?.length) continue;

        const matchedIds = matchedTripIdsByDestination.get(destinationId) || new Set();
        for (const trip of destinationTrips) {
          if (matchedIds.has(trip.id)) continue;
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

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
