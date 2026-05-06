import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { unstable_noStore as noStore } from 'next/cache';
import { DEV_AUTH_COOKIE_NAME, verifyDevAuthCookie } from '@/lib/dev-auth';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function isDevUser(req: NextRequest) {
  const cookie = req.cookies.get(DEV_AUTH_COOKIE_NAME)?.value;
  return verifyDevAuthCookie(cookie);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  noStore();
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

    // 先查 trip + destinations（不含 trip_days，因為該表可能不存在）
    const { data, error } = await supabase
      .from('trips')
      .select('*, destinations (*)')
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('trip query error:', error.message);
      return NextResponse.json({ error: '找不到行程' }, { status: 404 });
    }

    // 嘗試查 trip_days（表可能尚未建立）
    let tripDays: any[] = [];
    try {
      const { data: daysData } = await supabase
        .from('trip_days')
        .select('*')
        .eq('trip_id', params.id)
        .order('day_number', { ascending: true });
      if (daysData) tripDays = daysData;
    } catch {
      // trip_days 表不存在，跳過
    }

    // 查詢出發日期
    let departureDates: any[] = [];
    try {
      const { data: datesData } = await supabase
        .from('trip_departure_dates')
        .select('*')
        .eq('trip_id', params.id)
        .order('departure_date', { ascending: true });
      if (datesData) departureDates = datesData;
    } catch {
      // trip_departure_dates 表不存在，跳過
    }

    const responseData = {
      ...data,
      trip_days: tripDays,
      departure_dates: departureDates,
      document_is_available: Boolean(data.document_url),
    };

    return NextResponse.json(responseData, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH: 更新行程欄位（天數、標題等）
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isDevUser(request)) {
    return NextResponse.json({ error: '未授權' }, { status: 401 });
  }
  try {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ error: 'Missing server configuration.' }, { status: 500 });
    }

    const body = await request.json();
    const allowedFields = ['title', 'subtitle', 'duration', 'price_range', 'highlights', 'trip_banner', 'is_active', 'document_text'];
    const updates: Record<string, any> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: '沒有可更新的欄位' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data, error } = await supabase
      .from('trips')
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

// DELETE: 刪除行程
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isDevUser(request)) {
    return NextResponse.json({ error: '未授權' }, { status: 401 });
  }
  try {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ error: 'Missing server configuration.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 先刪除關聯的 trip_days
    await supabase
      .from('trip_days')
      .delete()
      .eq('trip_id', params.id);

    // 刪除行程
    const { error } = await supabase
      .from('trips')
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
