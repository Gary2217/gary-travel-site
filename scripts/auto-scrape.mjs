import { readFileSync } from 'fs';
import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = 'https://www.pwgotravel.com.tw';
const REGION_PAGES = [
  { key: 'asia', url: '/asia/', tabs: ['中東', '中亞', '西伯利亞'] },
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
];

const CITY_BY_AIRPORT = {
  '桃園國際機場': '桃園',
  '高雄-小港機場': '高雄',
  '高雄國際機場': '高雄',
  '台北松山機場': '松山',
  '台中清泉崗機場': '台中',
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function loadEnv() {
  const env = readFileSync('.env.local', 'utf8');
  const getEnv = (key) => {
    const matched = env.match(new RegExp(`^${key}=(.+)$`, 'm'));
    return matched ? matched[1].trim() : null;
  };

  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY，請確認 .env.local');
  }

  return { supabaseUrl, serviceRoleKey };
}

function parseArgs(argv) {
  const args = { regions: null, logId: null };

  for (const arg of argv) {
    if (arg.startsWith('--regions=')) {
      args.regions = arg
        .slice('--regions='.length)
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    } else if (arg.startsWith('--log-id=')) {
      args.logId = arg.slice('--log-id='.length).trim() || null;
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

function parseNumber(value) {
  const digits = String(value || '').replace(/[^\d-]/g, '');
  return digits ? Number(digits) : null;
}

function getAirlineCodeFromFlightNumber(flightNumber) {
  const matched = String(flightNumber || '').trim().match(/^[A-Z0-9]{2,3}/i);
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

async function scrollToLoadLazyContent(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 500;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);

      setTimeout(() => {
        clearInterval(timer);
        resolve();
      }, 12000);
    });
  });

  await sleep(1500);
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
    .select('id, title, subtitle, display_order, is_active')
    .eq('is_active', true);

  if (error) throw new Error(`讀取 destinations 失敗：${error.message}`);
  return data || [];
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
    .eq('is_active', true);

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
    const key = normalizeTitle(destination.title);
    const list = titleMap.get(key) || [];
    list.push(destination);
    titleMap.set(key, list);
  }

  const aliases = new Map([
    ['濟州島', '濟州'],
    ['宿霧薄荷島', '宿霧'],
    ['馬來西亞/新加坡', '新加坡'],
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

async function scrapeRegionListings(page, regionConfig) {
  const url = `${BASE_URL}${regionConfig.url}`;
  console.log(`\n🌐 區域頁：${url}`);

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(3000);
  } catch {
    console.log('  ⚠️ 區域頁載入逾時，改用目前內容繼續');
  }

  await scrollToLoadLazyContent(page);

  const sections = await page.$$eval('.row.expand-graphics', (containers, baseUrl) => {
    const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const seenHref = new Set();

    return containers
      .map((container) => {
        const parent = container.parentElement;
        const header = parent?.querySelector('.header-title');
        const sectionLabel = normalize(header?.textContent || '');
        const cards = Array.from(container.querySelectorAll('.item-box a[href*="/products/group/"]'));
        const trips = cards
          .map((link, index) => {
            const href = link.getAttribute('href') || '';
            const absoluteHref = href.startsWith('http') ? href : `${baseUrl}${href}`;
            if (!href || seenHref.has(absoluteHref)) return null;
            seenHref.add(absoluteHref);

            const title = normalize(link.querySelector('h3')?.textContent || '');
            const priceText = normalize(link.querySelector('h4')?.textContent || '');
            return {
              title,
              list_price: priceText,
              href: absoluteHref,
              section_label: sectionLabel,
              display_order: index + 1,
            };
          })
          .filter(Boolean);

        if (!trips.length) return null;
        return { label: sectionLabel, trips };
      })
      .filter(Boolean);
  }, BASE_URL);

  const allTrips = sections.flatMap((section) => section.trips);
  console.log(`  📋 找到 ${sections.length} 個區塊，${allTrips.length} 筆行程`);

  return sections;
}

async function scrapeTripDetail(page, tripSummary) {
  try {
    await page.goto(tripSummary.href, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(2000);
  } catch {
    console.log(`  ⚠️ 詳情頁載入逾時，繼續解析：${tripSummary.title}`);
  }

  const data = await page.evaluate((sourceUrl, sectionLabel) => {
    const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const absolute = (value) => {
      const url = String(value || '').trim();
      if (!url) return '';
      if (url.startsWith('http://') || url.startsWith('https://')) return url;
      if (url.startsWith('//')) return `https:${url}`;
      if (url.startsWith('/')) return `${location.origin}${url}`;
      return `${location.origin}/${url.replace(/^\//, '')}`;
    };

    const breadcrumbLinks = Array.from(document.querySelectorAll('.breadcrumb-item a')).map((node) => clean(node.textContent));
    const destinationLabel = breadcrumbLinks[breadcrumbLinks.length - 1] || sectionLabel || '';

    const basicInfo = {};
    document.querySelectorAll('.PriceBlock li').forEach((item) => {
      const key = clean(item.querySelector('strong')?.textContent || '');
      if (!key) return;
      const spans = Array.from(item.querySelectorAll('.fontEg'))
        .map((node) => clean(node.textContent))
        .filter(Boolean)
        .filter((text) => text !== '航班資訊');
      const joined = spans.length ? spans.join(' ') : clean(item.textContent.replace(key, ''));
      basicInfo[key] = joined;
    });

    const priceDetails = Array.from(document.querySelectorAll('.LowestPrice table tbody tr td')).map((cell) => clean(cell.textContent));
    const tags = Array.from(document.querySelectorAll('.KeyFeatures li a')).map((node) => clean(node.textContent));

    const flightSegments = Array.from(document.querySelectorAll('#flightModal li'))
      .map((item) => {
        const airlineLines = clean(item.querySelector('.detail_airline span')?.textContent || '')
          .split(/\s+/)
          .filter(Boolean);
        const goText = clean(item.querySelector('.go')?.textContent || '');
        const toText = clean(item.querySelector('.to')?.textContent || '');
        const dayMatch = goText.match(/第\s*(\d+)\s*天/);
        const depTimeMatch = goText.match(/(\d{1,2}:\d{2})/);
        const arrTimeMatch = toText.match(/(\d{1,2}:\d{2})/);
        const depAirport = clean(item.querySelector('.go div')?.textContent || '');
        const arrAirport = clean(item.querySelector('.to div')?.textContent || '');

        if (!airlineLines.length && !depAirport && !arrAirport) return null;

        return {
          day_text: dayMatch ? `第${dayMatch[1]}天` : '',
          airline: airlineLines[0] || '',
          flight_number: airlineLines[1] || '',
          dep_time: depTimeMatch ? depTimeMatch[1] : '',
          dep_airport: depAirport,
          arr_time: arrTimeMatch ? arrTimeMatch[1] : '',
          arr_airport: arrAirport,
          next_day: /\+\s*1天/.test(toText),
        };
      })
      .filter(Boolean);

    const departures = Array.from(document.querySelectorAll('#search-table tbody tr'))
      .map((row) => {
        const date = clean(row.querySelector('.YMD')?.textContent || '').replace(/\//g, '-');
        if (!date) return null;

        return {
          date,
          departure_airport: clean(row.querySelector('.airport')?.textContent || ''),
          airline: clean(row.querySelector('.plane-abbr')?.textContent || ''),
          label: clean(row.querySelector('.plane-sche')?.textContent || ''),
          seats_total: Number(String(row.querySelector('.TotalSeat')?.textContent || '').replace(/[^\d]/g, '') || 0),
          seats_available: Number(String(row.querySelector('.AvailableSeat')?.textContent || '').replace(/[^\d]/g, '') || 0),
          price: Number(String(row.querySelector('.TourPrice')?.textContent || '').replace(/[^\d]/g, '') || 0),
        };
      })
      .filter(Boolean);

    return {
      source_url: sourceUrl,
      source_section_label: sectionLabel,
      destination_label: destinationLabel,
      title: clean(document.querySelector('h1')?.textContent || ''),
      cover_image_url: absolute(document.querySelector('#BasicCarousel img')?.getAttribute('src') || ''),
      code_label: clean(document.querySelector('.GroupNumber')?.textContent || '').replace(/^.*?([A-Z0-9]{5,})$/, '$1'),
      duration_text: basicInfo['旅遊天數'] || '',
      min_group_size_text: basicInfo['成團人數'] || '',
      airport: basicInfo['出發機場'] || '',
      airline: basicInfo['航空公司'] || '',
      price_details: priceDetails,
      tags,
      flight_segments: flightSegments,
      departures,
    };
  }, tripSummary.href, tripSummary.section_label);

  const durationMatch = sanitizeText(data.duration_text).match(/(\d+)\s*天\s*(\d+)\s*夜/);
  const duration = durationMatch ? `${durationMatch[1]}天${durationMatch[2]}夜` : sanitizeText(data.duration_text);
  const minGroupSize = parseNumber(data.min_group_size_text);
  const enrichedFlightSegments = (data.flight_segments || []).map((segment) => ({
    airline: formatAirlineLabel(segment.airline, segment.flight_number),
    flight_number: sanitizeText(segment.flight_number),
    dep_time: sanitizeText(segment.dep_time),
    dep_airport: sanitizeText(segment.dep_airport),
    arr_time: sanitizeText(segment.arr_time),
    arr_airport: sanitizeText(segment.arr_airport),
    next_day: Boolean(segment.next_day),
  }));

  const primaryAirline = formatAirlineLabel(data.airline, enrichedFlightSegments[0]?.flight_number || '');
  const tags = (data.tags || []).map(normalizeTag).filter(Boolean);
  const priceDetail = buildPriceDetailText(data.price_details || []);
  const adultPrice = normalizePriceText(data.price_details?.[0] || '');
  const priceRange = formatPriceRange(adultPrice);
  const departures = (data.departures || []).map((departure) => ({
    date: sanitizeText(departure.date),
    departure_city: getDepartureCity(departure.departure_airport || data.airport),
    airline: formatAirlineLabel(departure.airline || primaryAirline, enrichedFlightSegments[0]?.flight_number || ''),
    price: departure.price || null,
    seats_total: departure.seats_total ?? null,
    seats_available: departure.seats_available ?? null,
    label: sanitizeText(departure.label),
  }));

  const subtitle = buildSubtitle({ title: data.title, airline: primaryAirline, tags });
  const seatsTotal = departures.find((departure) => departure.seats_total)?.seats_total ?? null;
  const seatsAvailable = departures.find((departure) => departure.seats_available != null)?.seats_available ?? null;
  const customTour = departures.length === 0;

  return {
    destination_label: sanitizeText(data.destination_label || tripSummary.section_label),
    region_label: sanitizeText(data.source_section_label || tripSummary.section_label),
    source_url: tripSummary.href,
    title: sanitizeText(data.title),
    subtitle,
    duration,
    price_range: priceRange,
    cover_image_url: sanitizeText(data.cover_image_url),
    code_label: sanitizeText(data.code_label),
    min_group_size: minGroupSize,
    airport: sanitizeText(data.airport),
    airline: primaryAirline,
    tags,
    price_detail: priceDetail,
    flight_segments: enrichedFlightSegments,
    departures,
    departure_label: getDepartureLabel(data.airport),
    display_order: tripSummary.display_order,
    custom_tour: customTour,
    trip_banner: {
      code_label: sanitizeText(data.code_label),
      price_label: priceRange,
      tags,
      departure_label: getDepartureLabel(data.airport),
      duration_label: duration,
      seats_total: seatsTotal,
      seats_available: seatsAvailable,
      deposit_label: '',
      custom_tour: customTour,
      min_group_size: minGroupSize,
      airport: sanitizeText(data.airport),
      airline: primaryAirline,
      price_detail: priceDetail,
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

  const pushChange = (changeType, fieldName, oldValue, newValue) => {
    if (String(oldValue ?? '') === String(newValue ?? '')) return;
    changes.push({
      ...buildPendingChangeBase(context),
      change_type: changeType,
      field_name: fieldName,
      old_value: oldValue == null ? null : typeof oldValue === 'string' ? oldValue : stableStringify(oldValue),
      new_value: newValue == null ? null : typeof newValue === 'string' ? newValue : stableStringify(newValue),
    });
  };

  pushChange('price', 'price_range', sanitizeText(existingTrip.price_range), scrapedTrip.price_range);
  pushChange('info', 'title', sanitizeText(existingTrip.title), scrapedTrip.title);
  pushChange('info', 'subtitle', sanitizeText(existingTrip.subtitle), scrapedTrip.subtitle);
  pushChange('info', 'duration', sanitizeText(existingTrip.duration), scrapedTrip.duration);
  pushChange('info', 'display_order', existingTrip.display_order, scrapedTrip.display_order);
  pushChange('info', 'code_label', sanitizeText(existingBanner.code_label), scrapedTrip.code_label);
  pushChange('info', 'departure_label', sanitizeText(existingBanner.departure_label), scrapedTrip.departure_label);
  pushChange('info', 'duration_label', sanitizeText(existingBanner.duration_label), scrapedTrip.duration);
  pushChange('info', 'airport', sanitizeText(existingBanner.airport), scrapedTrip.airport);
  pushChange('info', 'airline', sanitizeText(existingBanner.airline), scrapedTrip.airline);
  pushChange('info', 'min_group_size', existingBanner.min_group_size, scrapedTrip.min_group_size);
  pushChange('info', 'tags', existingBanner.tags || [], scrapedTrip.tags);
  pushChange('info', 'custom_tour', Boolean(existingBanner.custom_tour), Boolean(scrapedTrip.custom_tour));
  pushChange('price_detail', 'price_detail', sanitizeText(existingBanner.price_detail), scrapedTrip.price_detail);

  const existingFlights = extractExistingFlightSegments(existingTrip);
  if (stableStringify(existingFlights) !== stableStringify(scrapedTrip.flight_segments)) {
    pushChange('flight', 'flight_segments', existingFlights, scrapedTrip.flight_segments);
  }

  const existingDepartures = buildExistingDepartureSnapshot(existingTrip);
  const scrapedDepartures = buildScrapedDepartureSnapshot(scrapedTrip);
  if (stableStringify(existingDepartures) !== stableStringify(scrapedDepartures)) {
    pushChange('departure', 'departures', existingDepartures, scrapedDepartures);
  }

  return changes;
}

async function insertPendingChanges(supabase, changes) {
  if (!changes.length) return 0;
  const { error } = await supabase.from('pending_changes').insert(changes);
  if (error) throw new Error(`寫入 pending_changes 失敗：${error.message}`);
  return changes.length;
}

async function main() {
  const { supabaseUrl, serviceRoleKey } = loadEnv();
  const { regions, logId: requestedLogId } = parseArgs(process.argv.slice(2));
  const selectedRegions = selectRegions(regions);
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const regionDetailsInitial = buildRegionDetails(selectedRegions);
  const logId = await createOrResetLog(supabase, requestedLogId, selectedRegions.length, regionDetailsInitial);

  let browser = null;

  try {
    console.log(`🚀 開始自動抓取，log_id=${logId}`);

    const [destinations, existingTrips] = await Promise.all([
      loadDestinations(supabase),
      loadExistingTrips(supabase),
    ]);

    const resolveDestination = buildDestinationResolver(destinations, existingTrips);
    const tripsByDestinationId = existingTrips.reduce((accumulator, trip) => {
      const list = accumulator.get(trip.destination_id) || [];
      list.push(trip);
      accumulator.set(trip.destination_id, list);
      return accumulator;
    }, new Map());

    const matchedTripIdsByDestination = new Map();
    let regionDetails = regionDetailsInitial;
    let totalTrips = 0;
    let completedTrips = 0;
    let completedRegions = 0;
    let changesFound = 0;

    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      protocolTimeout: 300000,
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    );

    for (const regionConfig of selectedRegions) {
      regionDetails = mergeRegionDetail(regionDetails, regionConfig.key, {
        status: 'running',
      });
      await updateLog(supabase, logId, {
        current_region: regionConfig.key,
        current_trip: '',
        region_details: regionDetails,
      });

      const sections = await scrapeRegionListings(page, regionConfig);
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

        // 每筆行程用獨立 page 避免記憶體累積
        const detailPage = await browser.newPage();
        detailPage.setDefaultTimeout(60000);
        detailPage.setDefaultNavigationTimeout(60000);
        await detailPage.setUserAgent(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        );

        let scrapedTrip;
        try {
          scrapedTrip = await scrapeTripDetail(detailPage, tripSummary);
        } catch (detailErr) {
          console.log(`  ⚠️ 抓取失敗，跳過：${tripSummary.title} (${detailErr.message})`);
          await detailPage.close().catch(() => {});
          completedTrips += 1;
          continue;
        }
        await detailPage.close().catch(() => {});

        const destination = resolveDestination(scrapedTrip.destination_label) || resolveDestination(tripSummary.section_label);
        if (!destination) {
          throw new Error(`找不到 destination 對應：${scrapedTrip.destination_label || tripSummary.section_label}`);
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

      for (const [destinationId, destinationTrips] of tripsByDestinationId.entries()) {
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
    if (browser) {
      await browser.close();
      browser = null;
    }

    await updateLog(supabase, logId, {
      status: 'failed',
      error_message: message,
      finished_at: new Date().toISOString(),
    });

    console.error('\n❌ 自動抓取失敗');
    console.error(message);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
