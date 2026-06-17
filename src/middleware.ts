import { NextResponse } from 'next/server';

// 安全 Headers 已統一由 next.config.mjs headers() 設定。
// 保留 middleware 供未來擴充（例如 auth redirect）。
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
