import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireDevAuth } from '@/lib/api-auth';

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

interface ScrapedTrip {
  title: string;
  subtitle: string;
  duration: string;
  price_range: string;
  display_order: number;
  destination_id: string;
  trip_banner: Record<string, unknown>;
  departures: Array<{
    date: string;
    city: string;
    airline: string;
    price: number;
    label: string;
    total: number;
    avail: number;
  }>;
  flightSegments: Array<Record<string, unknown>>;
}

// POST: 確認變更，寫入正式 DB
export async function POST(req: NextRequest) {
  const authError = requireDevAuth();
  if (authError) return authError;

  try {
    const body = await req.json();
    const { changeIds } = body as { changeIds: string[] };

    if (!changeIds || !Array.isArray(changeIds) || changeIds.length === 0) {
      return NextResponse.json({ error: '缺少 changeIds' }, { status: 400 });
    }

    const supabase = createSupabase();
    const results: { id: string; success: boolean; error?: string }[] = [];

    for (const changeId of changeIds) {
      try {
        const { data: change, error: fetchErr } = await supabase
          .from('pending_changes')
          .select('*')
          .eq('id', changeId)
          .single();

        if (fetchErr || !change) {
          results.push({ id: changeId, success: false, error: '找不到變更紀錄' });
          continue;
        }

        if (change.status !== 'pending') {
          results.push({ id: changeId, success: false, error: '已處理過' });
          continue;
        }

        const scraped = change.scraped_data as ScrapedTrip | null;

        switch (change.change_type) {
          case 'price':
          case 'info':
          case 'price_detail':
          case 'flight': {
            // 更新既有行程欄位
            if (!change.trip_id || !scraped) {
              results.push({ id: changeId, success: false, error: '缺少 trip_id 或 scraped_data' });
              continue;
            }

            // 讀取現有 trip_banner 保留圖片
            const { data: existing } = await supabase
              .from('trips')
              .select('trip_banner')
              .eq('id', change.trip_id)
              .single();

            const mergedBanner = {
              ...(existing?.trip_banner || {}),
              ...(scraped.trip_banner || {}),
            };

            // 保留既有圖片欄位
            if ((existing?.trip_banner as Record<string, unknown>)?.side_image_url) {
              (mergedBanner as Record<string, unknown>).side_image_url =
                (existing?.trip_banner as Record<string, unknown>).side_image_url;
            }

            const { error: updateErr } = await supabase
              .from('trips')
              .update({
                title: scraped.title,
                subtitle: scraped.subtitle,
                duration: scraped.duration,
                price_range: scraped.price_range,
                trip_banner: mergedBanner,
              })
              .eq('id', change.trip_id);

            if (updateErr) {
              results.push({ id: changeId, success: false, error: updateErr.message });
              continue;
            }
            break;
          }

          case 'departure': {
            // 重建出發日期
            if (!change.trip_id || !scraped?.departures) {
              results.push({ id: changeId, success: false, error: '缺少出發日期資料' });
              continue;
            }

            // 刪除舊日期
            await supabase
              .from('trip_departure_dates')
              .delete()
              .eq('trip_id', change.trip_id);

            // 插入新日期
            const segments = scraped.flightSegments || [];
            const outbound = segments[0] || null;
            const returnFlight = segments[segments.length - 1] || null;

            for (const dep of scraped.departures) {
              await supabase.from('trip_departure_dates').insert({
                trip_id: change.trip_id,
                departure_date: dep.date,
                departure_city: dep.city,
                airline: dep.airline,
                price: dep.price,
                label: dep.label,
                seats_total: dep.total,
                seats_available: dep.avail,
                outbound_flight: (outbound as Record<string, unknown>)?.flight_number || null,
                outbound_time: (outbound as Record<string, unknown>)?.dep_time || null,
                outbound_from: (outbound as Record<string, unknown>)?.dep_airport || null,
                outbound_arrival_time: (outbound as Record<string, unknown>)?.arr_time || null,
                outbound_to: (outbound as Record<string, unknown>)?.arr_airport || null,
                outbound_next_day: (outbound as Record<string, unknown>)?.next_day || false,
                return_flight: (returnFlight as Record<string, unknown>)?.flight_number || null,
                return_time: (returnFlight as Record<string, unknown>)?.dep_time || null,
                return_from: (returnFlight as Record<string, unknown>)?.dep_airport || null,
                return_arrival_time: (returnFlight as Record<string, unknown>)?.arr_time || null,
                return_to: (returnFlight as Record<string, unknown>)?.arr_airport || null,
                return_next_day: (returnFlight as Record<string, unknown>)?.next_day || false,
                flight_segments: segments,
                is_active: true,
              });
            }
            break;
          }

          case 'new_trip': {
            // 新增行程
            if (!scraped) {
              results.push({ id: changeId, success: false, error: '缺少 scraped_data' });
              continue;
            }

            const { data: inserted, error: insertErr } = await supabase
              .from('trips')
              .insert({
                destination_id: scraped.destination_id || change.destination_id,
                title: scraped.title,
                subtitle: scraped.subtitle,
                duration: scraped.duration,
                price_range: scraped.price_range,
                highlights: [],
                is_active: true,
                display_order: scraped.display_order || 99,
                trip_banner: scraped.trip_banner,
              })
              .select('id')
              .single();

            if (insertErr || !inserted) {
              results.push({ id: changeId, success: false, error: insertErr?.message || '新增失敗' });
              continue;
            }

            // 插入出發日期
            if (scraped.departures) {
              const segments = scraped.flightSegments || [];
              const outbound = segments[0] || null;
              const returnFlight = segments[segments.length - 1] || null;

              for (const dep of scraped.departures) {
                await supabase.from('trip_departure_dates').insert({
                  trip_id: inserted.id,
                  departure_date: dep.date,
                  departure_city: dep.city,
                  airline: dep.airline,
                  price: dep.price,
                  label: dep.label,
                  seats_total: dep.total,
                  seats_available: dep.avail,
                  outbound_flight: (outbound as Record<string, unknown>)?.flight_number || null,
                  outbound_time: (outbound as Record<string, unknown>)?.dep_time || null,
                  outbound_from: (outbound as Record<string, unknown>)?.dep_airport || null,
                  outbound_arrival_time: (outbound as Record<string, unknown>)?.arr_time || null,
                  outbound_to: (outbound as Record<string, unknown>)?.arr_airport || null,
                  outbound_next_day: (outbound as Record<string, unknown>)?.next_day || false,
                  return_flight: (returnFlight as Record<string, unknown>)?.flight_number || null,
                  return_time: (returnFlight as Record<string, unknown>)?.dep_time || null,
                  return_from: (returnFlight as Record<string, unknown>)?.dep_airport || null,
                  return_arrival_time: (returnFlight as Record<string, unknown>)?.arr_time || null,
                  return_to: (returnFlight as Record<string, unknown>)?.arr_airport || null,
                  return_next_day: (returnFlight as Record<string, unknown>)?.next_day || false,
                  flight_segments: segments,
                  is_active: true,
                });
              }
            }
            break;
          }

          case 'removed': {
            // 標記行程下架
            if (!change.trip_id) {
              results.push({ id: changeId, success: false, error: '缺少 trip_id' });
              continue;
            }

            const { error: deactivateErr } = await supabase
              .from('trips')
              .update({ is_active: false })
              .eq('id', change.trip_id);

            if (deactivateErr) {
              results.push({ id: changeId, success: false, error: deactivateErr.message });
              continue;
            }
            break;
          }

          default:
            results.push({ id: changeId, success: false, error: `未知的 change_type: ${change.change_type}` });
            continue;
        }

        // 標記為已處理
        await supabase
          .from('pending_changes')
          .update({ status: 'approved' })
          .eq('id', changeId);

        results.push({ id: changeId, success: true });
      } catch (err) {
        results.push({ id: changeId, success: false, error: String(err) });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      total: results.length,
      success: successCount,
      failed: failCount,
      results,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
