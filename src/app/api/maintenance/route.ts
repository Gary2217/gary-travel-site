import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_ERRORS, apiError } from '@/lib/api-error';
import { DEV_AUTH_COOKIE_NAME, verifyDevAuthCookie } from '@/lib/dev-auth';
import { requireDevAuth } from '@/lib/api-auth';
import { createServiceClient, hasServiceRoleConfig } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function createSupabase() {
  return createServiceClient();
}

function checkIsDevUser(): boolean {
  const token = cookies().get(DEV_AUTH_COOKIE_NAME)?.value;
  return verifyDevAuthCookie(token);
}

// GET: 查詢維護模式狀態
export async function GET(req: NextRequest) {
  try {
    if (!hasServiceRoleConfig()) {
      return NextResponse.json(
        { enabled: false, isDevUser: false },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    const supabase = createSupabase();
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'maintenance_mode')
      .single();

    const enabled = data?.value === true || data?.value === 'true';
    const devUser = checkIsDevUser();

    return NextResponse.json(
      { enabled, isDevUser: devUser },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } },
    );
  } catch (err) {
    console.error('[API 500] 維護模式狀態讀取失敗:', err instanceof Error ? err.message : String(err));
    // 表不存在或其他錯誤，預設關閉維護模式
    return NextResponse.json(
      { enabled: false, isDevUser: checkIsDevUser() },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  }
}

// PUT: 切換維護模式（需要 dev auth）
export async function PUT(req: NextRequest) {
  const authError = requireDevAuth();
  if (authError) return authError;

  try {
    if (!hasServiceRoleConfig()) {
      return API_ERRORS.missingConfig();
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
      return API_ERRORS.dbError(error);
    }

    return NextResponse.json({ enabled });
  } catch (err) {
    return API_ERRORS.internal(err);
  }
}
