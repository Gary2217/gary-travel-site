import { NextRequest, NextResponse } from 'next/server';
import { API_ERRORS, apiError } from '@/lib/api-error';
import { requireDevAuth } from '@/lib/api-auth';
import { createAnonClientNoCache, createServiceClient, hasSupabaseConfig } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!hasSupabaseConfig()) {
      return API_ERRORS.missingConfig();
    }

    const showHidden = _request.nextUrl.searchParams.get('hidden') === '1';

    // hidden=1 需要開發者授權才能使用 service role
    if (showHidden) {
      const authError = requireDevAuth();
      if (authError) return authError;
    }

    // 查隱藏行程需 service role key 繞過 RLS
    const supabase = showHidden && supabaseServiceKey ? createServiceClient() : createAnonClientNoCache();

    const today = new Date().toISOString().slice(0, 10);

    // departure dates 只選取列表頁需要的欄位（減少回應體積 ~60%）
    const { data, error } = await supabase
      .from('trips')
      .select('*, trip_departure_dates(id, departure_date, price, seats_available, seats_total, label, outbound_from, flight_segments, is_active)')
      .eq('destination_id', params.id)
      .eq('is_active', showHidden ? false : true)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('destination trips query error:', error.message);
      return apiError('載入失敗', 500, error);
    }

    const trips = (data || []).map((trip: any) => {
      const { trip_departure_dates: rawDates, ...tripData } = trip;
      return {
        ...tripData,
        document_is_available: Boolean(trip.document_url),
        departure_dates: (rawDates || [])
          .filter((d: any) => d.is_active && (!d.departure_date || d.departure_date >= today))
          .sort((a: any, b: any) => (a.departure_date || '').localeCompare(b.departure_date || '')),
      };
    });

    // 有正常出發日的行程排前面，請洽詢行程（custom_tour=true 或無出發日）排最後，同組依 display_order，再 id 穩定排序
    const isInquiryOnly = (t: any) =>
      !!t.trip_banner?.custom_tour || (t.departure_dates?.length ?? 0) === 0;
    trips.sort((a: any, b: any) => {
      const ap = isInquiryOnly(a) ? 1 : 0;
      const bp = isInquiryOnly(b) ? 1 : 0;
      if (ap !== bp) return ap - bp;
      const ao = a.display_order ?? Number.MAX_SAFE_INTEGER;
      const bo = b.display_order ?? Number.MAX_SAFE_INTEGER;
      if (ao !== bo) return ao - bo;
      return (a.id as string).localeCompare(b.id as string);
    });

    return NextResponse.json(trips, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (err) {
    return API_ERRORS.internal(err);
  }
}
