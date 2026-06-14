"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getDestination, getDestinationTrips, getRelatedTrips, getSiteLogo, createTrip, deleteTrip, lineDmHref, type Destination, type Trip } from "@/lib/supabase";
import { openExternalLink } from "@/lib/external-link";
import FloatingContact from "@/components/FloatingContact";
import SocialCta from "@/components/SocialCta";
import StickyHeader from "@/components/StickyHeader";
import TripCard from "@/components/TripCard";
import DevModeToggle from "@/components/DevModeToggle";
import Toast from "@/components/Toast";

async function handleReorder<T extends { id: string; display_order: number }>(
  table: 'destinations' | 'trips',
  items: T[],
  fromIndex: number,
  toIndex: number,
  setItems: (items: T[]) => void
) {
  if (toIndex < 0 || toIndex >= items.length || fromIndex === toIndex) return;

  const current = items[fromIndex];
  const target = items[toIndex];

  const currentOrder = current.display_order;
  const targetOrder = target.display_order;

  const updated = [...items];
  updated[fromIndex] = { ...current, display_order: targetOrder };
  updated[toIndex] = { ...target, display_order: currentOrder };
  updated.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  setItems(updated);

  const res = await fetch('/api/reorder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      table,
      items: [
        { id: current.id, display_order: targetOrder },
        { id: target.id, display_order: currentOrder },
      ],
    }),
  });

  if (!res.ok) {
    setItems(items);
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || '排序儲存失敗');
  }
}

export default function DestinationPage() {
  const params = useParams();
  const router = useRouter();
  const destinationId = params.id as string;

  const [destination, setDestination] = useState<Destination & { regions?: { category_label: string; title: string } } | null>(null);
  const [regionTabs, setRegionTabs] = useState<{ label: string; destId: string }[]>([]);
  const [currentTabLabel, setCurrentTabLabel] = useState("");
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDevMode, setIsDevMode] = useState(false);
  const [siteLogoUrl, setSiteLogoUrl] = useState('/travel-logo.svg');
  const [dateFilter, setDateFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [relatedTrips, setRelatedTrips] = useState<{ regionTrips: Trip[]; categoryTrips: Trip[] } | null>(null);
  const [popularFallback, setPopularFallback] = useState<Trip[] | null>(null);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isPC, setIsPC] = useState(false);
  const [scrapeTriggering, setScrapeTriggering] = useState(false);
  const [scrapeRunning, setScrapeRunning] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [subAreaFilter, setSubAreaFilter] = useState<string>("");
  const siblingDestsRef = useRef<string[]>([]);
  const recommendRef = useRef<HTMLDivElement>(null);
  const relatedFetched = useRef(false);

  // 從 URL query params 讀取搜尋條件（含 sub_area 篩選）
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const qs = new URLSearchParams(window.location.search);
    setDateFilter(qs.get('date') || '');
    setCityFilter(qs.get('city') || '');
  }, []);

  // 檢查是否有抓取進行中（防重複觸發）
  useEffect(() => {
    if (!isDevMode) return;
    let cancelled = false;
    async function checkRunning() {
      try {
        const res = await fetch('/api/scrape/progress', { credentials: 'include', cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setScrapeRunning(data.running === true);
        }
      } catch { /* ignore */ }
    }
    checkRunning();
    return () => { cancelled = true; };
  }, [isDevMode]);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setPopularFallback(null);
        const [destData, tripsData] = await Promise.all([
          getDestination(destinationId),
          getDestinationTrips(destinationId),
        ]);
        if (!isMounted) return;
        if (!destData) {
          setError("找不到此目的地");
          return;
        }
        setDestination(destData);
        setTrips(tripsData);

        // 載入同區域的所有行程，建立 sub_area 篩選 tabs
        const isChinaRegion = destData.regions?.title === '港澳大陸';

        if (destData.region_id) {
          try {
            const allDests = await fetch('/api/destinations', { cache: 'no-store' });
            if (allDests.ok) {
              const destsData = await allDests.json();
              const siblings = (destsData as { id: string; title: string; region_id: string; display_order: number; sub_region?: string }[])
                .filter((d) => d.region_id === destData.region_id)
                .sort((a, b) => a.display_order - b.display_order);

              const allSiblingIds = siblings.map(d => d.id);
              siblingDestsRef.current = allSiblingIds;

              if (siblings.length > 1) {
                // 載入所有子目的地的行程（合併顯示）
                const siblingIds = allSiblingIds.filter(id => id !== destinationId);
                const results = await Promise.allSettled(
                  siblingIds.map(id => getDestinationTrips(id))
                );
                const extraTrips = results
                  .filter((r): r is PromiseFulfilledResult<typeof tripsData> => r.status === 'fulfilled')
                  .flatMap(r => r.value);
                const allTrips = [...tripsData, ...extraTrips];

                // 去重 by code_label
                const seen = new Set<string>();
                const deduped = allTrips.filter(t => {
                  const key = (t.trip_banner as Record<string, unknown>)?.code_label as string || t.id;
                  if (seen.has(key)) return false;
                  seen.add(key);
                  return true;
                });

                // 用 sub_area 值建立篩選 tabs
                const CHINA_SUB_AREA_ORDER = ['張家界', '九寨溝', '張家界+九寨溝', '重慶', '長江三峽', '貴州', '桂林', '甘南', '新疆', '黃山', '金廈', '江南', '武夷山', '青島', '洛陽', '哈爾濱', '高雄出發'];
                const areas = Array.from(new Set(
                  deduped.flatMap(t => ((t.trip_banner?.sub_area as string) || "").split(",").map(s => s.trim())).filter(Boolean)
                ));
                if (isChinaRegion) {
                  areas.sort((a, b) => {
                    const ai = CHINA_SUB_AREA_ORDER.indexOf(a);
                    const bi = CHINA_SUB_AREA_ORDER.indexOf(b);
                    if (ai === -1 && bi === -1) return a.localeCompare(b);
                    if (ai === -1) return 1;
                    if (bi === -1) return -1;
                    return ai - bi;
                  });
                }
                const areaTabs = areas.length >= 2
                  ? [{ label: "全部", destId: "all" }, ...areas.map(a => ({ label: a, destId: `filter:${a}` }))]
                  : [];

                if (isMounted) {
                  setTrips(deduped);
                  setRegionTabs(areaTabs);
                  setCurrentTabLabel("全部");
                }
              }
            }
          } catch { /* 靜默 */ }
        }

        // 載入同區域推薦行程（不管有沒有行程都載）
        if (destData.region_id && destData.regions?.category_label) {
          setRelatedLoading(true);
          try {
            const related = await getRelatedTrips(
              destData.region_id,
              destData.regions.category_label,
              destinationId
            );
            if (!isMounted) return;
            setRelatedTrips(related);

            if (related.regionTrips.length === 0 && related.categoryTrips.length === 0) {
              try {
                const res = await fetch('/api/popular-trips', { cache: 'no-store' });
                if (res.ok) {
                  const popular = (await res.json()) as Trip[];
                  if (isMounted) setPopularFallback(popular);
                }
              } catch {
                // 靜默失敗，不影響主頁面
              }
            }
          } catch {
            // 靜默失敗，不影響主頁面
          } finally {
            if (isMounted) setRelatedLoading(false);
          }
        }
      } catch {
        if (isMounted) setError("無法載入資料，請重新整理頁面");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, [destinationId]);

  // lazy loading observer 已移除 — 推薦行程在 loadData 中直接載入

  useEffect(() => {
    async function loadSiteLogo() {
      try {
        const url = await getSiteLogo();
        setSiteLogoUrl(url);
      } catch {
        setSiteLogoUrl('/travel-logo.svg');
      }
    }

    loadSiteLogo();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsDevMode(localStorage.getItem('dev_mode_enabled') === '1');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(pointer: fine)');
    const updateIsPC = (event?: MediaQueryListEvent) => {
      setIsPC(event?.matches ?? mediaQuery.matches);
    };

    updateIsPC();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateIsPC);
      return () => mediaQuery.removeEventListener('change', updateIsPC);
    }

    mediaQuery.addListener(updateIsPC);
    return () => mediaQuery.removeListener(updateIsPC);
  }, []);

  const handleTripImageUpdate = (tripId: string, newImageUrl: string) => {
    setTrips(prev =>
      prev.map(trip =>
        trip.id === tripId ? { ...trip, cover_image_url: newImageUrl } : trip
      )
    );
  };

  const handleTripDocumentUpdate = (tripId: string, newDocUrl: string) => {
    setTrips(prev =>
      prev.map(trip =>
        trip.id === tripId ? { ...trip, document_url: newDocUrl } : trip
      )
    );
  };

  const handleTripDocumentAvailabilityUpdate = (tripId: string, available: boolean) => {
    setTrips(prev =>
      prev.map(trip =>
        trip.id === tripId ? { ...trip, document_is_available: available } : trip
      )
    );
  };

  const handleTripDurationUpdate = (tripId: string, newDuration: string) => {
    setTrips(prev =>
      prev.map(trip =>
        trip.id === tripId ? { ...trip, duration: newDuration } : trip
      )
    );
  };

  const handleTripTitleUpdate = (tripId: string, newTitle: string) => {
    setTrips(prev =>
      prev.map(trip =>
        trip.id === tripId ? { ...trip, title: newTitle } : trip
      )
    );
  };

  const handleCustomTourToggle = async (tripId: string, value: boolean) => {
    try {
      const trip = trips.find(t => t.id === tripId);
      const currentBanner = trip?.trip_banner;
      const updatedBanner = { ...(currentBanner || { code_label: '', price_label: '', tags: [], departure_label: '', duration_label: '', seats_total: null, seats_available: null, deposit_label: '' }), custom_tour: value };
      const res = await fetch(`/api/trips/${tripId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip_banner: updatedBanner }),
      });
      if (res.ok) {
        setTrips(prev =>
          prev.map(t =>
            t.id === tripId ? { ...t, trip_banner: updatedBanner } : t
          )
        );
      }
    } catch {
      alert('設定失敗，請再試一次');
    }
  };

  const handleAddTrip = async () => {
    try {
      const newTrip = await createTrip(destinationId);
      setTrips(prev => [...prev, { ...newTrip, document_is_available: false }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "新增失敗";
      alert(`新增行程失敗：${msg}`);
    }
  };

  const handleHideTrip = async (tripId: string) => {
    try {
      const res = await fetch(`/api/trips/${tripId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: false }),
      });
      if (!res.ok) throw new Error('隱藏失敗');
      setTrips(prev => prev.filter(trip => trip.id !== tripId));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "隱藏失敗";
      alert(`隱藏行程失敗：${msg}`);
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    try {
      await deleteTrip(tripId);
      setTrips(prev => prev.filter(trip => trip.id !== tripId));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "刪除失敗";
      alert(`刪除行程失敗：${msg}`);
    }
  };

  const handleTripReorder = async (index: number, direction: -1 | 1) => {
    try {
      await handleReorder('trips', trips, index, index + direction, setTrips);
    } catch (error) {
      alert(error instanceof Error ? error.message : '排序失敗');
    }
  };

  function handleDragStart(index: number) {
    return (e: React.DragEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, [contenteditable]')) {
        e.preventDefault();
        return;
      }
      setDragIndex(index);
      setDragOverIndex(index);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));
    };
  }

  function handleDragOver(index: number) {
    return (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOverIndex(index);
    };
  }

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  function handleDrop(dropIndex: number) {
    return async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();

      if (dragIndex === null || dragIndex === dropIndex) {
        handleDragEnd();
        return;
      }

      try {
        await handleReorder('trips', trips, dragIndex, dropIndex, setTrips);
      } catch (error) {
        alert(error instanceof Error ? error.message : '排序失敗');
      } finally {
        handleDragEnd();
      }
    };
  }

  const clearFilters = () => {
    setDateFilter('');
    setCityFilter('');
    const isAll = currentTabLabel === "全部";
    router.replace(`/destination/${destinationId}${isAll ? '?all=1' : ''}`);
  };

  const handleShowAll = async () => {
    setCurrentTabLabel("全部");
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('all', '1');
      window.history.replaceState({}, '', url.toString());
    }

    const allIds = siblingDestsRef.current;
    if (allIds.length === 0) return;

    try {
      const results = await Promise.allSettled(
        allIds.map(id => getDestinationTrips(id))
      );
      const allTrips = results
        .filter((r): r is PromiseFulfilledResult<Trip[]> => r.status === 'fulfilled')
        .flatMap(r => r.value);

      const seen = new Set<string>();
      const deduped = allTrips.filter(t => {
        const key = (t.trip_banner as Record<string, unknown>)?.code_label as string || t.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // 全部模式：用 sub_area 建立篩選 tabs
      const areas = Array.from(new Set(
        deduped.flatMap(t => ((t.trip_banner?.sub_area as string) || "").split(",").map(s => s.trim())).filter(Boolean)
      ));
      const areaTabs = areas.length >= 2
        ? [{ label: "全部", destId: "all" }, ...areas.map(a => ({ label: a, destId: `filter:${a}` }))]
        : [{ label: "全部", destId: "all" }];

      setTrips(deduped);
      setRegionTabs(areaTabs);
    } catch {
      // 保持目前行程不變
    }
  };

  const handleTabClick = (tab: { label: string; destId: string }) => {
    if (tab.label === currentTabLabel) return;
    if (tab.destId.startsWith("filter:")) {
      setSubAreaFilter(tab.destId.slice(7));
      setCurrentTabLabel(tab.label);
    } else if (tab.destId === "all") {
      setSubAreaFilter("");
      setCurrentTabLabel("全部");
    }
  };

  const formatDate = (d: string) => {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${y}/${m}/${day}`;
  };

  const getTripCardPrice = (trip: Trip) => {
    // 取出發日期中的最低價（對齊朋威的「NT$xx,xxx起」）
    const prices = (trip.departure_dates || [])
      .map(d => d.price)
      .filter((p): p is number => typeof p === 'number' && p > 0);

    if (prices.length > 0) {
      const minPrice = Math.min(...prices);
      return `NT$ ${minPrice.toLocaleString('zh-TW')}`;
    }

    return trip.price_range;
  };

  const handleScrapeThisPage = async () => {
    if (scrapeTriggering) return;

    // 先檢查 destination 有沒有 source_url
    if (!destination?.source_url) {
      alert('此目的地尚未設定朋威對應 URL（source_url），無法抓取。\n請到 Supabase 設定此目的地的 source_url 後再試。');
      return;
    }

    setScrapeTriggering(true);
    try {
      const res = await fetch('/api/scrape/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ destinationId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || '觸發抓取失敗');
      }

      setToastMessage('已觸發抓取');
      setTimeout(() => {
        const from = encodeURIComponent(window.location.pathname + window.location.search);
        router.push(`/admin?tab=scrape&from=${from}`);
      }, 600);
    } catch (err) {
      alert(err instanceof Error ? err.message : '觸發抓取失敗');
    } finally {
      setScrapeTriggering(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-transparent text-gray-900">
        <StickyHeader showBackButton backHref="/" logoUrl={siteLogoUrl} />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-sky-400 border-r-transparent" />
            <p className="mt-4 text-gray-600">載入中...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !destination || !destination.title) {
    return (
      <main className="min-h-screen bg-white text-gray-900">
        <StickyHeader showBackButton backHref="/" logoUrl={siteLogoUrl} />
        <div className="flex min-h-[60vh] items-center justify-center px-4">
          <div className="text-center">
            <p className="text-4xl">🔍</p>
            <p className="mt-3 text-lg font-bold text-gray-700">{error || "找不到此目的地"}</p>
            <p className="mt-1 text-sm text-gray-400">此頁面可能已移除或網址有誤</p>
            <button
              onClick={() => window.location.href = '/'}
              className="mt-5 rounded-full bg-sky-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
            >
              回首頁
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-transparent pt-[8.5rem] text-gray-900">
      <StickyHeader showBackButton backHref="/" logoUrl={siteLogoUrl} devModeSlot={<DevModeToggle onToggle={setIsDevMode} />} />

      {/* Hero 區塊 */}
      <div className="relative h-48 overflow-hidden sm:h-56 md:h-64">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${destination.image_url})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-white via-black/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 md:p-8">
          <div className="mx-auto max-w-site">
            {destination.regions && (
              <span className="mb-1.5 inline-block rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-white/90 backdrop-blur-sm sm:mb-2 sm:px-3 sm:py-1 sm:text-xs">
                {destination.regions.category_label}
              </span>
            )}
            <h1 className="text-2xl font-bold text-white sm:text-3xl md:text-4xl">
              {destination.title}
            </h1>
            {destination.subtitle && (
              <p className="mt-0.5 text-sm text-white/80 sm:mt-1 sm:text-base md:text-lg">{destination.subtitle}</p>
            )}
          </div>
        </div>
      </div>

      {/* 區域篩選 tabs */}
      {regionTabs.length > 1 && (
        <div className="mx-auto max-w-site px-3 pt-5 sm:px-4 md:px-8">
          {destination.regions && (
            <h2 className="mb-4 text-center text-xl font-bold text-gray-800 sm:text-2xl">
              {destination.regions.title}
            </h2>
          )}
          <div className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex flex-wrap justify-center gap-2 px-1 pb-1">
              {regionTabs.map((tab) => (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => handleTabClick(tab)}
                  className={`shrink-0 rounded-full px-5 py-2 text-[13px] font-bold tracking-wide transition-all ${
                    tab.label === currentTabLabel
                      ? "bg-gradient-to-b from-[#0ea5e9] to-[#0369a1] text-white shadow-md shadow-sky-500/20 ring-1 ring-sky-400/30"
                      : "border border-sky-100 bg-gradient-to-b from-white to-sky-50/80 text-gray-600 shadow-sm ring-1 ring-sky-100/50 hover:border-sky-200 hover:from-sky-50 hover:to-sky-100/60 hover:text-sky-700 hover:shadow-md"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 行程列表 */}
      <section className="mx-auto max-w-site px-3 py-4 sm:px-4 sm:py-6 md:px-8 md:py-10">

        {trips.length === 0 && !isDevMode ? (
          <>
            {/* 客製洽詢區塊（緊湊橫排） */}
            <div className="mb-6 flex flex-col items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 sm:flex-row sm:px-5">
              <div className="text-center sm:text-left">
                <p className="text-sm font-bold text-gray-900">
                  {destination.title}目前暫無現成行程，可客製行程
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  免費諮詢 · 不收服務費 · 讓蓋瑞為您量身打造專屬行程
                </p>
              </div>
              <button
                type="button"
                onClick={() => openExternalLink(lineDmHref)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#06C755] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#05b64d] active:scale-95"
              >
                <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                </svg>
                LINE 私訊洽詢
              </button>
            </div>

            {/* 相關行程載入中 */}
            {relatedLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-sky-400 border-r-transparent" />
                <span className="ml-3 text-sm text-gray-500">載入相關行程...</span>
              </div>
            ) : (
              <>
                {/* 同地區其他行程（按 sub_region 分組） */}
                {relatedTrips && relatedTrips.regionTrips.length > 0 && (() => {
                  const trips = relatedTrips.regionTrips as any[];
                  const hasSubRegions = trips.some((t) => t.destinations?.sub_region);
                  const groups: { label: string; trips: any[] }[] = [];
                  if (hasSubRegions) {
                    const seen = new Set<string>();
                    trips.forEach((t) => {
                      const key = t.destinations?.sub_region || '';
                      if (!seen.has(key)) {
                        seen.add(key);
                        groups.push({ label: key, trips: trips.filter((x) => (x.destinations?.sub_region || '') === key) });
                      }
                    });
                  }
                  return (
                    <section className="mb-10">
                      <h2 className="mb-3 text-base font-bold text-gray-900 sm:mb-4 sm:text-lg md:text-xl">
                        {destination.regions?.title} 其他行程（{trips.length}）
                      </h2>
                      {hasSubRegions ? groups.map((g) => (
                        <div key={g.label || 'ungrouped'} className="mb-5">
                          {g.label && <h3 className="mb-2 px-1 text-sm font-bold text-sky-600">{g.label}</h3>}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {g.trips.map((trip) => (
                              <div key={trip.id} className="md:min-w-0">
                                <TripCard id={trip.id} title={trip.title} duration={trip.duration}
                                  price_range={getTripCardPrice(trip)} cover_image_url={trip.cover_image_url}
                                  document_url={trip.document_url} document_is_available={trip.document_is_available}
                                  departure_dates={trip.departure_dates} tags={trip.trip_banner?.tags} isDevMode={false} />
                              </div>
                            ))}
                          </div>
                        </div>
                      )) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {trips.map((trip) => (
                            <div key={trip.id} className="md:min-w-0">
                              <TripCard id={trip.id} title={trip.title} duration={trip.duration}
                                price_range={getTripCardPrice(trip)} cover_image_url={trip.cover_image_url}
                                document_url={trip.document_url} document_is_available={trip.document_is_available}
                                departure_dates={trip.departure_dates} tags={trip.trip_banner?.tags} isDevMode={false} />
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })()}

                {/* 同類別熱門行程（按 region title 分組） */}
                {relatedTrips && relatedTrips.categoryTrips.length > 0 && (() => {
                  const trips = relatedTrips.categoryTrips as any[];
                  const groups: { label: string; trips: any[] }[] = [];
                  const seen = new Set<string>();
                  trips.forEach((t) => {
                    const key = (t.destinations as any)?.regions?.title || '';
                    if (!seen.has(key)) {
                      seen.add(key);
                      groups.push({ label: key, trips: trips.filter((x) => ((x.destinations as any)?.regions?.title || '') === key) });
                    }
                  });
                  return (
                    <section className="mb-10">
                      <h2 className="mb-3 text-base font-bold text-gray-900 sm:mb-4 sm:text-lg md:text-xl">
                        推薦{destination.regions?.category_label}熱門團（{trips.length}）
                      </h2>
                      {groups.map((g) => (
                        <div key={g.label || 'ungrouped'} className="mb-5">
                          {g.label && <h3 className="mb-2 px-1 text-sm font-bold text-sky-600">{g.label}</h3>}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {g.trips.map((trip) => (
                              <div key={trip.id} className="md:min-w-0">
                                <TripCard id={trip.id} title={trip.title} duration={trip.duration}
                                  price_range={getTripCardPrice(trip)} cover_image_url={trip.cover_image_url}
                                  document_url={trip.document_url} document_is_available={trip.document_is_available}
                                  departure_dates={trip.departure_dates} tags={trip.trip_banner?.tags} isDevMode={false} />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </section>
                  );
                })()}
              </>
            )}
          </>
        ) : (
          <>
            {/* 搜尋條件 banner */}
            {(dateFilter || cityFilter) && (
              <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5">
                <svg className="h-4 w-4 shrink-0 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
                </svg>
                <span className="text-sm text-sky-700">搜尋條件：</span>
                {cityFilter && (
                  <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
                    出發地：{cityFilter}
                  </span>
                )}
                {dateFilter && (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                    出發日：{formatDate(dateFilter)}
                  </span>
                )}
                <button
                  onClick={clearFilters}
                  className="ml-auto text-xs text-gray-400 transition hover:text-gray-700"
                >
                  清除篩選
                </button>
              </div>
            )}

            {/* 無符合梯次提示 */}
            {dateFilter && trips.length > 0 && !trips.some((t) => t.departure_dates?.some((d) => d.departure_date === dateFilter)) && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
                <div className="flex items-start gap-3">
                  <svg className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-amber-700">
                      {formatDate(dateFilter)} 目前暫無出發梯次
                    </p>
                    <p className="mt-0.5 text-xs text-amber-600">
                      以下為其他可選行程，歡迎諮詢旅遊規劃師蓋瑞，為您安排客製出發日期
                    </p>
                  </div>
                </div>
              </div>
            )}

            <h2 className="mb-4 text-lg font-bold text-gray-900 sm:mb-6 sm:text-xl md:text-2xl">
              可選行程（{subAreaFilter ? trips.filter((t) => ((t.trip_banner?.sub_area as string) || "").split(",").map(s => s.trim()).includes(subAreaFilter)).length : trips.length}）
            </h2>

            {(() => {
              const filtered = subAreaFilter
                ? trips.filter((t) => ((t.trip_banner?.sub_area as string) || "").split(",").map(s => s.trim()).includes(subAreaFilter))
                : trips;
              const sorted = dateFilter
                ? [...filtered].sort((a, b) => {
                    const aMatch = a.departure_dates?.some((d) => d.departure_date === dateFilter) ? 0 : 1;
                    const bMatch = b.departure_dates?.some((d) => d.departure_date === dateFilter) ? 0 : 1;
                    return aMatch - bMatch;
                  })
                : filtered;

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sorted.map((trip) => {
                    const hasMatchingDate = Boolean(
                      dateFilter && trip.departure_dates?.some((d) => d.departure_date === dateFilter)
                    );
                    const tripIndex = trips.findIndex((item) => item.id === trip.id);

                    return (
                      <div
                        key={trip.id}
                        className="relative md:min-w-0"
                      >
                          {hasMatchingDate && (
                            <div className="absolute -top-2 left-2 z-10 rounded-full bg-sky-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-lg shadow-sky-500/30">
                              符合出發日
                            </div>
                          )}
                          {isDevMode && (
                            <div className="absolute right-2 top-12 z-10 flex flex-col gap-1">
                              {tripIndex > 0 && (
                                <button
                                  type="button"
                                  onClick={() => void handleTripReorder(tripIndex, -1)}
                                  className="flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-xs text-white/80 hover:bg-black/70"
                                  title="上移"
                                >
                                  ↑
                                </button>
                              )}
                              {tripIndex < trips.length - 1 && (
                                <button
                                  type="button"
                                  onClick={() => void handleTripReorder(tripIndex, 1)}
                                  className="flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-xs text-white/80 hover:bg-black/70"
                                  title="下移"
                                >
                                  ↓
                                </button>
                              )}
                            </div>
                          )}
                          <TripCard
                            id={trip.id}
                            title={trip.title}
                          duration={trip.duration}
                          price_range={getTripCardPrice(trip)}
                          cover_image_url={trip.cover_image_url}
                          document_url={trip.document_url}
                          document_is_available={trip.document_is_available}
                          departure_dates={trip.departure_dates}
                          tags={trip.trip_banner?.tags}
                          isDevMode={isDevMode}
                          isCustomTour={trip.trip_banner?.custom_tour ?? false}
                          isPromoEnabled={trip.trip_banner?.promo_enabled ?? false}
                          promoContent={trip.trip_banner?.promo_content || ''}
                          categoryLabel={subAreaFilter || ((trip.trip_banner?.sub_area as string) || '').split(',')[0].trim() || undefined}
                          onCustomTourToggle={handleCustomTourToggle}
                          onImageUpdate={handleTripImageUpdate}
                          onDocumentUpdate={handleTripDocumentUpdate}
                          onDocumentAvailabilityUpdate={handleTripDocumentAvailabilityUpdate}
                          onDurationUpdate={handleTripDurationUpdate}
                          onTitleUpdate={handleTripTitleUpdate}
                          onDelete={handleDeleteTrip}
                          onHide={handleHideTrip}
                        />
                      </div>
                    );
                  })}
                  {isDevMode && (
                    <button
                      onClick={handleAddTrip}
                      className="group/add col-span-full flex flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-sky-200 bg-gray-50 p-6 transition hover:border-sky-300 hover:bg-sky-50 md:flex-row md:p-8"
                    >
                      <div className="flex h-full w-32 shrink-0 items-center justify-center sm:w-40 md:w-48">
                        <svg className="h-10 w-10 text-sky-400 transition group-hover/add:text-sky-500 sm:h-12 sm:w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                      <div className="flex flex-1 flex-col justify-center p-2.5 sm:p-3 md:p-4">
                        <p className="text-xs font-semibold text-sky-600 sm:text-sm">新增行程</p>
                        <div className="mt-2 flex w-full items-center justify-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-[11px] font-semibold text-sky-600 sm:px-4 sm:py-2 sm:text-xs md:text-sm">
                          點擊新增
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              );
            })()}
          </>
        )}

        {/* 熱門行程推薦（直接顯示同區域推薦） */}
        {relatedTrips && relatedTrips.regionTrips.length > 0 && (
          <section className="mt-10">
            <div className="-mx-3 mb-4 rounded-xl bg-gradient-to-r from-red-700 via-amber-600 to-yellow-500 px-4 py-5 shadow-lg sm:-mx-4 sm:mb-6 sm:px-5 sm:py-6">
              <div className="flex flex-col items-center gap-1">
                <h2 className="text-xl font-black tracking-[0.15em] text-white drop-shadow-md sm:text-2xl">
                  {destination.regions?.title}熱門行程
                </h2>
                <div className="mt-0.5 h-[2px] w-16 rounded-full bg-gradient-to-r from-transparent via-yellow-300 to-transparent" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {relatedTrips.regionTrips.slice(0, 6).map((trip) => (
                <div key={trip.id} className="relative md:min-w-0">
                  {/* 推薦標籤 */}
                  <div className="absolute -top-1.5 left-2 z-10 flex items-center gap-1 rounded-md bg-gradient-to-r from-orange-400 to-orange-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-md sm:text-xs">
                    <span>👍</span>
                    <span>推薦</span>
                  </div>
                  <TripCard
                    id={trip.id}
                    title={trip.title}
                    duration={trip.duration}
                    price_range={getTripCardPrice(trip)}
                    cover_image_url={trip.cover_image_url}
                    document_url={trip.document_url}
                    document_is_available={trip.document_is_available}
                    departure_dates={trip.departure_dates}
                    tags={trip.trip_banner?.tags}
                    isDevMode={false}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 熱門行程推薦 fallback */}
        {relatedTrips && relatedTrips.regionTrips.length === 0 && relatedTrips.categoryTrips.length === 0 && popularFallback && popularFallback.length > 0 && (
          <section className="mt-10">
            <div className="-mx-3 mb-4 rounded-xl bg-gradient-to-r from-red-700 via-amber-600 to-yellow-500 px-4 py-5 shadow-lg sm:-mx-4 sm:mb-6 sm:px-5 sm:py-6">
              <div className="flex flex-col items-center gap-1">
                <h2 className="text-xl font-black tracking-[0.15em] text-white drop-shadow-md sm:text-2xl">
                  其他熱門行程推薦
                </h2>
                <div className="mt-0.5 h-[2px] w-16 rounded-full bg-gradient-to-r from-transparent via-yellow-300 to-transparent" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {popularFallback.slice(0, 6).map((trip) => (
                <div key={trip.id} className="relative md:min-w-0">
                  <div className="absolute -top-1.5 left-2 z-10 flex items-center gap-1 rounded-md bg-gradient-to-r from-orange-400 to-orange-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-md sm:text-xs">
                    <span>👍</span>
                    <span>推薦</span>
                  </div>
                  <TripCard
                    id={trip.id}
                    title={trip.title}
                    duration={trip.duration}
                    price_range={getTripCardPrice(trip)}
                    cover_image_url={trip.cover_image_url}
                    document_url={trip.document_url}
                    document_is_available={trip.document_is_available}
                    departure_dates={trip.departure_dates}
                    tags={trip.trip_banner?.tags}
                    isDevMode={false}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 載入推薦行程中 */}
        {trips.length > 0 && relatedLoading && (
          <div className="mt-10 flex items-center justify-center py-6">
            <div className="inline-block h-5 w-5 animate-spin rounded-full border-4 border-solid border-sky-400 border-r-transparent" />
            <span className="ml-2 text-sm text-gray-500">載入推薦行程...</span>
          </div>
        )}

        <SocialCta
          className="mt-10"
          title="找不到想要的行程？"
          description="聯繫旅遊規劃師蓋瑞 GARY，為您客製專屬行程"
        />
      </section>

      <FloatingContact />
      {isDevMode && (
        <button
          onClick={() => void handleScrapeThisPage()}
          disabled={scrapeTriggering || scrapeRunning}
          className="fixed bottom-20 right-4 z-50 flex items-center gap-2 rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-purple-500 disabled:opacity-60"
        >
          {scrapeRunning ? '⏳ 抓取進行中' : scrapeTriggering ? '⏳ 啟動中...' : '🔄 更新抓取此頁'}
        </button>
      )}
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
    </main>
  );
}
