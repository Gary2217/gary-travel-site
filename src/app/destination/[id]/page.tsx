"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getDestination, getDestinationTrips, getSiteLogo, createTrip, deleteTrip, type Destination, type Trip } from "@/lib/supabase";
import FloatingContact from "@/components/FloatingContact";
import ScrollToTop from "@/components/ScrollToTop";
import SocialCta from "@/components/SocialCta";
import StickyHeader from "@/components/StickyHeader";
import TripCard from "@/components/TripCard";
import DevModeToggle from "@/components/DevModeToggle";

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

  // 從 URL query params 讀取搜尋條件
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const qs = new URLSearchParams(window.location.search);
    setDateFilter(qs.get('date') || '');
    setCityFilter(qs.get('city') || '');
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const [destData, tripsData] = await Promise.all([
          getDestination(destinationId),
          getDestinationTrips(destinationId),
        ]);
        setDestination(destData);
        setTrips(tripsData);
      } catch {
        setError("無法載入資料，請重新整理頁面");
      } finally {
        setLoading(false);
      }
    }
    loadData();
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
      <main className="min-h-screen bg-[#0f1923] text-white">
        <StickyHeader showBackButton backHref="/" logoUrl={siteLogoUrl} />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-sky-400 border-r-transparent" />
            <p className="mt-4 text-white/70">載入中...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !destination) {
    return (
      <main className="min-h-screen bg-[#0f1923] text-white">
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
    <main className="min-h-screen bg-[#0f1923] pt-14 text-white">
      <StickyHeader showBackButton backHref="/" logoUrl={siteLogoUrl} devModeSlot={<DevModeToggle onToggle={setIsDevMode} />} />

      {/* Hero 區塊 */}
      <div className="relative h-48 overflow-hidden sm:h-56 md:h-64">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${destination.image_url})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f1923] via-black/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 md:p-8">
          <div className="mx-auto max-w-[1100px]">
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
      <section className="mx-auto max-w-[1100px] px-3 py-4 sm:px-4 sm:py-6 md:px-8 md:py-10">

        {/* 搜尋條件 banner */}
        {(dateFilter || cityFilter) && (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-2.5">
            <svg className="h-4 w-4 shrink-0 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            <span className="text-sm text-sky-200">搜尋條件：</span>
            {cityFilter && (
              <span className="rounded-full bg-violet-500/20 px-2.5 py-0.5 text-xs font-semibold text-violet-300">
                出發地：{cityFilter}
              </span>
            )}
            {dateFilter && (
              <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
                出發日：{formatDate(dateFilter)}
              </span>
            )}
            <button
              onClick={clearFilters}
              className="ml-auto text-xs text-white/40 transition hover:text-white"
            >
              清除篩選
            </button>
          </div>
        )}

        {/* 無符合梯次提示 */}
        {dateFilter && trips.length > 0 && !trips.some((t) => t.departure_dates?.some((d) => d.departure_date === dateFilter)) && (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3.5">
            <div className="flex items-start gap-3">
              <svg className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-amber-300">
                  {formatDate(dateFilter)} 目前暫無出發梯次
                </p>
                <p className="mt-0.5 text-xs text-amber-200/70">
                  以下為其他可選行程，歡迎諮詢旅遊規劃師蓋瑞，為您安排客製出發日期
                </p>
              </div>
            </div>
          </div>
        )}

        <h2 className="mb-4 text-lg font-bold text-white sm:mb-6 sm:text-xl md:text-2xl">
          可選行程（{trips.length}）
        </h2>

        {(() => {
          // 有日期篩選時，符合梯次的行程排前面
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
                return (
                  <div key={trip.id} className="relative">
                    {hasMatchingDate && (
                      <div className="absolute -top-2 left-2 z-10 rounded-full bg-sky-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-lg shadow-sky-500/30">
                        符合出發日
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
              {/* Dev mode: 新增行程按鈕 */}
              {isDevMode && (
                <button
                  onClick={handleAddTrip}
                  className="group/add flex flex-col overflow-hidden rounded-xl border-2 border-dashed border-[#00b4d8]/30 bg-[#1a3347]/50 transition hover:border-[#00b4d8]/50 hover:bg-[#00b4d8]/10"
                >
                  <div className="flex h-28 items-center justify-center sm:h-36 md:h-44">
                    <svg className="h-10 w-10 text-sky-500/50 transition group-hover/add:text-sky-400/70 sm:h-12 sm:w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div className="p-2 sm:p-3 md:p-4">
                    <p className="min-h-[2rem] text-xs font-semibold text-sky-400/70 sm:min-h-[2.5rem] sm:text-sm">新增行程</p>
                    <div className="mt-2 flex w-full items-center justify-center rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-[11px] font-semibold text-sky-400/80 sm:mt-3 sm:px-4 sm:py-2 sm:text-xs md:text-sm">
                      點擊新增
                    </div>
                  </div>
                </button>
              )}
            </div>
          );
        })()}

        <SocialCta
          className="mt-10"
          title="找不到想要的行程？"
          description={`聯繫旅遊規劃師蓋瑞 GARY，為您客製專屬的 ${destination.title} 行程`}
          logoUrl={siteLogoUrl}
        />
      </section>

      <FloatingContact />
      <ScrollToTop />
    </main>
  );
}
