import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireDevAuth } from '@/lib/api-auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function createPublicClient() {
  return createClient(supabaseUrl, supabaseAnonKey);
}

function createAdminClient() {
  if (!supabaseServiceRoleKey) return null;
  return createClient(supabaseUrl, supabaseServiceRoleKey);
}

type FocusTopicStatus = 'pending' | 'approved' | 'rejected' | 'published';

// GET - 取得焦點話題（公開: published / 開發者: all）
export async function GET(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json([], {
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
      });
    }

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope');
    const id = searchParams.get('id');
    const isAllScope = scope === 'all';

    const supabase = isAllScope ? createAdminClient() : createPublicClient();

    if (!supabase) {
      return NextResponse.json({ error: 'Missing server configuration.' }, { status: 500 });
    }

    if (isAllScope) {
      const authError = requireDevAuth(request);
      if (authError) return authError;
    }

    const query = supabase
      .from('focus_topic_items')
      .select('id, title, summary, image_url, source_name, source_url, source_item_id, published_at, status, created_at, updated_at')
      .order(isAllScope ? 'updated_at' : 'published_at', { ascending: false })
      .limit(isAllScope ? 100 : 4);

    if (id) {
      query.eq('id', id).limit(1);
    }

    if (!isAllScope) {
      query.eq('status', 'published');
    }

    const { data, error } = await query;

    if (error) {
      // 第一版允許表尚未建立，前台以空資料顯示骨架
      return NextResponse.json([], {
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
      });
    }

    if (id) {
      return NextResponse.json((data && data[0]) || null, {
        headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
      });
    }

    return NextResponse.json(data || [], {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch {
    return NextResponse.json([], {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  }
}

// POST - 新增焦點話題（需開發者授權）
export async function POST(request: NextRequest) {
  const authError = requireDevAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const {
      title,
      summary,
      image_url,
      source_name,
      source_url,
      status,
    }: {
      title?: string;
      summary?: string;
      image_url?: string;
      source_name?: string;
      source_url?: string;
      status?: FocusTopicStatus;
    } = body || {};

    if (!title || !title.trim()) {
      return NextResponse.json({ error: '缺少標題' }, { status: 400 });
    }

    if (!image_url || !image_url.trim()) {
      return NextResponse.json({ error: '缺少圖片網址' }, { status: 400 });
    }

    if (!source_url || !source_url.trim()) {
      return NextResponse.json({ error: '缺少來源連結' }, { status: 400 });
    }

    const normalizedStatus: FocusTopicStatus =
      status && ['pending', 'approved', 'rejected', 'published'].includes(status)
        ? status
        : 'pending';

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Missing server configuration.' }, { status: 500 });
    }
    const nowIso = new Date().toISOString();

    const { data, error } = await supabase
      .from('focus_topic_items')
      .insert({
        title: title.trim(),
        summary: summary?.trim() || '',
        image_url: image_url.trim(),
        source_name: source_name?.trim() || '外部來源',
        source_url: source_url.trim(),
        status: normalizedStatus,
        published_at: normalizedStatus === 'published' ? nowIso : null,
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - 更新焦點話題（需開發者授權）
export async function PATCH(request: NextRequest) {
  const authError = requireDevAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const {
      id,
      title,
      summary,
      image_url,
      source_name,
      source_url,
      status,
    }: {
      id?: string;
      title?: string;
      summary?: string;
      image_url?: string;
      source_name?: string;
      source_url?: string;
      status?: FocusTopicStatus;
    } = body || {};

    if (!id) {
      return NextResponse.json({ error: '缺少 id' }, { status: 400 });
    }

    const patch: Record<string, unknown> = {};

    if (typeof title === 'string') patch.title = title.trim();
    if (typeof summary === 'string') patch.summary = summary.trim();
    if (typeof image_url === 'string') patch.image_url = image_url.trim();
    if (typeof source_name === 'string') patch.source_name = source_name.trim();
    if (typeof source_url === 'string') patch.source_url = source_url.trim();

    if (status && ['pending', 'approved', 'rejected', 'published'].includes(status)) {
      patch.status = status;
      patch.published_at = status === 'published' ? new Date().toISOString() : null;
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Missing server configuration.' }, { status: 500 });
    }
    const { data, error } = await supabase
      .from('focus_topic_items')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - 刪除焦點話題（需開發者授權）
export async function DELETE(request: NextRequest) {
  const authError = requireDevAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: '缺少 id' }, { status: 400 });
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Missing server configuration.' }, { status: 500 });
    }
    const { error } = await supabase
      .from('focus_topic_items')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
