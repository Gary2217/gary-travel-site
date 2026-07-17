import { NextRequest, NextResponse } from 'next/server';
import { API_ERRORS, apiError } from '@/lib/api-error';
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
      return API_ERRORS.missingConfig();
    }

    const supabase = createAnonClientNoCache();

    const { data, error } = await supabase
      .from('destinations')
      .select('*, regions(*)')
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('destination query error:', error.message);
      return apiError('找不到目的地', 404);
    }

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (err) {
    return API_ERRORS.internal(err);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = requireDevAuth();
  if (authError) return authError;

  try {
    if (!hasServiceRoleConfig()) {
      return API_ERRORS.missingConfig();
    }

    const body = await request.json();
    const updates: { title?: string; subtitle?: string; source_url?: string | null } = {};

    if (typeof body.title === 'string') {
      const title = body.title.trim();
      if (!title) {
        return apiError('標題不可為空白', 400);
      }
      updates.title = title;
    }

    if (typeof body.subtitle === 'string') {
      updates.subtitle = body.subtitle.trim();
    }

    if (body.source_url === null || typeof body.source_url === 'string') {
      updates.source_url = body.source_url ? body.source_url.trim() : null;
    }

    if (Object.keys(updates).length === 0) {
      return apiError('沒有可更新的欄位', 400);
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('destinations')
      .update(updates)
      .eq('id', params.id)
      .select('id,title,subtitle,image_url,source_url,updated_at')
      .single();

    if (error) {
      return API_ERRORS.dbError(error);
    }

    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return API_ERRORS.internal(err);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = requireDevAuth();
  if (authError) return authError;

  try {
    if (!hasServiceRoleConfig()) {
      return API_ERRORS.missingConfig();
    }

    const supabase = createServiceClient();

    const { data: destination, error: destinationError } = await supabase
      .from('destinations')
      .select('id, image_url')
      .eq('id', params.id)
      .single();

    if (destinationError || !destination) {
      return apiError('找不到目的地', 404);
    }

    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select('id, cover_image_url, document_url, trip_banner')
      .eq('destination_id', params.id);

    if (tripsError) {
      return API_ERRORS.dbError(tripsError);
    }

    const tripIds = (trips || []).map((trip) => trip.id);

    const storagePaths = new Set<string>();
    const destinationImagePath = r2KeyFromUrl(destination.image_url || '');
    if (destinationImagePath) {
      storagePaths.add(destinationImagePath);
    }

    for (const trip of trips || []) {
      const coverPath = r2KeyFromUrl(trip.cover_image_url || '');
      if (coverPath) {
        storagePaths.add(coverPath);
      }

      const documentPath = r2KeyFromUrl(trip.document_url || '');
      if (documentPath) {
        storagePaths.add(documentPath);
      }

      const banner = trip.trip_banner as Record<string, unknown> | null;
      const sideImagePath = r2KeyFromUrl(String(banner?.side_image_url || ''));
      if (sideImagePath) {
        storagePaths.add(sideImagePath);
      }
    }

    if (tripIds.length > 0) {
      const { data: sideMedia, error: sideMediaError } = await supabase
        .from('trip_side_media')
        .select('url, media_type')
        .in('trip_id', tripIds)
        .eq('media_type', 'image');

      if (sideMediaError) {
          return API_ERRORS.dbError(sideMediaError);
      }

      for (const media of sideMedia || []) {
        const mediaPath = r2KeyFromUrl(media.url || '');
        if (mediaPath) {
          storagePaths.add(mediaPath);
        }
      }
    }

    // 反查此目的地以外的資料是否仍在引用同一個 R2 檔案。
    // 早期「複製卡片」會讓副本與原卡共用同一份 R2 檔（已於 503ab86 改為複製新檔），
    // 且共用可能跨目的地 —— 例如杜拜的 banner 同時被「中東」與「高雄出發」的卡片使用。
    // 若不做此反查，刪除一個目的地會讓其他目的地仍上架的行程變成破圖。
    // 必須在任何刪除動作之前算完，否則被刪的資料就查不到了。
    const sharedKeys = new Set<string>();
    if (storagePaths.size > 0) {
      const tripIdSet = new Set(tripIds);
      const [{ data: otherTrips }, { data: allMedia }, { data: otherDestinations }] = await Promise.all([
        supabase.from('trips').select('cover_image_url, document_url, trip_banner').neq('destination_id', params.id),
        supabase.from('trip_side_media').select('trip_id, url'),
        supabase.from('destinations').select('image_url').neq('id', params.id),
      ]);

      const referencedElsewhere = new Set<string>();
      for (const other of otherTrips || []) {
        const otherBanner = other.trip_banner as Record<string, unknown> | null;
        for (const url of [other.cover_image_url, other.document_url, otherBanner?.side_image_url]) {
          const key = r2KeyFromUrl(String(url || ''));
          if (key) referencedElsewhere.add(key);
        }
      }
      for (const media of allMedia || []) {
        // 只算「不屬於此目的地」的側邊媒體 —— 屬於此目的地的正要被刪除
        if (tripIdSet.has(media.trip_id)) continue;
        const key = r2KeyFromUrl(String(media.url || ''));
        if (key) referencedElsewhere.add(key);
      }
      for (const other of otherDestinations || []) {
        const key = r2KeyFromUrl(String(other.image_url || ''));
        if (key) referencedElsewhere.add(key);
      }

      for (const key of [...storagePaths]) {
        if (referencedElsewhere.has(key)) {
          sharedKeys.add(key);
          storagePaths.delete(key);
        }
      }
    }

    if (tripIds.length > 0) {
      await Promise.all([
        supabase.from('trip_departure_dates').delete().in('trip_id', tripIds),
        supabase.from('trip_side_media').delete().in('trip_id', tripIds),
      ]);

      const { error: deleteTripsError } = await supabase
        .from('trips')
        .delete()
        .eq('destination_id', params.id);

      if (deleteTripsError) {
        return API_ERRORS.dbError(deleteTripsError);
      }
    }

    const { error: deleteDestinationError } = await supabase
      .from('destinations')
      .delete()
      .eq('id', params.id);

    if (deleteDestinationError) {
      return API_ERRORS.dbError(deleteDestinationError);
    }

    // 清理 R2 檔案（僅限沒有其他目的地／行程引用的）。
    if (storagePaths.size > 0) {
      try {
        await r2Delete([...storagePaths]);
      } catch (removeErr) {
        console.error('Failed to remove destination-related R2 files:', removeErr instanceof Error ? removeErr.message : removeErr);
      }
    }
    if (sharedKeys.size > 0) {
      console.warn(`Kept ${sharedKeys.size} R2 file(s) still referenced elsewhere:`, [...sharedKeys]);
    }

    return NextResponse.json({ success: true, deleted_trip_count: tripIds.length });
  } catch (err) {
    return API_ERRORS.internal(err);
  }
}
