"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { lineHref, type FlightRoute } from "@/lib/supabase";
import { openExternalLink } from "@/lib/external-link";

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
  /** 僅顯示機票搜尋（隱藏行程搜尋 tab） */
  flightOnly?: boolean;
}

const DEPARTURE_CITIES = [
  { id: "", label: "不限" },
  { id: "桃園", label: "台北（桃園機場）" },
  { id: "松山", label: "台北（松山機場）" },
  { id: "台中", label: "台中" },
  { id: "高雄", label: "高雄" },
];

const FLIGHT_DEPARTURES = [
  { code: "TPE", label: "台北（桃園）" },
  { code: "TSA", label: "台北（松山）" },
  { code: "RMQ", label: "台中" },
  { code: "KHH", label: "高雄" },
];

const FLIGHT_DESTINATIONS = [
  { code: "NRT", label: "東京（成田）", region: "日本" },
  { code: "HND", label: "東京（羽田）", region: "日本" },
  { code: "KIX", label: "大阪（關西）", region: "日本" },
  { code: "NGO", label: "名古屋", region: "日本" },
  { code: "FUK", label: "福岡", region: "日本" },
  { code: "CTS", label: "札幌（新千歲）", region: "日本" },
  { code: "OKA", label: "沖繩（那霸）", region: "日本" },
  { code: "ICN", label: "首爾（仁川）", region: "韓國" },
  { code: "GMP", label: "首爾（金浦）", region: "韓國" },
  { code: "PUS", label: "釜山", region: "韓國" },
  { code: "BKK", label: "曼谷（素萬那普）", region: "東南亞" },
  { code: "DMK", label: "曼谷（廊曼）", region: "東南亞" },
  { code: "SIN", label: "新加坡", region: "東南亞" },
  { code: "KUL", label: "吉隆坡", region: "東南亞" },
  { code: "DPS", label: "巴里島（登巴薩）", region: "東南亞" },
  { code: "SGN", label: "胡志明市", region: "東南亞" },
  { code: "HAN", label: "河內", region: "東南亞" },
  { code: "MNL", label: "馬尼拉", region: "東南亞" },
  { code: "HKG", label: "香港", region: "中港澳" },
  { code: "MFM", label: "澳門", region: "中港澳" },
  { code: "LHR", label: "倫敦（希斯羅）", region: "歐洲" },
  { code: "CDG", label: "巴黎（戴高樂）", region: "歐洲" },
  { code: "FRA", label: "法蘭克福", region: "歐洲" },
  { code: "AMS", label: "阿姆斯特丹", region: "歐洲" },
  { code: "FCO", label: "羅馬（菲烏米奇諾）", region: "歐洲" },
  { code: "ZRH", label: "蘇黎世", region: "歐洲" },
  { code: "LAX", label: "洛杉磯", region: "美洲" },
  { code: "JFK", label: "紐約（甘迺迪）", region: "美洲" },
  { code: "SFO", label: "舊金山", region: "美洲" },
  { code: "YVR", label: "溫哥華", region: "美洲" },
  { code: "YYZ", label: "多倫多", region: "美洲" },
  { code: "SYD", label: "雪梨", region: "澳紐" },
  { code: "MEL", label: "墨爾本", region: "澳紐" },
  { code: "AKL", label: "奧克蘭", region: "澳紐" },
];

export default function TravelSearchBar({ regions = [], onSearch, flightOnly = false }: TravelSearchBarProps) {
  // 模式切換
  const [activeMode, setActiveMode] = useState<"trip" | "flight">(flightOnly ? "flight" : "trip");

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
  const dateInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  // === 機票搜尋 state ===
  const [tripType, setTripType] = useState<"roundtrip" | "oneway">("roundtrip");
  const [fromCode, setFromCode] = useState("TPE");
  const [fromOpen, setFromOpen] = useState(false);
  const [toCity, setToCity] = useState<(typeof FLIGHT_DESTINATIONS)[number] | null>(null);
  const [toSearch, setToSearch] = useState("");
  const [toOpen, setToOpen] = useState(false);
  const [outboundDate, setOutboundDate] = useState("");
  const [inboundDate, setInboundDate] = useState("");
  const flightRef = useRef<HTMLDivElement>(null);
  const outboundRef = useRef<HTMLInputElement>(null);
  const inboundRef = useRef<HTMLInputElement>(null);
  const toSearchRef = useRef<HTMLInputElement>(null);

  // 機票搜尋結果
  const [flightRoutes, setFlightRoutes] = useState<FlightRoute[]>([]);
  const [flightRoutesLoaded, setFlightRoutesLoaded] = useState(false);
  const [flightResult, setFlightResult] = useState<{
    matched: FlightRoute | null;
    sameRegion: FlightRoute[];
    searchLabel: string;
    region: string;
  } | null>(null);

  // 行程 dropdown 外點關閉
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

  // 切到機票模式時載入航線資料
  useEffect(() => {
    if (activeMode !== "flight" || flightRoutesLoaded) return;
    fetch("/api/flight-routes")
      .then((r) => r.json())
      .then((data: FlightRoute[]) => {
        setFlightRoutes(data);
        setFlightRoutesLoaded(true);
      })
      .catch(() => setFlightRoutesLoaded(true));
  }, [activeMode, flightRoutesLoaded]);

  // 機票 dropdown 外點關閉
  useEffect(() => {
    if (!fromOpen && !toOpen) return;
    const handler = (e: MouseEvent) => {
      if (flightRef.current && !flightRef.current.contains(e.target as Node)) {
        setFromOpen(false);
        setToOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [fromOpen, toOpen]);

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
      const qs = new URLSearchParams();
      if (date) qs.set("date", date);
      if (departureCityId) qs.set("city", departureCityId);
      const query = qs.toString();
      router.push(`/destination/${selectedDestId}${query ? `?${query}` : ""}`);
      setDestOpen(false);
      setDepartureOpen(false);
      return;
    }
    onSearch?.({ departureCity: departureCityId, regionId: selectedRegionId, destinationId: null, date });
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
  const fromLabel = FLIGHT_DEPARTURES.find((d) => d.code === fromCode)?.label ?? "台北（桃園）";

  const formatDate = (d: string) => {
    if (!d) return "";
    const [y, m, day] = d.split("-");
    return `${y}/${m}/${day}`;
  };

  // === 機票搜尋 handlers ===
  const filteredDest = FLIGHT_DESTINATIONS.filter((d) =>
    !toSearch ||
    d.label.includes(toSearch) ||
    d.region.includes(toSearch) ||
    d.code.toLowerCase().includes(toSearch.toLowerCase())
  );

  const destRegions = Array.from(new Set(filteredDest.map((d) => d.region)));

  function handleFlightSearch() {
    if (!toCity) return;

    const searchLabel = toCity.label;
    const searchRegion = toCity.region;

    // 用目的地城市名比對資料庫航線（搜尋欄 label 如「東京（成田）」，DB 的 to_city 如「東京」）
    const matched = flightRoutes.find(
      (r) => searchLabel.includes(r.to_city) || r.to_city.includes(searchLabel.replace(/（.*）/, ""))
    ) ?? null;

    if (matched) {
      router.push(`/flights/${matched.id}`);
      return;
    }

    // 沒有完全匹配 → 找同地區航線
    const sameRegion = flightRoutes.filter((r) => r.region === searchRegion);
    setFlightResult({ matched: null, sameRegion, searchLabel, region: searchRegion });
  }

  return (
    <div className="mx-auto max-w-[900px] px-3 py-4 sm:px-4 md:px-6">
      {/* 標題 */}
      {!flightOnly && (
        <div className="mb-4 text-center">
          <h2 className="text-lg font-bold text-white sm:text-xl">探索你的下一趟旅程</h2>
          <p className="mt-1 text-xs text-white/50">精選國際行程，由旅遊規劃師蓋瑞為您量身打造</p>
        </div>
      )}

      {/* 模式 Tab */}
      {!flightOnly && (
      <div className="mb-3 flex justify-center">
        <div className="inline-flex rounded-full bg-white/10 p-1 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setActiveMode("trip")}
            className={`flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold transition ${
              activeMode === "trip"
                ? "bg-white text-gray-900 shadow"
                : "text-white/70 hover:text-white"
            }`}
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            團體旅遊
          </button>
        </div>
      </div>
      )}

      {/* ── 行程搜尋 ── */}
      {activeMode === "trip" && (
        <div ref={containerRef} className="relative">
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

          {/* Dropdown 目的地 */}
          {destOpen && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl shadow-black/20">
              <div className="border-b border-gray-100">
                <div className="flex flex-wrap">
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
      )}

      {/* 篩選標籤（行程模式） */}
      {activeMode === "trip" && hasFilter && (
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

      {/* ── 機票搜尋 ── */}
      {activeMode === "flight" && (
        <div ref={flightRef} className="relative">
          {/* 來回 / 單程 toggle */}
          <div className="mb-3 flex gap-4">
            {(["roundtrip", "oneway"] as const).map((type) => (
              <label key={type} className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="tripType"
                  value={type}
                  checked={tripType === type}
                  onChange={() => {
                    setTripType(type);
                    if (type === "oneway") setInboundDate("");
                  }}
                  className="h-4 w-4 accent-sky-500"
                />
                <span className="text-sm font-semibold text-white">
                  {type === "roundtrip" ? "來回" : "單程"}
                </span>
              </label>
            ))}
          </div>

          {/* 搜尋框主體 */}
          <div className="flex flex-col overflow-visible rounded-2xl bg-white shadow-2xl shadow-black/40 sm:flex-row sm:rounded-full">

            {/* 出發地 */}
            <button
              type="button"
              onClick={() => { setFromOpen(!fromOpen); setToOpen(false); }}
              className="flex flex-1 items-center gap-3 rounded-t-2xl px-5 py-4 text-left transition hover:bg-gray-50 focus:outline-none sm:h-[60px] sm:rounded-l-full sm:rounded-r-none"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-500">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <span className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400">出發地</span>
                <span className="mt-0.5 block truncate text-sm font-bold text-gray-900">{fromLabel}</span>
              </div>
              <svg className={`h-4 w-4 shrink-0 text-gray-300 transition-transform ${fromOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <div className="hidden h-[60px] w-px shrink-0 self-center bg-gray-100 sm:block" />
            <div className="mx-5 h-px bg-gray-100 sm:hidden" />

            {/* 目的地 */}
            <button
              type="button"
              onClick={() => {
                const next = !toOpen;
                setToOpen(next);
                setFromOpen(false);
                if (next) setTimeout(() => toSearchRef.current?.focus(), 50);
              }}
              className="flex flex-1 items-center gap-3 px-5 py-4 text-left transition hover:bg-gray-50 focus:outline-none sm:h-[60px] sm:rounded-none"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-500">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-2.079 3.791-5.16 3.791-9.077A8 8 0 003.05 9.25c0 3.916 1.847 6.997 3.791 9.077a19.58 19.58 0 002.683 2.282 16.974 16.974 0 001.144.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <span className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400">目的地</span>
                <span className={`mt-0.5 block truncate text-sm font-bold ${toCity ? "text-gray-900" : "text-gray-400"}`}>
                  {toCity ? toCity.label : "選擇城市"}
                </span>
              </div>
              <svg className={`h-4 w-4 shrink-0 text-gray-300 transition-transform ${toOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <div className="hidden h-[60px] w-px shrink-0 self-center bg-gray-100 sm:block" />
            <div className="mx-5 h-px bg-gray-100 sm:hidden" />

            {/* 去程日期 */}
            <div
              className="flex flex-1 cursor-pointer items-center gap-3 px-5 py-4 transition hover:bg-gray-50 sm:h-[60px] sm:py-0"
              onClick={() => outboundRef.current?.showPicker?.()}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-500">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </span>
              <div className="relative flex-1 overflow-hidden">
                <span className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400">去程日期</span>
                <div className={`mt-0.5 text-sm font-bold ${outboundDate ? "text-gray-900" : "text-gray-400"}`}>
                  {outboundDate ? formatDate(outboundDate) : "選擇日期"}
                </div>
                <input
                  ref={outboundRef}
                  type="date"
                  value={outboundDate}
                  onChange={(e) => setOutboundDate(e.target.value)}
                  min={today}
                  autoComplete="off"
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </div>
            </div>

            {/* 回程日期（僅來回模式） */}
            {tripType === "roundtrip" && (
              <>
                <div className="hidden h-[60px] w-px shrink-0 self-center bg-gray-100 sm:block" />
                <div className="mx-5 h-px bg-gray-100 sm:hidden" />
                <div
                  className="col-span-2 flex flex-1 cursor-pointer items-center gap-3 px-5 py-4 transition hover:bg-gray-50 sm:col-span-1 sm:h-[60px] sm:py-0"
                  onClick={() => inboundRef.current?.showPicker?.()}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-500">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </span>
                  <div className="relative flex-1 overflow-hidden">
                    <span className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400">回程日期</span>
                    <div className={`mt-0.5 text-sm font-bold ${inboundDate ? "text-gray-900" : "text-gray-400"}`}>
                      {inboundDate ? formatDate(inboundDate) : "選擇日期"}
                    </div>
                    <input
                      ref={inboundRef}
                      type="date"
                      value={inboundDate}
                      onChange={(e) => setInboundDate(e.target.value)}
                      min={outboundDate || today}
                      autoComplete="off"
                      className="absolute inset-0 cursor-pointer opacity-0"
                    />
                  </div>
                </div>
              </>
            )}

            {/* 搜尋按鈕 */}
            <div className="flex items-center px-4 py-3 sm:py-0">
              <button
                type="button"
                onClick={handleFlightSearch}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-sky-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-sky-500/30 transition hover:bg-sky-400 active:scale-95 sm:h-[44px] sm:w-[44px] sm:flex-none sm:px-0"
              >
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="sm:hidden">搜尋機票</span>
              </button>
            </div>
          </div>

          {/* Dropdown 出發地 */}
          {fromOpen && (
            <div className="absolute left-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl shadow-black/20">
              <div className="py-1.5">
                {FLIGHT_DEPARTURES.map((d) => (
                  <button
                    key={d.code}
                    onClick={() => { setFromCode(d.code); setFromOpen(false); }}
                    className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-sm transition ${
                      fromCode === d.code
                        ? "bg-sky-50 font-semibold text-sky-600"
                        : "text-gray-600 hover:bg-sky-50 hover:text-sky-700"
                    }`}
                  >
                    {fromCode === d.code ? (
                      <svg className="h-3.5 w-3.5 shrink-0 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="h-3.5 w-3.5 shrink-0" />
                    )}
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Dropdown 目的地（可搜尋，依地區分組） */}
          {toOpen && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl shadow-black/20">
              <div className="border-b border-gray-100 p-3">
                <input
                  ref={toSearchRef}
                  type="text"
                  value={toSearch}
                  onChange={(e) => setToSearch(e.target.value)}
                  placeholder="搜尋城市、國家或機場代碼..."
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-300"
                />
              </div>
              <div className="max-h-72 overflow-y-auto">
                {destRegions.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-gray-400">找不到符合的城市</p>
                ) : (
                  destRegions.map((region) => (
                    <div key={region}>
                      <div className="sticky top-0 bg-gray-50 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        {region}
                      </div>
                      {filteredDest.filter((d) => d.region === region).map((d) => (
                        <button
                          key={d.code}
                          onClick={() => { setToCity(d); setToSearch(""); setToOpen(false); }}
                          className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition ${
                            toCity?.code === d.code
                              ? "bg-sky-50 font-semibold text-sky-600"
                              : "text-gray-600 hover:bg-sky-50 hover:text-sky-700"
                          }`}
                        >
                          <span>{d.label}</span>
                          <span className="ml-2 shrink-0 font-mono text-xs text-gray-400">{d.code}</span>
                        </button>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 說明文字 */}
          <p className="mt-2 text-center text-xs text-white/40">
            搜尋蓋瑞提供的機票諮詢航線｜需要協助請
            <a href={lineHref} onClick={(e) => { e.preventDefault(); openExternalLink(lineHref); }} className="text-sky-400 underline underline-offset-2 transition hover:text-sky-300">
              LINE 詢問蓋瑞
            </a>
          </p>

          {/* 搜尋結果提示 Modal */}
          {flightResult && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
              onClick={(e) => { if (e.target === e.currentTarget) setFlightResult(null); }}
            >
              <div className="w-full max-w-md overflow-hidden rounded-[1.75rem] border border-white/10 bg-[rgba(18,18,28,0.97)] shadow-2xl">
                <div className="p-6">
                  {/* 提示標題 */}
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        找不到「{flightResult.searchLabel}」的航線
                      </h3>
                      <p className="mt-1 text-sm text-white/50">
                        目前尚未提供此目的地的機票諮詢服務
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFlightResult(null)}
                      className="shrink-0 rounded-full p-1 text-white/40 transition hover:bg-white/10 hover:text-white"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* 同地區航線列表 */}
                  {flightResult.sameRegion.length > 0 ? (
                    <>
                      <p className="mb-3 text-sm font-semibold text-sky-300">
                        {flightResult.region}地區其他可諮詢航線：
                      </p>
                      <div className="max-h-60 space-y-2 overflow-y-auto">
                        {flightResult.sameRegion.map((route) => (
                          <Link
                            key={route.id}
                            href={`/flights/${route.id}`}
                            onClick={() => setFlightResult(null)}
                            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition hover:border-sky-500/30 hover:bg-white/10"
                          >
                            {route.image_url && (
                              <img
                                src={route.image_url}
                                alt={route.to_city}
                                className="h-10 w-10 shrink-0 rounded-lg object-cover"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-white/70">{route.from_city}</span>
                                <svg className="h-3 w-3 shrink-0 text-sky-400" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                                </svg>
                                <span className="font-bold text-white">{route.to_city}</span>
                              </div>
                              <p className="mt-0.5 truncate text-xs text-white/50">
                                {route.airlines}・{route.price_range}
                              </p>
                            </div>
                            <svg className="h-4 w-4 shrink-0 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-white/50">
                      {flightResult.region}地區目前暫無可諮詢的航線
                    </p>
                  )}

                  {/* LINE 聯繫 */}
                  <div className="mt-4 border-t border-white/10 pt-4">
                    <a
                      href={lineHref}
                      onClick={(e) => { e.preventDefault(); openExternalLink(lineHref); }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#06C755] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#05b34d] active:scale-[0.98]"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                      </svg>
                      LINE 詢問蓋瑞
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
