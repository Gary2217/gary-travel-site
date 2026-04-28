"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getRegionsWithDestinations, getSiteLogo, trackClick } from "@/lib/supabase";
import DevModeToggle from "@/components/DevModeToggle";
import ImageEditor from "@/components/ImageEditor";
import LogoUploader from "@/components/LogoUploader";
import FloatingContact from "@/components/FloatingContact";
import SocialCta from "@/components/SocialCta";
import StickyHeader from "@/components/StickyHeader";
import { flightHref } from "@/lib/supabase";

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

const sectionTitleGradients: Record<string, string> = {
  '日本': 'from-sky-200 via-cyan-400 to-blue-600',
  '韓國': 'from-fuchsia-200 via-pink-400 to-rose-600',
  '東南亞': 'from-violet-200 via-purple-400 to-fuchsia-600',
  '歐洲': 'from-amber-200 via-orange-400 to-red-600',
  '美洲': 'from-indigo-200 via-violet-400 to-sky-600',
  '紐澳': 'from-cyan-200 via-teal-400 to-emerald-600',
  '中東': 'from-yellow-200 via-amber-400 to-orange-600',
  '中港澳': 'from-emerald-200 via-lime-400 to-green-600',
  '中非': 'from-rose-200 via-red-400 to-orange-600',
  '台灣': 'from-slate-200 via-sky-400 to-cyan-600',
};

function getSectionTitleGradient(section: RouteSection, index: number) {
  const titleKey = section.categoryLabel.replace(/旅遊.*$/, '');
  const fallbackGradients = [
    'from-sky-200 via-cyan-400 to-blue-600',
    'from-fuchsia-200 via-pink-400 to-rose-600',
    'from-violet-200 via-purple-400 to-fuchsia-600',
    'from-amber-200 via-orange-400 to-red-600',
    'from-indigo-200 via-violet-400 to-sky-600',
    'from-cyan-200 via-teal-400 to-emerald-600',
    'from-yellow-200 via-amber-400 to-orange-600',
  ];
  return sectionTitleGradients[titleKey] || fallbackGradients[index % fallbackGradients.length];
}

function RouteRow({
  section,
  isDevMode,
  onImageUpdate,
  sectionIndex,
}: {
  section: RouteSection;
  isDevMode: boolean;
  onImageUpdate: (destinationId: string, newImageUrl: string) => void;
  sectionIndex: number;
}) {
  const hasDestinations = section.destinations.length > 0;
  const rowRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const pauseTimeoutRef = useRef<number | null>(null);
  const pauseUntilRef = useRef(0);
  const isHoveringRef = useRef(false);
  const hasInitializedPositionRef = useRef(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null);
  const loopedDestinations = [...section.destinations, ...section.destinations, ...section.destinations];

  useEffect(() => {
    const element = rowRef.current;

    if (!element || !hasDestinations) {
      return;
    }

    hasInitializedPositionRef.current = false;
    isHoveringRef.current = false;
    pauseUntilRef.current = 0;

    const normalizeScrollPosition = (segmentWidth: number) => {
      if (segmentWidth <= 0) {
        return;
      }

      if (element.scrollLeft >= segmentWidth * 2) {
        element.scrollLeft -= segmentWidth;
      } else if (element.scrollLeft <= 0) {
        element.scrollLeft += segmentWidth;
      }
    };

    const tick = () => {
      if (!element) {
        return;
      }

      const segmentWidth = element.scrollWidth / 3;
      const isMeasurable = segmentWidth > 0 && element.scrollWidth > element.clientWidth;

      if (isMeasurable) {
        if (!hasInitializedPositionRef.current) {
          element.scrollLeft = segmentWidth;
          hasInitializedPositionRef.current = true;
        }

        normalizeScrollPosition(segmentWidth);

        if (!isHoveringRef.current && !isEditorOpen && Date.now() >= pauseUntilRef.current) {
          element.scrollLeft += 0.8;
        }
      } else {
        hasInitializedPositionRef.current = false;
      }

      frameRef.current = window.requestAnimationFrame(tick);
    };

    frameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (pauseTimeoutRef.current !== null) {
        window.clearTimeout(pauseTimeoutRef.current);
        pauseTimeoutRef.current = null;
      }

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }

      hasInitializedPositionRef.current = false;
      isHoveringRef.current = false;
      pauseUntilRef.current = 0;
    };
  }, [hasDestinations, isEditorOpen]);

  const pauseAutoScroll = (duration = 2000) => {
    pauseUntilRef.current = Date.now() + duration;

    if (pauseTimeoutRef.current !== null) {
      window.clearTimeout(pauseTimeoutRef.current);
    }

    pauseTimeoutRef.current = window.setTimeout(() => {
      pauseUntilRef.current = 0;
      pauseTimeoutRef.current = null;
    }, duration);
  };

  const handleMouseEnter = () => {
    isHoveringRef.current = true;
  };

  const handleMouseLeave = () => {
    isHoveringRef.current = false;
  };

  const scroll = (direction: number) => {
    const element = rowRef.current;

    if (!element) {
      return;
    }

    pauseAutoScroll();

    const segmentWidth = element.scrollWidth / 3;
    const firstCard = element.querySelector("[data-destination-card='true']") as HTMLDivElement | null;
    const gapValue = window.getComputedStyle(element).columnGap || window.getComputedStyle(element).gap;
    const gap = Number.parseFloat(gapValue || "0") || 0;
    const cardWidth = firstCard ? firstCard.offsetWidth + gap : 320;

    if (element.scrollLeft >= segmentWidth * 2) {
      element.scrollLeft -= segmentWidth;
    }

    if (element.scrollLeft <= 0) {
      element.scrollLeft += segmentWidth;
    }

    element.scrollBy({ left: direction * cardWidth, behavior: "smooth" });
  };

  return (
    <section
      id={section.id}
      className="scroll-mt-[130px] rounded-[1.75rem] bg-[rgba(20,20,30,0.65)] px-0.5 py-3 shadow-lg shadow-black/10 backdrop-blur-[6px] md:scroll-mt-[142px] md:px-1 md:py-4 lg:scroll-mt-[118px] lg:px-1.5 lg:py-5"
    >
      <div className="mb-2 flex items-center justify-center px-2 text-center sm:mb-3 sm:px-0">
        <div className="relative mx-auto w-full max-w-3xl">
          <h2 className={`bg-gradient-to-r ${getSectionTitleGradient(section, sectionIndex)} bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl md:text-4xl`}>
            {section.title}
          </h2>
          <p className="mt-0.5 text-xs leading-5 text-white/75 sm:mt-1 sm:text-sm sm:leading-6">
            {section.description}
          </p>
        </div>
      </div>

      {!hasDestinations ? (
        <div className="rounded-[1.5rem] border border-white/10 bg-[rgba(20,20,30,0.6)] px-5 py-6 text-sm leading-6 text-white/70 backdrop-blur-[12px]">
          {section.description}
        </div>
      ) : (
        <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
          <button
            type="button"
            aria-label="向左捲動"
            onClick={() => scroll(-1)}
            className="absolute left-0 top-1/2 z-20 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[rgba(20,20,30,0.7)] text-base font-bold text-white shadow-lg shadow-black/30 transition hover:bg-[rgba(35,35,50,0.85)] sm:h-12 sm:w-12 sm:-left-3 sm:text-xl lg:-left-4"
          >
            ‹
          </button>

          <div
            ref={rowRef}
            className="flex gap-4 overflow-x-auto px-10 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-12"
          >
            {loopedDestinations.map((destination, destinationIndex) => (
              <Link
                key={`${section.title}-${destination.title}-${destinationIndex}`}
                href={`/destination/${destination.id}`}
                prefetch={true}
                data-destination-card="true"
                draggable={false}
                className="group relative block h-[120px] min-w-[200px] cursor-pointer overflow-hidden rounded-[1.25rem] border border-white/10 bg-[rgba(20,20,30,0.45)] shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:shadow-xl sm:h-[144px] sm:min-w-[280px] sm:rounded-[1.5rem] md:h-[168px] md:min-w-[320px] lg:min-w-[340px]"
                onMouseDown={(e) => { mouseDownPos.current = { x: e.clientX, y: e.clientY }; }}
                onClick={(e) => {
                  if (!mouseDownPos.current) return;
                  const dx = Math.abs(e.clientX - mouseDownPos.current.x);
                  const dy = Math.abs(e.clientY - mouseDownPos.current.y);
                  if (dx >= 5 || dy >= 5 || isDevMode) {
                    e.preventDefault();
                  } else {
                    trackClick(destination.id);
                  }
                  mouseDownPos.current = null;
                }}
              >
                {isDevMode && (
                  <ImageEditor
                    entityId={destination.id}
                    currentImageUrl={destination.image_url}
                    title={destination.title}
                    onUpdate={(newUrl) => onImageUpdate(destination.id, newUrl)}
                    onOpenChange={setIsEditorOpen}
                  />
                )}
                <img
                  src={destination.image_url}
                  alt={destination.title}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-2.5 text-white sm:p-3 md:p-4">
                  <h3 className="text-base font-semibold sm:text-xl md:text-2xl">{destination.title}</h3>
                  <p className="mt-0.5 text-xs text-white/85 sm:mt-1 sm:text-sm">{destination.subtitle}</p>
                </div>
              </Link>
            ))}
          </div>

          <button
            type="button"
            aria-label="向右捲動"
            onClick={() => scroll(1)}
            className="absolute right-0 top-1/2 z-20 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[rgba(20,20,30,0.7)] text-base font-bold text-white shadow-lg shadow-black/30 transition hover:bg-[rgba(35,35,50,0.85)] sm:h-12 sm:w-12 sm:-right-3 sm:text-xl lg:-right-4"
          >
            ›
          </button>
        </div>
      )}
    </section>
  );
}

export default function HomePage() {
  const [sections, setSections] = useState<RouteSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDevMode, setIsDevMode] = useState(false);
  const [siteLogoUrl, setSiteLogoUrl] = useState('/travel-logo.svg');

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

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);

    if (!element) {
      return;
    }

    element.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[linear-gradient(135deg,#0b0f2a_0%,#0a0a0a_50%,#1a0d0d_100%)] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-sky-400 border-r-transparent"></div>
          <p className="mt-4 text-white/70">載入中...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[linear-gradient(135deg,#0b0f2a_0%,#0a0a0a_50%,#1a0d0d_100%)] text-white flex items-center justify-center">
        <div className="text-center px-4">
          <p className="text-lg text-red-400">{error}</p>
          <button
            onClick={() => { setLoading(true); setError(null); window.location.reload(); }}
            className="mt-4 rounded-full bg-sky-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
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
    <main className="min-h-screen bg-[linear-gradient(135deg,#0b0f2a_0%,#0a0a0a_50%,#1a0d0d_100%)] pt-[86px] text-white md:pt-[98px] lg:pt-[74px]">
      <StickyHeader
        logoUrl={siteLogoUrl}
        logoEditorSlot={isDevMode ? <LogoUploader currentLogoUrl={siteLogoUrl} onUpdate={setSiteLogoUrl} /> : null}
        devModeSlot={<DevModeToggle onToggle={setIsDevMode} />}
      />

      <section id="routes" className="w-full px-0 pb-2 pt-0 md:pb-3 md:pt-0">
        <div className="sticky top-[84px] z-40 relative overflow-x-auto rounded-none bg-[rgba(10,10,18,0.82)] px-2 py-1.5 shadow-lg shadow-black/20 backdrop-blur-[6px] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:top-[96px] md:px-3 lg:top-[72px]">
          <div className="pointer-events-none absolute left-0 top-0 z-10 flex h-full items-center bg-gradient-to-r from-[rgba(20,20,30,0.8)] to-transparent px-2 md:hidden">
            <svg className="h-5 w-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </div>
          <div className="pointer-events-none absolute right-0 top-0 z-10 flex h-full items-center bg-gradient-to-l from-[rgba(20,20,30,0.8)] to-transparent px-2 md:hidden">
            <svg className="h-5 w-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <div className="flex min-w-max justify-center gap-3 md:min-w-0 md:flex-wrap">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => scrollToSection(section.id)}
                className="cursor-pointer rounded-full border border-white/10 bg-[rgba(255,255,255,0.08)] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[rgba(255,255,255,0.14)] hover:shadow"
              >
                {section.categoryLabel}
              </button>
            ))}

            <Link
              href="/flights"
              className="cursor-pointer rounded-full border border-white/10 bg-[rgba(255,255,255,0.08)] px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[rgba(255,255,255,0.14)] hover:shadow"
            >
              機票
            </Link>
          </div>
        </div>

        <div className="space-y-3">
          {sections.map((section, sectionIndex) => (
            <RouteRow
              key={section.id}
              section={section}
              isDevMode={isDevMode}
              onImageUpdate={handleImageUpdate}
              sectionIndex={sectionIndex}
            />
          ))}
        </div>

        <SocialCta
          className="mt-8"
          title="找到心儀的旅遊目的地了嗎？"
          description="立即聯繫旅遊規劃師 蓋瑞 GARY，為您量身打造專屬行程"
          logoUrl={siteLogoUrl}
        />
      </section>

      <FloatingContact />
    </main>
  );
}
