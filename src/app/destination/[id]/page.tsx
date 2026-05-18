"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getDestination, getDestinationTrips, getRelatedTrips, getSiteLogo, createTrip, deleteTrip, lineDmHref, type Destination, type Trip } from "@/lib/supabase";
import { openExternalLink } from "@/lib/external-link";
import FloatingContact from "@/components/FloatingContact";
import SocialCta from "@/components/SocialCta";
import StickyHeader from "@/components/StickyHeader";
import TripCard from "@/components/TripCard";
import DevModeToggle from "@/components/DevModeToggle";

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
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDevMode, setIsDevMode] = useState(false);
  const [siteLogoUrl, setSiteLogoUrl] = useState('/travel-logo.svg');
  const [dateFilter, setDateFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [relatedTrips, setRelatedTrips] = useState<{ regionTrips: Trip[]; categoryTrips: Trip[] } | null>(null);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isPC, setIsPC] = useState(false);

  // 從 URL query params 讀取搜尋條件
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const qs = new URLSearchParams(window.location.search);
    setDateFilter(qs.get('date') || '');
    setCityFilter(qs.get('city') || '');
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [destData, tripsData] = await Promise.all([
          getDestination(destinationId),
          getDestinationTrips(destinationId),
        ]);
        if (!isMounted) return;
        setDestination(destData);
        setTrips(tripsData);

        if (tripsData.length === 0 && destData.region_id && destData.regions?.category_label) {
          setRelatedLoading(true);
          try {
            const related = await getRelatedTrips(
              destData.region_id,
              destData.regions.category_label,
              destinationId
            );
            if (!isMounted) return;
            setRelatedTrips(related);
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

  const handleAddTrip = async () => {
    try {
      const newTrip = await createTrip(destinationId);
      setTrips(prev => [...prev, { ...newTrip, document_is_available: false }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "新增失敗";
      alert(`新增行程失敗：${msg}`);
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
    router.replace(`/destination/${destinationId}`);
  };

  const formatDate = (d: string) => {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${y}/${m}/${day}`;
  };

  const getTripCardPrice = (trip: Trip) => {
    const firstDeparturePrice = trip.departure_dates?.[0]?.price;

    if (typeof firstDeparturePrice === 'number' && firstDeparturePrice > 0) {
      return `NT$ ${firstDeparturePrice.toLocaleString('zh-TW')}`;
    }

    return trip.price_range;
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

  if (error || !destination) {
    return (
      <main className="min-h-screen bg-transparent text-gray-900">
        <StickyHeader showBackButton backHref="/" logoUrl={siteLogoUrl} />
        <div className="flex min-h-[60vh] items-center justify-center px-4">
          <div className="text-center">
            <p className="text-lg text-red-400">{error || "找不到此目的地"}</p>
            <button
              onClick={() => window.history.back()}
              className="mt-4 rounded-full bg-sky-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
            >
              返回上一頁
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-transparent pt-14 text-gray-900">
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
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:gap-4 lg:grid-cols-5">
                            {g.trips.map((trip) => (
                              <TripCard key={trip.id} id={trip.id} title={trip.title} duration={trip.duration}
                                price_range={getTripCardPrice(trip)} cover_image_url={trip.cover_image_url}
                                document_url={trip.document_url} document_is_available={trip.document_is_available} isDevMode={false} />
                            ))}
                          </div>
                        </div>
                      )) : (
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:gap-4 lg:grid-cols-5">
                          {trips.map((trip) => (
                            <TripCard key={trip.id} id={trip.id} title={trip.title} duration={trip.duration}
                              price_range={getTripCardPrice(trip)} cover_image_url={trip.cover_image_url}
                              document_url={trip.document_url} document_is_available={trip.document_is_available} isDevMode={false} />
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
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:gap-4 lg:grid-cols-5">
                            {g.trips.map((trip) => (
                              <TripCard key={trip.id} id={trip.id} title={trip.title} duration={trip.duration}
                                price_range={getTripCardPrice(trip)} cover_image_url={trip.cover_image_url}
                                document_url={trip.document_url} document_is_available={trip.document_is_available} isDevMode={false} />
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
              可選行程（{trips.length}）
            </h2>

            {(() => {
              const sorted = dateFilter
                ? [...trips].sort((a, b) => {
                    const aMatch = a.departure_dates?.some((d) => d.departure_date === dateFilter) ? 0 : 1;
                    const bMatch = b.departure_dates?.some((d) => d.departure_date === dateFilter) ? 0 : 1;
                    return aMatch - bMatch;
                  })
                : trips;

              return (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:gap-4 lg:grid-cols-5">
                  {sorted.map((trip) => {
                    const hasMatchingDate = Boolean(
                      dateFilter && trip.departure_dates?.some((d) => d.departure_date === dateFilter)
                    );
                    const tripIndex = trips.findIndex((item) => item.id === trip.id);

                    return (
                      <div
                        key={trip.id}
                        draggable={isDevMode && isPC}
                        onDragStart={handleDragStart(tripIndex)}
                        onDragOver={handleDragOver(tripIndex)}
                        onDragEnd={handleDragEnd}
                        onDrop={handleDrop(tripIndex)}
                        className={`relative ${isDevMode && isPC ? 'cursor-grab active:cursor-grabbing' : ''} ${dragIndex === tripIndex ? 'opacity-50' : ''} ${dragOverIndex === tripIndex ? 'ring-2 ring-sky-400 rounded-xl' : ''}`}
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
                          isDevMode={isDevMode}
                          onImageUpdate={handleTripImageUpdate}
                          onDocumentUpdate={handleTripDocumentUpdate}
                          onDocumentAvailabilityUpdate={handleTripDocumentAvailabilityUpdate}
                          onDurationUpdate={handleTripDurationUpdate}
                          onTitleUpdate={handleTripTitleUpdate}
                          onDelete={handleDeleteTrip}
                        />
                      </div>
                    );
                  })}
                  {isDevMode && (
                    <button
                      onClick={handleAddTrip}
                      className="group/add flex flex-col overflow-hidden rounded-xl border-2 border-dashed border-sky-200 bg-gray-50 transition hover:border-sky-300 hover:bg-sky-50"
                    >
                      <div className="flex h-32 items-center justify-center sm:h-36 md:h-44">
                        <svg className="h-10 w-10 text-sky-400 transition group-hover/add:text-sky-500 sm:h-12 sm:w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                      <div className="p-2 sm:p-3 md:p-4">
                        <p className="min-h-[2rem] text-xs font-semibold text-sky-600 sm:min-h-[2.5rem] sm:text-sm">新增行程</p>
                        <div className="mt-2 flex w-full items-center justify-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-[11px] font-semibold text-sky-600 sm:mt-3 sm:px-4 sm:py-2 sm:text-xs md:text-sm">
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

        <SocialCta
          className="mt-10"
          title="找不到想要的行程？"
          description={`聯繫旅遊規劃師蓋瑞 GARY，為您客製專屬的 ${destination.title} 行程`}
        />
      </section>

      <FloatingContact />
    </main>
  );
}
