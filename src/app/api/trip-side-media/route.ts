import { NextRequest, NextResponse } from 'next/server';
import { API_ERRORS, apiError } from '@/lib/api-error';
import { requireDevAuth } from '@/lib/api-auth';
import { getStoragePathFromPublicUrl } from '@/lib/storage';
import { createAnonClient, createServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// GET - 取得行程的側邊媒體
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tripId = searchParams.get('trip_id');

  if (!tripId) {
    return apiError('缺少 trip_id', 400);
  }

  const supabase = createAnonClient();
  const { data, error } = await supabase
    .from('trip_side_media')
    .select('*')
    .eq('trip_id', tripId)
    .order('display_order', { ascending: true });

  if (error) {
    return API_ERRORS.dbError(error);
  }

  return NextResponse.json(data || [], {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  });
}

// POST - 新增媒體（需登入）
export async function POST(request: NextRequest) {
  const authError = requireDevAuth();
  if (authError) return authError;

  try {
    const body = await request.json();
    const { trip_id, media_type, url } = body;

    if (!trip_id || !media_type || !url) {
      return apiError('缺少必要欄位', 400);
    }

    if (!['image', 'instagram_video'].includes(media_type)) {
      return apiError('不支援的媒體類型', 400);
    }

    if (typeof url !== 'string' || url.length > 2048) {
      return apiError('URL 長度不得超過 2048 字元', 400);
    }

    const supabase = createServiceClient();

    // 檢查數量限制
    const { count } = await supabase
      .from('trip_side_media')
      .select('*', { count: 'exact', head: true })
      .eq('trip_id', trip_id);

    if ((count || 0) >= 15) {
      return NextResponse.json({ error: '最多只能新增 15 筆媒體' }, { status: 400 });
    }

    // 取得最大 display_order
    const { data: maxOrder } = await supabase
      .from('trip_side_media')
      .select('display_order')
      .eq('trip_id', trip_id)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = (maxOrder?.[0]?.display_order || 0) + 1;

    const { data, error } = await supabase
      .from('trip_side_media')
      .insert({
        trip_id,
        media_type,
        url,
        display_order: nextOrder,
      })
      .select()
      .single();

    if (error) {
      return API_ERRORS.dbError(error);
    }

    return NextResponse.json(data);
  } catch (err) {
    return API_ERRORS.internal(err);
  }
}

// DELETE - 刪除媒體（需登入）
export async function DELETE(request: NextRequest) {
  const authError = requireDevAuth();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return apiError('缺少 id', 400);
  }

  const supabase = createServiceClient();

  const { data: targetMedia, error: targetError } = await supabase
    .from('trip_side_media')
    .select('id,media_type,url')
    .eq('id', id)
    .single();

  if (targetError || !targetMedia) {
    return apiError('找不到指定媒體', 404);
  }

  const { error } = await supabase
    .from('trip_side_media')
    .delete()
    .eq('id', id);

  if (error) {
    return API_ERRORS.dbError(error);
  }

  if (targetMedia.media_type === 'image') {
    const oldStoragePath = getStoragePathFromPublicUrl(targetMedia.url || '');
    if (oldStoragePath) {
      const { error: removeError } = await supabase.storage.from('images').remove([oldStoragePath]);
      if (removeError) {
        console.error('Failed to remove trip side media image:', removeError.message);
      }
    }
  }

  return NextResponse.json({ success: true });
}
