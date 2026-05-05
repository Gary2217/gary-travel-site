import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// GET - 取得行程的側邊媒體
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tripId = searchParams.get('trip_id');

  if (!tripId) {
    return NextResponse.json({ error: '缺少 trip_id' }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase
    .from('trip_side_media')
    .select('*')
    .eq('trip_id', tripId)
    .order('display_order', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || [], {
    headers: { 'Cache-Control': 'no-store' },
  });
}

// POST - 新增媒體
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trip_id, media_type, url } = body;

    if (!trip_id || !media_type || !url) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 });
    }

    if (!['image', 'instagram_video'].includes(media_type)) {
      return NextResponse.json({ error: '不支援的媒體類型' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - 刪除媒體
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: '缺少 id' }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { error } = await supabase
    .from('trip_side_media')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
