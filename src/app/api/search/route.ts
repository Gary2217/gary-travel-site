import { NextRequest, NextResponse } from 'next/server';
import { API_ERRORS } from '@/lib/api-error';
import { createAnonClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const rawQ = request.nextUrl.searchParams.get('q')?.trim() ?? '';

  if (rawQ.length < 1) {
    return NextResponse.json([]);
  }

  // 過濾 PostgREST 特殊字元，防止 filter injection
  const q = rawQ.replace(/[(),."\\]/g, '');

  try {
    const supabase = createAnonClient();

    const { data, error } = await supabase
      .from('trips')
      .select('id, title, subtitle, duration, cover_image_url, destinations(title)')
      .eq('is_active', true)
      .or(`title.ilike.%${q}%,subtitle.ilike.%${q}%`)
      .order('display_order', { ascending: true })
      .limit(10);

    if (error) {
      return API_ERRORS.dbError(error);
    }

    return NextResponse.json(data || [], {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    });
  } catch (err) {
    return API_ERRORS.internal(err);
  }
}
