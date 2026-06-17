import { NextResponse } from 'next/server';
import { createAnonClient, hasSupabaseConfig } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const start = Date.now();

  // 環境變數檢查
  const env_checks = [
    {
      name: 'Supabase 資料庫',
      ok: hasSupabaseConfig(),
      impact: '網站無法載入任何資料，所有頁面都會顯示錯誤',
      fix: '請確認 Vercel 環境變數有設定 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY',
    },
    {
      name: 'LINE 官方帳號',
      ok: Boolean(process.env.NEXT_PUBLIC_LINE_ID),
      impact: '訪客點「加 LINE 好友」按鈕不會跳轉',
      fix: '請在 Vercel 環境變數設定 NEXT_PUBLIC_LINE_ID',
    },
    {
      name: 'Facebook 粉專',
      ok: Boolean(process.env.NEXT_PUBLIC_FB_URL),
      impact: '訪客點 Facebook 按鈕不會跳轉到粉專',
      fix: '請在 Vercel 環境變數設定 NEXT_PUBLIC_FB_URL',
    },
    {
      name: 'Instagram 帳號',
      ok: Boolean(process.env.NEXT_PUBLIC_IG_URL),
      impact: '訪客點 Instagram 按鈕不會跳轉',
      fix: '請在 Vercel 環境變數設定 NEXT_PUBLIC_IG_URL',
    },
    {
      name: '開發者模式密碼',
      ok: Boolean(process.env.NEXT_PUBLIC_DEV_PASSWORD),
      impact: '無法進入開發者模式管理網站內容',
      fix: '請在 Vercel 環境變數設定 NEXT_PUBLIC_DEV_PASSWORD',
    },
  ];

  if (!hasSupabaseConfig()) {
    return NextResponse.json(
      { status: 'error', db: 'unreachable', latency_ms: Date.now() - start, env_checks, data_checks: [] },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  try {
    const supabase = createAnonClient();

    const { error: dbError } = await supabase
      .from('regions')
      .select('id', { count: 'exact', head: true });

    const latency_ms = Date.now() - start;

    if (dbError) {
      return NextResponse.json(
        { status: 'error', db: 'unreachable', latency_ms, env_checks, data_checks: [] },
        { status: 503, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // 資料完整性檢查（並行查詢加速）
    const [destsRes, tripsRes, regionsRes, tripDaysRes] = await Promise.all([
      supabase.from('destinations').select('title, image_url').eq('is_active', true),
      supabase.from('trips').select('title, cover_image_url').eq('is_active', true),
      supabase.from('regions').select('id, name, destinations!destinations_region_id_fkey(id)').eq('is_active', true).eq('destinations.is_active', true),
      supabase.from('trips').select('id, title, trip_days(id)').eq('is_active', true),
    ]);

    const data_checks: Array<{ name: string; ok: boolean; count?: number; items?: string[]; impact: string; fix: string }> = [];

    const noImgDests = (destsRes.data || []).filter((d: any) => !d.image_url);
    if (noImgDests.length > 0) {
      data_checks.push({
        name: '目的地缺少圖片',
        ok: false,
        count: noImgDests.length,
        items: noImgDests.map((d: any) => d.title),
        impact: `有 ${noImgDests.length} 個目的地沒有封面圖片，訪客會看到灰色空白區塊`,
        fix: '進入開發者模式，點擊該目的地上傳圖片',
      });
    }

    const noImgTrips = (tripsRes.data || []).filter((t: any) => !t.cover_image_url);
    if (noImgTrips.length > 0) {
      data_checks.push({
        name: '行程缺少封面圖',
        ok: false,
        count: noImgTrips.length,
        items: noImgTrips.map((t: any) => t.title),
        impact: `有 ${noImgTrips.length} 個行程沒有封面圖片，行程卡片會顯示預設灰色背景`,
        fix: '進入開發者模式，編輯該行程上傳封面圖片',
      });
    }

    if (regionsRes.data) {
      const emptyRegions = regionsRes.data.filter((r: any) => !r.destinations || r.destinations.length === 0);
      if (emptyRegions.length > 0) {
        data_checks.push({
          name: '空白地區分類',
          ok: false,
          count: emptyRegions.length,
          items: emptyRegions.map((r: any) => r.name),
          impact: `有 ${emptyRegions.length} 個地區分類下沒有目的地，不會顯示在網站上`,
          fix: '新增目的地到這些地區，或將空白地區設為停用',
        });
      }
    }

    if (tripDaysRes.data) {
      const noDayTrips = tripDaysRes.data.filter((t: any) => !t.trip_days || t.trip_days.length === 0);
      if (noDayTrips.length > 0) {
        data_checks.push({
          name: '行程缺少每日行程',
          ok: false,
          count: noDayTrips.length,
          items: noDayTrips.map((t: any) => t.title),
          impact: `有 ${noDayTrips.length} 個行程沒有每日行程內容，訪客看到的行程頁會是空的`,
          fix: '進入開發者模式，為這些行程新增每日行程',
        });
      }
    }

    const hasWarnings = env_checks.some(e => !e.ok) || data_checks.some(d => !d.ok);

    return NextResponse.json(
      { status: hasWarnings ? 'warning' : 'ok', db: 'connected', latency_ms, env_checks, data_checks },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    console.error('[API 503] 健康檢查失敗:', err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { status: 'error', db: 'unreachable', latency_ms: Date.now() - start, env_checks, data_checks: [] },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
