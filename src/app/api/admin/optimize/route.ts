import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireDevAuth } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function createSupabase() {
  return createClient(supabaseUrl, supabaseServiceRoleKey);
}

// GET: 取得資料統計 + 完整性檢查
export async function GET() {
  try {
    const supabase = createSupabase();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

    const [
      { count: tripsCount },
      { count: activeTripsCount },
      { count: departuresCount },
      { count: pendingChangesOld },
      { count: scrapeLogsOld },
      { count: pendingTotal },
      { count: dismissedTotal },
      { data: noImageTrips },
      { data: noCodeTrips },
      { data: noDepartureTrips },
      { data: autoCleanSetting },
    ] = await Promise.all([
      supabase.from('trips').select('id', { count: 'exact', head: true }),
      supabase.from('trips').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('trip_departure_dates').select('id', { count: 'exact', head: true }),
      supabase.from('pending_changes').select('id', { count: 'exact', head: true }).in('status', ['approved', 'dismissed']).lt('created_at', thirtyDaysAgo),
      supabase.from('scrape_logs').select('id', { count: 'exact', head: true }).lt('started_at', thirtyDaysAgo),
      supabase.from('pending_changes').select('id', { count: 'exact', head: true }),
      supabase.from('pending_changes').select('id', { count: 'exact', head: true }).eq('status', 'dismissed'),
      supabase.from('trips').select('id, title').eq('is_active', true).or('cover_image_url.is.null,cover_image_url.eq.').limit(20),
      supabase.from('trips').select('id, title, trip_banner').eq('is_active', true).limit(500),
      supabase.from('trips').select('id, title, trip_banner').eq('is_active', true).limit(500),
      supabase.from('site_settings').select('value').eq('key', 'auto_cleanup_enabled').single(),
    ]);

    // 找缺團號的行程
    const missingCode = (noCodeTrips || []).filter(t => {
      const banner = t.trip_banner as Record<string, unknown> | null;
      return !banner?.code_label;
    }).slice(0, 10);

    // 找缺出發日的啟用行程（非客製行程）
    const noDeparture: { id: string; title: string }[] = [];
    for (const t of (noDepartureTrips || []).slice(0, 50)) {
      const banner = t.trip_banner as Record<string, unknown> | null;
      if (banner?.custom_tour) continue;
      const { count } = await supabase.from('trip_departure_dates').select('id', { count: 'exact', head: true }).eq('trip_id', t.id);
      if (!count || count === 0) noDeparture.push({ id: t.id, title: t.title });
      if (noDeparture.length >= 10) break;
    }

    return NextResponse.json({
      stats: {
        trips_total: tripsCount || 0,
        trips_active: activeTripsCount || 0,
        departures: departuresCount || 0,
        pending_changes_total: pendingTotal || 0,
        pending_changes_dismissed: dismissedTotal || 0,
      },
      cleanable: {
        old_pending_changes: pendingChangesOld || 0,
        old_scrape_logs: scrapeLogsOld || 0,
      },
      integrity: {
        no_image: (noImageTrips || []).map(t => ({ id: t.id, title: t.title })),
        no_code: missingCode.map(t => ({ id: t.id, title: t.title })),
        no_departure: noDeparture,
      },
      auto_cleanup_enabled: autoCleanSetting?.value === true || autoCleanSetting?.value === 'true',
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: 執行清理
export async function POST(req: NextRequest) {
  const authError = requireDevAuth();
  if (authError) return authError;

  try {
    const supabase = createSupabase();
    const body = await req.json().catch(() => ({}));
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const results: Record<string, number> = {};

    // 清理舊 pending_changes
    if (body.clean_pending !== false) {
      const { data } = await supabase
        .from('pending_changes')
        .delete()
        .in('status', ['approved', 'dismissed'])
        .lt('created_at', thirtyDaysAgo)
        .select('id');
      results.pending_changes_deleted = data?.length || 0;
    }

    // 清理舊 scrape_logs
    if (body.clean_logs !== false) {
      const { data } = await supabase
        .from('scrape_logs')
        .delete()
        .lt('started_at', thirtyDaysAgo)
        .select('id');
      results.scrape_logs_deleted = data?.length || 0;
    }

    return NextResponse.json({ success: true, results });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT: 更新自動清理設定
export async function PUT(req: NextRequest) {
  const authError = requireDevAuth();
  if (authError) return authError;

  try {
    const supabase = createSupabase();
    const body = await req.json();
    const enabled = body.auto_cleanup_enabled === true;

    await supabase
      .from('site_settings')
      .upsert({ key: 'auto_cleanup_enabled', value: enabled, updated_at: new Date().toISOString() });

    return NextResponse.json({ auto_cleanup_enabled: enabled });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
