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

  // 過濾 PostgREST 特殊字元 + SQL ilike 萬用字元，防止 filter injection
  const q = rawQ.replace(/[(),."\\%_]/g, '');

  if (!q) {
    return NextResponse.json([]);
  }

  try {
    const supabase = createAnonClient();

    // 關鍵字也可能是「地區名」（如：韓國、東南亞）而非行程標題裡的字，
    // 行程標題多半只會寫城市名（首爾、釜山），不會寫「韓國」兩字，
    // 所以要額外比對 destinations.title 與 regions.title / category_label，
    // 找出符合的目的地，再把該目的地底下的行程一併納入搜尋結果。
    const [{ data: destMatches }, { data: regionMatches }] = await Promise.all([
      supabase.from('destinations').select('id').eq('is_active', true).ilike('title', `%${q}%`),
      supabase.from('regions').select('id').eq('is_active', true).or(`title.ilike.%${q}%,category_label.ilike.%${q}%`),
    ]);

    let destIdsFromRegion: string[] = [];
    const regionIds = (regionMatches || []).map((r) => r.id);
    if (regionIds.length > 0) {
      const { data: destsInRegions } = await supabase
        .from('destinations')
        .select('id')
        .eq('is_active', true)
        .in('region_id', regionIds);
      destIdsFromRegion = (destsInRegions || []).map((d) => d.id);
    }

    const matchedDestIds = Array.from(
      new Set([...(destMatches || []).map((d) => d.id), ...destIdsFromRegion]),
    );

    const orParts = [`title.ilike.%${q}%`, `subtitle.ilike.%${q}%`];
    if (matchedDestIds.length > 0) {
      orParts.push(`destination_id.in.(${matchedDestIds.join(',')})`);
    }

    const { data, error } = await supabase
      .from('trips')
      .select('id, title, subtitle, duration, cover_image_url, destinations(title)')
      .eq('is_active', true)
      .or(orParts.join(','))
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
