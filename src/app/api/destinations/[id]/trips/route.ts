import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Missing server configuration.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        fetch: (url: RequestInfo | URL, options?: RequestInit) =>
          fetch(url, { ...options, cache: 'no-store' }),
      },
    });

    const today = new Date().toISOString().slice(0, 10);

    const showHidden = _request.nextUrl.searchParams.get('hidden') === '1';

    const { data, error } = await supabase
      .from('trips')
      .select('*, trip_departure_dates(*)')
      .eq('destination_id', params.id)
      .eq('is_active', showHidden ? false : true)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('destination trips query error:', error.message);
      return NextResponse.json({ error: '載入失敗' }, { status: 500 });
    }

    const trips = (data || []).map((trip: any) => {
      const { trip_departure_dates: rawDates, ...tripData } = trip;
      return {
        ...tripData,
        document_is_available: Boolean(trip.document_url),
        departure_dates: (rawDates || [])
          .filter((d: any) => d.is_active && (!d.departure_date || d.departure_date >= today))
          .sort((a: any, b: any) => (a.departure_date || '').localeCompare(b.departure_date || '')),
      };
    });

    // 有出團日期的排前面，沒有的排後面；同組內維持 display_order
    trips.sort((a: any, b: any) => {
      const aHasDates = a.departure_dates && a.departure_dates.length > 0 ? 0 : 1;
      const bHasDates = b.departure_dates && b.departure_dates.length > 0 ? 0 : 1;
      if (aHasDates !== bHasDates) return aHasDates - bHasDates;
      return (a.display_order || 99) - (b.display_order || 99);
    });

    return NextResponse.json(trips, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
