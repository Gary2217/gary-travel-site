import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { event_type, platform, trip_id, flight_id, trip_title, flight_route } = await req.json() as {
      event_type?: string; platform?: string; trip_id?: string;
      flight_id?: string; trip_title?: string; flight_route?: string;
    };
    if (!event_type) return NextResponse.json({ ok: false });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
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
