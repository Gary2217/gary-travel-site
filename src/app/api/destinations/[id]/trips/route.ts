import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  noStore();
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

    const { data, error } = await supabase
      .from('trips')
      .select('*, trip_departure_dates(*)')
      .eq('destination_id', params.id)
      .eq('is_active', true)
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
          .filter((d: any) => d.is_active && d.departure_date >= today)
          .sort((a: any, b: any) => a.departure_date.localeCompare(b.departure_date)),
      };
    });

    return NextResponse.json(trips, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
