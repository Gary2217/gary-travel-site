"use client";

import { useState, useRef, useEffect } from "react";

type Destination = { id: string; title: string };
type RegionOption = { id: string; categoryLabel: string; destinations: Destination[] };

interface TravelSearchBarProps {
  regions: RegionOption[];
  onSearch: (params: { regionId: string | null; destinationId: string | null; date: string }) => void;
}

export default function TravelSearchBar({ regions, onSearch }: TravelSearchBarProps) {
  const [destOpen, setDestOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [selectedDestId, setSelectedDestId] = useState<string | null>(null);
  const [selectedLabel, setSelectedLabel] = useState("不限目的地");
  const [date, setDate] = useState("");
  const [dateFocused, setDateFocused] = useState(false);
  const destRef = useRef<HTMLDivElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!destOpen) return;
    const handler = (e: MouseEvent) => {
      if (destRef.current && !destRef.current.contains(e.target as Node)) {
        setDestOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [destOpen]);

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
    onSearch({ regionId: selectedRegionId, destinationId: selectedDestId, date });
  };

  const handleClear = () => {
    setSelectedRegionId(null);
    setSelectedDestId(null);
    setSelectedLabel("不限目的地");
    setDate("");
    onSearch({ regionId: null, destinationId: null, date: "" });
  };

  const hasFilter = selectedRegionId || date;

  const formatDate = (d: string) => {
    if (!d) return "";
    const [y, m, day] = d.split("-");
    return `${y}/${m}/${day}`;
  };

  return (
    <div className="mx-auto max-w-3xl px-3 py-5 sm:px-4 md:px-6">
      {/* 標題 */}
      <div className="mb-4 text-center">
        <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">探索您的夢想旅途</h2>
        <p className="mt-1 text-xs text-white/50 sm:text-sm">精選國際行程，由旅遊規劃師蓋瑞為您量身打造</p>
      </div>

      {/* 搜尋列主體 - 白色卡片風格 */}
      <div className="relative flex flex-col overflow-visible rounded-2xl bg-white shadow-2xl shadow-black/40 sm:flex-row sm:rounded-full">

        {/* 目的地 */}
        <div ref={destRef} className="relative flex-1">
          <button
            type="button"
            onClick={() => setDestOpen((v) => !v)}
            className="group flex w-full items-center gap-3 rounded-t-2xl px-5 py-4 text-left transition hover:bg-gray-50 focus:outline-none sm:rounded-l-full sm:rounded-r-none sm:py-0 sm:h-[60px]"
          >
            {/* 地點 icon */}
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
            <svg
              className={`h-4 w-4 shrink-0 text-gray-300 transition-transform ${destOpen ? "rotate-180" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown */}
          {destOpen && (
            <div className="absolute left-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl shadow-black/20">
              {/* Region tabs */}
              <div className="flex overflow-x-auto border-b border-gray-100 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button
                  onClick={() => setActiveTab("all")}
                  className={`shrink-0 px-4 py-2.5 text-xs font-semibold transition ${
                    activeTab === "all" ? "border-b-2 border-sky-500 text-sky-600" : "text-gray-400 hover:text-gray-700"
                  }`}
                >
                  全部
                </button>
                {regions.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setActiveTab(r.id)}
                    className={`shrink-0 px-4 py-2.5 text-xs font-semibold transition ${
                      activeTab === r.id ? "border-b-2 border-sky-500 text-sky-600" : "text-gray-400 hover:text-gray-700"
                    }`}
                  >
                    {r.categoryLabel}
                  </button>
                ))}
              </div>

              {/* Options */}
              <div className="max-h-60 overflow-y-auto py-1.5">
                {activeTab === "all" ? (
                  <>
                    <button
                      onClick={handleSelectAll}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-500 transition hover:bg-sky-50 hover:text-sky-700"
                    >
                      <span className="text-xs text-gray-300">—</span>
                      <span>不限目的地</span>
                    </button>
                    {regions.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => handleSelectRegion(r.id, r.categoryLabel)}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 transition hover:bg-sky-50 hover:text-sky-700"
                      >
                        <span className="text-xs text-gray-300">—</span>
                        <span className="font-medium">{r.categoryLabel}</span>
                        <span className="ml-auto text-[11px] text-gray-400">全部</span>
                      </button>
                    ))}
                  </>
                ) : (
                  <>
                    {(() => {
                      const region = regions.find((r) => r.id === activeTab);
                      if (!region) return null;
                      return (
                        <>
                          <button
                            onClick={() => handleSelectRegion(region.id, region.categoryLabel)}
                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-sky-600 transition hover:bg-sky-50"
                          >
                            <span className="text-xs text-sky-300">—</span>
                            {region.categoryLabel}（全部）
                          </button>
                          {region.destinations.map((d) => (
                            <button
                              key={d.id}
                              onClick={() => handleSelectDest(region.id, d.id, d.title)}
                              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 transition hover:bg-sky-50 hover:text-sky-700"
                            >
                              <span className="text-xs text-gray-300">—</span>
                              {d.title}
                            </button>
                          ))}
                        </>
                      );
                    })()}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 分隔線 */}
        <div className="hidden h-[60px] w-px shrink-0 self-center bg-gray-100 sm:block" />
        <div className="mx-5 h-px bg-gray-100 sm:hidden" />

        {/* 出發日期 */}
        <div
          className="flex flex-1 cursor-pointer items-center gap-3 px-5 py-4 transition hover:bg-gray-50 sm:py-0 sm:h-[60px]"
          onClick={() => dateInputRef.current?.showPicker?.()}
        >
          {/* 日曆 icon */}
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
              onFocus={() => setDateFocused(true)}
              onBlur={() => setDateFocused(false)}
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
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-sky-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-sky-500/30 transition hover:bg-sky-400 active:scale-95 sm:flex-none sm:h-[44px] sm:w-[44px] sm:px-0"
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

      {/* 篩選標籤 */}
      {hasFilter && (
        <div className="mt-3 flex flex-wrap items-center gap-2 px-1">
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
