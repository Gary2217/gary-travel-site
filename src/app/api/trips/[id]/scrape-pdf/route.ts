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

// 解析單一航班行
function parseFlightLine(line: string): PdfFlightSegment | null {
  const trimmed = line.trim();
  if (!/^第[一二三四五六七八九十百千\d]+天/.test(trimmed)) return null;

  const tokens = trimmed.split(/\s+/);
  const day = tokens[0];

  const flightNumPattern = /^[A-Z]{1,3}-?\d{3,4}[A-Z]?$/;
  const flightNumIdx = tokens.findIndex(t => flightNumPattern.test(t));
  if (flightNumIdx === -1) return null;

  const flightNumber = tokens[flightNumIdx];

  const timePattern = /^(\d{1,2}:\d{2})(\+1)?$/;
  const afterFlight = tokens.slice(flightNumIdx + 1);
  const times = afterFlight
    .map(t => t.match(timePattern))
    .filter((m): m is RegExpMatchArray => m !== null);

  if (times.length < 2) return null;

  const depTime = times[0][1];
  const arrRaw = times[1][0];
  const arrTime = times[1][1];
  const isNextDay = arrRaw.includes('+1');

  const fromCity = tokens[1] ?? '';
  const toCity = tokens[2] ?? '';
  const airline = tokens.slice(3, flightNumIdx).join('');

  return {
    day,
    from_city: fromCity,
    to_city: toCity,
    airline,
    flight_number: flightNumber,
    departure_time: depTime,
    arrival_time: arrTime,
    is_next_day: isNextDay,
  };
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

  const flightSegments: PdfFlightSegment[] = [];
  for (const line of lines) {
    const seg = parseFlightLine(line);
    if (seg) flightSegments.push(seg);
  }

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

  return {
    title,
    duration,
    airline,
    airport,
    departure_label,
    min_group_size,
    flight_segments: flightSegments,
    hotels,
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
