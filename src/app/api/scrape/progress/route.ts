import { NextResponse } from 'next/server';
import { API_ERRORS, apiError } from '@/lib/api-error';
import { requireDevAuth } from '@/lib/api-auth';
import { createServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function createSupabase() {
  return createServiceClient();
}

// GET: 讀取最新的抓取進度（前端每 3 秒輪詢）
export async function GET() {
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
  } catch (err) {
    return API_ERRORS.internal(err);
  }
}

// DELETE: 清除最新的失敗紀錄（標記為 cleared，不再顯示）
export async function DELETE() {
  const authError = requireDevAuth();
  if (authError) return authError;

  try {
    const supabase = createSupabase();

    const { data: log, error: fetchErr } = await supabase
      .from('scrape_logs')
      .select('id, status')
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchErr || !log) {
      return apiError('找不到抓取紀錄', 404);
    }

    if (log.status === 'running') {
      return apiError('抓取進行中，無法清除', 400);
    }

    const { error: updateErr } = await supabase
      .from('scrape_logs')
      .update({ status: 'cleared' })
      .eq('id', log.id);

    if (updateErr) {
      return API_ERRORS.dbError(updateErr);
    }

    return NextResponse.json({ cleared: true });
  } catch (err) {
    return API_ERRORS.internal(err);
  }
}
