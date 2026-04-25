import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET() {
  try {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ error: 'Missing server configuration.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: regionsData, error: regionsError } = await supabase
      .from('regions')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (regionsError) {
      return NextResponse.json({ error: regionsError.message }, { status: 500 });
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
        return NextResponse.json({ error: destinationsError.message }, { status: 500 });
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
