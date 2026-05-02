import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  noStore();
  try {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ error: 'Missing server configuration.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      global: {
        fetch: (url: RequestInfo | URL, options?: RequestInit) =>
          fetch(url, { ...options, cache: 'no-store' }),
      },
    });

    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('destination_id', params.id)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const trips = (data || []).map((trip: any) => ({
      ...trip,
      document_is_available: Boolean(trip.document_url),
    }));

    if (trips.length === 0) {
      return NextResponse.json([], {
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
      });
    }

    const tripIds = trips.map((trip: { id: string }) => trip.id);
    const { data: departureDates } = await supabase
      .from('trip_departure_dates')
      .select('*')
      .in('trip_id', tripIds)
      .order('departure_date', { ascending: true });

    const departureDatesMap = new Map<string, any[]>();

    (departureDates || []).forEach((date: any) => {
      const existing = departureDatesMap.get(date.trip_id) || [];
      existing.push(date);
      departureDatesMap.set(date.trip_id, existing);
    });

    const tripsWithDepartureDates = trips.map((trip: any) => ({
      ...trip,
      departure_dates: departureDatesMap.get(trip.id) || [],
    }));

    return NextResponse.json(tripsWithDepartureDates, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
