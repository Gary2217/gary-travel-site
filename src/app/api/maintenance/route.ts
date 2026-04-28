import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DEV_AUTH_COOKIE_NAME, verifyDevAuthCookie } from '@/lib/dev-auth';
import { unstable_noStore as noStore } from 'next/cache';

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

function isDevUser(req: NextRequest) {
  const cookie = req.cookies.get(DEV_AUTH_COOKIE_NAME)?.value;
  return verifyDevAuthCookie(cookie);
}

// GET: 查詢維護模式狀態
export async function GET(req: NextRequest) {
  noStore();
  try {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ enabled: false, isDevUser: false });
    }

    const supabase = createSupabase();
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'maintenance_mode')
      .single();

    const enabled = data?.value === true || data?.value === 'true';
    const devUser = isDevUser(req);

    return NextResponse.json(
      { enabled, isDevUser: devUser },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } },
    );
  } catch {
    // 表不存在或其他錯誤，預設關閉維護模式
    return NextResponse.json({ enabled: false, isDevUser: isDevUser(req) });
  }
}

// PUT: 切換維護模式（需要 dev auth）
export async function PUT(req: NextRequest) {
  if (!isDevUser(req)) {
    return NextResponse.json({ error: '未授權' }, { status: 401 });
  }

  try {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ error: 'Missing server configuration.' }, { status: 500 });
    }

    const body = await req.json();
    const enabled = Boolean(body.enabled);

    const supabase = createSupabase();

    const { error } = await supabase
      .from('site_settings')
      .upsert(
        { key: 'maintenance_mode', value: enabled, updated_at: new Date().toISOString() },
        { onConflict: 'key' },
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ enabled });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
