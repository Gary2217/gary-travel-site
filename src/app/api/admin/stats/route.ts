import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { DEV_AUTH_COOKIE_NAME, verifyDevAuthCookie } from "@/lib/dev-auth";

interface AnalyticsEvent {
  id: string;
  event_type: string;
  platform: string | null;
  trip_id: string | null;
  flight_id: string | null;
  trip_title: string | null;
  flight_route: string | null;
  created_at: string;
}

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get(DEV_AUTH_COOKIE_NAME)?.value;
  if (!verifyDevAuthCookie(cookie)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: events, error } = await supabase
    .from("analytics_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error || !events) {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }

  const ev = events as AnalyticsEvent[];

  // ── Overview ──────────────────────────────────────────
  const overview = {
    total_views:     ev.filter(e => e.event_type === "trip_view" || e.event_type === "flight_view").length,
    total_downloads: ev.filter(e => e.event_type === "trip_download").length,
    total_shares:    ev.filter(e => e.event_type === "trip_share").length,
    total_inquiries: ev.filter(e => e.event_type === "trip_inquiry" || e.event_type === "flight_inquiry").length,
  };

  // ── 7-day trend ───────────────────────────────────────
  const now = new Date();
  const trend = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    const label = `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const end   = start + 86_400_000;
    const day   = ev.filter(e => { const t = new Date(e.created_at).getTime(); return t >= start && t < end; });
    return {
      date:      label,
      views:     day.filter(e => e.event_type === "trip_view" || e.event_type === "flight_view").length,
      downloads: day.filter(e => e.event_type === "trip_download").length,
      shares:    day.filter(e => e.event_type === "trip_share").length,
    };
  });

  // ── Per-trip ──────────────────────────────────────────
  const tripMap = new Map<string, {
    trip_id: string; trip_title: string;
    views: number; downloads: number; shares: number;
    dl_line: number; dl_fb: number; dl_ig: number;
    share_line: number; share_fb: number; share_ig: number;
  }>();
  for (const e of ev) {
    if (!e.trip_id) continue;
    if (!tripMap.has(e.trip_id)) {
      tripMap.set(e.trip_id, {
        trip_id: e.trip_id, trip_title: e.trip_title || e.trip_id,
        views: 0, downloads: 0, shares: 0,
        dl_line: 0, dl_fb: 0, dl_ig: 0,
        share_line: 0, share_fb: 0, share_ig: 0,
      });
    }
    const t = tripMap.get(e.trip_id)!;
    if (e.event_type === "trip_view") t.views++;
    if (e.event_type === "trip_download") {
      t.downloads++;
      if (e.platform === "LINE") t.dl_line++;
      if (e.platform === "FB")   t.dl_fb++;
      if (e.platform === "IG")   t.dl_ig++;
    }
    if (e.event_type === "trip_share") {
      t.shares++;
      if (e.platform === "LINE") t.share_line++;
      if (e.platform === "FB")   t.share_fb++;
      if (e.platform === "IG")   t.share_ig++;
    }
  }
  const trips = [...tripMap.values()].sort((a, b) => b.views - a.views);

  // ── Platform distribution ─────────────────────────────
  const dlShare = ev.filter(e =>
    e.event_type === "trip_download" || e.event_type === "trip_share" || e.event_type === "flight_inquiry"
  );
  const platform = {
    line:      dlShare.filter(e => e.platform === "LINE").length,
    facebook:  dlShare.filter(e => e.platform === "FB").length,
    instagram: dlShare.filter(e => e.platform === "IG").length,
  };

  // ── Per-flight ────────────────────────────────────────
  const flightMap = new Map<string, {
    flight_id: string; flight_route: string;
    views: number; inquiries: number;
    line: number; fb: number; ig: number;
  }>();
  for (const e of ev) {
    if (!e.flight_id) continue;
    if (!flightMap.has(e.flight_id)) {
      flightMap.set(e.flight_id, {
        flight_id: e.flight_id, flight_route: e.flight_route || e.flight_id,
        views: 0, inquiries: 0, line: 0, fb: 0, ig: 0,
      });
    }
    const f = flightMap.get(e.flight_id)!;
    if (e.event_type === "flight_view") f.views++;
    if (e.event_type === "flight_inquiry") {
      f.inquiries++;
      if (e.platform === "LINE") f.line++;
      if (e.platform === "FB")   f.fb++;
      if (e.platform === "IG")   f.ig++;
    }
  }
  const flights = [...flightMap.values()].sort((a, b) => b.views - a.views);

  // ── Recent events ─────────────────────────────────────
  const recent = ev.slice(0, 20).map(e => ({
    created_at:   e.created_at,
    event_type:   e.event_type,
    platform:     e.platform,
    trip_title:   e.trip_title,
    flight_route: e.flight_route,
  }));

  return NextResponse.json({ overview, trend, trips, platform, flights, recent });
}
