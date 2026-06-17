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
  } catch (err) {
    return API_ERRORS.internal(err);
  }
}
