import { NextRequest, NextResponse } from 'next/server';
import { API_ERRORS, apiError } from '@/lib/api-error';
import { createAnonClientNoCache, hasSupabaseConfig } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    if (!hasSupabaseConfig()) {
      return API_ERRORS.missingConfig();
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const city = searchParams.get('city');

    if (!date) {
      return apiError('請選擇出發日期', 400);
    }

    const supabase = createAnonClientNoCache();

    // 找出該日期有出發的梯次
    let dateQuery = supabase
      .from('trip_departure_dates')
      .select('trip_id')
      .eq('departure_date', date)
      .eq('is_active', true);

    if (city) {
      // 過濾 PostgREST 特殊字元，防止 filter injection
      const safeCity = city.replace(/[(),."\\]/g, '');
      dateQuery = dateQuery.or(`departure_city.ilike.%${safeCity}%,outbound_from.ilike.%${safeCity}%`);
    }

    const { data: dateRows, error: dateError } = await dateQuery;

    if (dateError) {
      return apiError('查詢失敗', 500, dateError);
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
      return apiError('查詢失敗', 500, tripError);
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
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    });
  } catch (err) {
    return API_ERRORS.internal(err);
  }
}
