import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const FEATURED_DESTINATION_ORDER = ['杜拜', '烏茲別克', '斯里蘭卡', '馬爾地夫'];

// GET - 取得熱門推薦目的地（依近 6 個月點擊次數排序）
export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 只統計近 6 個月的目的地點擊事件
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: destinations, error: destinationsError } = await supabase
      .from('destinations')
      .select('id, title, subtitle, image_url, display_order')
      .eq('is_active', true)
      .not('image_url', 'is', null)
      .neq('image_url', '');

    if (destinationsError) {
      console.error('popular destinations query error:', destinationsError);
      return NextResponse.json({ error: '載入失敗' }, { status: 500 });
    }

    if (!destinations || destinations.length === 0) {
      return NextResponse.json([], {
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
      });
    }

    const ids = destinations.map((d) => d.id);
    const { data: clickRows } = await supabase
      .from('click_analytics')
      .select('destination_id')
      .in('destination_id', ids)
      .gte('clicked_at', sixMonthsAgo.toISOString());

    const clickCountMap = new Map<string, number>();
    (clickRows || []).forEach((row: any) => {
      clickCountMap.set(row.destination_id, (clickCountMap.get(row.destination_id) || 0) + 1);
    });

    const mapped = destinations.map((destination) => ({
      id: destination.id,
      title: destination.title,
      subtitle: destination.subtitle || '',
      image_url: destination.image_url,
      display_order: destination.display_order ?? 0,
      click_count: clickCountMap.get(destination.id) ?? 0,
      isFeatured: FEATURED_DESTINATION_ORDER.includes(destination.title),
    }));

    // Featured：每個標題只取一筆代表（點擊數最多；同分以 id 穩定排序），再依 display_order 決定順序
    const featuredRepMap = new Map<string, typeof mapped[0]>();
    for (const d of mapped) {
      if (!d.isFeatured) continue;
      const existing = featuredRepMap.get(d.title);
      if (!existing ||
          d.click_count > existing.click_count ||
          (d.click_count === existing.click_count && d.id < existing.id)) {
        featuredRepMap.set(d.title, d);
      }
    }

    const featuredDestinations = Array.from(featuredRepMap.values())
      .sort((a, b) => a.display_order - b.display_order);

    const otherDestinations = mapped
      .filter((d) => !d.isFeatured)
      .sort((a, b) => {
        const clickDiff = b.click_count - a.click_count;
        return clickDiff !== 0 ? clickDiff : a.display_order - b.display_order;
      });

    const ranked = [...featuredDestinations, ...otherDestinations].slice(0, 8);

    return NextResponse.json(ranked, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
