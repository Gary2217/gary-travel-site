import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET() {
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
      .select('*, destinations!destinations_region_id_fkey(*)')
      .eq('is_active', true)
      .eq('destinations.is_active', true)
      .order('display_order', { ascending: true });

    if (regionsError) {
      console.error('regions query error:', regionsError.message);
      return NextResponse.json({ error: '載入失敗' }, { status: 500 });
    }

    const regions = (regionsData || [])
      .map((region: any) => ({
        ...region,
        destinations: (region.destinations || []).sort((a: any, b: any) => a.display_order - b.display_order),
      }))
      .filter((region: any) => region.destinations.length > 0);

    return NextResponse.json(regions, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
