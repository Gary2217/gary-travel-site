import crypto from "crypto";

const COOKIE_NAME = "dev_auth";

function getSecret() {
  return process.env.DEV_AUTH_SECRET || process.env.NEXT_PUBLIC_DEV_PASSWORD || "dev-auth-fallback-secret";
}

export function signDevAuth(payload: string) {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function createDevAuthCookie(userId: string) {
  const timestamp = Date.now().toString();
  const payload = `${userId}.${timestamp}`;
  const signature = signDevAuth(payload);
  return `${payload}.${signature}`;
}

export function verifyDevAuthCookie(cookieValue?: string | null) {
  if (!cookieValue) return false;

  const parts = cookieValue.split(".");
  if (parts.length !== 3) return false;

  const [userId, timestamp, signature] = parts;
  const payload = `${userId}.${timestamp}`;
  const expected = signDevAuth(payload);

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
