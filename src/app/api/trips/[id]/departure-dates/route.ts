import { NextRequest, NextResponse } from 'next/server';
import { requireDevAuth } from '@/lib/api-auth';
import { createServiceClient, hasServiceRoleConfig } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function createSupabase() {
  return createServiceClient();
}

// POST: 新增出團梯次
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
    const { departure_date, departure_city, airline, price, label, seats_total, seats_available,
      outbound_flight, outbound_time, outbound_from, outbound_arrival_time, outbound_to, outbound_next_day,
      return_date, return_flight, return_time, return_from, return_arrival_time, return_to, return_next_day,
      flight_segments,
    } = body;

    // 修正 & 驗證 departure_date 格式
    let validatedDate = departure_date;
    if (validatedDate) {
      // 自動修正年份超過4位的情況（如 20206-12-06 → 2026-12-06）
      validatedDate = validatedDate.replace(/^(\d{4})\d+(-\d{2}-\d{2})$/, '$1$2');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(validatedDate) || isNaN(Date.parse(validatedDate))) {
        return NextResponse.json({ error: `無效日期格式: ${departure_date}` }, { status: 400 });
      }
    }

    const supabase = createSupabase();

    const { data, error } = await supabase
      .from('trip_departure_dates')
      .insert({
        trip_id: params.id,
        departure_date: validatedDate || null,
        departure_city: departure_city || '桃園',
        airline: airline || null,
        price: price || null,
        label: label || null,
        seats_total: typeof seats_total === 'number' ? seats_total : 0,
        seats_available: typeof seats_available === 'number' ? seats_available : 0,
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

// PATCH: 更新出團梯次
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
    const allowedFields = [
      'departure_date', 'departure_city', 'airline', 'price', 'label', 'is_active', 'seats_total', 'seats_available',
      'outbound_flight', 'outbound_time', 'outbound_from', 'outbound_arrival_time', 'outbound_to', 'outbound_next_day',
      'return_date', 'return_flight', 'return_time', 'return_from', 'return_arrival_time', 'return_to', 'return_next_day',
      'flight_segments',
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

    // 修正 & 驗證 departure_date 格式
    if (updates.departure_date) {
      const raw = updates.departure_date as string;
      updates.departure_date = raw.replace(/^(\d{4})\d+(-\d{2}-\d{2})$/, '$1$2');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(updates.departure_date as string) || isNaN(Date.parse(updates.departure_date as string))) {
        return NextResponse.json({ error: `無效日期格式: ${raw}` }, { status: 400 });
      }
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
