import { NextRequest, NextResponse } from 'next/server';
import { requireDevAuth } from '@/lib/api-auth';
import { createServiceClient, hasServiceRoleConfig } from '@/lib/supabase-server';
import { extractText } from 'unpdf';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface PdfFlightSegment {
  day: string;
  from_city: string;
  to_city: string;
  airline: string;
  flight_number: string;
  departure_time: string;
  arrival_time: string;
  is_next_day: boolean;
}

interface FlightMatchCandidate {
  index: number;
  segment: PdfFlightSegment;
}

const AIRLINE_ALIASES = [
  '酷航',
  '星宇',
  '長榮',
  '華航',
  '國泰',
  '虎航',
  '樂桃',
  '酷鳥',
  '宿霧',
  '亞航',
] as const;

const AIRLINE_PATTERN = String.raw`(?:[\u4E00-\u9FFF]{2,10}航空|${AIRLINE_ALIASES.join('|')})`;
const CITY_PATTERN = String.raw`[\u4E00-\u9FFF]{2,12}(?:國際機場|機場)?(?:\s*[（(][A-Z]{3}[)）]|\s+[A-Z]{3})?`;
const FLIGHT_NUMBER_PATTERN = String.raw`(?:[A-Z]{1,2}\d?|[A-Z]{3})\s*-?\s*\d{3,4}[A-Z]?`;
const TIME_PATTERN = String.raw`\d{1,2}:\d{2}`;

function normalizeFlightText(rawText: string): string {
  return rawText
    .replace(/：/g, ':')
    .replace(/﹕/g, ':')
    .replace(/＋/g, '+')
    .replace(/[‐‑‒–—－]/g, '-')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeTime(value: string): string {
  const [hours, minutes] = value.split(':');
  return `${hours.padStart(2, '0')}:${minutes}`;
}

function normalizeFlightNumber(value: string): string {
  return value
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, '')
    .trim();
}

function cleanCity(value: string): string {
  return value
    .replace(/\s*[（(][A-Z]{3}[)）]\s*$/u, '')
    .replace(/\s+[A-Z]{3}\s*$/u, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildFlightSegment(groups: RegExpExecArray['groups']): PdfFlightSegment | null {
  const day = groups?.day?.trim();
  const fromCity = groups?.from?.trim();
  const toCity = groups?.to?.trim();
  const airline = groups?.airline?.trim();
  const flightNumber = groups?.flight?.trim();
  const departureTime = groups?.dep?.trim();
  const arrivalTime = groups?.arr?.trim();

  if (!day || !fromCity || !toCity || !airline || !flightNumber || !departureTime || !arrivalTime) {
    return null;
  }

  return {
    day,
    from_city: cleanCity(fromCity),
    to_city: cleanCity(toCity),
    airline,
    flight_number: normalizeFlightNumber(flightNumber),
    departure_time: normalizeTime(departureTime),
    arrival_time: normalizeTime(arrivalTime),
    is_next_day: Boolean(groups?.next),
  };
}

function collectFlightMatches(
  text: string,
  pattern: RegExp,
  matches: FlightMatchCandidate[],
) {
  pattern.lastIndex = 0;

  let match = pattern.exec(text);
  while (match !== null) {
    const segment = buildFlightSegment(match.groups);
    if (segment) {
      matches.push({
        index: match.index,
        segment,
      });
    }

    match = pattern.exec(text);
  }
}

function parseFlightsFromText(rawText: string): PdfFlightSegment[] {
  const text = normalizeFlightText(rawText);
  if (!text) return [];

  const patterns = [
    new RegExp(
      String.raw`(?<day>第[一二三四五六七八九十百千\d]+天|\d{1,2}/\d{1,2})\s*(?<from>${CITY_PATTERN})\s+(?<to>${CITY_PATTERN})\s+(?<airline>${AIRLINE_PATTERN})\s+(?<flight>${FLIGHT_NUMBER_PATTERN})\s+(?<dep>${TIME_PATTERN})\s+(?<arr>${TIME_PATTERN})(?<next>\+1)?(?:\s+${TIME_PATTERN})?`,
      'g',
    ),
    new RegExp(
      String.raw`(?<day>去程|回程)\s+(?<airline>${AIRLINE_PATTERN})\s+(?<flight>${FLIGHT_NUMBER_PATTERN})\s+(?<from>${CITY_PATTERN})\s+(?<to>${CITY_PATTERN})\s+(?<dep>${TIME_PATTERN})\s+(?<arr>${TIME_PATTERN})(?<next>\+1)?`,
      'g',
    ),
    new RegExp(
      String.raw`(?<day>D\d{1,2})\s+(?<airline>${AIRLINE_PATTERN})\s+(?<flight>${FLIGHT_NUMBER_PATTERN})\s+(?<from>${CITY_PATTERN})\s+(?<dep>${TIME_PATTERN})\s+(?<to>${CITY_PATTERN})\s+(?<arr>${TIME_PATTERN})(?<next>\+1)?`,
      'g',
    ),
  ];

  const matches: FlightMatchCandidate[] = [];
  for (const pattern of patterns) {
    collectFlightMatches(text, pattern, matches);
  }

  matches.sort((a, b) => a.index - b.index);

  const uniqueSegments: PdfFlightSegment[] = [];
  const seen = new Set<string>();

  for (const match of matches) {
    const key = [
      match.segment.day,
      match.segment.from_city,
      match.segment.to_city,
      match.segment.airline,
      match.segment.flight_number,
      match.segment.departure_time,
      match.segment.arrival_time,
      match.segment.is_next_day ? '1' : '0',
    ].join('|');

    if (seen.has(key)) continue;
    seen.add(key);
    uniqueSegments.push(match.segment);
  }

  return uniqueSegments;
}

// 解析 PDF 文字，回傳結構化資料
function parsePdfText(text: string): {
  title: string;
  duration: string | null;
  airline: string | null;
  airport: string | null;
  departure_label: string | null;
  min_group_size: number | null;
  flight_segments: PdfFlightSegment[];
  hotels: string[];
  highlights: string[];
  raw_text: string;
} {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  const title = lines[0] ?? '';

  let duration: string | null = null;
  const dayNightMatch = text.match(/(\d+)\s*天\s*(\d+)\s*夜/);
  if (dayNightMatch) {
    duration = `${dayNightMatch[1]}天${dayNightMatch[2]}夜`;
  } else {
    const dayFromText = (title + ' ' + text).match(/(\d+)\s*[日天]/);
    if (dayFromText) {
      const days = parseInt(dayFromText[1], 10);
      duration = `${days}天${days - 1}夜`;
    } else {
      const dMatches = [...text.matchAll(/\bD(\d+)\b/g)];
      if (dMatches.length > 0) {
        const maxDay = Math.max(...dMatches.map(m => parseInt(m[1], 10)));
        if (maxDay > 0) duration = `${maxDay}天${maxDay - 1}夜`;
      }
    }
  }

  const flightSegments = parseFlightsFromText(text);

  const airport = flightSegments.length > 0 ? flightSegments[0].from_city : null;

  let departure_label: string | null = null;
  if (airport) {
    if (airport.includes('高雄') || airport.includes('小港')) {
      departure_label = '高雄出發';
    } else if (airport.includes('桃園')) {
      departure_label = '桃園出發';
    } else if (airport.includes('台北') || airport.includes('臺北') || airport.includes('松山')) {
      departure_label = '台北出發';
    }
  }

  let airline: string | null = null;
  if (flightSegments.length > 0) {
    const counts = new Map<string, number>();
    for (const seg of flightSegments) {
      if (seg.airline) counts.set(seg.airline, (counts.get(seg.airline) ?? 0) + 1);
    }
    let maxCount = 0;
    for (const [a, count] of counts) {
      if (count > maxCount) { maxCount = count; airline = a; }
    }
  }

  let min_group_size: number | null = null;
  const groupMatch = text.match(/最低出團人數.*?(\d+)\s*人/) ?? text.match(/(\d+)\s*人以上/);
  if (groupMatch) {
    min_group_size = parseInt(groupMatch[1], 10);
  }

  const hotels: string[] = [];
  const hotelRegex = /住宿[：:﹕]\s*(.+?)(?:\n|$)/g;
  let hotelMatch = hotelRegex.exec(text);
  while (hotelMatch !== null) {
    const hotel = hotelMatch[1].trim();
    if (hotel) hotels.push(hotel);
    hotelMatch = hotelRegex.exec(text);
  }

  // 亮點標籤（highlights）：抓「★/☆/◆/■」開頭的行，或「行程特色/必玩/必訪/精選」區塊的條列
  const highlights: string[] = [];
  const seenHl = new Set<string>();
  for (const line of lines) {
    // 星號/符號開頭的亮點行
    const starMatch = line.match(/^[★☆◆■◎●・･]+\s*(.+)$/);
    if (starMatch) {
      // 取符號後、第一個標點或「～」前的短語當標籤（避免整段長文）
      const raw = starMatch[1].trim();
      const label = raw.split(/[，,。.、！!？?：:；;～~（(]/)[0].trim();
      if (label && label.length >= 2 && label.length <= 20 && !seenHl.has(label)) {
        seenHl.add(label);
        highlights.push(label);
      }
    }
    if (highlights.length >= 8) break; // 最多 8 個亮點標籤
  }

  return {
    title,
    duration,
    airline,
    airport,
    departure_label,
    min_group_size,
    flight_segments: flightSegments,
    hotels,
    highlights,
    raw_text: text.slice(0, 2000),
  };
}

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authError = requireDevAuth();
    if (authError) return authError;

    if (!hasServiceRoleConfig()) {
      return NextResponse.json({ error: '伺服器設定缺失' }, { status: 500 });
    }

    const supabase = createServiceClient();

    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id, document_url, document_text')
      .eq('id', params.id)
      .single();

    if (tripError || !trip) {
      return NextResponse.json({ error: '找不到行程' }, { status: 404 });
    }

    if (!trip.document_url) {
      return NextResponse.json({ error: '此行程沒有 PDF 檔案' }, { status: 400 });
    }

    let documentText: string = (trip.document_text as string | null) ?? '';

    // 若無快取文字，用 unpdf 提取（專為 serverless 設計，無需 worker/DOMMatrix）
    if (!documentText) {
      const pdfRes = await fetch(trip.document_url as string);
      if (!pdfRes.ok) {
        return NextResponse.json({ error: 'PDF 下載失敗' }, { status: 502 });
      }

      const pdfBuffer = new Uint8Array(await pdfRes.arrayBuffer());
      const result = await extractText(pdfBuffer);
      documentText = Array.isArray(result.text)
        ? result.text.join('\n')
        : (result.text ?? '');

      if (documentText) {
        await supabase
          .from('trips')
          .update({ document_text: documentText })
          .eq('id', params.id);
      }
    }

    const parsed = parsePdfText(documentText);

    return NextResponse.json(parsed, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('[scrape-pdf] error:', errMsg);
    return NextResponse.json(
      { error: `PDF 解析失敗: ${errMsg.slice(0, 200)}` },
      { status: 500 },
    );
  }
}
