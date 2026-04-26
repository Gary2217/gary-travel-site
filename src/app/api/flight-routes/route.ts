import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { unstable_noStore as noStore } from 'next/cache';
import { cookies } from 'next/headers';
import { verifyDevAuthCookie, DEV_AUTH_COOKIE_NAME } from '@/lib/dev-auth';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET() {
  noStore();
  try {
    // 用 anon key 讀取公開資料（RLS 允許公開 SELECT is_active=true）
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        fetch: (url: RequestInfo | URL, options?: RequestInit) =>
          fetch(url, { ...options, cache: 'no-store' }),
      },
    });

    const { data, error } = await supabase
      .from('flight_routes')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? [], {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const devCookie = cookieStore.get(DEV_AUTH_COOKIE_NAME)?.value;
    if (!verifyDevAuthCookie(devCookie)) {
      return NextResponse.json({ error: '未授權' }, { status: 401 });
    }

    const body = await request.json();
    const { region, from_city, to_city, airlines, duration, price_range, image_url, direct, metadata } = body;

    if (!region || !to_city || !airlines || !duration || !price_range) {
      return NextResponse.json({ error: '缺少必填欄位' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
