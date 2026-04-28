import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function createSupabase() {
  return createClient(supabaseUrl, supabaseServiceRoleKey);
}

// POST: 新增航班出發日期
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ error: 'Missing server configuration.' }, { status: 500 });
    }

    const body = await request.json();
    const { departure_date, airline, price, seats_total, seats_available, label } = body;

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

// PATCH: 更新航班出發日期
export async function PATCH(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ error: 'Missing server configuration.' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const dateId = searchParams.get('dateId');

    if (!dateId) {
      return NextResponse.json({ error: '缺少 dateId' }, { status: 400 });
    }

    const body = await request.json();
    const allowedFields = ['departure_date', 'airline', 'price', 'seats_total', 'seats_available', 'label', 'is_active'];
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

// DELETE: 刪除航班出發日期
export async function DELETE(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ error: 'Missing server configuration.' }, { status: 500 });
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
