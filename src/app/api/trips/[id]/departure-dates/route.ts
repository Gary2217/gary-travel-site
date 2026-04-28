import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function createSupabase() {
  return createClient(supabaseUrl, supabaseServiceRoleKey);
}

// POST: 新增出團梯次
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ error: 'Missing server configuration.' }, { status: 500 });
    }

    const body = await request.json();
    const { departure_date, departure_city, airline, price, label,
      outbound_flight, outbound_time, outbound_from, outbound_arrival_time, outbound_to, outbound_next_day,
      return_date, return_flight, return_time, return_from, return_arrival_time, return_to, return_next_day,
    } = body;

    if (!departure_date) {
      return NextResponse.json({ error: '請選擇出發日期' }, { status: 400 });
    }

    const supabase = createSupabase();

    const { data, error } = await supabase
      .from('trip_departure_dates')
      .insert({
        trip_id: params.id,
        departure_date,
        departure_city: departure_city || '桃園',
        airline: airline || null,
        price: price || null,
        label: label || null,
        outbound_flight: outbound_flight || null,
        outbound_time: outbound_time || null,
        outbound_from: outbound_from || null,
        outbound_arrival_time: outbound_arrival_time || null,
        outbound_to: outbound_to || null,
        outbound_next_day: outbound_next_day || false,
        return_date: return_date || null,
        return_flight: return_flight || null,
        return_time: return_time || null,
        return_from: return_from || null,
        return_arrival_time: return_arrival_time || null,
        return_to: return_to || null,
        return_next_day: return_next_day || false,
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

// PATCH: 更新出團梯次
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
    const allowedFields = [
      'departure_date', 'departure_city', 'airline', 'price', 'label', 'is_active',
      'outbound_flight', 'outbound_time', 'outbound_from', 'outbound_arrival_time', 'outbound_to', 'outbound_next_day',
      'return_date', 'return_flight', 'return_time', 'return_from', 'return_arrival_time', 'return_to', 'return_next_day',
    ];
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
      .from('trip_departure_dates')
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

// DELETE: 刪除出團梯次
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
      .from('trip_departure_dates')
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
