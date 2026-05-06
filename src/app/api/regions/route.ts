import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET() {
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

    const { data: regionsData, error: regionsError } = await supabase
      .from('regions')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (regionsError) {
      console.error('regions query error:', regionsError.message);
      return NextResponse.json({ error: '載入失敗' }, { status: 500 });
    }

    const regionIds = (regionsData || []).map((region: any) => region.id);

    let destinationsByRegion = new Map<string, any[]>();

    if (regionIds.length > 0) {
      const { data: destinationsData, error: destinationsError } = await supabase
        .from('destinations')
        .select('*')
        .in('region_id', regionIds)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (destinationsError) {
        console.error('destinations query error:', destinationsError.message);
        return NextResponse.json({ error: '載入失敗' }, { status: 500 });
      }

      destinationsByRegion = (destinationsData || []).reduce((map: Map<string, any[]>, destination: any) => {
        const existing = map.get(destination.region_id) || [];
        existing.push(destination);
        map.set(destination.region_id, existing);
        return map;
      }, new Map<string, any[]>());
    }

    const regions = (regionsData || []).map((region: any) => ({
      ...region,
      destinations: destinationsByRegion.get(region.id) || [],
    }));

    return NextResponse.json(regions, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
