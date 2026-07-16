import { NextRequest, NextResponse } from 'next/server';
import { requireDevAuth } from '@/lib/api-auth';
import { createServiceClient, hasServiceRoleConfig } from '@/lib/supabase-server';
import { R2_PUBLIC_BASE, r2PublicUrl, r2Upload } from '@/lib/r2';

export const dynamic = 'force-dynamic';

/**
 * 複製 R2 圖檔／PDF 到獨立的新 key，讓複製出來的卡片不與原卡共用同一個檔案。
 * 若沿用同一 URL，之後「更換／刪除」其中一張卡的圖或 PDF 會連帶刪掉共用的 R2 檔，
 * 使另一張卡的圖／PDF 破圖。複製失敗時退回沿用原 URL（顯示仍正常），不讓整個複製流程失敗。
 */
async function copyR2Asset(
  sourceUrl: string | null | undefined,
  folder: string,
  newId: string,
): Promise<string | null | undefined> {
  if (!sourceUrl) return sourceUrl;
  if (!sourceUrl.startsWith(R2_PUBLIC_BASE)) return sourceUrl; // 非 R2（外部連結或空值）→ 原樣保留
  try {
    const res = await fetch(sourceUrl);
    if (!res.ok) return sourceUrl;
    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0) return sourceUrl;

    let ext = 'jpg';
    try {
      const m = new URL(sourceUrl).pathname.match(/\.([a-z0-9]+)$/i);
      if (m) ext = m[1].toLowerCase();
    } catch {
      /* 保留預設副檔名 */
    }

    const newKey = `${folder}/${newId}-${Date.now()}.${ext}`;
    await r2Upload(newKey, buf, contentType);
    return `${r2PublicUrl(newKey)}?v=${Date.now()}`;
  } catch {
    return sourceUrl; // 退回共用原檔，至少顯示正常
  }
}

/** 出發日期的比對簽章（用來把舊梯次 id 對應到複製後的新梯次 id） */
function departureSignature(d: Record<string, unknown>): string {
  return [d.departure_date, d.price, d.label, d.departure_city, d.airline]
    .map((v) => String(v ?? ''))
    .join('|');
}

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

    // 建立新行程（先沿用原欄位，稍後修正圖檔與售價明細對應）
    const { trip_departure_dates: departureDates, id: _id, created_at: _ca, updated_at: _ua, ...tripFields } = original;

    const { data: newTrip, error: insertError } = await supabase
      .from('trips')
      .insert({
        ...tripFields,
        title: `${original.title}（複製）`,
        is_active: true,
        scrape_managed: false,
      })
      .select()
      .single();

    if (insertError || !newTrip) {
      return NextResponse.json({ error: insertError?.message || '複製行程失敗' }, { status: 500 });
    }

    // 複製所有 is_active=true 的出發日期，並保留插入結果以重建售價明細對應
    const activeDates = (departureDates as Record<string, unknown>[] || []).filter(
      (d) => d.is_active === true || d.is_active === undefined
    );

    let insertedDates: Record<string, unknown>[] = [];
    if (activeDates.length > 0) {
      const newDates = activeDates.map(({ id: _did, created_at: _dca, updated_at: _dua, trip_id: _tid, ...rest }) => ({
        ...rest,
        trip_id: newTrip.id,
      }));

      const { data: insertedRows, error: datesError } = await supabase
        .from('trip_departure_dates')
        .insert(newDates)
        .select();

      if (datesError) {
        console.error('複製出發日期失敗:', datesError.message);
      } else {
        insertedDates = (insertedRows as Record<string, unknown>[]) || [];
      }
    }

    // 建立「舊梯次 id → 新梯次 id」對應（依日期/價格/標籤等簽章比對，處理同日多梯次）
    const newIdsBySignature = new Map<string, string[]>();
    for (const nd of insertedDates) {
      const sig = departureSignature(nd);
      if (!newIdsBySignature.has(sig)) newIdsBySignature.set(sig, []);
      newIdsBySignature.get(sig)!.push(String(nd.id));
    }
    const oldToNewDateId: Record<string, string> = {};
    for (const od of activeDates) {
      const bucket = newIdsBySignature.get(departureSignature(od));
      if (bucket && bucket.length > 0) {
        oldToNewDateId[String(od.id)] = bucket.shift() as string;
      }
    }

    // 重建 departure_info_map：把 key 從舊梯次 id 換成新梯次 id（否則複製卡的售價明細會對不到而變空白）
    const banner = (newTrip.trip_banner as Record<string, unknown> | null) || null;
    let rekeyedBanner = banner;
    if (banner && banner.departure_info_map && typeof banner.departure_info_map === 'object') {
      const oldMap = banner.departure_info_map as Record<string, unknown>;
      const newMap: Record<string, unknown> = {};
      for (const [oldDateId, info] of Object.entries(oldMap)) {
        const newDateId = oldToNewDateId[oldDateId];
        if (newDateId) newMap[newDateId] = info;
      }
      rekeyedBanner = { ...banner, departure_info_map: newMap };
    }

    // 複製 R2 圖檔／PDF 到獨立 key（封面、PDF、側邊圖），讓複製卡片完全獨立
    const [newCover, newDocument, newSideImage] = await Promise.all([
      copyR2Asset(newTrip.cover_image_url, 'images/trips', newTrip.id),
      copyR2Asset(newTrip.document_url, 'images/documents', newTrip.id),
      copyR2Asset((rekeyedBanner?.side_image_url as string | undefined), 'images/trip-banners', newTrip.id),
    ]);

    if (rekeyedBanner && newSideImage !== undefined) {
      rekeyedBanner = { ...rekeyedBanner, side_image_url: newSideImage };
    }

    // 一次寫回修正後的欄位
    const patch: Record<string, unknown> = {};
    if (newCover !== newTrip.cover_image_url) patch.cover_image_url = newCover;
    if (newDocument !== newTrip.document_url) patch.document_url = newDocument;
    if (rekeyedBanner !== banner) patch.trip_banner = rekeyedBanner;

    if (Object.keys(patch).length > 0) {
      const { error: patchError } = await supabase.from('trips').update(patch).eq('id', newTrip.id);
      if (patchError) console.error('複製後修正欄位失敗:', patchError.message);
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
