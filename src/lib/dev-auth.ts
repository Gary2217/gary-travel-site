import crypto from "crypto";

const COOKIE_NAME = "dev_auth";

function getSecret(): string | null {
  return process.env.DEV_AUTH_SECRET || process.env.NEXT_PUBLIC_DEV_PASSWORD || null;
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
  const payload = `${userId}.${timestamp}`;
  const expected = signDevAuth(payload);

  // 密鑰未設定時一律拒絕
  if (!expected) return false;

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return false;
  }

  const ageMs = Date.now() - Number(timestamp);
  const maxAgeMs = 1000 * 60 * 60 * 8;

  return Number.isFinite(ageMs) && ageMs >= 0 && ageMs <= maxAgeMs;
}

export function isAllowedDevUser(userId?: string | null) {
  const allowedUserId = process.env.DEV_LINE_USER_ID;
  return Boolean(userId && allowedUserId && userId === allowedUserId);
}

export const DEV_AUTH_COOKIE_NAME = COOKIE_NAME;
