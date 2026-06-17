import { NextRequest, NextResponse } from 'next/server';
import { requireDevAuth } from '@/lib/api-auth';
import { createAnonClientNoCache, createServiceClient, hasServiceRoleConfig, hasSupabaseConfig } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!hasSupabaseConfig()) {
      return NextResponse.json({ error: '伺服器設定缺失' }, { status: 500 });
    }

    const supabase = createAnonClientNoCache();
    const { data, error } = await supabase
      .from('flight_routes')
      .select('*')
      .eq('id', params.id)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: '找不到此航線' }, { status: 404 });
    }

    // 取得航班出發日期
    const { data: departures } = await supabase
      .from('flight_departure_dates')
      .select('*')
      .eq('flight_route_id', params.id)
      .eq('is_active', true)
      .order('departure_date', { ascending: true });

    data.flight_departure_dates = departures || [];

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = requireDevAuth();
  if (authError) return authError;

  try {
    if (!hasServiceRoleConfig()) {
      return NextResponse.json({ error: '伺服器設定缺失' }, { status: 500 });
    }

    const body = await request.json();
    const allowedFields = [
      'region', 'from_city', 'to_city', 'airlines',
      'duration', 'price_range', 'image_url', 'direct',
      'display_order', 'is_active', 'metadata',
    ];
    const updates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) updates[field] = body[field];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: '沒有可更新的欄位' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('flight_routes')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authErr = requireDevAuth();
  if (authErr) return authErr;

  try {
    if (!hasServiceRoleConfig()) {
      return NextResponse.json({ error: '伺服器設定缺失' }, { status: 500 });
    }

    const supabase = createServiceClient();

    const { error } = await supabase
      .from('flight_routes')
      .delete()
      .eq('id', params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
