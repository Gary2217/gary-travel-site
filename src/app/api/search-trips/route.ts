import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Missing server configuration.' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const city = searchParams.get('city');

    if (!date) {
      return NextResponse.json({ error: '請選擇出發日期' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        fetch: (url: RequestInfo | URL, options?: RequestInit) =>
          fetch(url, { ...options, cache: 'no-store' }),
      },
    });

    // 找出該日期有出發的梯次
    let dateQuery = supabase
      .from('trip_departure_dates')
      .select('trip_id')
      .eq('departure_date', date)
      .eq('is_active', true);

    if (city) {
      dateQuery = dateQuery.or(`departure_city.ilike.%${city}%,outbound_from.ilike.%${city}%`);
    }

    const { data: dateRows, error: dateError } = await dateQuery;

    if (dateError) {
      return NextResponse.json({ error: '查詢失敗' }, { status: 500 });
    }

    const tripIds = [...new Set((dateRows || []).map((r: any) => r.trip_id))];

    if (tripIds.length === 0) {
      return NextResponse.json([]);
    }

    // 取得對應行程（含所有梯次）
    const { data: trips, error: tripError } = await supabase
      .from('trips')
      .select('*, trip_departure_dates(*), destinations(title)')
      .in('id', tripIds)
      .eq('is_active', true);

    if (tripError) {
      return NextResponse.json({ error: '查詢失敗' }, { status: 500 });
    }

    const result = (trips || []).map((trip: any) => {
      const { trip_departure_dates: rawDates, ...tripData } = trip;
      return {
        ...tripData,
        document_is_available: Boolean(trip.document_url),
        departure_dates: (rawDates || [])
          .filter((d: any) => d.is_active)
          .sort((a: any, b: any) => (a.departure_date || '').localeCompare(b.departure_date || '')),
      };
    });

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
