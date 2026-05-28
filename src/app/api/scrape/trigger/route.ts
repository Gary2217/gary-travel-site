import { NextRequest, NextResponse } from 'next/server';
import { requireDevAuth } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

// POST: 觸發 GitHub Actions 抓取工作流程
export async function POST(req: NextRequest) {
  const authError = requireDevAuth();
  if (authError) return authError;

  try {
    const githubToken = process.env.GITHUB_PAT;
    const repo = process.env.GITHUB_REPO || 'Gary2217/gary-travel-site';

    if (!githubToken) {
      return NextResponse.json(
        { error: '缺少 GITHUB_PAT 環境變數' },
        { status: 500 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const regions = body.regions || []; // 空 = 全部抓

    // 觸發 GitHub Actions workflow_dispatch
    const response = await fetch(
      `https://api.github.com/repos/${repo}/actions/workflows/scrape-trips.yml/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ref: 'main',
          inputs: {
            regions: regions.length > 0 ? regions.join(',') : 'all',
          },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `GitHub API 錯誤: ${response.status} ${errorText}` },
        { status: response.status },
      );
    }

    return NextResponse.json({ triggered: true, regions: regions.length > 0 ? regions : 'all' });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
