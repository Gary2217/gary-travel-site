import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { unstable_noStore as noStore } from 'next/cache';
import { requireDevAuth } from '@/lib/api-auth';
import { getStoragePathFromPublicUrl } from '@/lib/storage';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  noStore();
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Missing server configuration.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        fetch: (url: RequestInfo | URL, options?: RequestInit) =>
          fetch(url, { ...options, cache: 'no-store' }),
      },
    });

    // 先查 trip + destinations（不含 trip_days，因為該表可能不存在）
    const { data, error } = await supabase
      .from('trips')
      .select('*, destinations (*)')
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('trip query error:', error.message);
      return NextResponse.json({ error: '找不到行程' }, { status: 404 });
    }

    // 嘗試查 trip_days（表可能尚未建立）
    let tripDays: any[] = [];
    try {
      const { data: daysData } = await supabase
        .from('trip_days')
        .select('*')
        .eq('trip_id', params.id)
        .order('day_number', { ascending: true });
      if (daysData) tripDays = daysData;
    } catch {
      // trip_days 表不存在，跳過
    }

    // 查詢出發日期
    let departureDates: any[] = [];
    try {
      const { data: datesData } = await supabase
        .from('trip_departure_dates')
        .select('*')
        .eq('trip_id', params.id)
        .order('departure_date', { ascending: true });
      if (datesData) departureDates = datesData;
    } catch {
      // trip_departure_dates 表不存在，跳過
    }

    const responseData = {
      ...data,
      trip_days: tripDays,
      departure_dates: departureDates,
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
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ error: 'Missing server configuration.' }, { status: 500 });
    }

    const body = await request.json();
    const allowedFields = ['title', 'subtitle', 'duration', 'price_range', 'highlights', 'trip_banner', 'is_active', 'document_text'];
    const updates: Record<string, any> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: '沒有可更新的欄位' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data, error } = await supabase
      .from('trips')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
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
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ error: 'Missing server configuration.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 取得行程資料以收集 Storage 路徑
    const { data: trip, error: tripFetchError } = await supabase
      .from('trips')
      .select('cover_image_url, document_url, trip_banner')
      .eq('id', params.id)
      .single();

    if (tripFetchError || !trip) {
      return NextResponse.json({ error: '找不到行程' }, { status: 404 });
    }

    // 收集需清理的 Storage 路徑
    const storagePaths = new Set<string>();

    const coverPath = getStoragePathFromPublicUrl(trip.cover_image_url || '');
    if (coverPath) storagePaths.add(coverPath);

    const documentPath = getStoragePathFromPublicUrl(trip.document_url || '');
    if (documentPath) storagePaths.add(documentPath);

    const banner = trip.trip_banner as Record<string, unknown> | null;
    const sideImagePath = getStoragePathFromPublicUrl(String(banner?.side_image_url || ''));
    if (sideImagePath) storagePaths.add(sideImagePath);

    // 取得 trip_side_media 圖片路徑
    const { data: sideMedia } = await supabase
      .from('trip_side_media')
      .select('url, media_type')
      .eq('trip_id', params.id)
      .eq('media_type', 'image');

    for (const media of sideMedia || []) {
      const mediaPath = getStoragePathFromPublicUrl((media as any).url || '');
      if (mediaPath) storagePaths.add(mediaPath);
    }

    // 刪除所有關聯資料
    await Promise.all([
      supabase.from('trip_days').delete().eq('trip_id', params.id),
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

    // 清理 Storage 檔案
    if (storagePaths.size > 0) {
      const { error: removeError } = await supabase.storage
        .from('images')
        .remove([...storagePaths]);
      if (removeError) {
        console.error('Failed to remove trip storage files:', removeError.message);
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
