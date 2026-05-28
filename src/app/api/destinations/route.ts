import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireDevAuth } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase
      .from('destinations')
      .select('id, title, subtitle, image_url, display_order, sub_region, region_id, source_url')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || [], { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authError = requireDevAuth();
  if (authError) return authError;

  try {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ error: 'Missing server configuration.' }, { status: 500 });
    }

    const body = await request.json();
    const regionId = String(body.region_id || '').trim();
    const title = String(body.title || '').trim();
    const subtitle = String(body.subtitle || '').trim();
    const subRegion = String(body.sub_region || '').trim();

    if (!regionId || !title) {
      return NextResponse.json({ error: '缺少 region_id 或 title' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: existing } = await supabase
      .from('destinations')
      .select('display_order')
      .eq('region_id', regionId)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = (existing?.[0]?.display_order || 0) + 1;

    const { data, error } = await supabase
      .from('destinations')
      .insert({
        region_id: regionId,
        title,
        subtitle,
        sub_region: subRegion,
        image_url: '',
        display_order: nextOrder,
        is_active: true,
        click_count: 0,
        source_url: typeof body.source_url === 'string' ? body.source_url.trim() : null,
      })
      .select('id, region_id, title, subtitle, image_url, display_order, sub_region, source_url')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
