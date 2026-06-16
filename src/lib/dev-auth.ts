import crypto from "crypto";

const COOKIE_NAME = "dev_auth";

function getSecret(): string | null {
  // 只用伺服器端 secret，禁止 fallback 到 NEXT_PUBLIC_*（會進前端 bundle）
  return process.env.DEV_AUTH_SECRET || null;
}

export function signDevAuth(payload: string): string | null {
  const secret = getSecret();
  if (!secret) return null;
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function createDevAuthCookie(userId: string): string | null {
  const timestamp = Date.now().toString();
  const payload = `${userId}.${timestamp}`;
  const signature = signDevAuth(payload);
  if (!signature) return null;
  return `${payload}.${signature}`;
}

export function verifyDevAuthCookie(cookieValue?: string | null) {
  if (!cookieValue) return false;

  const parts = cookieValue.split(".");
  if (parts.length !== 3) return false;

  const [userId, timestamp, signature] = parts;

  // 長度不一致時直接拒絕（避免 timingSafeEqual throw）
  const payload = `${userId}.${timestamp}`;
  const expected = signDevAuth(payload);
  if (!expected) return false;

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return false;

  if (!crypto.timingSafeEqual(sigBuf, expBuf)) {
    return false;
  }

  // 二次驗證：userId 必須在白名單內
  if (!isAllowedDevUser(userId)) return false;

  const ageMs = Date.now() - Number(timestamp);
  const maxAgeMs = 1000 * 60 * 60 * 24 * 7; // 7天

  return Number.isFinite(ageMs) && ageMs >= 0 && ageMs <= maxAgeMs;
}

export function isAllowedDevUser(userId?: string | null) {
  const allowedUserId = process.env.DEV_LINE_USER_ID;
  return Boolean(userId && allowedUserId && userId === allowedUserId);
}

export const DEV_AUTH_COOKIE_NAME = COOKIE_NAME;
