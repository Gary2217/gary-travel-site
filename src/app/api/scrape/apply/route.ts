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

/**
 * 外部圖片自動上傳 Supabase Storage
 * 如果 URL 已經是 Supabase 的就直接回傳，否則下載後上傳
 */
async function ensureSupabaseImage(
  supabase: ReturnType<typeof createSupabase>,
  imageUrl: string | null | undefined,
  tripId: string,
): Promise<string | null> {
  if (!imageUrl) return null;
  // 已經是 Supabase Storage 的 URL → 不需處理
  if (imageUrl.includes(supabaseUrl) || imageUrl.includes('supabase')) return imageUrl;

  try {
    const res = await fetch(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      redirect: 'follow',
    });
    if (!res.ok) return imageUrl; // 下載失敗就保留原 URL

    const ct = res.headers.get('content-type') || 'image/jpeg';
    const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg';
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1000) return imageUrl; // 太小，可能不是真圖

    const path = `trips/${tripId}-${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from('images').upload(path, buf, {
      contentType: ct,
      cacheControl: 'public, max-age=31536000',
      upsert: true,
    });
    if (uploadErr) return imageUrl;

    const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(path);
    return `${publicUrl}?v=${Date.now()}`;
  } catch {
    return imageUrl; // 任何錯誤都保留原 URL，不中斷套用流程
  }
}

interface ScrapedTrip {
  title: string;
  subtitle: string;
  duration: string;
  price_range: string;
  display_order: number;
  destination_id: string;
  cover_image_url?: string;
  promo_text?: string;
  trip_banner: Record<string, unknown>;
  departures: Array<{
    date: string;
    departure_city: string;
    airline: string;
    price: number;
    label: string;
    seats_total: number;
    seats_available: number;
  }>;
  flightSegments: FlightSegment[];
}

interface FlightSegment {
  day_text?: string;
  airline?: string;
  flight_number?: string;
  dep_time?: string;
  dep_airport?: string;
  arr_time?: string;
  arr_airport?: string;
  next_day?: boolean;
}

interface DepartureInfoMapValue {
  group_code: string;
  price_detail: string;
}

/**
 * 從優惠文字解析出對應的月/日組合
 * 支援格式：
 *   "6/17.23" → [{ month:6, day:17 }, { month:6, day:23 }]
 *   "6/17、23" → 同上
 *   "6/17,23" → 同上
 *   "6/17.6/23" → 同上
 *   "6/17" → [{ month:6, day:17 }]
 */
function parsePromoDates(promoText: string): { month: number; day: number }[] {
  if (!promoText) return [];
  const results: { month: number; day: number }[] = [];

  // 匹配 M/D 開頭的日期模式，後面可能跟著 .D 或 、D 或 ,D 表示同月份其他日期
  const pattern = /(\d{1,2})\/(\d{1,2})(?:[.、,](\d{1,2})(?:[.、,](\d{1,2}))?)?/g;
  let m;
  while ((m = pattern.exec(promoText)) !== null) {
    const month = parseInt(m[1], 10);
    const day1 = parseInt(m[2], 10);
    if (month >= 1 && month <= 12 && day1 >= 1 && day1 <= 31) {
      results.push({ month, day: day1 });
    }
    if (m[3]) {
      const day2 = parseInt(m[3], 10);
      // 判斷 m[3] 是同月其他日還是新的月份（看有沒有 /）
      const afterDay1 = promoText.substring(m.index! + m[1].length + 1 + m[2].length);
      if (afterDay1.match(/^[.、,]\d{1,2}\//) && m[3].length <= 2) {
        // 下一組是 M/D 格式，跳過（pattern 會在下一輪 match）
      } else if (day2 >= 1 && day2 <= 31) {
        results.push({ month, day: day2 });
      }
    }
    if (m[4]) {
      const day3 = parseInt(m[4], 10);
      if (day3 >= 1 && day3 <= 31) {
        results.push({ month, day: day3 });
      }
    }
  }

  return results;
}

function extractPriceColumn(priceDetailStr: unknown, index: number) {
  const value = String(priceDetailStr || '')
    .split('\t')
    [index]?.replace(/[^\d]/g, '');

  return value || '';
}

async function rebuildDepartureInfoMap(
  supabase: ReturnType<typeof createSupabase>,
  tripId: string,
  scraped: ScrapedTrip,
) {
  const { data: newDeps, error: depsErr } = await supabase
    .from('trip_departure_dates')
    .select('id')
    .eq('trip_id', tripId);

  if (depsErr) return depsErr.message;

  const departureInfoMap: Record<string, DepartureInfoMapValue> = {};
  for (const dep of newDeps || []) {
    departureInfoMap[dep.id] = {
      group_code: String(scraped.trip_banner?.code_label || ''),
      price_detail: JSON.stringify({
        title: '團費與售價說明',
        subtitle: '依航空與房型不同，價格略有調整',
        adultPrice: extractPriceColumn(scraped.trip_banner?.price_detail, 0),
        childWithBedPrice: extractPriceColumn(scraped.trip_banner?.price_detail, 1),
        childNoBedPrice: extractPriceColumn(scraped.trip_banner?.price_detail, 2),
        childExtraBedPrice: extractPriceColumn(scraped.trip_banner?.price_detail, 3),
        infantPrice: extractPriceColumn(scraped.trip_banner?.price_detail, 4),
      }),
    };
  }

  const { data: currentTrip, error: currentTripErr } = await supabase
    .from('trips')
    .select('trip_banner')
    .eq('id', tripId)
    .single();

  if (currentTripErr) return currentTripErr.message;

  const existingBanner =
    currentTrip?.trip_banner && typeof currentTrip.trip_banner === 'object'
      ? (currentTrip.trip_banner as Record<string, unknown>)
      : {};

  const updatedBanner = {
    ...existingBanner,
    departure_info_map: departureInfoMap,
  };

  const { error: updateBannerErr } = await supabase
    .from('trips')
    .update({ trip_banner: updatedBanner })
    .eq('id', tripId);

  return updateBannerErr?.message;
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
          case 'flight':
          case 'promotion': {
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

            if (change.change_type === 'promotion') {
              const promoText = (scraped as any).promo_text || change.new_value || '';
              (mergedBanner as Record<string, unknown>).promo_content = promoText;
              (mergedBanner as Record<string, unknown>).promo_enabled = Boolean(promoText);

              // 解析優惠文字裡的日期，對符合的出發日期加上「限時優惠」標籤
              if (promoText && change.trip_id) {
                const promoDates = parsePromoDates(promoText);
                if (promoDates.length > 0) {
                  const { data: deps } = await supabase
                    .from('trip_departure_dates')
                    .select('id, departure_date')
                    .eq('trip_id', change.trip_id);

                  for (const dep of deps || []) {
                    const dt = new Date(dep.departure_date + 'T00:00:00');
                    const matched = promoDates.some(
                      (pd) => pd.month === dt.getMonth() + 1 && pd.day === dt.getDate(),
                    );
                    if (matched) {
                      await supabase
                        .from('trip_departure_dates')
                        .update({ label: '限時優惠' })
                        .eq('id', dep.id);
                    }
                  }
                }
              }
            }

            // 外部圖片自動上傳 Supabase Storage
            const resolvedImageUrl = await ensureSupabaseImage(supabase, scraped.cover_image_url, change.trip_id);

            const { error: updateErr } = await supabase
              .from('trips')
              .update({
                title: scraped.title,
                subtitle: scraped.subtitle,
                duration: scraped.duration,
                price_range: scraped.price_range,
                display_order: scraped.display_order,
                cover_image_url: resolvedImageUrl,
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
            const { error: deleteErr } = await supabase
              .from('trip_departure_dates')
              .delete()
              .eq('trip_id', change.trip_id);

            if (deleteErr) {
              results.push({ id: changeId, success: false, error: deleteErr.message });
              continue;
            }

            // 插入新日期
            const segments = scraped.flightSegments || [];
            const outbound = segments[0] || null;
            const returnFlight = segments[segments.length - 1] || null;
            let departureError: string | null = null;

            for (const dep of scraped.departures) {
              const { error: insertDepErr } = await supabase.from('trip_departure_dates').insert({
                trip_id: change.trip_id,
                departure_date: dep.date,
                departure_city: dep.departure_city,
                airline: dep.airline,
                price: dep.price,
                label: dep.label,
                seats_total: dep.seats_total,
                seats_available: dep.seats_available,
                outbound_flight: outbound?.flight_number || null,
                outbound_time: outbound?.dep_time || null,
                outbound_from: outbound?.dep_airport || null,
                outbound_arrival_time: outbound?.arr_time || null,
                outbound_to: outbound?.arr_airport || null,
                outbound_next_day: outbound?.next_day || false,
                return_flight: returnFlight?.flight_number || null,
                return_time: returnFlight?.dep_time || null,
                return_from: returnFlight?.dep_airport || null,
                return_arrival_time: returnFlight?.arr_time || null,
                return_to: returnFlight?.arr_airport || null,
                return_next_day: returnFlight?.next_day || false,
                flight_segments: segments,
                is_active: true,
              });

              if (insertDepErr) {
                departureError = insertDepErr.message;
                break;
              }
            }

            if (departureError) {
              results.push({ id: changeId, success: false, error: departureError });
              continue;
            }

            const rebuildErr = await rebuildDepartureInfoMap(supabase, change.trip_id, scraped);
            if (rebuildErr) {
              results.push({ id: changeId, success: false, error: rebuildErr });
              continue;
            }

            // 出發日期重建後，重新套用優惠標籤（避免被 DELETE+INSERT 洗掉）
            const promoSource = (scraped as any).promo_text || '';
            if (promoSource) {
              const promoDatesForDep = parsePromoDates(promoSource);
              if (promoDatesForDep.length > 0) {
                const { data: newDeps } = await supabase
                  .from('trip_departure_dates')
                  .select('id, departure_date')
                  .eq('trip_id', change.trip_id);
                for (const nd of newDeps || []) {
                  const ndt = new Date(nd.departure_date + 'T00:00:00');
                  if (promoDatesForDep.some((pd) => pd.month === ndt.getMonth() + 1 && pd.day === ndt.getDate())) {
                    await supabase.from('trip_departure_dates').update({ label: '限時優惠' }).eq('id', nd.id);
                  }
                }
              }
            } else {
              // scraped_data 沒 promo_text，查現有 trip_banner.promo_content
              const { data: tripForPromo } = await supabase
                .from('trips')
                .select('trip_banner')
                .eq('id', change.trip_id)
                .single();
              const existingPromo = (tripForPromo?.trip_banner as Record<string, unknown>)?.promo_content as string || '';
              if (existingPromo) {
                const existingPromoDates = parsePromoDates(existingPromo);
                if (existingPromoDates.length > 0) {
                  const { data: newDeps2 } = await supabase
                    .from('trip_departure_dates')
                    .select('id, departure_date')
                    .eq('trip_id', change.trip_id);
                  for (const nd2 of newDeps2 || []) {
                    const ndt2 = new Date(nd2.departure_date + 'T00:00:00');
                    if (existingPromoDates.some((pd) => pd.month === ndt2.getMonth() + 1 && pd.day === ndt2.getDate())) {
                      await supabase.from('trip_departure_dates').update({ label: '限時優惠' }).eq('id', nd2.id);
                    }
                  }
                }
              }
            }
            break;
          }

          case 'new_trip': {
            // 新增行程
            if (!scraped) {
              results.push({ id: changeId, success: false, error: '缺少 scraped_data' });
              continue;
            }

            // 新增行程時，先用 placeholder ID 上傳圖片，插入後再用真正 ID 重新上傳
            const tempImageUrl = await ensureSupabaseImage(supabase, scraped.cover_image_url, `new-${Date.now()}`);

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
                cover_image_url: tempImageUrl,
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
              let departureError: string | null = null;

              for (const dep of scraped.departures) {
                const { error: insertDepErr } = await supabase.from('trip_departure_dates').insert({
                  trip_id: inserted.id,
                  departure_date: dep.date,
                  departure_city: dep.departure_city,
                  airline: dep.airline,
                  price: dep.price,
                  label: dep.label,
                  seats_total: dep.seats_total,
                  seats_available: dep.seats_available,
                  outbound_flight: outbound?.flight_number || null,
                  outbound_time: outbound?.dep_time || null,
                  outbound_from: outbound?.dep_airport || null,
                  outbound_arrival_time: outbound?.arr_time || null,
                  outbound_to: outbound?.arr_airport || null,
                  outbound_next_day: outbound?.next_day || false,
                  return_flight: returnFlight?.flight_number || null,
                  return_time: returnFlight?.dep_time || null,
                  return_from: returnFlight?.dep_airport || null,
                  return_arrival_time: returnFlight?.arr_time || null,
                  return_to: returnFlight?.arr_airport || null,
                  return_next_day: returnFlight?.next_day || false,
                  flight_segments: segments,
                  is_active: true,
                });

                if (insertDepErr) {
                  departureError = insertDepErr.message;
                  break;
                }
              }

              if (departureError) {
                results.push({ id: changeId, success: false, error: departureError });
                continue;
              }

              const rebuildErr = await rebuildDepartureInfoMap(supabase, inserted.id, scraped);
              if (rebuildErr) {
                results.push({ id: changeId, success: false, error: rebuildErr });
                continue;
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
        const { error: approveErr } = await supabase
          .from('pending_changes')
          .update({ status: 'approved' })
          .eq('id', changeId);

        if (approveErr) {
          results.push({ id: changeId, success: false, error: approveErr.message });
          continue;
        }

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
