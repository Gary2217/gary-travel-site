import { NextRequest, NextResponse } from 'next/server';
import { requireDevAuth } from '@/lib/api-auth';
import { createServiceClient, hasServiceRoleConfig } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const authError = requireDevAuth();
  if (authError) return authError;

  if (!hasServiceRoleConfig()) {
    return NextResponse.json({ error: '伺服器設定錯誤' }, { status: 500 });
  }

  try {
    const supabase = createServiceClient();

    // 清除超過 90 天的 analytics 事件
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    const cutoffStr = cutoffDate.toISOString();

    // 先計數再刪除
    const { count: analyticsCount } = await supabase
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', cutoffStr);

    const { error: analyticsError } = await supabase
      .from('analytics_events')
      .delete()
      .lt('created_at', cutoffStr);

    if (analyticsError) {
      console.error('cleanup analytics error:', analyticsError.message);
    }

    // 清除超過 90 天的 click_analytics
    const { count: clickCount } = await supabase
      .from('click_analytics')
      .select('*', { count: 'exact', head: true })
      .lt('clicked_at', cutoffStr);

    const { error: clickError } = await supabase
      .from('click_analytics')
      .delete()
      .lt('clicked_at', cutoffStr);

    if (clickError) {
      console.error('cleanup click_analytics error:', clickError.message);
    }

    return NextResponse.json({
      success: true,
      cutoff_date: cutoffStr,
      deleted: {
        analytics_events: analyticsCount ?? 0,
        click_analytics: clickCount ?? 0,
      },
    });
  } catch {
    return NextResponse.json({ error: '清理失敗' }, { status: 500 });
  }
}
