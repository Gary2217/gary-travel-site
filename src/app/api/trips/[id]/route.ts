import { NextRequest, NextResponse } from 'next/server';
import { requireDevAuth } from '@/lib/api-auth';
import { r2Delete, r2KeyFromUrl } from '@/lib/r2';
import { createAnonClientNoCache, createServiceClient, hasServiceRoleConfig, hasSupabaseConfig } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!hasSupabaseConfig()) {
      return NextResponse.json({ error: '伺服器設定缺失' }, { status: 500 });
    }

    const supabase = createAnonClientNoCache();

    const [{ data, error }, daysResult, datesResult] = await Promise.all([
      supabase.from('trips').select('*, destinations (*, regions (category_label))').eq('id', params.id).single(),
      supabase.from('trip_days').select('*').eq('trip_id', params.id).order('day_number', { ascending: true }),
      supabase.from('trip_departure_dates').select('*').eq('trip_id', params.id).order('departure_date', { ascending: true }),
    ]);

    if (error) {
      console.error('trip query error:', error.message);
      return NextResponse.json({ error: '找不到行程' }, { status: 404 });
    }

    const responseData = {
      ...data,
      trip_days: daysResult.data || [],
      departure_dates: datesResult.data || [],
      document_is_available: Boolean(data.document_url),
    };

    return NextResponse.json(responseData, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH: 更新行程欄位（天數、標題等）
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = requireDevAuth();
  if (authError) return authError;
  try {
    if (!hasServiceRoleConfig()) {
      return NextResponse.json({ error: '伺服器設定缺失' }, { status: 500 });
    }

    const body = await request.json();
    const allowedFields = ['title', 'subtitle', 'duration', 'price_range', 'highlights', 'trip_banner', 'is_active', 'document_text', 'destination_id', 'source_url'];
    const updates: Record<string, any> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: '沒有可更新的欄位' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('trips')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: 刪除行程
export async function DELETE(
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

    // 取得行程資料以收集 Storage 路徑
    const { data: trip, error: tripFetchError } = await supabase
      .from('trips')
      .select('cover_image_url, document_url, trip_banner')
      .eq('id', params.id)
      .single();

    if (tripFetchError || !trip) {
      return NextResponse.json({ error: '找不到行程' }, { status: 404 });
    }

    // 收集此行程引用的 R2 object key
    const storagePaths = new Set<string>();

    const coverPath = r2KeyFromUrl(trip.cover_image_url || '');
    if (coverPath) storagePaths.add(coverPath);

    const documentPath = r2KeyFromUrl(trip.document_url || '');
    if (documentPath) storagePaths.add(documentPath);

    const banner = trip.trip_banner as Record<string, unknown> | null;
    const sideImagePath = r2KeyFromUrl(String(banner?.side_image_url || ''));
    if (sideImagePath) storagePaths.add(sideImagePath);

    // 取得 trip_side_media 圖片路徑
    const { data: sideMedia } = await supabase
      .from('trip_side_media')
      .select('url, media_type')
      .eq('trip_id', params.id)
      .eq('media_type', 'image');

    for (const media of sideMedia || []) {
      const mediaPath = r2KeyFromUrl(String((media as { url?: string }).url || ''));
      if (mediaPath) storagePaths.add(mediaPath);
    }

    // 反查其他行程是否仍在引用同一個 R2 檔案。
    // 早期「複製卡片」會讓副本與原卡共用同一份 R2 檔（已於 503ab86 改為複製一份新檔），
    // 但在那之前產生的卡片仍存在共用情形。若不做此反查，刪除其中一張卡片
    // 會讓另一張仍上架的行程變成破圖。
    let sharedKeys = new Set<string>();
    if (storagePaths.size > 0) {
      const [{ data: otherTrips }, { data: otherMedia }] = await Promise.all([
        supabase.from('trips').select('cover_image_url, document_url, trip_banner').neq('id', params.id),
        supabase.from('trip_side_media').select('url').neq('trip_id', params.id),
      ]);

      const referencedElsewhere = new Set<string>();
      for (const other of otherTrips || []) {
        const otherBanner = other.trip_banner as Record<string, unknown> | null;
        for (const url of [other.cover_image_url, other.document_url, otherBanner?.side_image_url]) {
          const key = r2KeyFromUrl(String(url || ''));
          if (key) referencedElsewhere.add(key);
        }
      }
      for (const media of otherMedia || []) {
        const key = r2KeyFromUrl(String((media as { url?: string }).url || ''));
        if (key) referencedElsewhere.add(key);
      }

      sharedKeys = new Set([...storagePaths].filter((key) => referencedElsewhere.has(key)));
      for (const key of sharedKeys) storagePaths.delete(key);
    }

    // 刪除所有關聯資料
    await Promise.all([
      supabase.from('trip_departure_dates').delete().eq('trip_id', params.id),
      supabase.from('trip_side_media').delete().eq('trip_id', params.id),
    ]);

    // 刪除行程
    const { error } = await supabase
      .from('trips')
      .delete()
      .eq('id', params.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 清理 R2 檔案（僅限沒有其他行程引用的）。
    // DB 已刪除成功，此處失敗不應讓整個請求失敗 —— 最壞情況只是留下孤兒檔。
    if (storagePaths.size > 0) {
      try {
        await r2Delete([...storagePaths]);
      } catch (removeErr) {
        console.error('Failed to remove trip R2 files:', removeErr instanceof Error ? removeErr.message : removeErr);
      }
    }
    if (sharedKeys.size > 0) {
      console.warn(`Kept ${sharedKeys.size} R2 file(s) still referenced by other trips:`, [...sharedKeys]);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
