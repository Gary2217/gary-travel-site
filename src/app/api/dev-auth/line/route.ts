import { NextRequest, NextResponse } from "next/server";
import { createDevAuthCookie, isAllowedDevUser, DEV_AUTH_COOKIE_NAME } from "@/lib/dev-auth";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const storedState = req.cookies.get("dev_auth_state")?.value;

  if (!code || !state || !storedState || state !== storedState) {
    return NextResponse.redirect(new URL("/?devAuth=failed", req.url));
  }

  const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
  const channelSecret = process.env.LINE_LOGIN_CHANNEL_SECRET;
  const redirectUri = `${req.nextUrl.origin}/api/dev-auth/line`;

  if (!channelId || !channelSecret) {
    return NextResponse.json({ error: "LINE Login 未設定" }, { status: 500 });
  }

  const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: channelId,
      client_secret: channelSecret,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL("/?devAuth=failed", req.url));
  }

  const tokenData = (await tokenRes.json()) as { access_token?: string };
  if (!tokenData.access_token) {
    return NextResponse.redirect(new URL("/?devAuth=failed", req.url));
  }

  const profileRes = await fetch("https://api.line.me/v2/profile", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!profileRes.ok) {
    return NextResponse.redirect(new URL("/?devAuth=failed", req.url));
  }

  const profile = (await profileRes.json()) as { userId?: string };

  if (!isAllowedDevUser(profile.userId)) {
    return NextResponse.redirect(new URL("/?devAuth=denied", req.url));
  }

  const response = NextResponse.redirect(new URL("/?devAuth=ok", req.url));
  response.cookies.set(DEV_AUTH_COOKIE_NAME, createDevAuthCookie(profile.userId || ""), {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  response.cookies.set("dev_auth_state", "", { path: "/", maxAge: 0 });
  return response;
}
