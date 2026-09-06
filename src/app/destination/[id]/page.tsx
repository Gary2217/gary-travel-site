import { createAnonClientNoCache, hasSupabaseConfig } from '@/lib/supabase-server';
import DestinationPageClient from './DestinationPageClient';
import type { Destination, Trip } from '@/lib/supabase';

type DestinationWithRegion = Destination & { regions?: { category_label: string; title: string } };

// 跟行程頁（trip/[id]/page.tsx）同一個修法：伺服器端先查 Phase 1 需要的核心資料
// （目的地本身 + 底下行程列表，對應 api/destinations/[id] 與 api/destinations/[id]/trips
// 這兩支 API 的 GET），讓 Hero 圖片與行程卡片第一版 HTML 就看得到，不用等瀏覽器抓完資料。
// 跨目的地的分頁 tab（sub_region、sub_area）仍由既有 client effect 抓取計算，維持原邏輯不變。
async function getInitialDestinationData(id: string): Promise<{ destination: DestinationWithRegion | null; trips: Trip[] }> {
  if (!hasSupabaseConfig()) return { destination: null, trips: [] };
  const supabase = createAnonClientNoCache();

  const [{ data: destData, error: destError }, { data: tripsData, error: tripsError }] = await Promise.all([
    supabase.from('destinations').select('*, regions(*)').eq('id', id).single(),
    supabase
      .from('trips')
      .select('*, trip_departure_dates(id, departure_date, price, seats_available, seats_total, label, outbound_from, flight_segments, is_active)')
      .eq('destination_id', id)
      .eq('is_active', true)
      .order('display_order', { ascending: true }),
  ]);

  if (destError || !destData) return { destination: null, trips: [] };

  const today = new Date().toISOString().slice(0, 10);
  const trips: Trip[] = tripsError
    ? []
    : (tripsData || []).map((trip: any) => {
        const { trip_departure_dates: rawDates, ...tripData } = trip;
        return {
          ...tripData,
          document_is_available: Boolean(trip.document_url),
          departure_dates: (rawDates || [])
            .filter((d: any) => d.is_active && (!d.departure_date || d.departure_date >= today))
            .sort((a: any, b: any) => (a.departure_date || '').localeCompare(b.departure_date || '')),
        };
      });

  // 只有「洽詢加LINE」(custom_tour) 的行程排最後；其餘一律排前面，同組依 display_order，再 id 穩定排序
  // （跟 api/destinations/[id]/trips 的 GET 用同一套排序，維持顯示順序一致）
  const isInquiryOnly = (t: Trip) => !!t.trip_banner?.custom_tour;
  trips.sort((a, b) => {
    const ap = isInquiryOnly(a) ? 1 : 0;
    const bp = isInquiryOnly(b) ? 1 : 0;
    if (ap !== bp) return ap - bp;
    const ao = a.display_order ?? Number.MAX_SAFE_INTEGER;
    const bo = b.display_order ?? Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    return a.id.localeCompare(b.id);
  });

  return { destination: destData as DestinationWithRegion, trips };
}

export default async function DestinationPage({ params }: { params: { id: string } }) {
  const { destination, trips } = await getInitialDestinationData(params.id).catch(() => ({ destination: null, trips: [] }));
  return <DestinationPageClient initialDestination={destination} initialTrips={trips} />;
}
