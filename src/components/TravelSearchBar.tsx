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
  const [selectedLabel, setSelectedLabel] = useState("不限");
  const [date, setDate] = useState("");
  const destRef = useRef<HTMLDivElement>(null);
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
    setSelectedLabel("不限");
    setDestOpen(false);
  };

  const handleSelectRegion = (regionId: string, label: string) => {
    setSelectedRegionId(regionId);
    setSelectedDestId(null);
    setSelectedLabel(`${label}全部`);
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
    setSelectedLabel("不限");
    setDate("");
    onSearch({ regionId: null, destinationId: null, date: "" });
  };

  const hasFilter = selectedRegionId || date;

  return (
    <div className="mx-auto max-w-3xl px-3 py-4 sm:px-4 md:px-6">
      <div className="relative flex flex-col gap-0 overflow-hidden rounded-[1.5rem] border border-white/10 bg-[rgba(20,20,30,0.65)] shadow-xl shadow-black/30 backdrop-blur-[14px] sm:flex-row sm:rounded-[1.75rem]">

        {/* 目的地 */}
        <div ref={destRef} className="relative flex-1 border-b border-white/8 sm:border-b-0 sm:border-r">
          <button
            type="button"
            onClick={() => setDestOpen((v) => !v)}
            className="flex w-full flex-row items-center justify-between gap-3 px-5 py-3.5 text-left transition hover:bg-white/5 sm:flex-col sm:items-start sm:justify-start sm:gap-0.5 sm:py-4"
          >
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">目的地</span>
              <span className="mt-0.5 block text-sm font-bold text-white sm:text-[15px]">{selectedLabel}</span>
            </div>
            <svg
              className={`h-4 w-4 shrink-0 text-white/30 transition-transform sm:hidden ${destOpen ? "rotate-180" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown */}
          {destOpen && (
            <div className="absolute left-0 top-full z-50 mt-1 w-80 overflow-hidden rounded-2xl border border-white/10 bg-[rgba(12,14,28,0.98)] shadow-2xl backdrop-blur-xl sm:mt-2">
              {/* Region tabs */}
              <div className="flex overflow-x-auto border-b border-white/8 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button
                  onClick={() => setActiveTab("all")}
                  className={`shrink-0 px-4 py-2.5 text-xs font-semibold transition ${
                    activeTab === "all" ? "border-b-2 border-sky-400 text-sky-300" : "text-white/50 hover:text-white"
                  }`}
                >
                  全部
                </button>
                {regions.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setActiveTab(r.id)}
                    className={`shrink-0 px-4 py-2.5 text-xs font-semibold transition ${
                      activeTab === r.id ? "border-b-2 border-sky-400 text-sky-300" : "text-white/50 hover:text-white"
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
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-white/80 transition hover:bg-white/8 hover:text-white"
                    >
                      <span className="text-xs text-white/25">—</span>
                      <span>不限</span>
                    </button>
                    {regions.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => handleSelectRegion(r.id, r.categoryLabel)}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-white/80 transition hover:bg-white/8 hover:text-white"
                      >
                        <span className="text-xs text-white/25">—</span>
                        <span>{r.categoryLabel}</span>
                        <span className="ml-auto text-[11px] text-white/30">全部</span>
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
                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-sky-300 transition hover:bg-sky-400/10"
                          >
                            <span className="text-xs text-sky-400/40">—</span>
                            {region.categoryLabel}全部
                          </button>
                          {region.destinations.map((d) => (
                            <button
                              key={d.id}
                              onClick={() => handleSelectDest(region.id, d.id, d.title)}
                              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-white/75 transition hover:bg-white/8 hover:text-white"
                            >
                              <span className="text-xs text-white/25">—</span>
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

        {/* 出發日期 */}
        <div className="flex-1 border-b border-white/8 px-5 py-3.5 sm:border-b-0 sm:border-r sm:py-4">
          <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">出發日期</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            min={today}
            className="mt-0.5 w-full bg-transparent text-sm font-bold text-white outline-none [color-scheme:dark] empty:text-white/30"
          />
        </div>

        {/* 搜尋按鈕 */}
        <div className="flex items-center gap-2 px-4 py-3 sm:py-0">
          <button
            type="button"
            onClick={handleSearch}
            className="flex flex-1 items-center justify-center gap-2 rounded-[1.25rem] bg-sky-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-sky-500/25 transition hover:bg-sky-400 active:scale-95 sm:flex-none sm:h-11 sm:w-11 sm:rounded-full sm:px-0"
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
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/40 transition hover:bg-white/10 hover:text-white sm:h-11 sm:w-11"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 篩選標籤提示 */}
      {hasFilter && (
        <div className="mt-2 flex flex-wrap items-center gap-2 px-1">
          {selectedRegionId && (
            <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-300">
              {selectedLabel}
            </span>
          )}
          {date && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
              出發：{date.replace(/-/g, "/")}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
