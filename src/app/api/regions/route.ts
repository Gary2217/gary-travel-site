import { NextResponse } from 'next/server';
import { API_ERRORS, apiError } from '@/lib/api-error';
import { createAnonClientNoCache, hasSupabaseConfig } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function GET() {
  try {
    if (!hasSupabaseConfig()) {
      return API_ERRORS.missingConfig();
    }

    const supabase = createAnonClientNoCache();

    const { data: regionsData, error: regionsError } = await supabase
      .from('regions')
      .select('*, destinations!destinations_region_id_fkey(*)')
      .eq('is_active', true)
      .eq('destinations.is_active', true)
      .order('display_order', { ascending: true });

    if (regionsError) {
      console.error('regions query error:', regionsError.message);
      return apiError('載入失敗', 500, regionsError);
    }

    const { data: tripsData, error: tripsError } = await supabase
      .from('trips')
      .select('destination_id, price_range')
      .eq('is_active', true);

    if (tripsError) {
      console.error('trips query error:', tripsError.message);
      return apiError('載入失敗', 500, tripsError);
    }

    const tripCountMap = (tripsData || []).reduce((acc: Record<string, number>, trip: any) => {
      if (!trip.destination_id) return acc;
      acc[trip.destination_id] = (acc[trip.destination_id] || 0) + 1;
      return acc;
    }, {});

    const minPriceMap = (tripsData || []).reduce((acc: Record<string, number | null>, trip: any) => {
      if (!trip.destination_id || !trip.price_range) return acc;

      const match = String(trip.price_range).match(/[\d,]+/);
      if (!match) return acc;

      const price = Number(match[0].replace(/,/g, ''));
      if (Number.isNaN(price)) return acc;

      const currentMin = acc[trip.destination_id];
      if (currentMin === null || currentMin === undefined || price < currentMin) {
        acc[trip.destination_id] = price;
      }

      return acc;
    }, {});

    const regions = (regionsData || [])
      .map((region: any) => ({
        ...region,
        destinations: (region.destinations || [])
          .sort((a: any, b: any) => a.display_order - b.display_order)
          .map((destination: any) => ({
            ...destination,
            trip_count: tripCountMap[destination.id] || 0,
            min_price: minPriceMap[destination.id] ?? null,
          })),
      }))
      .filter((region: any) => region.destinations.length > 0);

    return NextResponse.json(regions, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (err) {
    return API_ERRORS.internal(err);
  }
}
