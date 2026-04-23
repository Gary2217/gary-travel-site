"use client";

import { useEffect, useRef, useState } from "react";
import { getRegionsWithDestinations, trackClick } from "@/lib/supabase";

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

const lineId = process.env.NEXT_PUBLIC_LINE_ID || "@YOUR_LINE_ID";
const lineHref = `https://line.me/ti/p/${lineId.replace('@', '')}`;

function RouteRow({
  section,
}: {
  section: RouteSection;
}) {
  const hasDestinations = section.destinations.length > 0;
  const rowRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const pauseTimeoutRef = useRef<number | null>(null);
  const pauseUntilRef = useRef(0);
  const isHoveringRef = useRef(false);
  const hasInitializedPositionRef = useRef(false);
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

        if (!isHoveringRef.current && Date.now() >= pauseUntilRef.current) {
          element.scrollLeft += 1.2;
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
  }, [hasDestinations]);

  const pauseAutoScroll = (duration = 2800) => {
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
    const firstCard = element.querySelector("[data-destination-card='true']") as HTMLAnchorElement | null;
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

  const handleDestinationClick = async (destinationId: string) => {
    await trackClick(destinationId);
  };

  return (
    <section
      id={section.id}
      className="scroll-mt-20 rounded-[1.75rem] bg-[rgba(20,20,30,0.38)] px-0.5 py-3 shadow-lg shadow-black/10 backdrop-blur-[12px] md:px-1 md:py-4 lg:px-1.5 lg:py-5"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
            {section.title}
          </h2>
          <p className="mt-1 text-sm leading-6 text-white/70 sm:text-base">
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
            onClick={() => scroll(-1)}
            className="absolute left-0 top-1/2 z-20 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[rgba(20,20,30,0.7)] text-xl font-bold text-white shadow-lg shadow-black/30 transition hover:bg-[rgba(35,35,50,0.85)] sm:-left-3 lg:-left-4"
          >
            ‹
          </button>

          <div
            ref={rowRef}
            className="flex gap-4 overflow-x-auto px-10 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-12"
          >
            {loopedDestinations.map((destination, destinationIndex) => (
              <a
                key={`${section.title}-${destination.title}-${destinationIndex}`}
                data-destination-card="true"
                href={lineHref}
                target="_blank"
                rel="noreferrer"
                onClick={() => handleDestinationClick(destination.id)}
                className="group relative h-[144px] min-w-[280px] overflow-hidden rounded-[1.5rem] border border-white/10 bg-[rgba(20,20,30,0.45)] shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:shadow-xl md:h-[168px] md:min-w-[320px] lg:min-w-[340px]"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url(${destination.image_url})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3 text-white md:p-4">
                  <h3 className="text-xl font-semibold sm:text-2xl">{destination.title}</h3>
                  <p className="mt-1 text-sm text-white/85">{destination.subtitle}</p>
                </div>
              </a>
            ))}
          </div>

          <button
            type="button"
            onClick={() => scroll(1)}
            className="absolute right-0 top-1/2 z-20 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[rgba(20,20,30,0.7)] text-xl font-bold text-white shadow-lg shadow-black/30 transition hover:bg-[rgba(35,35,50,0.85)] sm:-right-3 lg:-right-4"
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

  useEffect(() => {
    async function loadData() {
      try {
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
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
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

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#0b0f2a_0%,#0a0a0a_50%,#1a0d0d_100%)] text-white">
      <div className="sticky top-0 z-50 border-b border-white/10 bg-[rgba(20,20,30,0.72)] backdrop-blur-[12px]">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-2.5 md:gap-4 md:px-6">
          <div className="flex shrink-0 items-center gap-2">
            <svg className="h-8 w-8 text-sky-400 md:h-9 md:w-9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
            </svg>
            <div className="hidden md:block">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">
                Route Browser
              </p>
              <p className="text-sm font-semibold text-white">
                快速瀏覽熱門旅遊目的地
              </p>
            </div>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            <p className="hidden text-[11px] font-medium text-white/70 sm:block sm:text-sm">
              旅遊規劃師 蓋瑞 GARY｜LINE 詢問行程
            </p>
            <a
              href={lineHref}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 rounded-full bg-[#06C755] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#05b64d] sm:px-5 sm:text-sm"
            >
              LINE 諮詢
            </a>
          </div>
        </div>
      </div>

      <section id="routes" className="w-full px-1 py-6 md:px-2 xl:px-2">
        <div className="relative mb-3 overflow-x-auto rounded-xl bg-[rgba(20,20,30,0.34)] py-2 shadow-lg shadow-black/10 backdrop-blur-[12px] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-1">
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
          </div>
        </div>

        <div className="space-y-3">
          {sections.map((section) => (
            <RouteRow key={section.id} section={section} />
          ))}
        </div>
      </section>
    </main>
  );
}
