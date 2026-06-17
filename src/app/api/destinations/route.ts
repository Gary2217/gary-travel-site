import { NextRequest, NextResponse } from 'next/server';
import { API_ERRORS, apiError } from '@/lib/api-error';
import { requireDevAuth } from '@/lib/api-auth';
import { createAnonClient, createServiceClient, hasServiceRoleConfig } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createAnonClient();
    const { data, error } = await supabase
      .from('destinations')
      .select('id, title, subtitle, image_url, display_order, sub_region, region_id, source_url, regions(title, category_label)')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    if (error) return API_ERRORS.dbError(error);
    return NextResponse.json(data || [], { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } });
  } catch (err) {
    return API_ERRORS.internal(err);
  }
}

export async function POST(request: NextRequest) {
  const authError = requireDevAuth();
  if (authError) return authError;

  try {
    if (!hasServiceRoleConfig()) {
      return API_ERRORS.missingConfig();
    }

    const body = await request.json();
    const regionId = String(body.region_id || '').trim();
    const title = String(body.title || '').trim();
    const subtitle = String(body.subtitle || '').trim();
    const subRegion = String(body.sub_region || '').trim();

    if (!regionId || !title) {
      return apiError('缺少 region_id 或 title', 400);
    }

    const supabase = createServiceClient();

    const { data: existing } = await supabase
      .from('destinations')
      .select('display_order')
      .eq('region_id', regionId)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = (existing?.[0]?.display_order || 0) + 1;

    const { data, error } = await supabase
      .from('destinations')
      .insert({
        region_id: regionId,
        title,
        subtitle,
        sub_region: subRegion,
        image_url: '',
        display_order: nextOrder,
        is_active: true,
        click_count: 0,
        source_url: typeof body.source_url === 'string' ? body.source_url.trim() : null,
      })
      .select('id, region_id, title, subtitle, image_url, display_order, sub_region, source_url')
      .single();

    if (error) {
      return API_ERRORS.dbError(error);
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return API_ERRORS.internal(err);
  }
}
