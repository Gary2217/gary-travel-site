import { NextRequest, NextResponse } from 'next/server';
import { requireDevAuth } from '@/lib/api-auth';
import { createServiceClient, hasServiceRoleConfig } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function createSupabase() {
  return createServiceClient();
}

// POST: 新增航班出發日期（需登入）
export async function POST(
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
    const { departure_date, airline, price, seats_total, seats_available, label, transfer_type, flight_segments } = body;

    if (!departure_date) {
      return NextResponse.json({ error: '請選擇出發日期' }, { status: 400 });
    }

    const supabase = createSupabase();

    const { data, error } = await supabase
      .from('flight_departure_dates')
      .insert({
        flight_route_id: params.id,
        departure_date,
        airline: airline || null,
        price: price || null,
        seats_total: seats_total || 0,
        seats_available: seats_available ?? seats_total ?? 0,
        label: label || null,
        transfer_type: transfer_type || null,
        flight_segments: flight_segments ?? null,
      })
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

// PATCH: 更新航班出發日期（需登入）
export async function PATCH(request: NextRequest) {
  const authError = requireDevAuth();
  if (authError) return authError;

  try {
    if (!hasServiceRoleConfig()) {
      return NextResponse.json({ error: '伺服器設定缺失' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const dateId = searchParams.get('dateId');

    if (!dateId) {
      return NextResponse.json({ error: '缺少 dateId' }, { status: 400 });
    }

    const body = await request.json();
    const allowedFields = ['departure_date', 'airline', 'price', 'seats_total', 'seats_available', 'label', 'transfer_type', 'is_active', 'flight_segments'];
    const updates: Record<string, any> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: '沒有可更新的欄位' }, { status: 400 });
    }

    const supabase = createSupabase();

    const { data, error } = await supabase
      .from('flight_departure_dates')
      .update(updates)
      .eq('id', dateId)
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

// DELETE: 刪除航班出發日期（需登入）
export async function DELETE(request: NextRequest) {
  const authError = requireDevAuth();
  if (authError) return authError;

  try {
    if (!hasServiceRoleConfig()) {
      return NextResponse.json({ error: '伺服器設定缺失' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const dateId = searchParams.get('dateId');

    if (!dateId) {
      return NextResponse.json({ error: '缺少 dateId' }, { status: 400 });
    }

    const supabase = createSupabase();

    const { error } = await supabase
      .from('flight_departure_dates')
      .delete()
      .eq('id', dateId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
