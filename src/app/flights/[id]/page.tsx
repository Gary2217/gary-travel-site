"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import StickyHeader from "@/components/StickyHeader";
import DevModeToggle from "@/components/DevModeToggle";
import FlightDepartureDates from "@/components/FlightDepartureDates";
import FloatingContact from "@/components/FloatingContact";
import LegalNotice from "@/components/LegalNotice";
import { getSiteLogo, lineDmHref, fbDmHref, igDmHref, type FlightRoute, type FlightDepartureDate } from "@/lib/supabase";
import { track } from "@/lib/analytics";
import { openExternalLink } from "@/lib/external-link";

export default function FlightDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [route, setRoute] = useState<FlightRoute | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [siteLogoUrl, setSiteLogoUrl] = useState("/travel-logo.svg");
  const [isDevMode, setIsDevMode] = useState(false);
  const [departureDates, setDepartureDates] = useState<FlightDepartureDate[]>([]);

  useEffect(() => {
    getSiteLogo().then(setSiteLogoUrl).catch(() => {});
    fetchRoute();
  }, [params.id]);

  async function fetchRoute() {
    try {
      const res = await fetch(`/api/flight-routes/${params.id}`, { cache: "no-store" });
      if (!res.ok) { setNotFound(true); return; }
      const data = await res.json() as FlightRoute;
      setRoute(data);
      setDepartureDates(data.flight_departure_dates || []);
      track({ event_type: "flight_view", flight_id: data.id, flight_route: `${data.from_city} → ${data.to_city}` });
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0f1923]">
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
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0f1923] text-white">
        <p className="text-white/50">找不到此航線</p>
        <button onClick={() => router.push("/flights")} className="rounded-lg bg-[#00b4d8] px-5 py-2 text-sm font-semibold text-white">
          返回機票列表
        </button>
      </main>
    );
  }

  const metaEntries = Object.entries(route.metadata || {});

  return (
    <main className="min-h-screen bg-[#0f1923] text-white">
      <StickyHeader logoUrl={siteLogoUrl} showBackButton backHref="/flights" devModeSlot={<DevModeToggle onToggle={setIsDevMode} />} />

      <div className="mx-auto max-w-site px-4 pt-16 md:px-5">

        {/* ── 航班列表（全寬） ── */}
        <FlightDepartureDates
          flightRouteId={route.id}
          routeLabel={`${route.from_city} → ${route.to_city}`}
          fromCity={route.from_city}
          toCity={route.to_city}
          duration={route.duration}
          direct={route.direct}
          airlines={route.airlines}
          dates={departureDates}
          isDevMode={isDevMode}
          onDatesChange={setDepartureDates}
        />

        {/* ── 自定義欄位 ── */}
        {metaEntries.length > 0 && (
          <section className="mt-6 rounded-2xl border border-white/[0.08] bg-[#1a3347] p-5">
            <h2 className="mb-3 text-sm font-bold text-white">更多資訊</h2>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {metaEntries.map(([k, v]) => (
                <div key={k} className="rounded-xl border border-white/[0.08] bg-white/5 px-3 py-2.5">
                  <p className="mb-0.5 text-[11px] text-white/40">{k}</p>
                  <p className="text-sm font-semibold text-white/90">{String(v)}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── 底部 CTA ── */}
        <div className="my-8 rounded-2xl border border-white/[0.08] bg-[#1a3347] p-5">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-white">需要協助？聯繫旅遊規劃師蓋瑞</p>
              <p className="mt-0.5 text-xs text-white/50">免費諮詢 · 不收服務費 · 即時回覆</p>
            </div>
            <div className="flex gap-2">
              <a href={lineDmHref}
                onClick={(e) => {
                  e.preventDefault();
                  track({ event_type: "flight_inquiry", platform: "LINE", flight_id: route.id, flight_route: `${route.from_city} → ${route.to_city}` });
                  openExternalLink(lineDmHref);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#06C755] px-5 py-2.5 text-[13px] font-semibold text-white transition hover:opacity-85">
                LINE 詢問
              </a>
              <a href={fbDmHref}
                onClick={(e) => {
                  e.preventDefault();
                  track({ event_type: "flight_inquiry", platform: "FB", flight_id: route.id, flight_route: `${route.from_city} → ${route.to_city}` });
                  openExternalLink(fbDmHref);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1877F2] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:opacity-85">
                FB 私訊
              </a>
              <a href={igDmHref}
                onClick={(e) => {
                  e.preventDefault();
                  track({ event_type: "flight_inquiry", platform: "IG", flight_id: route.id, flight_route: `${route.from_city} → ${route.to_city}` });
                  openExternalLink(igDmHref);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#E4405F] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:opacity-85">
                IG 私訊
              </a>
            </div>
          </div>
        </div>

        <LegalNotice className="mb-6" />
      </div>

      <FloatingContact />
    </main>
  );
}
