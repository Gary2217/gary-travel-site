"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { searchTripsByDate, getSiteLogo, type Trip } from "@/lib/supabase";
import StickyHeader from "@/components/StickyHeader";
import TripCard from "@/components/TripCard";
import SocialCta from "@/components/SocialCta";
import FloatingContact from "@/components/FloatingContact";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const date = searchParams.get("date") || "";
  const city = searchParams.get("city") || "";

  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [siteLogoUrl, setSiteLogoUrl] = useState("/travel-logo.svg");

  useEffect(() => {
    getSiteLogo().then(setSiteLogoUrl).catch(() => {});
  }, []);

  useEffect(() => {
    if (!date) {
      setLoading(false);
      return;
    }
    let isMounted = true;
    setLoading(true);
    searchTripsByDate(date, city || undefined)
      .then((data) => {
        if (isMounted) setTrips(data);
      })
      .catch(() => {
        if (isMounted) setError("搜尋失敗，請重新整理頁面");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, [date, city]);

  const formatDate = (d: string) => {
    if (!d) return "";
    const [y, m, day] = d.split("-");
    return `${y}/${m}/${day}`;
  };

  const getTripCardPrice = (trip: Trip) => {
    const firstPrice = trip.departure_dates?.[0]?.price;
    if (typeof firstPrice === "number" && firstPrice > 0) {
      return `NT$ ${firstPrice.toLocaleString("zh-TW")}`;
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
            <p className="mt-4 text-gray-600">搜尋中...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-transparent pt-14 text-gray-900">
      <StickyHeader showBackButton backHref="/" logoUrl={siteLogoUrl} />

      <section className="mx-auto max-w-site px-3 py-4 sm:px-4 sm:py-6 md:px-8 md:py-10">
        {/* 搜尋條件 */}
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5">
          <svg className="h-4 w-4 shrink-0 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-sm text-sky-700">搜尋條件：</span>
          {date && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
              出發日：{formatDate(date)}
            </span>
          )}
          {city && (
            <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
              出發地：{city}
            </span>
          )}
          <a href="/" className="ml-auto text-xs text-gray-400 transition hover:text-gray-700">
            清除搜尋
          </a>
        </div>

        {error ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <p className="text-lg text-red-400">{error}</p>
          </div>
        ) : !date ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <p className="text-gray-500">請選擇出發日期後搜尋</p>
          </div>
        ) : trips.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-lg font-bold text-gray-700">{formatDate(date)} 暫無出發行程</p>
            <p className="mt-2 text-sm text-gray-500">歡迎聯繫旅遊規劃師蓋瑞，為您安排客製出發日期</p>
          </div>
        ) : (
          <>
            <h2 className="mb-4 text-lg font-bold text-gray-900 sm:mb-6 sm:text-xl">
              {formatDate(date)} 出發行程（{trips.length}）
            </h2>
            <div className="flex flex-col gap-3">
              {trips.map((trip) => (
                <TripCard
                  key={trip.id}
                  id={trip.id}
                  title={trip.title}
                  duration={trip.duration}
                  price_range={getTripCardPrice(trip)}
                  cover_image_url={trip.cover_image_url}
                  document_url={trip.document_url}
                  document_is_available={trip.document_is_available}
                  departure_dates={trip.departure_dates}
                  isPromoEnabled={trip.trip_banner?.promo_enabled ?? false}
                  promoContent={trip.trip_banner?.promo_content || ""}
                />
              ))}
            </div>
          </>
        )}

        <SocialCta
          className="mt-10"
          title="找不到想要的行程？"
          description="聯繫旅遊規劃師蓋瑞 GARY，為您客製專屬行程"
        />
      </section>

      <FloatingContact />
    </main>
  );
}
