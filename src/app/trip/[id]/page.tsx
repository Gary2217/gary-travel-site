import { createAnonClientNoCache, hasSupabaseConfig } from '@/lib/supabase-server';
import TripPageClient from './TripPageClient';
import type { Trip } from '@/lib/supabase';

// 跟 src/app/api/trips/[id]/route.ts 的 GET handler 刻意保持一致（同一個查詢），
// 讓行程頁第一版 HTML 就有封面圖跟完整內容（是本頁的 LCP 元素），不用等瀏覽器
// 執行完 client 端的 useEffect 才看得到。用 anon key 是因為這本來就是公開讀取，
// 跟 API route 的權限層級一致。
async function getInitialTrip(id: string): Promise<Trip | null> {
  if (!hasSupabaseConfig()) return null;
  const supabase = createAnonClientNoCache();

  const [{ data, error }, daysResult, datesResult] = await Promise.all([
    supabase.from('trips').select('*, destinations (*, regions (category_label))').eq('id', id).single(),
    supabase.from('trip_days').select('*').eq('trip_id', id).order('day_number', { ascending: true }),
    supabase.from('trip_departure_dates').select('*').eq('trip_id', id).order('departure_date', { ascending: true }),
  ]);

  if (error || !data) return null;

  return {
    ...data,
    trip_days: daysResult.data || [],
    departure_dates: datesResult.data || [],
    document_is_available: Boolean(data.document_url),
  } as Trip;
}

export default async function TripPage({ params }: { params: { id: string } }) {
  const initialTrip = await getInitialTrip(params.id).catch(() => null);
  return <TripPageClient initialTrip={initialTrip} />;
}
