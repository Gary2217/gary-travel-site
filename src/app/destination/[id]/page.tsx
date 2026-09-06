import { createAnonClientNoCache, hasSupabaseConfig } from '@/lib/supabase-server';
import { computeDestinationTabState, type DestinationListItem, type SubRegionGroup, type RegionTab } from '@/lib/destination-tabs';
import DestinationPageClient from './DestinationPageClient';
import type { Destination, Trip } from '@/lib/supabase';

type DestinationWithRegion = Destination & { regions?: { category_label: string; title: string } };

// 跟行程頁（trip/[id]/page.tsx）同一個修法：伺服器端先查 Phase 1 需要的核心資料
// （目的地本身 + 底下行程列表 + 全部目的地清單，對應 api/destinations/[id]、
// api/destinations/[id]/trips、api/destinations 這三支 API 的 GET），讓 Hero 圖片、
// 行程卡片、sub_region/sub_area 分頁 tab 第一版 HTML 就看得到，不用等瀏覽器抓完資料。
// tab 分組/排序/URL 深層連結還原邏輯跟 client effect 共用 computeDestinationTabState，
// 不是兩邊各自維護一份。
async function getInitialDestinationData(id: string): Promise<{ destination: DestinationWithRegion | null; trips: Trip[]; allDestinations: DestinationListItem[] }> {
  if (!hasSupabaseConfig()) return { destination: null, trips: [], allDestinations: [] };
  const supabase = createAnonClientNoCache();

  const [{ data: destData, error: destError }, { data: tripsData, error: tripsError }, { data: destsData }] = await Promise.all([
    supabase.from('destinations').select('*, regions(*)').eq('id', id).single(),
    supabase
      .from('trips')
      .select('*, trip_departure_dates(id, departure_date, price, seats_available, seats_total, label, outbound_from, flight_segments, is_active)')
      .eq('destination_id', id)
      .eq('is_active', true)
      .order('display_order', { ascending: true }),
    supabase
      .from('destinations')
      .select('id, title, subtitle, image_url, display_order, sub_region, region_id, source_url, regions(title, category_label)')
      .eq('is_active', true)
      .order('display_order', { ascending: true }),
  ]);

  if (destError || !destData) return { destination: null, trips: [], allDestinations: [] };

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

  return { destination: destData as DestinationWithRegion, trips, allDestinations: (destsData || []) as unknown as DestinationListItem[] };
}

export default async function DestinationPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string; all?: string };
}) {
  const { destination, trips, allDestinations } = await getInitialDestinationData(params.id).catch(() => ({ destination: null, trips: [], allDestinations: [] as DestinationListItem[] }));

  let initialTabState: {
    subRegionGroups: SubRegionGroup[];
    activeSubRegion: string;
    regionTabs: RegionTab[];
    currentTabLabel: string;
    subAreaFilter: string;
  } | null = null;

  if (destination) {
    const tabState = computeDestinationTabState({
      destinationId: params.id,
      destData: destination,
      trips,
      allDestinations,
      savedTab: searchParams.tab || '',
      savedAll: searchParams.all === '1',
    });
    initialTabState = {
      subRegionGroups: tabState.subRegionGroups,
      activeSubRegion: tabState.activeSubRegion,
      regionTabs: tabState.regionTabs,
      currentTabLabel: tabState.currentTabLabel,
      subAreaFilter: tabState.subAreaFilter,
    };
  }

  return (
    <DestinationPageClient
      initialDestination={destination}
      initialTrips={trips}
      initialTabState={initialTabState}
    />
  );
}
