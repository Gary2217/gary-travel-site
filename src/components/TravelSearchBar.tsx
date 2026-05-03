"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

type Destination = { id: string; title: string };
type RegionOption = { id: string; categoryLabel: string; destinations: Destination[] };

interface TravelSearchBarProps {
  regions: RegionOption[];
  onSearch: (params: {
    departureCity: string;
    regionId: string | null;
    destinationId: string | null;
    date: string;
  }) => void;
}

const DEPARTURE_CITIES = [
  { id: "", label: "不限" },
  { id: "桃園", label: "台北（桃園機場）" },
  { id: "松山", label: "台北（松山機場）" },
  { id: "台中", label: "台中" },
  { id: "高雄", label: "高雄" },
];

export default function TravelSearchBar({ regions, onSearch }: TravelSearchBarProps) {
  const [departureOpen, setDepartureOpen] = useState(false);
  const [departureCityId, setDepartureCityId] = useState("");
  const [destOpen, setDestOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [selectedDestId, setSelectedDestId] = useState<string | null>(null);
  const [selectedLabel, setSelectedLabel] = useState("不限目的地");
  const [date, setDate] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!departureOpen && !destOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDepartureOpen(false);
        setDestOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [departureOpen, destOpen]);

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
    setSelectedLabel(`${label}（全部）`);
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
      // 導到目的地頁，帶日期與出發地
      const qs = new URLSearchParams();
      if (date) qs.set("date", date);
      if (departureCityId) qs.set("city", departureCityId);
      const query = qs.toString();
      router.push(`/destination/${selectedDestId}${query ? `?${query}` : ""}`);
      setDestOpen(false);
      setDepartureOpen(false);
      return;
    }
    // 只有地區或日期 → 交由首頁篩選
    onSearch({ departureCity: departureCityId, regionId: selectedRegionId, destinationId: null, date });
  };

  const handleClear = () => {
    setDepartureCityId("");
    setSelectedRegionId(null);
    setSelectedDestId(null);
    setSelectedLabel("不限目的地");
    setDate("");
    onSearch({ departureCity: "", regionId: null, destinationId: null, date: "" });
  };

  const hasFilter = departureCityId || selectedRegionId || date;

  const departureCityLabel = DEPARTURE_CITIES.find((c) => c.id === departureCityId)?.label ?? "不限";

  const formatDate = (d: string) => {
    if (!d) return "";
    const [y, m, day] = d.split("-");
    return `${y}/${m}/${day}`;
  };

  return (
    <div className="mx-auto max-w-5xl px-3 py-5 sm:px-4 md:px-6">
      {/* 標題 */}
      <div className="mb-4 text-center">
        <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">探索您的夢想旅途</h2>
        <p className="mt-1 text-xs text-white/50 sm:text-sm">精選國際行程，由旅遊規劃師蓋瑞為您量身打造</p>
      </div>

      {/* 外層容器 — 搜尋列 + 兩個 dropdown 共用定位基準 */}
      <div ref={containerRef} className="relative">

        {/* 搜尋列主體 */}
        <div className="flex flex-col overflow-visible rounded-2xl bg-white shadow-2xl shadow-black/40 sm:flex-row sm:rounded-full">

          {/* 出發地 */}
          <button
            type="button"
            onClick={openDeparture}
            className="flex flex-1 items-center gap-3 rounded-t-2xl px-5 py-4 text-left transition hover:bg-gray-50 focus:outline-none sm:h-[60px] sm:rounded-l-full sm:rounded-r-none"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-500">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
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
                title="清除篩選"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 sm:hidden"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Dropdown 出發地 */}
        {departureOpen && (
          <div className="absolute left-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl shadow-black/20">
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
          </div>
        )}

        {/* Dropdown 目的地 — 對齊整個搜尋列寬度 */}
        {destOpen && (
          <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl shadow-black/20">

            {/* 第一列：地區 tabs，自動換行 */}
            <div className="border-b border-gray-100">
              <div className="flex flex-wrap">
                {regions.map((r) => (
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

            {/* 第二列：全部地區 */}
            <div className="border-b border-gray-100 px-4 py-2">
              <button
                onClick={() => setActiveTab("all")}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                  activeTab === "all"
                    ? "bg-sky-500 text-white"
                    : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                }`}
              >
                全部地區
              </button>
            </div>

            {/* Options — 2 欄佈局 */}
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
                  {regions.map((r) => (
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
                    const region = regions.find((r) => r.id === activeTab);
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
          </div>
        )}
      </div>

      {/* 篩選標籤 */}
      {hasFilter && (
        <div className="mt-3 flex flex-wrap items-center gap-2 px-1">
          {departureCityId && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
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
            className="hidden text-xs text-gray-400 underline underline-offset-2 transition hover:text-gray-600 sm:inline"
          >
            清除篩選
          </button>
        </div>
      )}
    </div>
  );
}
