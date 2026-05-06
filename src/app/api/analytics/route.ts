import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  // Rate limit：每 IP 每分鐘最多 30 次事件
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateLimited = checkRateLimit(ip, "analytics", { windowMs: 60_000, max: 30 });
  if (rateLimited) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  try {
    const body = await req.json() as {
      event_type?: string; platform?: string; trip_id?: string;
      flight_id?: string; trip_title?: string; flight_route?: string;
    };
    const { event_type, platform, trip_id, flight_id, trip_title, flight_route } = body;
    if (!event_type || event_type.length > 50) return NextResponse.json({ ok: false });

    // 長度限制防止濫用
    if ((platform && platform.length > 20) ||
        (trip_id && trip_id.length > 100) ||
        (flight_id && flight_id.length > 100) ||
        (trip_title && trip_title.length > 200) ||
        (flight_route && flight_route.length > 200)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    await supabase.from("analytics_events").insert({
      event_type,
      platform:     platform     || null,
      trip_id:      trip_id      || null,
      flight_id:    flight_id    || null,
      trip_title:   trip_title   || null,
      flight_route: flight_route || null,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
