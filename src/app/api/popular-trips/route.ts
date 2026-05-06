import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// GET - 取得熱門推薦行程（依瀏覽次數排序）
export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 從 analytics 統計各行程瀏覽次數
    const { data: events } = await supabase
      .from('analytics_events')
      .select('trip_id')
      .eq('event_type', 'trip_view')
      .not('trip_id', 'is', null);

    // 計算每個 trip 的瀏覽次數
    const viewCounts = new Map<string, number>();
    (events || []).forEach((e: any) => {
      if (e.trip_id) {
        viewCounts.set(e.trip_id, (viewCounts.get(e.trip_id) || 0) + 1);
      }
    });

    // 取得所有 active 行程
    const { data: trips, error } = await supabase
      .from('trips')
      .select('id, title, subtitle, duration, price_range, cover_image_url, destination_id, destinations(title)')
      .eq('is_active', true);

    if (error) {
      console.error('popular-trips query error:', error.message);
      return NextResponse.json({ error: '載入失敗' }, { status: 500 });
    }

    // 依瀏覽次數排序，取前 8 個有封面圖的行程
    const ranked = (trips || [])
      .filter((t: any) => t.cover_image_url)
      .map((t: any) => ({
        id: t.id,
        title: t.title,
        subtitle: t.subtitle || '',
        duration: t.duration,
        price_range: t.price_range || '',
        cover_image_url: t.cover_image_url,
        destination_name: t.destinations?.title || '',
        view_count: viewCounts.get(t.id) || 0,
      }))
      .sort((a: any, b: any) => b.view_count - a.view_count)
      .slice(0, 8);

    return NextResponse.json(ranked, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
