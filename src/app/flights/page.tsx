"use client";

import { useEffect, useState } from "react";
import StickyHeader from "@/components/StickyHeader";
import SocialCta from "@/components/SocialCta";
import { getSiteLogo, lineHref } from "@/lib/supabase";

type Region = "全部" | "日本" | "韓國" | "東南亞" | "中港澳";

type FlightRoute = {
  id: string;
  from: string;
  to: string;
  region: Exclude<Region, "全部">;
  airlines: string;
  duration: string;
  priceRange: string;
  imageUrl: string;
  direct: boolean;
};

const ROUTES: FlightRoute[] = [
  {
    id: "1",
    from: "台北",
    to: "東京",
    region: "日本",
    airlines: "長榮 / 華航 / ANA / JAL",
    duration: "約 3.5 小時",
    priceRange: "NT$ 5,000 起",
    imageUrl: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80",
    direct: true,
  },
  {
    id: "2",
    from: "台北",
    to: "大阪",
    region: "日本",
    airlines: "長榮 / 樂桃 / Peach",
    duration: "約 2.5 小時",
    priceRange: "NT$ 4,500 起",
    imageUrl: "https://images.unsplash.com/photo-1589452271712-64b8a66c7b71?w=800&q=80",
    direct: true,
  },
  {
    id: "3",
    from: "台北",
    to: "福岡",
    region: "日本",
    airlines: "星宇 / 華航 / ANA",
    duration: "約 2 小時",
    priceRange: "NT$ 4,200 起",
    imageUrl: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80",
    direct: true,
  },
  {
    id: "4",
    from: "台北",
    to: "北海道",
    region: "日本",
    airlines: "長榮 / 華航 / ANA",
    duration: "約 4 小時",
    priceRange: "NT$ 6,500 起",
    imageUrl: "https://images.unsplash.com/photo-1493780474015-ba834fd0ce2f?w=800&q=80",
    direct: true,
  },
  {
    id: "5",
    from: "台北",
    to: "首爾",
    region: "韓國",
    airlines: "韓亞 / 大韓 / 易斯達 / t'way",
    duration: "約 2.5 小時",
    priceRange: "NT$ 4,000 起",
    imageUrl: "https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=800&q=80",
    direct: true,
  },
  {
    id: "6",
    from: "台北",
    to: "曼谷",
    region: "東南亞",
    airlines: "泰航 / 長榮 / 亞航 / 泰獅航",
    duration: "約 3.5 小時",
    priceRange: "NT$ 5,500 起",
    imageUrl: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800&q=80",
    direct: true,
  },
  {
    id: "7",
    from: "台北",
    to: "新加坡",
    region: "東南亞",
    airlines: "新航 / 長榮 / 酷航",
    duration: "約 4.5 小時",
    priceRange: "NT$ 7,000 起",
    imageUrl: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800&q=80",
    direct: true,
  },
  {
    id: "8",
    from: "台北",
    to: "峇里島",
    region: "東南亞",
    airlines: "嘉魯達 / 亞航 / 獅子航空",
    duration: "約 5 小時",
    priceRange: "NT$ 8,000 起",
    imageUrl: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80",
    direct: false,
  },
  {
    id: "9",
    from: "台北",
    to: "香港",
    region: "中港澳",
    airlines: "國泰 / 港航 / 長榮",
    duration: "約 1.5 小時",
    priceRange: "NT$ 3,500 起",
    imageUrl: "https://images.unsplash.com/photo-1536599018102-9f803c140fc1?w=800&q=80",
    direct: true,
  },
  {
    id: "10",
    from: "台北",
    to: "上海",
    region: "中港澳",
    airlines: "華航 / 長榮 / 中國東方",
    duration: "約 2 小時",
    priceRange: "NT$ 4,500 起",
    imageUrl: "https://images.unsplash.com/photo-1474181487882-5abf3f0ba6c2?w=800&q=80",
    direct: true,
  },
];

const REGIONS: Region[] = ["全部", "日本", "韓國", "東南亞", "中港澳"];

const regionBadgeColor: Record<Exclude<Region, "全部">, string> = {
  日本: "bg-rose-600/80",
  韓國: "bg-fuchsia-600/80",
  東南亞: "bg-emerald-600/80",
  中港澳: "bg-amber-600/80",
};

export default function FlightsPage() {
  const [activeRegion, setActiveRegion] = useState<Region>("全部");
  const [siteLogoUrl, setSiteLogoUrl] = useState("/travel-logo.svg");

  useEffect(() => {
    getSiteLogo()
      .then(setSiteLogoUrl)
      .catch(() => setSiteLogoUrl("/travel-logo.svg"));
  }, []);

  const filtered =
    activeRegion === "全部"
      ? ROUTES
      : ROUTES.filter((r) => r.region === activeRegion);

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#0b0f2a_0%,#0a0a0a_50%,#1a0d0d_100%)] text-white">
      <StickyHeader
        logoUrl={siteLogoUrl}
        showBackButton
      />

      <div className="px-4 pt-[86px] md:pt-[98px] lg:pt-[74px]">

        {/* Hero */}
        <div className="mx-auto max-w-3xl py-8 text-center md:py-10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-1.5 text-sm text-sky-300">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
            </svg>
            <span>Flight Consultation</span>
          </div>
          <h1 className="bg-gradient-to-r from-sky-200 via-cyan-300 to-blue-400 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl md:text-5xl">
            機票諮詢服務
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/65 sm:text-base">
            台北出發，飛往亞洲各地熱門航線<br className="hidden sm:block" />
            由旅遊規劃師蓋瑞為您比價，找到最划算票價
          </p>
        </div>

        {/* Region filter tabs */}
        <div className="sticky top-[84px] z-40 overflow-x-auto rounded-none bg-[rgba(10,10,18,0.82)] px-2 py-1.5 shadow-lg shadow-black/20 backdrop-blur-[6px] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:top-[96px] lg:top-[72px]">
          <div className="flex min-w-max justify-center gap-3 md:min-w-0 md:flex-wrap">
            {REGIONS.map((region) => (
              <button
                key={region}
                type="button"
                onClick={() => setActiveRegion(region)}
                className={`rounded-full border px-4 py-2 text-sm font-medium text-white shadow-sm transition ${
                  activeRegion === region
                    ? "border-sky-400/60 bg-sky-600/30 text-sky-200"
                    : "border-white/10 bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.14)]"
                }`}
              >
                {region}
              </button>
            ))}
          </div>
        </div>

        {/* Cards grid */}
        <div className="mx-auto max-w-7xl py-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((route) => (
              <div
                key={route.id}
                className="group relative overflow-hidden rounded-[1.5rem] border border-white/10 shadow-lg shadow-black/20"
              >
                {/* Background image */}
                <div
                  className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url(${route.imageUrl})` }}
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/40 to-black/10" />

                {/* Content */}
                <div className="relative flex h-[210px] flex-col justify-between p-4 sm:h-[228px] sm:p-5">

                  {/* Top badges */}
                  <div className="flex gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm ${regionBadgeColor[route.region]}`}>
                      {route.region}
                    </span>
                    {route.direct ? (
                      <span className="rounded-full bg-sky-600/75 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                        直飛
                      </span>
                    ) : (
                      <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold text-white/80 backdrop-blur-sm">
                        轉機
                      </span>
                    )}
                  </div>

                  {/* Route info */}
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-sm text-white/65">{route.from}</span>
                      <svg className="h-3.5 w-3.5 shrink-0 text-sky-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                      </svg>
                      <span className="text-2xl font-bold text-white sm:text-3xl">{route.to}</span>
                    </div>
                    <p className="mb-3 text-[11px] leading-4 text-white/50 sm:text-xs">{route.airlines}</p>
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-base font-bold text-sky-300 sm:text-lg">{route.priceRange}</p>
                        <p className="text-[11px] text-white/45">{route.duration}</p>
                      </div>
                      <a
                        href={lineHref}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 rounded-full bg-[#06C755] px-3.5 py-2 text-xs font-semibold text-white shadow transition hover:bg-[#05b54c] sm:px-4 sm:text-sm"
                      >
                        諮詢蓋瑞
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="py-16 text-center text-white/50">
              此地區暫無航線資料
            </div>
          )}
        </div>

        <SocialCta
          className="mb-8 mt-2"
          title="找到理想的航線了嗎？"
          description="聯繫旅遊規劃師蓋瑞 GARY，為您比較票價、規劃完整旅遊行程"
          logoUrl={siteLogoUrl}
          lineLabel="LINE 詢問機票"
        />
      </div>
    </main>
  );
}
