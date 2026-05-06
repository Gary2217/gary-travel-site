import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DEV_AUTH_COOKIE_NAME, verifyDevAuthCookie } from '@/lib/dev-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // 需要開發者身份驗證
  const cookie = req.cookies.get(DEV_AUTH_COOKIE_NAME)?.value;
  if (!verifyDevAuthCookie(cookie)) {
    return NextResponse.json({ error: '未授權' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return NextResponse.json({ error: '伺服器設定錯誤' }, { status: 500 });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

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
