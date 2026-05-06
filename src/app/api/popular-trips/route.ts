import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function pickDestinationTitle(destinations: unknown): string {
  if (Array.isArray(destinations)) {
    const first = destinations[0];
    if (first && typeof first === 'object') {
      const title = (first as { title?: unknown }).title;
      return typeof title === 'string' ? title : '';
    }
    return '';
  }

  if (destinations && typeof destinations === 'object') {
    const title = (destinations as { title?: unknown }).title;
    return typeof title === 'string' ? title : '';
  }

  return '';
}

// GET - 取得熱門推薦行程（依近 6 個月瀏覽次數排序）
export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 只統計近 6 個月的瀏覽事件
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select('id, title, subtitle, duration, price_range, cover_image_url, destinations(title)')
      .eq('is_active', true)
      .not('cover_image_url', 'is', null);

    if (tripsError) {
      console.error('popular-trips query error:', tripsError.message);
      return NextResponse.json({ error: '載入失敗' }, { status: 500 });
    }

    if (!trips || trips.length === 0) {
      return NextResponse.json([], {
        headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
      });
    }

    // 由資料庫執行聚合（count），避免載入大量 analytics 到記憶體
    const viewCountResults = await Promise.all(
      trips.map((trip) =>
        supabase
          .from('analytics_events')
          .select('*', { count: 'exact', head: true })
          .eq('event_type', 'trip_view')
          .eq('trip_id', trip.id)
          .gte('created_at', sixMonthsAgo.toISOString())
      )
    );

    const ranked = trips
      .map((t, index) => ({
        id: t.id,
        title: t.title,
        subtitle: t.subtitle || '',
        duration: t.duration,
        price_range: t.price_range || '',
        cover_image_url: t.cover_image_url,
        destination_name: pickDestinationTitle(t.destinations),
        view_count: viewCountResults[index]?.count ?? 0,
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
