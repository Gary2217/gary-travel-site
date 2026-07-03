import { NextRequest, NextResponse } from 'next/server';
import { API_ERRORS, apiError } from '@/lib/api-error';
import { requireDevAuth } from '@/lib/api-auth';
import { createServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

interface TriggerBody {
  // 全部抓取（admin/page.tsx 第 1178 行）
  regions?: string;
  // 按目的地或單一行程（destination/[id]/page.tsx、trip/[id]/page.tsx）
  destinationId?: string;
  tripIds?: string[];
}

export async function POST(request: NextRequest) {
  const authError = requireDevAuth();
  if (authError) return authError;

  let body: TriggerBody = {};
  try {
    body = await request.json();
  } catch {
    // body 可能為空（全部抓取時）
  }

  const { regions, destinationId, tripIds } = body;

  try {
    const supabase = createServiceClient();

    // 建立新的 scrape_log 紀錄（status='running'）
    const { data: log, error: logError } = await supabase
      .from('scrape_logs')
      .insert({
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (logError || !log) {
      return API_ERRORS.dbError(logError);
    }

    const logId: string = log.id;

    const ghPat = process.env.GH_PAT;
    const repo =
      process.env.GITHUB_REPOSITORY || 'Gary2217/gary-travel-site';

    if (!ghPat) {
      // 沒有 GH_PAT 時：fallback 模式，只建立 log，不觸發 Actions
      await supabase
        .from('scrape_logs')
        .update({
          status: 'failed',
          error_message:
            '未設定 GH_PAT 環境變數，無法觸發 GitHub Actions。請至 Vercel 環境變數新增 GH_PAT（需要 actions:write 權限）。',
          finished_at: new Date().toISOString(),
        })
        .eq('id', logId);

      return apiError(
        '未設定 GH_PAT 環境變數，無法觸發 GitHub Actions。請至 Vercel 環境變數新增 GH_PAT（需要 actions:write 權限）。',
        503,
      );
    }

    // 組合 workflow inputs
    const workflowInputs: Record<string, string> = {
      regions: regions || 'all',
      destination_id: destinationId || '',
      trip_ids: tripIds?.join(',') || '',
    };

    // 觸發 GitHub Actions workflow_dispatch
    const ghResponse = await fetch(
      `https://api.github.com/repos/${repo}/actions/workflows/scrape-trips.yml/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `token ${ghPat}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ref: 'main',
          inputs: workflowInputs,
        }),
      },
    );

    // GitHub Actions dispatch 成功回傳 204 No Content
    if (!ghResponse.ok && ghResponse.status !== 204) {
      const errText = await ghResponse.text().catch(() => '');
      await supabase
        .from('scrape_logs')
        .update({
          status: 'failed',
          error_message: `GitHub Actions 觸發失敗（${ghResponse.status}）：${errText}`,
          finished_at: new Date().toISOString(),
        })
        .eq('id', logId);

      return apiError(
        `GitHub Actions 觸發失敗（${ghResponse.status}）`,
        502,
      );
    }

    return NextResponse.json(
      { triggered: true, log_id: logId },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    return API_ERRORS.internal(err);
  }
}
