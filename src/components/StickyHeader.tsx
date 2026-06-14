"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { lineHref, fbHref, igHref, getRegionsWithDestinations } from "@/lib/supabase";
import { openExternalLink } from "@/lib/external-link";
import { getFavorites, toggleFavorite } from "@/lib/favorites";

const ContactFormModal = dynamic(() => import("./ContactFormModal"), { ssr: false });

/** 子城市列表已移除，導航列只顯示 destination 名稱 */
const SUB_CITIES: Record<string, Record<string, string[]>> = {};

/** 導航列下拉用 sub_area 地區名（比 destination 更細），全部連到同一個合併頁 */
const NAV_AREAS: Record<string, string[]> = {
  '港澳大陸': ['張家界', '九寨溝', '重慶', '長江三峽', '貴州', '桂林', '甘南', '新疆', '黃山', '金廈', '江南', '武夷山', '青島', '洛陽', '哈爾濱', '高雄出發'],
  '日本': ['北海道', '東京', '大阪', '京阪神', '名古屋', '黑部立山', '沖繩', '九州', '東北', '四國'],
  '東南亞': ['曼谷', '清邁', '峴港', '芽莊', '富國島', '中越', '北越', '峇里島', '馬新', '宿霧/薄荷島'],
  '歐洲': ['德瑞法', '英國', '荷比法', '義大利', '希臘', '東歐', '芬蘭', '瑞典'],
  '中東亞非': ['中亞', '烏茲別克', '杜拜+阿布達比', '杜拜', '伊朗', '土耳其', '埃及', '西伯利亞'],
  '紐澳美加': ['澳洲', '紐西蘭', '美西', '美東', '美加'],
};

type FavTrip = {
  id: string;
  title: string;
  duration: string;
  cover_image_url?: string;
  destinations?: { title: string };
};

interface StickyHeaderProps {
  showBackButton?: boolean;
  backHref?: string;
  devModeSlot?: React.ReactNode;
  logoUrl?: string;
  logoEditorSlot?: React.ReactNode;
}

export default function StickyHeader({ showBackButton, backHref, devModeSlot, logoUrl = '/travel-logo.svg', logoEditorSlot }: StickyHeaderProps) {
  const router = useRouter();
  const [showContactForm, setShowContactForm] = useState(false);
  const [displayLogoUrl, setDisplayLogoUrl] = useState(logoUrl);
  const [logoReady, setLogoReady] = useState(false);

  // ── 導航列 ──
  const [navSections, setNavSections] = useState<{ id: string; categoryLabel: string; destinations: { id: string; title: string; sub_region: string }[] }[]>([]);
  const [hoveredNavId, setHoveredNavId] = useState<string | null>(null);
  const navTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getRegionsWithDestinations().then((data: any[]) => {
      setNavSections(data.map((r: any) => ({
        id: r.id,
        categoryLabel: r.category_label,
        destinations: (r.destinations || []).map((d: any) => ({ id: d.id, title: d.title, sub_region: d.sub_region || '' })),
      })));
    }).catch(() => {});
  }, []);

  // ── 收藏 ──
  const [favIds, setFavIds] = useState<string[]>([]);
  const [showFavPanel, setShowFavPanel] = useState(false);
  const [favTrips, setFavTrips] = useState<FavTrip[]>([]);
  const [favLoading, setFavLoading] = useState(false);
  const [favLoaded, setFavLoaded] = useState(false);
  const favPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFavIds(getFavorites());
  }, []);

  useEffect(() => {
    const handler = () => {
      const ids = getFavorites();
      setFavIds(ids);
      setFavLoaded(false);
    };
    window.addEventListener("favoritesChanged", handler);
    return () => window.removeEventListener("favoritesChanged", handler);
  }, []);

  useEffect(() => {
    if (!showFavPanel || favLoaded) return;
    const ids = getFavorites();
    if (ids.length === 0) { setFavTrips([]); setFavLoaded(true); return; }
    setFavLoading(true);
    Promise.all(
      ids.map(id => fetch(`/api/trips/${id}`, { cache: "no-store" }).then(r => r.ok ? r.json() : null).catch(() => null))
    ).then(results => {
      setFavTrips(results.filter(Boolean) as FavTrip[]);
      setFavLoading(false);
      setFavLoaded(true);
    });
  }, [showFavPanel, favLoaded]);

  useEffect(() => {
    if (!showFavPanel) return;
    const handler = (e: MouseEvent) => {
      if (favPanelRef.current && !favPanelRef.current.contains(e.target as Node)) {
        setShowFavPanel(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showFavPanel]);

  const removeFav = (id: string) => {
    toggleFavorite(id);
    setFavTrips(prev => prev.filter(t => t.id !== id));
    setFavIds(prev => prev.filter(i => i !== id));
    window.dispatchEvent(new Event("favoritesChanged"));
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    let next = logoUrl;
    if (logoUrl === "/travel-logo.svg") {
      try {
        const cached = localStorage.getItem("site_logo_url");
        if (cached) next = cached;
      } catch { /* ignore */ }
    }
    setDisplayLogoUrl(next);
    setLogoReady(true);
    if (!next || next === "/travel-logo.svg") return;
    try { localStorage.setItem("site_logo_url", next); } catch { /* ignore */ }
  }, [logoUrl]);

  const handleBackClick = () => {
    if (backHref?.startsWith("#")) {
      const target = document.querySelector(backHref) as HTMLElement | null;
      if (target) {
        const top = target.getBoundingClientRect().top + window.scrollY - 56;
        window.scrollTo({ top, behavior: "smooth" });
      }
      return;
    }
    // 優先用瀏覽器原生返回（瞬間恢復上一頁快取），無歷史時才用 href 導航
    if (window.history.length > 1) { window.history.back(); return; }
    if (backHref) { window.location.href = backHref; return; }
    window.location.href = '/';
  };

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-header h-header border-b border-gray-200/30 bg-white/50 backdrop-blur-[20px]">
        <div className="mx-auto flex h-full max-w-site items-center justify-between px-4 md:px-6">

          {/* 左側：返回 + Logo */}
          <div className="flex items-center gap-2">
            {showBackButton && (
              <button
                onClick={handleBackClick}
                className="mr-1 flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
                title="返回"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <Link href="/" className="flex min-h-10 shrink items-center gap-2 transition hover:opacity-90" aria-label="回到首頁">
              {logoReady ? (
                <img src={displayLogoUrl} alt="旅行沒有終點" className="h-10 w-auto max-w-[180px] object-contain sm:h-[72px] sm:max-w-[480px]" />
              ) : (
                <div className="h-10 w-32 bg-gray-100 sm:h-[72px] sm:w-72" />
              )}
            </Link>
            {logoEditorSlot}
          </div>

          {/* 右側 */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowContactForm(true)}
              className="hidden text-[13px] font-medium text-gray-600 transition hover:text-sky-600 sm:block"
            >
              聯絡我們
            </button>

            {/* 收藏行程按鈕 */}
            <div className="relative" ref={favPanelRef}>
                <button
                type="button"
                onClick={() => setShowFavPanel(p => !p)}
                className="relative flex items-center gap-1 rounded-full px-2 py-1.5 text-gray-500 transition hover:bg-red-50 hover:text-red-500"
                title="已收藏行程"
              >
                <svg
                  className="h-5 w-5 transition"
                  fill={favIds.length > 0 ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                  style={{ color: favIds.length > 0 ? "#ef4444" : undefined }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span className="hidden text-[13px] font-medium md:inline">收藏行程</span>
                {favIds.length > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                    {favIds.length > 9 ? "9+" : favIds.length}
                  </span>
                )}
              </button>

              {/* 收藏下拉面板 */}
              {showFavPanel && (
                <div className="animate-fade-slide-down absolute right-0 top-full z-dropdown mt-2 w-[min(18rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl">
                  <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                    <h3 className="text-sm font-bold text-gray-900">已收藏行程</h3>
                    {favIds.length > 0 && (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-500">
                        {favIds.length} 筆
                      </span>
                    )}
                  </div>

                  {favLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <svg className="h-5 w-5 animate-spin text-gray-300" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    </div>
                  ) : favTrips.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <p className="text-sm text-gray-400">尚未收藏任何行程</p>
                      <p className="mt-1 text-[11px] text-gray-300">點行程卡片上的 ❤️ 可加入收藏</p>
                    </div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto py-1">
                      {favTrips.map(trip => (
                        <div key={trip.id} className="group flex items-center gap-3 px-3 py-2.5 transition hover:bg-gray-50">
                          <Link
                            href={`/trip/${trip.id}`}
                            onClick={() => setShowFavPanel(false)}
                            className="flex min-w-0 flex-1 items-center gap-3"
                          >
                            <div className="h-10 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-200">
                              {trip.cover_image_url && (
                                <div
                                  className="h-full w-full bg-cover bg-center"
                                  style={{ backgroundImage: `url(${trip.cover_image_url})` }}
                                />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-gray-800">{trip.title}</p>
                              <p className="text-[10px] text-gray-400">
                                {trip.destinations?.title && <span>{trip.destinations.title}・</span>}
                                {trip.duration}
                              </p>
                            </div>
                          </Link>
                          <button
                            type="button"
                            onClick={() => removeFav(trip.id)}
                            className="shrink-0 rounded-full p-1 text-gray-300 opacity-0 transition hover:bg-red-50 hover:text-red-400 group-hover:opacity-100"
                            title="移除收藏"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="hidden items-center gap-1.5 sm:flex">
              <button type="button" onClick={() => openExternalLink(lineHref)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#06C755] text-white transition hover:opacity-85"
                title="LINE 諮詢">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" /></svg>
              </button>
              <button type="button" onClick={() => openExternalLink(fbHref)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#1877F2] text-white transition hover:opacity-85"
                title="Facebook">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
              </button>
              <button type="button" onClick={() => openExternalLink(igHref)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#E4405F] text-white transition hover:opacity-85"
                title="Instagram">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
              </button>
            </div>

            {devModeSlot}
          </div>
        </div>
      </header>

      {/* 深色導航列（所有頁面） */}
      {navSections.length > 0 && (
        <div
          className="fixed inset-x-0 z-[99] bg-[#354559]/85 backdrop-blur-md"
          style={{ top: '5rem' }}
          onMouseLeave={() => { navTimeoutRef.current = setTimeout(() => setHoveredNavId(null), 150); }}
        >
          <div className="relative">
            <nav className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex min-w-max items-stretch justify-center">
                {navSections.map((section) => {
                  const hasDests = section.destinations.length > 0;
                  return (
                    <div key={section.id} className="relative" onMouseEnter={() => { if (navTimeoutRef.current) clearTimeout(navTimeoutRef.current); setHoveredNavId(section.id); }}>
                      <Link
                        href={hasDests ? `/destination/${section.destinations[0].id}?all=1` : '/'}
                        className={`flex items-center gap-1 whitespace-nowrap px-4 py-3 text-sm font-semibold transition ${hoveredNavId === section.id ? "text-[#d4a853]" : "text-white/80 hover:text-[#d4a853]"}`}
                      >
                        {section.categoryLabel}
                        {hasDests && <svg className="h-3 w-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>}
                      </Link>
                    </div>
                  );
                })}
              </div>
            </nav>
          </div>

          {/* Hover 下拉（白底） */}
          {hoveredNavId && (() => {
            const section = navSections.find((s) => s.id === hoveredNavId);
            if (!section || section.destinations.length === 0) return null;
            const regionCities = SUB_CITIES[section.categoryLabel] || {};
            const hasRegionCityData = Object.keys(regionCities).length > 0;

            /* ── 有子城市資料（日本/東南亞/歐洲/港澳大陸）→ 4 欄 grid ── */
            /* ── 其餘小區域 → 水平排列 destination 名稱 ── */
            const navAreas = NAV_AREAS[section.categoryLabel];
            const firstDestId = section.destinations[0]?.id;

            const content = navAreas ? (
              /* 有 NAV_AREAS 的區域 → 顯示 sub_area 地區名，全部連到合併頁 */
              <div className="mx-auto max-w-site px-6 py-4">
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {navAreas.map((area) => (
                    <Link
                      key={area}
                      href={`/destination/${firstDestId}`}
                      onClick={() => setHoveredNavId(null)}
                      className="rounded-full border border-sky-100 bg-gradient-to-b from-white to-sky-50/80 px-5 py-2 text-[13px] font-bold tracking-wide text-gray-600 shadow-sm ring-1 ring-sky-100/50 transition hover:border-sky-200 hover:from-sky-50 hover:to-sky-100/60 hover:text-sky-700 hover:shadow-md"
                    >
                      {area}
                    </Link>
                  ))}
                </div>
              </div>
            ) : hasRegionCityData ? (() => {
              const grouped = new Map<string, typeof section.destinations>();
              for (const d of section.destinations) { const key = d.sub_region || d.title; const list = grouped.get(key) || []; list.push(d); grouped.set(key, list); }
              return (
                <div className="mx-auto max-w-site px-6 py-5">
                  <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {Array.from(grouped.entries()).map(([sub, dests]) => {
                      const cities = regionCities[sub] || [];
                      return (
                        <Link key={sub} href={`/destination/${dests[0].id}`} onClick={() => setHoveredNavId(null)} className="group block rounded-lg px-2 py-1.5 transition hover:bg-gray-50">
                          <p className="text-sm font-bold text-gray-900 transition group-hover:text-sky-600">{sub}</p>
                          <div className="mt-1 border-b-2 border-[#d4a853]" />
                          {cities.length > 0 && (
                            <p className="mt-2 text-xs leading-relaxed text-gray-500">{cities.join(' ｜ ')}</p>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })() : (
              <div className="mx-auto max-w-site px-6 py-4">
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {section.destinations.map((d) => (
                    <Link
                      key={d.id}
                      href={`/destination/${d.id}`}
                      onClick={() => setHoveredNavId(null)}
                      className="rounded-full border border-sky-100 bg-gradient-to-b from-white to-sky-50/80 px-5 py-2 text-[13px] font-bold tracking-wide text-gray-600 shadow-sm ring-1 ring-sky-100/50 transition hover:border-sky-200 hover:from-sky-50 hover:to-sky-100/60 hover:text-sky-700 hover:shadow-md"
                    >
                      {d.sub_region || d.title}
                    </Link>
                  ))}
                </div>
              </div>
            );

            return (
              <div
                className="absolute inset-x-0 top-full z-50 rounded-b-lg border border-t-0 border-gray-200 bg-white shadow-xl"
                onMouseEnter={() => { if (navTimeoutRef.current) clearTimeout(navTimeoutRef.current); }}
                onMouseLeave={() => { navTimeoutRef.current = setTimeout(() => setHoveredNavId(null), 150); }}
              >
                {content}
              </div>
            );
          })()}
        </div>
      )}

      <ContactFormModal isOpen={showContactForm} onClose={() => setShowContactForm(false)} />
    </>
  );
}
