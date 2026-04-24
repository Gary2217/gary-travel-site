"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getDestination, getDestinationTrips, type Destination, type Trip } from "@/lib/supabase";
import SocialCta from "@/components/SocialCta";
import StickyHeader from "@/components/StickyHeader";
import TripCard from "@/components/TripCard";
import DevModeToggle from "@/components/DevModeToggle";

export default function DestinationPage() {
  const params = useParams();
  const destinationId = params.id as string;

  const [destination, setDestination] = useState<Destination & { regions?: { category_label: string; title: string } } | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDevMode, setIsDevMode] = useState(false);

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

  const handleTripImageUpdate = (tripId: string, newImageUrl: string) => {
    setTrips(prev =>
      prev.map(trip =>
        trip.id === tripId ? { ...trip, cover_image_url: newImageUrl } : trip
      )
    );
  };

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

  if (error || !destination) {
    return (
      <main className="min-h-screen bg-[linear-gradient(135deg,#0b0f2a_0%,#0a0a0a_50%,#1a0d0d_100%)] text-white">
        <StickyHeader showBackButton />
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
    <main className="min-h-screen bg-[linear-gradient(135deg,#0b0f2a_0%,#0a0a0a_50%,#1a0d0d_100%)] text-white">
      <DevModeToggle onToggle={setIsDevMode} />
      <StickyHeader showBackButton />

      {/* Hero 區塊 */}
      <div className="relative h-48 overflow-hidden md:h-64">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${destination.image_url})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-black/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4 md:p-8">
          <div className="mx-auto max-w-[1400px]">
            {destination.regions && (
              <span className="mb-2 inline-block rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-sm">
                {destination.regions.category_label}
              </span>
            )}
            <h1 className="text-3xl font-bold text-white md:text-4xl">
              {destination.title}
            </h1>
            {destination.subtitle && (
              <p className="mt-1 text-base text-white/80 md:text-lg">{destination.subtitle}</p>
            )}
          </div>
        </div>
      </div>

      {/* 行程列表 */}
      <section className="mx-auto max-w-[1400px] px-4 py-6 md:px-8 md:py-10">
        <h2 className="mb-6 text-xl font-bold text-white md:text-2xl">
          可選行程（{trips.length}）
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-5">
          {trips.map((trip) => (
            <TripCard
              key={trip.id}
              id={trip.id}
              title={trip.title}
              duration={trip.duration}
              cover_image_url={trip.cover_image_url}
              isDevMode={isDevMode}
              onImageUpdate={handleTripImageUpdate}
            />
          ))}
          {/* 空白行程框，補滿至少 10 個 */}
          {Array.from({ length: Math.max(0, 10 - trips.length) }).map((_, i) => (
            <div
              key={`placeholder-${i}`}
              className="overflow-hidden rounded-[1.5rem] border border-dashed border-white/10 bg-[rgba(20,20,30,0.3)]"
            >
              <div className="flex h-36 items-center justify-center sm:h-40 md:h-44">
                <svg className="h-10 w-10 text-white/10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="p-3 sm:p-4">
                <p className="min-h-[2.5rem] text-sm text-white/30">敬請期待</p>
                <div className="mt-3 flex w-full items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/30 sm:text-sm">
                  即將上架
                </div>
              </div>
            </div>
          ))}
        </div>

        <SocialCta
          className="mt-10"
          title="找不到想要的行程？"
          description={`聯繫旅遊規劃師蓋瑞 GARY，為您客製專屬的 ${destination.title} 行程`}
        />
      </section>
    </main>
  );
}
