/**
 * API Route 開發者身份驗證工具
 * 供所有需要 DevMode 權限的 API Route 使用
 */
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { verifyDevAuthCookie, DEV_AUTH_COOKIE_NAME } from '@/lib/dev-auth';

/**
 * 驗證開發者身份（從 Cookie 讀取）
 * 回傳 null 表示驗證通過，回傳 NextResponse 表示驗證失敗
 */
export function requireDevAuth(): NextResponse | null {
  const cookieStore = cookies();
  const cookieValue = cookieStore.get(DEV_AUTH_COOKIE_NAME)?.value;

  if (!verifyDevAuthCookie(cookieValue)) {
    return NextResponse.json({ error: '未授權' }, { status: 401 });
  }

  return null;
}
