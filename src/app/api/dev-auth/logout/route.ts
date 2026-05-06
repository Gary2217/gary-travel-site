import { NextRequest, NextResponse } from "next/server";
import { DEV_AUTH_COOKIE_NAME } from "@/lib/dev-auth";

export async function GET(req: NextRequest) {
  const response = NextResponse.redirect(new URL("/", req.url));
  response.cookies.set(DEV_AUTH_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  response.cookies.set("dev_auth_state", "", { path: "/", maxAge: 0 });
  return response;
}
