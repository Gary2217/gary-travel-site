import { NextRequest, NextResponse } from 'next/server';
import { API_ERRORS, apiError } from '@/lib/api-error';
import { requireDevAuth } from '@/lib/api-auth';
import { createServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function createSupabase() {
  return createServiceClient();
}

const SCRAPE_KEYS = [
  'scrape_auto_enabled',
  'scrape_interval_days',
  'scrape_time',
  'scrape_last_run',
  'scrape_regions',
  'scrape_region_status',
];

// GET: 讀取所有抓取設定（需 dev auth）
export async function GET() {
  const authError = requireDevAuth();
  if (authError) return authError;

  try {
    const supabase = createSupabase();
    const { data, error } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', SCRAPE_KEYS);

    if (error) {
      return API_ERRORS.dbError(error);
    }

    const settings: Record<string, unknown> = {};
    for (const row of data || []) {
      settings[row.key] = row.value;
    }

    return NextResponse.json(settings, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (err) {
    return API_ERRORS.internal(err);
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
      return apiError('沒有可更新的欄位', 400);
    }

    for (const item of updates) {
      const { error } = await supabase
        .from('site_settings')
        .upsert(item, { onConflict: 'key' });

      if (error) {
          return API_ERRORS.dbError(error);
      }
    }

    return NextResponse.json({ updated: updates.length });
  } catch (err) {
    return API_ERRORS.internal(err);
  }
}
