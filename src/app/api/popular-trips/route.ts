import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const FEATURED_DESTINATION_ORDER = ['杜拜', '烏茲別克', '斯里蘭卡', '馬爾地夫'];

function getFeaturedPriority(destinationName: string) {
  const index = FEATURED_DESTINATION_ORDER.indexOf(destinationName);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

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
      console.error('popular destinations query error:', destinationsError.message);
      return NextResponse.json({ error: '載入失敗' }, { status: 500 });
    }

    if (!destinations || destinations.length === 0) {
      return NextResponse.json([], {
        headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
      });
    }

    const clickCountResults = await Promise.all(
      destinations.map((destination) =>
        supabase
          .from('click_analytics')
          .select('*', { count: 'exact', head: true })
          .eq('destination_id', destination.id)
          .gte('clicked_at', sixMonthsAgo.toISOString())
      )
    );

    const rankedDestinations = destinations
      .map((destination, index) => ({
        id: destination.id,
        title: destination.title,
        subtitle: destination.subtitle || '',
        image_url: destination.image_url,
        display_order: destination.display_order ?? 0,
        click_count: clickCountResults[index]?.count ?? 0,
      }))
      .sort((a, b) => {
        const featuredDiff = getFeaturedPriority(a.title) - getFeaturedPriority(b.title);
        if (featuredDiff !== 0) return featuredDiff;

        const clickDiff = b.click_count - a.click_count;
        if (clickDiff !== 0) return clickDiff;

        return a.display_order - b.display_order;
      });

    const featuredDestinations = FEATURED_DESTINATION_ORDER
      .map((destinationName) => rankedDestinations.find((destination) => destination.title === destinationName))
      .filter((destination): destination is (typeof rankedDestinations)[number] => Boolean(destination));

    const featuredIds = new Set(featuredDestinations.map((destination) => destination.id));

    const ranked = [
      ...featuredDestinations,
      ...rankedDestinations.filter((destination) => !featuredIds.has(destination.id)),
    ].slice(0, 8);

    return NextResponse.json(ranked, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
