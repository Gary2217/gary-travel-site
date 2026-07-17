import { describe, it, expect } from 'vitest';
import { r2KeyFromUrl, r2PublicUrl, R2_PUBLIC_BASE } from './r2';

/**
 * r2KeyFromUrl 決定「刪除行程時要刪掉哪一個 R2 物件」。
 * 解析錯誤 = 刪錯檔案，且無法復原，故在此鎖死其行為。
 */
describe('r2KeyFromUrl', () => {
  it('R2 公開 URL → 去掉開頭斜線的 object key', () => {
    expect(r2KeyFromUrl(`${R2_PUBLIC_BASE}/images/trips/abc.jpg`)).toBe('images/trips/abc.jpg');
    expect(r2KeyFromUrl(`${R2_PUBLIC_BASE}/images/trips/banner/x-banner-123.jpg`)).toBe(
      'images/trips/banner/x-banner-123.jpg',
    );
  });

  it('帶 cache-busting query（?v=...）仍回傳乾淨的 key', () => {
    expect(r2KeyFromUrl(`${R2_PUBLIC_BASE}/images/trips/abc.jpg?v=1778480244874`)).toBe('images/trips/abc.jpg');
  });

  it('非 R2 網域一律回傳 null —— 這是不會誤刪站外檔案的保證', () => {
    expect(r2KeyFromUrl('https://dcimg.travel.net.tw/images/trips/abc.jpg')).toBeNull();
    expect(r2KeyFromUrl('https://xxx.supabase.co/storage/v1/object/public/images/trips/abc.jpg')).toBeNull();
    // 網域前綴相似但不同源，不可誤判
    expect(r2KeyFromUrl('https://pub-3881231e994f4158b5d05c0ec109b3ef.r2.dev.evil.com/images/a.jpg')).toBeNull();
  });

  it('空值與非法 URL 回傳 null，不丟例外', () => {
    expect(r2KeyFromUrl('')).toBeNull();
    expect(r2KeyFromUrl('不是網址')).toBeNull();
    expect(r2KeyFromUrl('/images/trips/abc.jpg')).toBeNull();
  });

  it('只有網域沒有路徑時回傳 null（避免產生空 key）', () => {
    expect(r2KeyFromUrl(R2_PUBLIC_BASE)).toBeNull();
    expect(r2KeyFromUrl(`${R2_PUBLIC_BASE}/`)).toBeNull();
  });

  it('與 r2PublicUrl 互為反向運算', () => {
    const key = 'images/trips/round-trip-test.jpg';
    expect(r2KeyFromUrl(r2PublicUrl(key))).toBe(key);
  });
});
