import { NextRequest, NextResponse } from 'next/server';
import { requireDevAuth } from '@/lib/api-auth';
import { createServiceClient, hasServiceRoleConfig } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authErr = requireDevAuth();
  if (authErr) return authErr;

  try {
    if (!hasServiceRoleConfig()) {
      return NextResponse.json({ error: '伺服器設定缺失' }, { status: 500 });
    }

    const supabase = createServiceClient();

    // 讀取原始行程（含出發日期）
    const { data: original, error: fetchError } = await supabase
      .from('trips')
      .select('*, trip_departure_dates(*)')
      .eq('id', params.id)
      .single();

    if (fetchError || !original) {
      return NextResponse.json({ error: '找不到行程' }, { status: 404 });
    }

    // 建立新行程（title 加「（複製）」suffix）
    const { trip_departure_dates: departureDates, id: _id, created_at: _ca, updated_at: _ua, ...tripFields } = original;

    const { data: newTrip, error: insertError } = await supabase
      .from('trips')
      .insert({
        ...tripFields,
        title: `${original.title}（複製）`,
        is_active: true,
      })
      .select()
      .single();

    if (insertError || !newTrip) {
      return NextResponse.json({ error: insertError?.message || '複製行程失敗' }, { status: 500 });
    }

    // 複製所有 is_active=true 的出發日期
    const activeDates = (departureDates as Record<string, unknown>[] || []).filter(
      (d) => d.is_active === true || d.is_active === undefined
    );

    if (activeDates.length > 0) {
      const newDates = activeDates.map(({ id: _did, created_at: _dca, updated_at: _dua, trip_id: _tid, ...rest }) => ({
        ...rest,
        trip_id: newTrip.id,
      }));

      const { error: datesError } = await supabase
        .from('trip_departure_dates')
        .insert(newDates);

      if (datesError) {
        console.error('複製出發日期失敗:', datesError.message);
      }
    }

    // 回傳新行程（含出發日期）
    const { data: result, error: resultError } = await supabase
      .from('trips')
      .select('*, trip_departure_dates(*)')
      .eq('id', newTrip.id)
      .single();

    if (resultError || !result) {
      return NextResponse.json({ error: '取得複製結果失敗' }, { status: 500 });
    }

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
