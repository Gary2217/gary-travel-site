/**
 * 簡易記憶體型 Rate Limiter
 *
 * 限制：Vercel serverless 每次 cold start 會重置 Map，不同 instance 之間不共享。
 * 仍能阻擋同一 warm instance 上的連續暴力攻擊（如表單重複提交、API 掃描）。
 *
 * 目前使用於 4 個 write 端點（contact-forms 5/min、inquiries 10/min、track-click 30/min、analytics 30/min），
 * 對中小流量網站已足夠。若未來需要跨 instance 一致性，可改用 Upstash Redis（@upstash/ratelimit）。
 */

const ipRequestMap = new Map<string, { count: number; resetAt: number }>();

// 定期清理過期記錄（避免記憶體洩漏）
const CLEANUP_INTERVAL = 60_000; // 1 分鐘
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, value] of ipRequestMap) {
    if (now > value.resetAt) {
      ipRequestMap.delete(key);
    }
  }
}

interface RateLimitOptions {
  /** 時間窗口（毫秒） */
  windowMs: number;
  /** 時間窗口內最大請求數 */
  max: number;
}

/**
 * 檢查是否超過頻率限制
 * @returns null 表示通過，否則回傳剩餘等待秒數
 */
export function checkRateLimit(
  ip: string,
  endpoint: string,
  options: RateLimitOptions
): { limited: true; retryAfterSeconds: number } | null {
  cleanup();

  const key = `${ip}:${endpoint}`;
  const now = Date.now();
  const record = ipRequestMap.get(key);

  if (!record || now > record.resetAt) {
    ipRequestMap.set(key, { count: 1, resetAt: now + options.windowMs });
    return null;
  }

  record.count++;

  if (record.count > options.max) {
    const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000);
    return { limited: true, retryAfterSeconds };
  }

  return null;
}
