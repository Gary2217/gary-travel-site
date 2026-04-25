import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// POST: 新增行程
export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ error: 'Missing server configuration.' }, { status: 500 });
    }

    const body = await request.json();
    const { destination_id } = body;

    if (!destination_id) {
      return NextResponse.json({ error: 'Missing destination_id' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 取得目前最大 display_order
    const { data: existing } = await supabase
      .from('trips')
      .select('display_order')
      .eq('destination_id', destination_id)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = (existing?.[0]?.display_order || 0) + 1;

    const { data, error } = await supabase
      .from('trips')
      .insert({
        destination_id,
        title: body.title || '新行程',
        subtitle: body.subtitle || '',
        duration: body.duration || '5天4夜',
        price_range: body.price_range || '',
        cover_image_url: '',
        highlights: [],
        is_active: true,
        display_order: nextOrder,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
