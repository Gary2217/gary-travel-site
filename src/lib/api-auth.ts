import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { verifyDevAuthCookie, DEV_AUTH_COOKIE_NAME } from "./dev-auth";

/**
 * 驗證 API 請求是否來自已登入的開發者。
 * 回傳 null 代表驗證通過，否則回傳 401 NextResponse。
 */
export function requireDevAuth(request?: NextRequest): NextResponse | null {
  const tokenFromRequest = request?.cookies.get(DEV_AUTH_COOKIE_NAME)?.value;
  const tokenFromStore = cookies().get(DEV_AUTH_COOKIE_NAME)?.value;
  const token = tokenFromRequest || tokenFromStore;

  if (!verifyDevAuthCookie(token)) {
    return NextResponse.json({ error: "未授權的請求" }, { status: 401 });
  }

  return null;
}
