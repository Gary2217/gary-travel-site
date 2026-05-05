"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getRegionsWithDestinations, getSiteLogo, trackClick } from "@/lib/supabase";
import DevModeToggle from "@/components/DevModeToggle";
import ImageEditor from "@/components/ImageEditor";
import LogoUploader from "@/components/LogoUploader";
import FloatingContact from "@/components/FloatingContact";
import ScrollToTop from "@/components/ScrollToTop";
import SocialCta from "@/components/SocialCta";
import StickyHeader from "@/components/StickyHeader";
import TravelSearchBar from "@/components/TravelSearchBar";
import ContactInquiries from "@/components/ContactInquiries";

type Destination = {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
};

type RouteSection = {
  id: string;
  categoryLabel: string;
  title: string;
  description: string;
  destinations: Destination[];
};

export default function HomePage() {
  const [sections, setSections] = useState<RouteSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDevMode, setIsDevMode] = useState(false);
  const [siteLogoUrl, setSiteLogoUrl] = useState('/travel-logo.svg');
  const [filterRegionId, setFilterRegionId] = useState<string | null>(null);
  const [filterDestId, setFilterDestId] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState('');
  const [popularTrips, setPopularTrips] = useState<{
    id: string;
    title: string;
    duration: string;
    price_range: string;
    cover_image_url: string;
    destination_name: string;
  }[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        setError(null);
        const data = await getRegionsWithDestinations();
        const formattedSections = data.map((region: any) => ({
          id: region.id,
          categoryLabel: region.category_label,
          title: region.title,
          description: region.description || '',
          destinations: (region.destinations || []).map((dest: any) => ({
            id: dest.id,
            title: dest.title,
            subtitle: dest.subtitle || '',
            image_url: dest.image_url
          }))
        }));
        setSections(formattedSections);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('無法載入資料，請重新整理頁面');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

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
    async function loadPopular() {
      try {
        const res = await fetch('/api/popular-trips', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setPopularTrips(data);
        }
      } catch {
        // 靜默失敗
      }
    }
    loadPopular();
  }, []);

  const handleSearch = ({ regionId, destinationId, date }: { departureCity: string; regionId: string | null; destinationId: string | null; date: string }) => {
    setFilterRegionId(regionId);
    setFilterDestId(destinationId);
    setFilterDate(date);
    if (regionId) {
      setTimeout(() => scrollToSection(regionId), 50);
    }
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0f1923] text-white">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#00b4d8] border-r-transparent"></div>
          <p className="mt-4 text-white/50">載入中...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0f1923] text-white">
        <div className="text-center px-4">
          <p className="text-lg text-red-400">{error}</p>
          <button
            onClick={() => { setLoading(true); setError(null); window.location.reload(); }}
            className="mt-4 rounded-lg bg-[#00b4d8] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#0096c7]"
          >
            重新載入
          </button>
        </div>
      </main>
    );
  }

  const handleImageUpdate = (destinationId: string, newImageUrl: string) => {
    setSections(prevSections =>
      prevSections.map(section => ({
        ...section,
        destinations: section.destinations.map(dest =>
          dest.id === destinationId ? { ...dest, image_url: newImageUrl } : dest
        )
      }))
    );
  };

  return (
    <main className="min-h-screen bg-[#0f1923] pt-14 text-white">
      <StickyHeader
        logoUrl={siteLogoUrl}
        logoEditorSlot={isDevMode ? <LogoUploader currentLogoUrl={siteLogoUrl} onUpdate={setSiteLogoUrl} /> : null}
        devModeSlot={<DevModeToggle onToggle={setIsDevMode} />}
      />

      {/* Search Section */}
      <section className="bg-gradient-to-b from-[#162a3a] to-[#0f1923] px-4 pb-6 pt-3">
        <TravelSearchBar
          regions={sections.map((s) => ({
            id: s.id,
            categoryLabel: s.categoryLabel,
            destinations: s.destinations.map((d) => ({ id: d.id, title: d.title })),
          }))}
          onSearch={handleSearch}
        />
      </section>

      {/* Region Tabs */}
      <div className="sticky top-14 z-40 border-b border-white/[0.08] bg-[rgba(15,25,35,0.92)] backdrop-blur-[8px]">
        <div className="mx-auto max-w-[1100px] overflow-x-auto px-4 py-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex gap-2 justify-center min-w-max md:min-w-0 md:flex-wrap">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => scrollToSection(section.id)}
                className="rounded-full border border-white/[0.08] bg-transparent px-4 py-1.5 text-xs font-medium text-white/75 transition hover:border-[#00b4d8] hover:bg-[rgba(0,180,216,0.15)] hover:text-[#48cae4]"
              >
                {section.categoryLabel}
              </button>
            ))}
            <Link
              href="/flights"
              className="rounded-full border border-white/[0.08] bg-transparent px-4 py-1.5 text-xs font-medium text-white/75 transition hover:border-[#00b4d8] hover:bg-[rgba(0,180,216,0.15)] hover:text-[#48cae4]"
            >
              機票
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-[1100px] px-4 py-6 md:px-5">
        {/* 熱門推薦 */}
        {popularTrips.length > 0 && !filterRegionId && (
          <section className="mb-10">
            <div className="mb-4 px-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl">&#x1F525;</span>
                <h2 className="text-lg font-bold text-white">
                  熱門推薦
                </h2>
                <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
                  2025–2026
                </span>
              </div>
              <p className="mt-1 text-xs text-white/50">最多台灣人出發的團體行程，精選人氣路線一次看</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {popularTrips.map((trip, i) => (
                <Link
                  key={trip.id}
                  href={`/trip/${trip.id}`}
                  className="group relative block overflow-hidden rounded-xl border border-white/10 bg-[#182838] transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/30"
                >
                  {/* 排名徽章 */}
                  {i < 3 && (
                    <div className={`absolute left-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white shadow-lg ${
                      i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-gray-400' : 'bg-amber-700'
                    }`}>
                      {i + 1}
                    </div>
                  )}
                  {/* 封面圖 */}
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src={trip.cover_image_url}
                      alt={trip.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    {/* 天數標籤 */}
                    <div className="absolute right-2 top-2 rounded-full bg-sky-500/90 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                      {trip.duration}
                    </div>
                  </div>
                  {/* 行程資訊 */}
                  <div className="p-2.5 sm:p-3">
                    {trip.destination_name && (
                      <p className="mb-0.5 text-[10px] font-medium text-sky-400">{trip.destination_name}</p>
                    )}
                    <h3 className="line-clamp-2 min-h-[2rem] text-xs font-bold leading-snug text-white sm:text-sm">
                      {trip.title}
                    </h3>
                    {trip.price_range && (
                      <p className="mt-1 text-xs font-bold text-amber-300">
                        {trip.price_range.replace(/NT\$\s*/g, 'NT $ ').replace(/\s*[~～]\s*/g, ' ~ ')}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {(() => {
          let filtered = sections;

          if (filterRegionId) {
            const matchedSection = sections.find((s) => s.id === filterRegionId);
            if (matchedSection) {
              const section = filterDestId
                ? { ...matchedSection, destinations: matchedSection.destinations.filter((d) => d.id === filterDestId) }
                : matchedSection;
              filtered = [section];
            } else {
              filtered = [];
            }
          }

          if ((filterRegionId || filterDate) && filtered.length === 0) {
            return (
              <div className="py-16 text-center">
                <p className="text-base text-white/50">找不到符合條件的目的地</p>
                <button
                  onClick={() => handleSearch({ departureCity: '', regionId: null, destinationId: null, date: '' })}
                  className="mt-4 rounded-lg bg-[#00b4d8] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#0096c7]"
                >
                  清除篩選
                </button>
              </div>
            );
          }

          return filtered.map((section) => (
            <section key={section.id} id={section.id} className="mb-8 scroll-mt-[120px]">
              <div className="mb-3 flex items-baseline justify-between px-1">
                <div>
                  <h2 className="text-lg font-bold text-white">{section.title}</h2>
                  <p className="text-xs text-white/50">{section.description}</p>
                </div>
              </div>

              {section.destinations.length === 0 ? (
                <div className="rounded-xl border border-white/[0.08] bg-[#1a3347] px-5 py-6 text-sm text-white/50">
                  尚無目的地
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {section.destinations.map((destination) => (
                    <Link
                      key={destination.id}
                      href={`/destination/${destination.id}`}
                      className="group relative block aspect-[4/3] overflow-hidden rounded-xl border border-white/[0.08] transition hover:-translate-y-1 hover:shadow-lg hover:shadow-black/30"
                      onClick={() => { if (!isDevMode) trackClick(destination.id); }}
                    >
                      {isDevMode && (
                        <ImageEditor
                          entityId={destination.id}
                          currentImageUrl={destination.image_url}
                          title={destination.title}
                          onUpdate={(newUrl) => handleImageUpdate(destination.id, newUrl)}
                        />
                      )}
                      <img
                        src={destination.image_url}
                        alt={destination.title}
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-3">
                        <h3 className="text-sm font-bold text-white sm:text-base">{destination.title}</h3>
                        <p className="mt-0.5 text-[11px] text-white/80">{destination.subtitle}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          ));
        })()}

        <SocialCta
          className="mt-10"
          title="找到心儀的旅遊目的地了嗎？"
          description="立即聯繫旅遊規劃師 蓋瑞 GARY，為您量身打造專屬行程"
          logoUrl={siteLogoUrl}
        />

        {isDevMode && <ContactInquiries />}
      </div>

      <FloatingContact />
      <ScrollToTop />
    </main>
  );
}
