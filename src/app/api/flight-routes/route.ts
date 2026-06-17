import { NextRequest, NextResponse } from 'next/server';
import { API_ERRORS, apiError } from '@/lib/api-error';
import { requireDevAuth } from '@/lib/api-auth';
import { createAnonClientNoCache, createServiceClient, hasServiceRoleConfig, hasSupabaseConfig } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!hasSupabaseConfig()) {
      return API_ERRORS.missingConfig();
    }

    const supabase = createAnonClientNoCache();

    const { data, error } = await supabase
      .from('flight_routes')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('flight-routes query error:', error.message);
      return apiError('載入失敗', 500, error);
    }

    return NextResponse.json(data ?? [], {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (err) {
    return apiError('載入失敗', 500, err);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!hasServiceRoleConfig()) {
      return API_ERRORS.missingConfig();
    }

    const authError = requireDevAuth();
    if (authError) return authError;

    const body = await request.json();
    const { region, from_city, to_city, airlines, duration, price_range, image_url, direct, metadata } = body;

    if (!region || !to_city || !airlines || !duration || !price_range) {
      return apiError('缺少必填欄位', 400);
    }

    const supabase = createServiceClient();

    const { data: maxOrderData } = await supabase
      .from('flight_routes')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrder = (maxOrderData?.display_order ?? -1) + 1;

    const { data, error } = await supabase
      .from('flight_routes')
      .insert({
        region,
        from_city: from_city || '台北',
        to_city,
        airlines,
        duration,
        price_range,
        image_url: image_url || '',
        direct: direct ?? true,
        display_order: nextOrder,
        is_active: true,
        metadata: metadata ?? {},
      })
      .select()
      .single();

    if (error) {
      return API_ERRORS.dbError(error);
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return API_ERRORS.internal(err);
  }
}
