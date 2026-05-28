import { NextResponse } from 'next/server';
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

// GET: 讀取最新的抓取進度（前端每 3 秒輪詢）
export async function GET() {
  noStore();
  const authError = requireDevAuth();
  if (authError) return authError;

  try {
    const supabase = createSupabase();

    // 取最新一筆 scrape_log
    const { data: log, error } = await supabase
      .from('scrape_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !log) {
      return NextResponse.json(
        { running: false, latest: null },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } },
      );
    }

    // 自動偵測卡住的 running 紀錄（超過 35 分鐘視為 crash）
    if (log.status === 'running' && log.started_at) {
      const elapsed = Date.now() - new Date(log.started_at).getTime();
      if (elapsed > 35 * 60 * 1000) {
        await supabase
          .from('scrape_logs')
          .update({
            status: 'failed',
            error_message: 'GitHub Actions 逾時或異常中斷',
            finished_at: new Date().toISOString(),
          })
          .eq('id', log.id);
        log.status = 'failed';
        log.error_message = 'GitHub Actions 逾時或異常中斷';
      }
    }

    // 取待確認變更數量
    const { count: pendingCount } = await supabase
      .from('pending_changes')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');

    return NextResponse.json(
      {
        running: log.status === 'running',
        latest: log,
        pending_count: pendingCount || 0,
      },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } },
    );
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
