"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import StickyHeader from "@/components/StickyHeader";
import DevModeToggle from "@/components/DevModeToggle";
import FlightDepartureDates from "@/components/FlightDepartureDates";
import FloatingContact from "@/components/FloatingContact";
import SocialCta from "@/components/SocialCta";
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
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSaveSuccess = (message = '儲存成功') => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveSuccessMessage(message);
    saveTimerRef.current = setTimeout(() => setSaveSuccessMessage(null), 1500);
  };

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
      <main className="flex min-h-screen items-center justify-center bg-transparent">
        <div className="flex items-center gap-2 text-gray-500">
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
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-transparent text-gray-900">
        <p className="text-gray-500">找不到此航線</p>
        <button onClick={() => router.push("/flights")} className="rounded-lg bg-[#00b4d8] px-5 py-2 text-sm font-semibold text-white">
          返回機票列表
        </button>
      </main>
    );
  }

  const metaEntries = Object.entries(route.metadata || {});

  return (
    <main className="min-h-screen bg-transparent text-gray-900">
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
          onSaveSuccess={() => showSaveSuccess('出發日期已儲存')}
        />

        {/* ── 自定義欄位 ── */}
        {metaEntries.length > 0 && (
          <section className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <h2 className="mb-3 text-sm font-bold text-gray-900">更多資訊</h2>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {metaEntries.map(([k, v]) => (
                <div key={k} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5">
                  <p className="mb-0.5 text-[11px] text-gray-400">{k}</p>
                  <p className="text-sm font-semibold text-gray-800">{String(v)}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── 底部 CTA ── */}
        <div className="my-8 rounded-2xl border border-gray-200 bg-gray-50 p-5">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">需要協助？聯繫旅遊規劃師蓋瑞</p>
              <p className="mt-0.5 text-xs text-gray-500">免費諮詢 · 不收服務費 · 即時回覆</p>
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

        <SocialCta className="mt-10" title="需要機票協助嗎？" description="聯繫旅遊規劃師蓋瑞 GARY，為您找到最佳航班" />
      </div>

      <FloatingContact />

      {saveSuccessMessage && (
        <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center px-4">
          <div className="rounded-2xl border border-emerald-300 bg-white px-5 py-4 text-center shadow-2xl sm:px-6">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-base font-bold text-emerald-600">{saveSuccessMessage}</p>
          </div>
        </div>
      )}
    </main>
  );
}
