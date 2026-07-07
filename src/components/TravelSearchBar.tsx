"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";


type TripSearchResult = {
  id: string;
  title: string;
  subtitle: string | null;
  duration: string;
  cover_image_url: string | null;
  destinations: { title: string } | null;
};

type Destination = { id: string; title: string };
type RegionOption = { id: string; categoryLabel: string; destinations: Destination[] };

interface TravelSearchBarProps {
  regions?: RegionOption[];
  onSearch?: (params: {
    departureCity: string;
    regionId: string | null;
    destinationId: string | null;
    date: string;
  }) => void;
  /** 手機版可收合 */
  collapsible?: boolean;
}

const REGION_DISPLAY_ORDER = [
  "日本",
  "韓國",
  "港澳大陸",
  "東南亞",
  "歐洲",
  "紐澳美加",
  "中東亞非",
  "南亞",
  "台灣旅遊",
  "自由行",
  "郵輪旅遊",
  "高爾夫",
  "客製旅遊",
] as const;

const DEPARTURE_CITIES = [
  { id: "", label: "不限" },
  { id: "桃園", label: "台北（桃園機場）" },
  { id: "松山", label: "台北（松山機場）" },
  { id: "台中", label: "台中" },
  { id: "高雄", label: "高雄" },
];

export default function TravelSearchBar({ regions = [], onSearch, collapsible = false }: TravelSearchBarProps) {
  // === 行程搜尋 state ===
  const [departureOpen, setDepartureOpen] = useState(false);
  const [departureCityId, setDepartureCityId] = useState("");
  const [destOpen, setDestOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [selectedDestId, setSelectedDestId] = useState<string | null>(null);
  const [selectedLabel, setSelectedLabel] = useState("不限目的地");
  const [date, setDate] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const departureButtonRef = useRef<HTMLButtonElement>(null);
  const departureDropdownRef = useRef<HTMLDivElement>(null);
  const destDropdownRef = useRef<HTMLDivElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  // === 關鍵字搜尋 state ===
  const [keyword, setKeyword] = useState("");
  const [keywordResults, setKeywordResults] = useState<TripSearchResult[]>([]);
  const [keywordLoading, setKeywordLoading] = useState(false);
  const [keywordOpen, setKeywordOpen] = useState(false);
  const keywordRef = useRef<HTMLDivElement>(null);
  const keywordDropdownRef = useRef<HTMLDivElement>(null);
  const keywordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState(false);

  const updateDropdownRect = useCallback(() => {
    if (keywordRef.current) {
      const rect = keywordRef.current.getBoundingClientRect();
      setDropdownRect({
        top: rect.bottom,
        left: rect.left,
        width: rect.width,
      });
    }
  }, []);

  const searchTrips = useCallback(async (q: string) => {
    if (q.trim().length < 1) {
      setKeywordResults([]);
      setKeywordOpen(false);
      return;
    }
    setKeywordLoading(true);
    updateDropdownRect();
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      const data = res.ok ? await res.json() : [];
      setKeywordResults(Array.isArray(data) ? data : []);
      setKeywordOpen(true);
    } catch {
      setKeywordResults([]);
    }
    setKeywordLoading(false);
  }, [updateDropdownRect]);

  useEffect(() => {
    if (keywordTimerRef.current) clearTimeout(keywordTimerRef.current);
    if (!keyword.trim()) {
      setKeywordResults([]);
      setKeywordOpen(false);
      return;
    }
    keywordTimerRef.current = setTimeout(() => searchTrips(keyword), 300);
    return () => {
      if (keywordTimerRef.current) clearTimeout(keywordTimerRef.current);
    };
  }, [keyword, searchTrips]);

  useEffect(() => {
    if (!keywordOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      // 點擊在輸入框或 Portal 下拉選單內都不關閉
      if (keywordRef.current?.contains(target)) return;
      if (keywordDropdownRef.current?.contains(target)) return;
      setKeywordOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [keywordOpen]);

  const orderedRegions = useMemo(() => [...regions].sort((a, b) => {
    const aIndex = REGION_DISPLAY_ORDER.indexOf(a.categoryLabel as (typeof REGION_DISPLAY_ORDER)[number]);
    const bIndex = REGION_DISPLAY_ORDER.indexOf(b.categoryLabel as (typeof REGION_DISPLAY_ORDER)[number]);
    const safeA = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
    const safeB = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
    if (safeA !== safeB) return safeA - safeB;
    return a.categoryLabel.localeCompare(b.categoryLabel, "zh-Hant");
  }), [regions]);

  // 行程 dropdown 外點關閉
  useEffect(() => {
    if (!departureOpen && !destOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (departureDropdownRef.current?.contains(target)) return;
      if (destDropdownRef.current?.contains(target)) return;
      setDepartureOpen(false);
      setDestOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [departureOpen, destOpen]);

  // 頁面滾動時關閉 Portal dropdown（fixed 定位不隨捲動更新）
  useEffect(() => {
    if (!departureOpen && !destOpen && !keywordOpen) return;
    const close = () => {
      setDepartureOpen(false);
      setDestOpen(false);
      setKeywordOpen(false);
    };
    window.addEventListener("scroll", close, { passive: true });
    return () => window.removeEventListener("scroll", close);
  }, [departureOpen, destOpen, keywordOpen]);

  // === 行程搜尋 handlers ===
  const openDeparture = () => { setDepartureOpen(true); setDestOpen(false); };
  const openDest = () => { setDestOpen(true); setDepartureOpen(false); };

  const handleSelectDepartureCity = (id: string) => {
    setDepartureCityId(id);
    setDepartureOpen(false);
  };

  const handleSelectAll = () => {
    setSelectedRegionId(null);
    setSelectedDestId(null);
    setSelectedLabel("不限目的地");
    setDestOpen(false);
  };

  const handleSelectRegion = (regionId: string, label: string) => {
    setSelectedRegionId(regionId);
    setSelectedDestId(null);
    setSelectedLabel(label);
    setDestOpen(false);
  };

  const handleSelectDest = (regionId: string, destId: string, destTitle: string) => {
    setSelectedRegionId(regionId);
    setSelectedDestId(destId);
    setSelectedLabel(destTitle);
    setDestOpen(false);
  };

  const handleSearch = () => {
    if (selectedDestId) {
      const qs = new URLSearchParams();
      if (date) qs.set("date", date);
      if (departureCityId) qs.set("city", departureCityId);
      const query = qs.toString();
      router.push(`/destination/${selectedDestId}${query ? `?${query}` : ""}`);
      setDestOpen(false);
      setDepartureOpen(false);
      if (collapsible) setMobileExpanded(false);
      return;
    }
    // 只選日期也能搜尋
    if (date) {
      const qs = new URLSearchParams({ date });
      if (departureCityId) qs.set("city", departureCityId);
      router.push(`/search?${qs.toString()}`);
      if (collapsible) setMobileExpanded(false);
      return;
    }
    onSearch?.({ departureCity: departureCityId, regionId: selectedRegionId, destinationId: null, date });
    if (collapsible) setMobileExpanded(false);
  };

  const handleClear = () => {
    setDepartureCityId("");
    setSelectedRegionId(null);
    setSelectedDestId(null);
    setSelectedLabel("不限目的地");
    setDate("");
    onSearch?.({ departureCity: "", regionId: null, destinationId: null, date: "" });
  };

  const hasFilter = departureCityId || selectedRegionId || date;
  const departureCityLabel = DEPARTURE_CITIES.find((c) => c.id === departureCityId)?.label ?? "不限";

  const formatDate = (d: string) => {
    if (!d) return "";
    const [y, m, day] = d.split("-");
    return `${y}/${m}/${day}`;
  };

  return (
    <div className="mx-auto max-w-[900px] px-3 pb-4 pt-8 sm:px-4 sm:pt-10 md:px-6">

      {/* 模式 Tab */}
      <div className="mb-3 flex justify-center">
        <div className="flex items-center gap-1 rounded-full bg-gray-100 p-1">
          <button
            type="button"
            className="flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-900 shadow transition sm:gap-1.5 sm:px-4 sm:py-2 sm:text-sm"
          >
            <svg className="hidden h-3.5 w-3.5 sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            旅遊行程
          </button>
          <Link
            href="/mini-transit-tickets"
            className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold text-gray-500 transition hover:bg-white hover:text-gray-900 hover:shadow sm:gap-1.5 sm:px-4 sm:py-2 sm:text-sm"
          >
            小三通
          </Link>
          <Link
            href="/document-services"
            className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold text-gray-500 transition hover:bg-white hover:text-gray-900 hover:shadow sm:gap-1.5 sm:px-4 sm:py-2 sm:text-sm"
          >
            證件代辦
          </Link>
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('social-community');
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold text-sky-600 transition hover:bg-white hover:text-sky-700 hover:shadow sm:gap-1.5 sm:px-4 sm:py-2 sm:text-sm"
          >
            <svg className="hidden h-3.5 w-3.5 sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            社群
          </button>
        </div>
      </div>

      {/* ── 行程搜尋 ── */}
      <div ref={containerRef} className="relative">
        {/* 收合態 pill 條（只在手機顯示） */}
        {collapsible && !mobileExpanded && (
          <button
            type="button"
            onClick={() => setMobileExpanded(true)}
            className="mb-3 flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm sm:hidden"
          >
            <span className="text-sm text-gray-500">搜尋行程目的地...</span>
            <span className="rounded-full bg-sky-500 px-3 py-1 text-xs font-semibold text-white">篩選</span>
          </button>
        )}
        <div className={collapsible && !mobileExpanded ? "hidden sm:block" : ""}>

        {/* 關鍵字快速搜尋 */}
        <div ref={keywordRef} className="relative mb-3">
          <div className="flex items-center overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center text-gray-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onFocus={() => { if (keywordResults.length > 0) { updateDropdownRect(); setKeywordOpen(true); } }}
              placeholder="輸入行程名稱搜尋，例如：北海道、九州..."
              className="flex-1 py-2.5 pr-3 text-sm text-gray-700 outline-none placeholder:text-gray-400"
            />
            {keyword && (
              <button type="button" onClick={() => { setKeyword(""); setKeywordResults([]); setKeywordOpen(false); }}
                className="px-3 text-gray-300 transition hover:text-gray-500">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            {keywordLoading && (
              <span className="px-3 text-gray-400">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </span>
            )}
          </div>

          {/* 熱搜 tags */}
          <div className="mt-2 flex flex-nowrap gap-1.5 overflow-x-auto px-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {["日本", "韓國", "歐洲", "泰國", "越南", "沖繩", "北海道", "杜拜", "張家界", "中亞", "峇里島", "港澳"].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setKeyword(tag)}
                className="shrink-0 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-600 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
              >
                {tag}
              </button>
            ))}
          </div>

          {/* 搜尋結果下拉（Portal 渲染到 body，避免被 sticky 元素的 stacking context 蓋住） */}
          {keywordOpen && dropdownRect && typeof document !== "undefined" && createPortal(
            <div
              ref={keywordDropdownRef}
              className="fixed z-[9999] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl shadow-black/20"
              style={{ top: dropdownRect.top + 4, left: dropdownRect.left, width: dropdownRect.width }}
            >
              {keywordResults.length === 0 ? (
                <p className="px-4 py-5 text-center text-sm text-gray-400">找不到符合「{keyword}」的行程</p>
              ) : (
                <div className="max-h-72 overflow-y-auto py-1.5">
                  {keywordResults.map((trip) => (
                    <Link
                      key={trip.id}
                      href={`/trip/${trip.id}`}
                      onClick={() => setKeywordOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 transition hover:bg-sky-50"
                    >
                      {trip.cover_image_url ? (
                        <img src={trip.cover_image_url} alt={trip.title}
                          className="h-10 w-14 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <div className="h-10 w-14 shrink-0 rounded-lg bg-gray-100" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900">{trip.title}</p>
                        <p className="truncate text-xs text-gray-500">
                          {trip.destinations?.title && <span>{trip.destinations.title}・</span>}
                          {trip.duration}
                        </p>
                      </div>
                      <svg className="h-4 w-4 shrink-0 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ))}
                </div>
              )}
            </div>,
            document.body
          )}
        </div>

        <div className="flex flex-col overflow-visible rounded-2xl border border-gray-100 bg-white shadow-xl shadow-black/[0.08] sm:flex-row sm:rounded-full">

          {/* 出發地 */}
          <button
            ref={departureButtonRef}
            type="button"
            onClick={openDeparture}
            className="flex flex-1 items-center gap-3 rounded-t-2xl px-5 py-4 text-left transition hover:bg-gray-50 focus:outline-none sm:h-[60px] sm:rounded-l-full sm:rounded-r-none"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-500">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <span className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400">出發地</span>
              <span className={`mt-0.5 block truncate text-sm font-bold ${departureCityId ? "text-gray-900" : "text-gray-400"}`}>
                {departureCityLabel}
              </span>
            </div>
            <svg className={`h-4 w-4 shrink-0 text-gray-300 transition-transform ${departureOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <div className="hidden h-[60px] w-px shrink-0 self-center bg-gray-100 sm:block" />
          <div className="mx-5 h-px bg-gray-100 sm:hidden" />

          {/* 目的地 */}
          <button
            type="button"
            onClick={openDest}
            className="flex flex-1 items-center gap-3 px-5 py-4 text-left transition hover:bg-gray-50 focus:outline-none sm:h-[60px] sm:rounded-none"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-500">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-2.079 3.791-5.16 3.791-9.077A8 8 0 003.05 9.25c0 3.916 1.847 6.997 3.791 9.077a19.58 19.58 0 002.683 2.282 16.974 16.974 0 001.144.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <span className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400">目的地</span>
              <span className={`mt-0.5 block truncate text-sm font-bold ${selectedRegionId ? "text-gray-900" : "text-gray-400"}`}>
                {selectedLabel}
              </span>
            </div>
            <svg className={`h-4 w-4 shrink-0 text-gray-300 transition-transform ${destOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <div className="hidden h-[60px] w-px shrink-0 self-center bg-gray-100 sm:block" />
          <div className="mx-5 h-px bg-gray-100 sm:hidden" />

          {/* 出發日期 */}
          <div
            className="flex flex-1 cursor-pointer items-center gap-3 px-5 py-4 transition hover:bg-gray-50 sm:h-[60px] sm:py-0"
            onClick={() => dateInputRef.current?.showPicker?.()}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-500">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </span>
            <div className="relative flex-1">
              <span className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400">出發日期</span>
              <div className={`mt-0.5 text-sm font-bold ${date ? "text-gray-900" : "text-gray-400"}`}>
                {date ? formatDate(date) : "選擇日期"}
              </div>
              <input
                ref={dateInputRef}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={today}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </div>
            {date && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setDate(""); }}
                className="shrink-0 text-gray-300 transition hover:text-gray-500"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* 搜尋按鈕 */}
          <div className="flex items-center gap-2 px-4 py-3 sm:py-0">
            <button
              type="button"
              onClick={handleSearch}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-sky-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-sky-500/30 transition hover:bg-sky-400 active:scale-95 sm:h-[44px] sm:w-[44px] sm:flex-none sm:px-0"
            >
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="sm:hidden">搜尋</span>
            </button>
            {hasFilter && (
              <button
                type="button"
                onClick={handleClear}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm font-semibold text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 sm:hidden"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                取消篩選
              </button>
            )}
          </div>
        </div>

        {/* Dropdown 出發地（Portal 避免被父層裁切） */}
        {departureOpen && typeof document !== "undefined" && (() => {
          const rect = departureButtonRef.current?.getBoundingClientRect();
          if (!rect) return null;
          return createPortal(
            <div
              ref={departureDropdownRef}
              className="fixed z-[9999] w-52 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl shadow-black/20"
              style={{ top: rect.bottom + 4, left: rect.left }}
            >
              <div className="py-1.5">
                {DEPARTURE_CITIES.map((city) => (
                  <button
                    key={city.id}
                    onClick={() => handleSelectDepartureCity(city.id)}
                    className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-sm transition ${
                      departureCityId === city.id
                        ? "bg-sky-50 font-semibold text-sky-600"
                        : "text-gray-600 hover:bg-sky-50 hover:text-sky-700"
                    }`}
                  >
                    {departureCityId === city.id && (
                      <svg className="h-3.5 w-3.5 shrink-0 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {departureCityId !== city.id && <span className="h-3.5 w-3.5 shrink-0" />}
                    {city.label}
                  </button>
                ))}
              </div>
            </div>,
            document.body
          );
        })()}

        {/* Dropdown 目的地（Portal 避免被父層裁切） */}
        {destOpen && typeof document !== "undefined" && (() => {
          const rect = containerRef.current?.getBoundingClientRect();
          if (!rect) return null;
          return createPortal(
            <div
              ref={destDropdownRef}
              className="fixed z-[9999] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl shadow-black/20"
              style={{ top: rect.bottom + 4, left: rect.left, width: rect.width }}
            >
              <div className="border-b border-gray-100">
                <div className="flex overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <button
                    onClick={() => setActiveTab("all")}
                    className={`shrink-0 border-b-2 px-5 py-3 text-sm font-semibold whitespace-nowrap transition ${
                      activeTab === "all"
                        ? "border-sky-500 text-sky-600"
                        : "border-transparent text-gray-400 hover:text-gray-700"
                    }`}
                  >
                    全部地區
                  </button>
                  {orderedRegions.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setActiveTab(r.id)}
                      className={`shrink-0 border-b-2 px-5 py-3 text-sm font-semibold whitespace-nowrap transition ${
                        activeTab === r.id
                          ? "border-sky-500 text-sky-600"
                          : "border-transparent text-gray-400 hover:text-gray-700"
                      }`}
                    >
                      {r.categoryLabel}
                    </button>
                  ))}
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto p-4">
                {activeTab === "all" ? (
                  <div className="grid grid-cols-2 gap-x-6 sm:grid-cols-3">
                    <button
                      onClick={handleSelectAll}
                      className="flex items-start gap-2 py-1.5 text-left text-sm text-gray-400 transition hover:text-sky-600"
                    >
                      <span className="mt-0.5 shrink-0 text-xs text-gray-300">—</span>
                      不限目的地
                    </button>
                    {orderedRegions.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => handleSelectRegion(r.id, r.categoryLabel)}
                        className="flex items-start gap-2 py-1.5 text-left text-sm font-medium text-gray-700 transition hover:text-sky-600"
                      >
                        <span className="mt-0.5 shrink-0 text-xs text-gray-300">—</span>
                        {r.categoryLabel}
                      </button>
                    ))}
                  </div>
                ) : (
                  <>
                    {(() => {
                      const region = orderedRegions.find((r) => r.id === activeTab);
                      if (!region) return null;
                      return (
                        <div className="grid grid-cols-2 gap-x-6 sm:grid-cols-3">
                          <button
                            onClick={() => handleSelectRegion(region.id, region.categoryLabel)}
                            className="col-span-full mb-2 flex items-center gap-2 text-left text-sm font-bold text-sky-600 transition hover:text-sky-500"
                          >
                            <span className="text-xs text-sky-300">—</span>
                            {region.categoryLabel}全部
                          </button>
                          {region.destinations.map((d) => (
                            <button
                              key={d.id}
                              onClick={() => handleSelectDest(region.id, d.id, d.title)}
                              className="flex items-start gap-2 py-1.5 text-left text-sm text-gray-600 transition hover:text-sky-600"
                            >
                              <span className="mt-0.5 shrink-0 text-xs text-gray-300">—</span>
                              {d.title}
                            </button>
                          ))}
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            </div>,
            document.body
          );
        })()}
        </div>
      </div>

      {/* 篩選標籤（行程模式） */}
      {hasFilter && (
        <div className="mt-3 flex flex-wrap items-center gap-2 px-1">
          {departureCityId && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
              </svg>
              出發：{departureCityLabel}
            </span>
          )}
          {selectedRegionId && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-2.079 3.791-5.16 3.791-9.077A8 8 0 003.05 9.25c0 3.916 1.847 6.997 3.791 9.077a19.58 19.58 0 002.683 2.282 16.974 16.974 0 001.144.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              {selectedLabel}
            </span>
          )}
          {date && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              出發：{formatDate(date)}
            </span>
          )}
          <button
            onClick={handleClear}
            className="text-xs text-gray-400 underline underline-offset-2 transition hover:text-gray-600"
          >
            清除全部
          </button>
        </div>
      )}
    </div>
  );
}
