import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 資料型別定義
export type Destination = {
  id: string;
  region_id: string;
  title: string;
  subtitle: string;
  image_url: string;
  display_order: number;
  is_active: boolean;
  click_count: number;
  created_at: string;
  updated_at: string;
};

export type Region = {
  id: string;
  category_label: string;
  title: string;
  description: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  destinations?: Destination[];
};

// 取得所有啟用的區域和目的地
export async function getRegionsWithDestinations() {
  const { data, error } = await supabase
    .from('regions')
    .select(`
      *,
      destinations (*)
    `)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching regions:', error);
    return [];
  }

  // 排序每個區域內的目的地
  return (data || []).map((region: any) => ({
    ...region,
    destinations: (region.destinations || [])
      .filter((d: Destination) => d.is_active)
      .sort((a: Destination, b: Destination) => a.display_order - b.display_order)
  }));
}

// 記錄點擊事件
export async function trackClick(destinationId: string) {
  const { error } = await supabase
    .from('click_analytics')
    .insert({
      destination_id: destinationId,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      referrer: typeof document !== 'undefined' ? document.referrer : '',
    });

  if (error) {
    console.error('Error tracking click:', error);
  }
}
