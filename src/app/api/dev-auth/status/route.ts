import { NextRequest, NextResponse } from "next/server";
import { DEV_AUTH_COOKIE_NAME, verifyDevAuthCookie } from "@/lib/dev-auth";

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get(DEV_AUTH_COOKIE_NAME)?.value;
  const authorized = verifyDevAuthCookie(cookie);
  return NextResponse.json({ authorized });
}
