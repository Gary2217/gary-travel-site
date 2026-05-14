import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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

    // 取得同 region 的其他 destination ids（排除目前目的地）
    let regionDestsQuery = supabase
      .from('destinations')
      .select('id')
      .eq('region_id', params.id)
      .eq('is_active', true);
    if (excludeDestinationId) {
      regionDestsQuery = regionDestsQuery.neq('id', excludeDestinationId);
    }
    const { data: regionDests } = await regionDestsQuery;
    const regionDestIds = (regionDests || []).map((d: any) => d.id);

    // 取得同 region 的行程（含出發日期）
    let regionTrips: any[] = [];
    if (regionDestIds.length > 0) {
      const { data: rTrips } = await supabase
        .from('trips')
        .select('*, destinations(id, title, sub_region)')
        .in('destination_id', regionDestIds)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (rTrips && rTrips.length > 0) {
        const rTripIds = rTrips.map((t: any) => t.id);
        const { data: rDates } = await supabase
          .from('trip_departure_dates')
          .select('*')
          .in('trip_id', rTripIds)
          .eq('is_active', true)
          .gte('departure_date', today)
          .order('departure_date', { ascending: true });

        const rDatesMap = new Map<string, any[]>();
        (rDates || []).forEach((d: any) => {
          const ex = rDatesMap.get(d.trip_id) || [];
          ex.push(d);
          rDatesMap.set(d.trip_id, ex);
        });

        regionTrips = rTrips.map((t: any) => ({
          ...t,
          document_is_available: Boolean(t.document_url),
          departure_dates: rDatesMap.get(t.id) || [],
        }));
      }
    }

    // 取得同 category 的所有行程
    let categoryTrips: any[] = [];
    if (categoryLabel) {
      const { data: categoryRegions } = await supabase
        .from('regions')
        .select('id')
        .eq('category_label', categoryLabel)
        .eq('is_active', true);

      const categoryRegionIds = (categoryRegions || []).map((r: any) => r.id);

      if (categoryRegionIds.length > 0) {
        const { data: categoryDests } = await supabase
          .from('destinations')
          .select('id')
          .in('region_id', categoryRegionIds)
          .eq('is_active', true);

        const categoryDestIds = (categoryDests || []).map((d: any) => d.id);

        if (categoryDestIds.length > 0) {
          const { data: cTrips } = await supabase
            .from('trips')
            .select('*, destinations(id, title, sub_region, regions(id, title))')
            .in('destination_id', categoryDestIds)
            .eq('is_active', true)
            .order('display_order', { ascending: true });

          if (cTrips && cTrips.length > 0) {
            const cTripIds = cTrips.map((t: any) => t.id);
            const { data: cDates } = await supabase
              .from('trip_departure_dates')
              .select('*')
              .in('trip_id', cTripIds)
              .eq('is_active', true)
              .gte('departure_date', today)
              .order('departure_date', { ascending: true });

            const cDatesMap = new Map<string, any[]>();
            (cDates || []).forEach((d: any) => {
              const ex = cDatesMap.get(d.trip_id) || [];
              ex.push(d);
              cDatesMap.set(d.trip_id, ex);
            });

            categoryTrips = cTrips.map((t: any) => ({
              ...t,
              document_is_available: Boolean(t.document_url),
              departure_dates: cDatesMap.get(t.id) || [],
            }));
          }
        }
      }
    }

    return NextResponse.json({ regionTrips, categoryTrips }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
