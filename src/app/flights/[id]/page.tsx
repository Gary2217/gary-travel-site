"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import StickyHeader from "@/components/StickyHeader";
import { getSiteLogo, lineHref, fbHref, igHref, type FlightRoute } from "@/lib/supabase";

const REGION_COLOR: Record<string, string> = {
  日本: "bg-rose-600/80",
  韓國: "bg-fuchsia-600/80",
  東南亞: "bg-emerald-600/80",
  中港澳: "bg-amber-600/80",
  歐洲: "bg-blue-600/80",
  美洲: "bg-indigo-600/80",
  澳紐: "bg-teal-600/80",
};

export default function FlightDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [route, setRoute] = useState<FlightRoute | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [siteLogoUrl, setSiteLogoUrl] = useState("/travel-logo.svg");

  useEffect(() => {
    getSiteLogo().then(setSiteLogoUrl).catch(() => {});
    fetchRoute();
  }, [params.id]);

  async function fetchRoute() {
    try {
      const res = await fetch(`/api/flight-routes/${params.id}`, { cache: "no-store" });
      if (!res.ok) { setNotFound(true); return; }
      setRoute(await res.json());
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  const lineMsg = route
    ? `https://line.me/ti/p/${(process.env.NEXT_PUBLIC_LINE_ID || "").replace("@", "")}`
    : lineHref;

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#0b0f2a_0%,#0a0a0a_50%,#1a0d0d_100%)]">
        <div className="flex items-center gap-2 text-white/50">
          <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          載入中...
        </div>
      </main>
    );
  }

  if (notFound || !route) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[linear-gradient(135deg,#0b0f2a_0%,#0a0a0a_50%,#1a0d0d_100%)] text-white">
        <p className="text-white/50">找不到此航線</p>
        <button onClick={() => router.push("/flights")} className="rounded-full bg-sky-600 px-5 py-2 text-sm font-semibold">
          返回機票列表
        </button>
      </main>
    );
  }

  const metaEntries = Object.entries(route.metadata || {});

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#0b0f2a_0%,#0a0a0a_50%,#1a0d0d_100%)] text-white">
      <StickyHeader logoUrl={siteLogoUrl} showBackButton backHref="/flights" />

      {/* ── Hero ─────────────────────────────────────────── */}
      <div className="relative h-[52vh] min-h-[280px] max-h-[420px] w-full overflow-hidden">
        {route.image_url ? (
          <img src={route.image_url} alt={route.to_city} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-sky-900 to-slate-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-transparent h-24" />

        {/* Hero content */}
        <div className="absolute inset-x-0 bottom-0 px-4 pb-6 sm:px-6 md:px-10">
          <div className="mx-auto max-w-5xl">
            {/* Badges */}
            <div className="mb-3 flex flex-wrap gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm ${REGION_COLOR[route.region] ?? "bg-slate-600/80"}`}>
                {route.region}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm ${route.direct ? "bg-sky-600/80" : "bg-white/20"}`}>
                {route.direct ? "直飛" : "轉機"}
              </span>
            </div>

            {/* Route */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-white/70 sm:text-base">{route.from_city}</span>
              <svg className="h-5 w-5 shrink-0 text-sky-400 sm:h-6 sm:w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
              </svg>
              <h1 className="text-4xl font-bold text-white drop-shadow sm:text-5xl md:text-6xl">{route.to_city}</h1>
            </div>

            {/* Price */}
            <p className="mt-2 text-xl font-bold text-sky-300 sm:text-2xl">{route.price_range}</p>
          </div>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────── */}
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 md:px-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">

          {/* Left column */}
          <div className="space-y-4">

            {/* 航班資訊 */}
            <section className="rounded-[1.5rem] border border-white/10 bg-[rgba(20,20,30,0.55)] p-5 backdrop-blur-[12px]">
              <h2 className="mb-4 text-base font-bold text-white">航班資訊</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <InfoBlock label="出發地" value={route.from_city} />
                <InfoBlock label="目的地" value={route.to_city} />
                <InfoBlock label="飛行時間" value={route.duration} />
                <InfoBlock label="飛行方式" value={route.direct ? "✈ 直飛" : "🔄 需轉機"} highlight={route.direct} />
              </div>

              {/* Airlines */}
              <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="mb-1 text-xs text-white/45">可選航空公司</p>
                <div className="flex flex-wrap gap-2">
                  {route.airlines.split(/[/／、,，]/).map((a) => a.trim()).filter(Boolean).map((airline) => (
                    <span key={airline} className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-sm font-medium text-white/85">
                      {airline}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            {/* 自定義欄位 (metadata) */}
            {metaEntries.length > 0 && (
              <section className="rounded-[1.5rem] border border-white/10 bg-[rgba(20,20,30,0.55)] p-5 backdrop-blur-[12px]">
                <h2 className="mb-4 text-base font-bold text-white">更多資訊</h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {metaEntries.map(([k, v]) => (
                    <InfoBlock key={k} label={k} value={String(v)} />
                  ))}
                </div>
              </section>
            )}

            {/* Mobile CTA */}
            <div className="lg:hidden">
              <CtaCard route={route} lineHref={lineHref} fbHref={fbHref} igHref={igHref} />
            </div>
          </div>

          {/* Right column (sticky desktop) */}
          <div className="hidden lg:block">
            <div className="sticky top-[88px]">
              <CtaCard route={route} lineHref={lineHref} fbHref={fbHref} igHref={igHref} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// ── Sub-components ──────────────────────────────────────

function InfoBlock({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
      <p className="mb-0.5 text-[11px] text-white/40">{label}</p>
      <p className={`text-sm font-semibold ${highlight ? "text-sky-300" : "text-white/90"}`}>{value}</p>
    </div>
  );
}

function CtaCard({ route, lineHref, fbHref, igHref }: {
  route: FlightRoute;
  lineHref: string;
  fbHref: string;
  igHref: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-[rgba(20,20,30,0.75)] p-5 shadow-2xl backdrop-blur-[16px]">
      {/* Price */}
      <div className="mb-4 text-center">
        <p className="text-xs text-white/45">參考票價</p>
        <p className="text-3xl font-bold text-sky-300">{route.price_range}</p>
        <p className="mt-1 text-[11px] text-white/35">實際票價依查詢日期與艙等而異</p>
      </div>

      {/* LINE CTA */}
      <a
        href={lineHref}
        target="_blank"
        rel="noreferrer"
        className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#06C755] py-3.5 text-base font-bold text-white shadow-lg transition hover:bg-[#05b54c] active:scale-95"
      >
        <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white">
          <span className="text-[7px] font-black leading-none text-[#06C755]">LINE</span>
          <span className="absolute -bottom-[2px] left-[5px] h-0 w-0 border-l-[4px] border-r-[4px] border-t-[5px] border-l-transparent border-r-transparent border-t-white" />
        </span>
        LINE 詢問機票報價
      </a>

      <p className="mt-2 text-center text-[11px] text-white/35">免費諮詢・不收服務費</p>

      {/* Divider */}
      <div className="my-4 border-t border-white/10" />

      {/* Secondary CTAs */}
      <div className="grid grid-cols-2 gap-2">
        <a
          href={fbHref}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-1.5 rounded-xl bg-[#1877F2]/80 py-2.5 text-xs font-semibold text-white transition hover:bg-[#1877F2]"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          FB 私訊
        </a>
        <a
          href={igHref}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-1.5 rounded-xl bg-[#E4405F]/80 py-2.5 text-xs font-semibold text-white transition hover:bg-[#E4405F]"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
          </svg>
          IG 私訊
        </a>
      </div>

      {/* Trust signals */}
      <div className="mt-4 space-y-1.5">
        {["即時回覆・不用等", "已服務 1,000+ 旅客", "旅遊規劃師蓋瑞 GARY"].map((t) => (
          <div key={t} className="flex items-center gap-2 text-[11px] text-white/45">
            <span className="text-sky-400">✓</span>
            {t}
          </div>
        ))}
      </div>
    </div>
  );
}
