import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function mergeDepartureDates(trips: any[], today: string): any[] {
  return trips.map((trip: any) => {
    const { trip_departure_dates: rawDates, ...tripData } = trip;
    return {
      ...tripData,
      document_is_available: Boolean(trip.document_url),
      departure_dates: (rawDates || [])
        .filter((d: any) => d.is_active && d.departure_date >= today)
        .sort((a: any, b: any) => a.departure_date.localeCompare(b.departure_date)),
    };
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  noStore();
  try {
    const { searchParams } = new URL(request.url);
    const categoryLabel = searchParams.get('category_label') || '';
    const excludeDestinationId = searchParams.get('exclude_destination_id') || '';
    const today = new Date().toISOString().slice(0, 10);

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        fetch: (url: RequestInfo | URL, options?: RequestInit) =>
          fetch(url, { ...options, cache: 'no-store' }),
      },
    });

    // Round 1：regionDests 與 categoryRegions 互不依賴，並行執行
    let regionDestsQuery = supabase
      .from('destinations')
      .select('id')
      .eq('region_id', params.id)
      .eq('is_active', true);
    if (excludeDestinationId) {
      regionDestsQuery = regionDestsQuery.neq('id', excludeDestinationId);
    }

    const [regionDestsResult, categoryRegionsResult] = await Promise.all([
      regionDestsQuery,
      categoryLabel
        ? supabase.from('regions').select('id').eq('category_label', categoryLabel).eq('is_active', true)
        : Promise.resolve({ data: [] as any[], error: null }),
    ]);

    const regionDestIds = (regionDestsResult.data || []).map((d: any) => d.id);
    const categoryRegionIds = (categoryRegionsResult.data || []).map((r: any) => r.id);

    // Round 2：regionTrips（含出發日期）與 categoryDests 互不依賴，並行執行
    const [rTripsResult, categoryDestsResult] = await Promise.all([
      regionDestIds.length > 0
        ? supabase
            .from('trips')
            .select('*, trip_departure_dates(*), destinations(id, title, sub_region)')
            .in('destination_id', regionDestIds)
            .eq('is_active', true)
            .order('display_order', { ascending: true })
        : Promise.resolve({ data: [] as any[], error: null }),
      categoryRegionIds.length > 0
        ? supabase.from('destinations').select('id').in('region_id', categoryRegionIds).eq('is_active', true)
        : Promise.resolve({ data: [] as any[], error: null }),
    ]);

    const regionTrips = mergeDepartureDates(rTripsResult.data || [], today);
    const categoryDestIds = (categoryDestsResult.data || []).map((d: any) => d.id);

    // Round 3：categoryTrips（含出發日期），依賴 categoryDestIds
    let categoryTrips: any[] = [];
    if (categoryDestIds.length > 0) {
      const { data: cTrips } = await supabase
        .from('trips')
        .select('*, trip_departure_dates(*), destinations(id, title, sub_region, regions(id, title))')
        .in('destination_id', categoryDestIds)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      categoryTrips = mergeDepartureDates(cTrips || [], today);
    }

    return NextResponse.json({ regionTrips, categoryTrips }, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
