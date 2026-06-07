import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireDevAuth } from '@/lib/api-auth';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function createSupabase() {
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    global: {
      fetch: (url: RequestInfo | URL, options?: RequestInit) =>
        fetch(url, { ...options, cache: 'no-store' }),
    },
  });
}

const SCRAPE_KEYS = [
  'scrape_auto_enabled',
  'scrape_interval_days',
  'scrape_time',
  'scrape_last_run',
  'scrape_regions',
  'scrape_region_status',
  'scrape_next_region_index',
];

// GET: 讀取所有抓取設定
export async function GET() {
  noStore();
  try {
    const supabase = createSupabase();
    const { data, error } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', SCRAPE_KEYS);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const settings: Record<string, unknown> = {};
    for (const row of data || []) {
      settings[row.key] = row.value;
    }

    return NextResponse.json(settings, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT: 更新抓取設定（需 dev auth）
export async function PUT(req: NextRequest) {
  const authError = requireDevAuth();
  if (authError) return authError;

  try {
    const body = await req.json();
    const supabase = createSupabase();
    const updates: { key: string; value: unknown; updated_at: string }[] = [];

    for (const key of SCRAPE_KEYS) {
      if (body[key] !== undefined) {
        // site_settings.value 是 JSONB NOT NULL，確保不送 null
        const val = body[key] ?? false;
        updates.push({
          key,
          value: val,
          updated_at: new Date().toISOString(),
        });
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: '沒有可更新的欄位' }, { status: 400 });
    }

    for (const item of updates) {
      const { error } = await supabase
        .from('site_settings')
        .upsert(item, { onConflict: 'key' });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ updated: updates.length });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
