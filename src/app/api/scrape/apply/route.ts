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
  // 已經是 Supabase Storage 的 URL → 不需處理（嚴格檢查）
  if (imageUrl.startsWith(supabaseUrl) || imageUrl.includes('.supabase.co/storage')) return imageUrl;

  try {
    const res = await fetch(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      redirect: 'follow',
    });
    if (!res.ok) {
      console.warn(`[ensureSupabaseImage] 下載失敗 HTTP ${res.status}: ${imageUrl}`);
      return null; // 下載失敗不保留外部 URL，避免違反規範
    }

    const ct = res.headers.get('content-type') || 'image/jpeg';
    const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg';
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1000) {
      console.warn(`[ensureSupabaseImage] 圖片過小 ${buf.length} bytes: ${imageUrl}`);
      return null; // 太小，可能不是真圖
    }

    const path = `trips/${tripId}-${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from('images').upload(path, buf, {
      contentType: ct,
      cacheControl: 'public, max-age=31536000',
      upsert: true,
    });
    if (uploadErr) {
      console.warn(`[ensureSupabaseImage] 上傳失敗: ${uploadErr.message}`);
      return null; // 上傳失敗也不保留外部 URL
    }

    const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(path);
    return `${publicUrl}?v=${Date.now()}`;
  } catch (err) {
    console.warn(`[ensureSupabaseImage] 錯誤: ${err}`);
    return null; // 任何錯誤都不保留外部 URL，禁止直接引用外部 CDN
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
  source_url?: string;
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

  // 驗證 price_detail 欄數（應為 5 欄 tab 分隔）
  const priceDetailRaw = String(scraped.trip_banner?.price_detail || '');
  const priceDetailColumns = priceDetailRaw.split('\t');
  if (priceDetailRaw && priceDetailColumns.length < 5) {
    console.warn(`[rebuildDepartureInfoMap] price_detail 不足 5 欄（目前 ${priceDetailColumns.length} 欄），trip: ${tripId}`);
  }

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
        // CAS claim：只有 status=pending 才改成 processing，防止並發重複套用
        const { data: claimed, error: claimErr } = await supabase
          .from('pending_changes')
          .update({ status: 'processing' })
          .eq('id', changeId)
          .eq('status', 'pending')
          .select('*')
          .single();

        if (claimErr || !claimed) {
          results.push({ id: changeId, success: false, error: '已被其他請求處理或找不到' });
          continue;
        }

        const change = claimed;

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

            // 確保 price_label 與 price_range 同步（防止爬蟲遺漏時不一致）
            if (scraped.price_range) {
              (mergedBanner as Record<string, unknown>).price_label = scraped.price_range;
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

                  const promoMatchedIds: string[] = [];
                  for (const dep of deps || []) {
                    const dt = new Date(dep.departure_date + 'T00:00:00');
                    if (isNaN(dt.getTime())) continue; // 跳過無效日期
                    const matched = promoDates.some(
                      (pd) => pd.month === dt.getMonth() + 1 && pd.day === dt.getDate(),
                    );
                    if (matched) promoMatchedIds.push(dep.id);
                  }
                  if (promoMatchedIds.length > 0) {
                    await supabase
                      .from('trip_departure_dates')
                      .update({ label: '限時優惠' })
                      .in('id', promoMatchedIds);
                  }
                }
              }
            }

            // 外部圖片自動上傳 Supabase Storage
            const resolvedImageUrl = await ensureSupabaseImage(supabase, scraped.cover_image_url, change.trip_id);

            // 組合更新欄位
            // trip_banner 永遠透過 merge 更新；直接欄位依 change_type 決定範圍
            const tripUpdateFields: Record<string, unknown> = {
              trip_banner: mergedBanner,
            };

            if (change.change_type === 'info') {
              // info 類型：根據 field_name 只更新對應的直接欄位
              // trip_banner 內的欄位（tags, code_label, airport, airline 等）已透過 merge 處理
              const directFieldMap: Record<string, unknown> = {
                title: scraped.title,
                subtitle: scraped.subtitle,
                duration: scraped.duration,
                cover_image_url: resolvedImageUrl,
                display_order: scraped.display_order,
              };
              if (change.field_name && change.field_name in directFieldMap) {
                tripUpdateFields[change.field_name] = directFieldMap[change.field_name];
              }
            } else {
              // price / price_detail / flight / promotion：更新所有欄位保持完整同步
              tripUpdateFields.title = scraped.title;
              tripUpdateFields.subtitle = scraped.subtitle;
              tripUpdateFields.duration = scraped.duration;
              tripUpdateFields.price_range = scraped.price_range;
              tripUpdateFields.cover_image_url = resolvedImageUrl;
            }

            if (scraped.source_url) {
              tripUpdateFields.source_url = scraped.source_url;
            }

            const { error: updateErr } = await supabase
              .from('trips')
              .update(tripUpdateFields)
              .eq('id', change.trip_id);

            if (updateErr) {
              results.push({ id: changeId, success: false, error: updateErr.message });
              continue;
            }

            // price_detail 變更時，同步重建 departure_info_map（前端讀的是 JSON 版本）
            if (change.change_type === 'price_detail' || change.change_type === 'price') {
              const rebuildErr = await rebuildDepartureInfoMap(supabase, change.trip_id, scraped);
              if (rebuildErr) {
                results.push({ id: changeId, success: false, error: rebuildErr });
                continue;
              }
            }
            break;
          }

          case 'departure': {
            // 重建出發日期
            if (!change.trip_id || !scraped?.departures) {
              results.push({ id: changeId, success: false, error: '缺少出發日期資料' });
              continue;
            }

            // 出團日期為空 → 更新 trip_banner.custom_tour = true
            if (scraped.departures.length === 0) {
              const { data: existingForCustom } = await supabase
                .from('trips').select('trip_banner').eq('id', change.trip_id).single();
              const bannerForCustom = { ...(existingForCustom?.trip_banner || {}), custom_tour: true };
              await supabase.from('trips').update({ trip_banner: bannerForCustom }).eq('id', change.trip_id);
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

            // 批量插入新日期
            const segments = scraped.flightSegments || [];
            const outbound = segments[0] || null;
            const returnFlight = segments[segments.length - 1] || null;

            const departuresToInsert = scraped.departures.map((dep) => ({
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
            }));

            const { error: batchInsertErr } = await supabase.from('trip_departure_dates').insert(departuresToInsert);

            if (batchInsertErr) {
              results.push({ id: changeId, success: false, error: batchInsertErr.message });
              continue;
            }

            const rebuildErr = await rebuildDepartureInfoMap(supabase, change.trip_id, scraped);
            if (rebuildErr) {
              results.push({ id: changeId, success: false, error: rebuildErr });
              continue;
            }

            // 出發日期重建後，重新套用優惠標籤（避免被 DELETE+INSERT 洗掉）
            // 先判斷優惠文字來源：scraped_data > 既有 trip_banner.promo_content
            let promoTextForLabels = (scraped as any).promo_text || '';
            if (!promoTextForLabels) {
              const { data: tripForPromo } = await supabase
                .from('trips')
                .select('trip_banner')
                .eq('id', change.trip_id)
                .single();
              promoTextForLabels = (tripForPromo?.trip_banner as Record<string, unknown>)?.promo_content as string || '';
            }

            if (promoTextForLabels) {
              const promoDatesForDep = parsePromoDates(promoTextForLabels);
              if (promoDatesForDep.length > 0) {
                const { data: newDepsForPromo } = await supabase
                  .from('trip_departure_dates')
                  .select('id, departure_date')
                  .eq('trip_id', change.trip_id);
                const depPromoMatchedIds: string[] = [];
                for (const nd of newDepsForPromo || []) {
                  const ndt = new Date(nd.departure_date + 'T00:00:00');
                  if (isNaN(ndt.getTime())) continue; // 跳過無效日期
                  if (promoDatesForDep.some((pd) => pd.month === ndt.getMonth() + 1 && pd.day === ndt.getDate())) {
                    depPromoMatchedIds.push(nd.id);
                  }
                }
                if (depPromoMatchedIds.length > 0) {
                  await supabase
                    .from('trip_departure_dates')
                    .update({ label: '限時優惠' })
                    .in('id', depPromoMatchedIds);
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

            // 新行程：將 promo_text 轉換為前端讀取的 promo_content / promo_enabled
            const newTripBanner = { ...scraped.trip_banner };
            const newPromoText = (scraped as any).promo_text || (newTripBanner as Record<string, unknown>).promo_text || '';
            if (newPromoText) {
              (newTripBanner as Record<string, unknown>).promo_content = newPromoText;
              (newTripBanner as Record<string, unknown>).promo_enabled = true;
            }
            // 無出團日期 → 自動設為洽詢模式
            const hasNoDepartures = !scraped.departures || scraped.departures.length === 0;
            if (hasNoDepartures) {
              (newTripBanner as Record<string, unknown>).custom_tour = true;
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
                cover_image_url: tempImageUrl,
                trip_banner: newTripBanner,
                source_url: scraped.source_url || null,
              })
              .select('id')
              .single();

            if (insertErr || !inserted) {
              results.push({ id: changeId, success: false, error: insertErr?.message || '新增失敗' });
              continue;
            }

            // 用真正的 trip ID 重新上傳圖片（替換 placeholder ID 的路徑）
            if (scraped.cover_image_url && inserted.id) {
              const finalImageUrl = await ensureSupabaseImage(supabase, scraped.cover_image_url, inserted.id);
              if (finalImageUrl && finalImageUrl !== tempImageUrl) {
                await supabase.from('trips').update({ cover_image_url: finalImageUrl }).eq('id', inserted.id);
              }
            }

            // 批量插入出發日期
            if (scraped.departures && scraped.departures.length > 0) {
              const newTripSegments = scraped.flightSegments || [];
              const newTripOutbound = newTripSegments[0] || null;
              const newTripReturn = newTripSegments[newTripSegments.length - 1] || null;

              const newTripDepartures = scraped.departures.map((dep) => ({
                trip_id: inserted.id,
                departure_date: dep.date,
                departure_city: dep.departure_city,
                airline: dep.airline,
                price: dep.price,
                label: dep.label,
                seats_total: dep.seats_total,
                seats_available: dep.seats_available,
                outbound_flight: newTripOutbound?.flight_number || null,
                outbound_time: newTripOutbound?.dep_time || null,
                outbound_from: newTripOutbound?.dep_airport || null,
                outbound_arrival_time: newTripOutbound?.arr_time || null,
                outbound_to: newTripOutbound?.arr_airport || null,
                outbound_next_day: newTripOutbound?.next_day || false,
                return_flight: newTripReturn?.flight_number || null,
                return_time: newTripReturn?.dep_time || null,
                return_from: newTripReturn?.dep_airport || null,
                return_arrival_time: newTripReturn?.arr_time || null,
                return_to: newTripReturn?.arr_airport || null,
                return_next_day: newTripReturn?.next_day || false,
                flight_segments: newTripSegments,
                is_active: true,
              }));

              const { error: newTripDepErr } = await supabase.from('trip_departure_dates').insert(newTripDepartures);
              if (newTripDepErr) {
                results.push({ id: changeId, success: false, error: newTripDepErr.message });
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

          case 'warning':
          case 'new_tab': {
            // 警告/通知類型：不做實際資料變更，直接標記為已確認
            break;
          }

          default:
            results.push({ id: changeId, success: false, error: `未知的 change_type: ${change.change_type}` });
            continue;
        }

        // PDF 保留：不再自動清除 document_url
        // 使用者手動上傳的 PDF 應被保留，若需更新 PDF 請手動重新上傳

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
        // 失敗時把 status 回退成 pending，避免卡在 processing
        await supabase
          .from('pending_changes')
          .update({ status: 'pending' })
          .eq('id', changeId)
          .eq('status', 'processing');
        results.push({ id: changeId, success: false, error: String(err) });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    // 更新 scrape_region_status：記錄每個受影響區域的 last_applied 時間
    if (successCount > 0) {
      try {
        const appliedIds = results.filter(r => r.success).map(r => r.id);
        const { data: appliedChanges } = await supabase
          .from('pending_changes')
          .select('region_label')
          .in('id', appliedIds);

        // region_label 可能是 tab 名（中東/北海道）或 region key（asia/japan）
        // 映射成 region key 讓儀表板能正確顯示
        const LABEL_TO_KEY: Record<string, string> = {
          '中東': 'asia', '中亞': 'asia', '西伯利亞': 'asia', '高雄出發': 'asia',
          '北海道': 'japan', '東北': 'japan', '關東': 'japan', '中部': 'japan', '關西': 'japan', '四國': 'japan', '九州': 'japan', '沖繩': 'japan',
          '首爾': 'south-korea', '釜山': 'south-korea', '濟州': 'south-korea', '濟州島': 'south-korea',
          '曼谷': 'thailand', '泰國': 'thailand',
          '越南': 'vietnam', '北越': 'vietnam', '中越': 'vietnam',
          '印尼': 'indonesia', '菲律賓': 'philippines',
          '馬新': 'malaysia', 'malaysia': 'malaysia',
          '中西歐': 'europe', '東歐': 'europe', '南歐': 'europe', '北歐': 'europe',
          '華東': 'china', '華南': 'china', '華中': 'china', '西南': 'china', '西北': 'china',
          '斯里蘭卡': 'southasia', '不丹': 'southasia', '馬爾地夫': 'southasia',
          '紐澳': 'new', '美加': 'new',
          '金門': 'kinmen', '馬祖': 'mazu', '澎湖': 'penghu',
          '自由行': 'freetour', '高爾夫': 'golf',
        };
        const affectedRegions = new Set(
          (appliedChanges || [])
            .map(c => c.region_label)
            .filter(Boolean)
            .map(label => LABEL_TO_KEY[label] || label)
        );

        if (affectedRegions.size > 0) {
          const { data: existing } = await supabase
            .from('site_settings')
            .select('value')
            .eq('key', 'scrape_region_status')
            .single();

          const regionStatus: Record<string, { last_scraped?: string; last_applied?: string }> = (existing?.value as Record<string, { last_scraped?: string; last_applied?: string }>) || {};
          const now = new Date().toISOString();

          for (const region of affectedRegions) {
            if (!regionStatus[region]) regionStatus[region] = {};
            regionStatus[region].last_applied = now;
          }

          await supabase
            .from('site_settings')
            .upsert({ key: 'scrape_region_status', value: regionStatus, updated_at: now });
        }
      } catch {
        // 靜默失敗，不影響主流程
      }
    }

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
