"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getTripWithDays, type Trip } from "@/lib/supabase";
import StickyHeader from "@/components/StickyHeader";
import DayItinerary from "@/components/DayItinerary";
import InquiryButtons from "@/components/InquiryButtons";
import InquiryForm from "@/components/InquiryForm";

export default function TripPage() {
  const params = useParams();
  const tripId = params.id as string;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getTripWithDays(tripId);
        setTrip(data);
      } catch {
        setError("無法載入行程資料");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [tripId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[linear-gradient(135deg,#0b0f2a_0%,#0a0a0a_50%,#1a0d0d_100%)] text-white">
        <StickyHeader showBackButton />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-sky-400 border-r-transparent" />
            <p className="mt-4 text-white/70">載入中...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !trip) {
    return (
      <main className="min-h-screen bg-[linear-gradient(135deg,#0b0f2a_0%,#0a0a0a_50%,#1a0d0d_100%)] text-white">
        <StickyHeader showBackButton />
        <div className="flex min-h-[60vh] items-center justify-center px-4">
          <div className="text-center">
            <p className="text-lg text-red-400">{error || "找不到此行程"}</p>
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

  const days = trip.trip_days || [];

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#0b0f2a_0%,#0a0a0a_50%,#1a0d0d_100%)] text-white">
      <StickyHeader showBackButton />

      {/* 浮動詢問按鈕 */}
      <InquiryButtons tripTitle={trip.title} variant="floating" />

      {/* Hero 區塊 */}
      <div className="relative h-56 overflow-hidden md:h-72">
        {trip.cover_image_url ? (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${trip.cover_image_url})` }}
          />
        ) : (
          <div className="absolute inset-0 bg-[rgba(20,20,30,0.6)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-black/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4 md:p-8">
          <div className="mx-auto max-w-[1000px]">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-sky-500/90 px-3 py-1 text-xs font-bold text-white">
                {trip.duration}
              </span>
              {trip.price_range && (
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
                  {trip.price_range}
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold text-white md:text-4xl">{trip.title}</h1>
            {trip.subtitle && (
              <p className="mt-1 text-base text-white/80 md:text-lg">{trip.subtitle}</p>
            )}
          </div>
        </div>
      </div>

      {/* 內容區 */}
      <div className="mx-auto max-w-[1000px] px-4 py-6 md:px-8 md:py-10">
        {/* 亮點標籤 */}
        {trip.highlights && trip.highlights.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-white/50">行程亮點</h2>
            <div className="flex flex-wrap gap-2">
              {trip.highlights.map((highlight) => (
                <span
                  key={highlight}
                  className="rounded-full border border-sky-500/20 bg-sky-500/10 px-4 py-1.5 text-sm font-medium text-sky-300"
                >
                  {highlight}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 每日行程 */}
        {days.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-4 text-xl font-bold text-white md:text-2xl">每日行程</h2>
            <div className="space-y-3">
              {days.map((day) => (
                <DayItinerary
                  key={day.id}
                  dayNumber={day.day_number}
                  title={day.title}
                  description={day.description}
                  meals={day.meals}
                  accommodation={day.accommodation}
                  activities={day.activities || []}
                />
              ))}
            </div>
          </div>
        )}

        {/* 索取行程 / 詢問報價 CTA */}
        <div className="mb-8">
          <InquiryButtons tripTitle={trip.title} variant="inline" />
        </div>

        {/* 線上諮詢表單 */}
        <InquiryForm tripId={trip.id} tripTitle={trip.title} />
      </div>
    </main>
  );
}
