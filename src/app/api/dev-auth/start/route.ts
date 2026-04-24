import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
  if (!channelId) {
    return NextResponse.json({ error: "LINE Login 未設定" }, { status: 500 });
  }

  const state = crypto.randomBytes(16).toString("hex");
  const redirectUri = `${req.nextUrl.origin}/api/dev-auth/line`;
  const url = new URL("https://access.line.me/oauth2/v2.1/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", channelId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", "profile openid");

  const response = NextResponse.redirect(url);
  response.cookies.set("dev_auth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 10 * 60,
  });
  return response;
}
