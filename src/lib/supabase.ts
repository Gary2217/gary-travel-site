// ---------------------------------------------------------------------------
// 客戶端混合快取（記憶體 + sessionStorage，跨頁面導航保留資料）
// ---------------------------------------------------------------------------
const _cache = new Map<string, { data: unknown; exp: number }>();
const SS_PREFIX = 'sc:'; // sessionStorage key 前綴

function cacheGet<T>(key: string): T | null {
  // 1. 記憶體快取（最快）
  const memEntry = _cache.get(key);
  if (memEntry) {
    if (Date.now() <= memEntry.exp) return memEntry.data as T;
    _cache.delete(key);
  }

  // 2. sessionStorage（跨頁面導航保留）
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const stored = sessionStorage.getItem(SS_PREFIX + key);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as { data: unknown; exp: number };
    if (Date.now() > parsed.exp) {
      sessionStorage.removeItem(SS_PREFIX + key);
      return null;
    }
    // 提升回記憶體快取
    _cache.set(key, parsed);
    return parsed.data as T;
  } catch {
    return null;
  }
}

function cacheSet(key: string, data: unknown, ttlMs: number) {
  const entry = { data, exp: Date.now() + ttlMs };
  _cache.set(key, entry);

  // 同步寫入 sessionStorage
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(SS_PREFIX + key, JSON.stringify(entry));
  } catch {
    // 容量超限時清除舊條目後重試
    try {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const k = sessionStorage.key(i);
        if (k?.startsWith(SS_PREFIX)) sessionStorage.removeItem(k);
      }
      sessionStorage.setItem(SS_PREFIX + key, JSON.stringify(entry));
    } catch { /* 放棄，不影響功能 */ }
  }
}

/** 清除指定前綴或全部快取（寫入後呼叫） */
export function invalidateCache(prefix?: string) {
  if (!prefix) {
    _cache.clear();
    if (typeof sessionStorage !== 'undefined') {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const k = sessionStorage.key(i);
        if (k?.startsWith(SS_PREFIX)) sessionStorage.removeItem(k);
      }
    }
    return;
  }
  for (const key of _cache.keys()) {
    if (key.startsWith(prefix)) _cache.delete(key);
  }
  if (typeof sessionStorage !== 'undefined') {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const k = sessionStorage.key(i);
      if (k?.startsWith(SS_PREFIX + prefix)) sessionStorage.removeItem(k);
    }
  }
}

// 社群連結常數
const lineId = process.env.NEXT_PUBLIC_LINE_ID || "@YOUR_LINE_ID";
export const lineHref = process.env.NEXT_PUBLIC_LINE_FRIEND_URL || `https://line.me/ti/p/${lineId}`;
export const fbHref = process.env.NEXT_PUBLIC_FB_URL || "#";
export const igHref = process.env.NEXT_PUBLIC_IG_URL || "#";
// 私訊直達連結
export const lineDmHref = lineHref;
const _fbUrl = process.env.NEXT_PUBLIC_FB_URL || "";
const _fbPageId = _fbUrl.includes("id=") ? _fbUrl.split("id=").pop() || "" : "";
export const fbDmHref = _fbPageId ? `https://m.me/${_fbPageId}` : fbHref;
const _igUrl = process.env.NEXT_PUBLIC_IG_URL || "";
const _igUsername = _igUrl.replace(/https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "");
export const igDmHref = _igUsername ? `https://www.instagram.com/${_igUsername}/` : igHref;
// FB 社團連結
export const fbGroupHref = process.env.NEXT_PUBLIC_FB_GROUP_URL || "#";

// LINE 帶預填訊息的連結（開啟聊天框並自動填入文字）
export function lineMessageHref(message: string) {
  return `https://line.me/R/oaMessage/${encodeURIComponent(lineId)}/?${encodeURIComponent(message)}`;
}

// 資料型別定義
export type Destination = {
  id: string;
  region_id: string;
  title: string;
  subtitle: string;
  image_url: string;
  source_url?: string | null;
  display_order: number;
  is_active: boolean;
  click_count: number;
  created_at: string;
  updated_at: string;
};

export type Region = {
  id: string;
  category_label: string;
  title: string;
  description: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  destinations?: Destination[];
};

export type Trip = {
  id: string;
  destination_id: string;
  title: string;
  subtitle: string;
  duration: string;
  price_range: string;
  cover_image_url: string;
  document_url?: string;
  document_is_available?: boolean;
  document_text?: string;
  highlights: string[];
  trip_banner?: TripBanner | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  trip_days?: TripDay[];
  departure_dates?: DepartureDate[];
  destinations?: Destination;
};

export type FlightSegment = {
  date: string;
  airline: string;
  flight_number: string;
  dep_time: string;
  dep_airport: string;
  arr_time: string;
  arr_airport: string;
  next_day: boolean;
};

export type DepartureDate = {
  id: string;
  trip_id: string;
  departure_date: string;
  departure_city: string;
  airline: string | null;
  price: number | null;
  seats_total: number;
  seats_available: number;
  label: string | null;
  // 去程航班（向下相容）
  outbound_flight: string | null;
  outbound_time: string | null;
  outbound_from: string | null;
  outbound_arrival_time: string | null;
  outbound_to: string | null;
  outbound_next_day: boolean;
  // 回程航班（向下相容）
  return_date: string | null;
  return_flight: string | null;
  return_time: string | null;
  return_from: string | null;
  return_arrival_time: string | null;
  return_to: string | null;
  return_next_day: boolean;
  // 多航段（含轉機）
  flight_segments: FlightSegment[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type TripDay = {
  id: string;
  trip_id: string;
  day_number: number;
  title: string;
  description: string;
  meals: string;
  accommodation: string;
  activities: string[];
  created_at: string;
};

export type TripBanner = {
  code_label: string;
  price_label: string;
  tags: string[];
  departure_label: string;
  duration_label: string;
  seats_total: number | null;
  seats_available: number | null;
  deposit_label: string;
  side_image_url?: string;
  departure_info_map?: Record<string, DepartureBannerInfo>;
  custom_tour?: boolean;
  promo_enabled?: boolean;
  promo_content?: string;
  min_group_size?: number | null;
  sub_area?: string;
  airline?: string;
};

export type DepartureBannerInfo = {
  group_code: string;
  price_detail: string;
  waitlist_count?: number | null;
};

export type FlightRoute = {
  id: string;
  region: string;
  from_city: string;
  to_city: string;
  airlines: string;
  duration: string;
  price_range: string;
  image_url: string;
  direct: boolean;
  display_order: number;
  is_active: boolean;
  metadata: Record<string, string>;
  created_at: string;
  updated_at: string;
  flight_departure_dates?: FlightDepartureDate[];
};

export type FlightDepartureDate = {
  id: string;
  flight_route_id: string;
  departure_date: string;
  airline: string | null;
  price: number | null;
  seats_total: number;
  seats_available: number;
  label: string | null;
  transfer_type: string | null;
  flight_segments: FlightSegment[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Inquiry = {
  id: string;
  trip_id: string;
  trip_title: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  message: string;
  source: 'LINE' | 'IG' | 'FB' | 'FORM';
  status: 'pending' | 'contacted' | 'completed';
  created_at: string;
  updated_at: string;
};

// 取得所有啟用的區域和目的地
export async function getRegionsWithDestinations() {
  const KEY = 'regions';
  const hit = cacheGet(KEY);
  if (hit) return hit;

  const res = await fetch('/api/regions');
  if (!res.ok) throw new Error(`Failed to fetch regions: ${res.status}`);
  const data = await res.json();
  cacheSet(KEY, data, 10 * 60_000); // 10 min（區域資料變動少）
  return data;
}

// 取得單一目的地資訊
export async function getDestination(destinationId: string) {
  const KEY = `dest:${destinationId}`;
  const hit = cacheGet(KEY);
  if (hit) return hit;

  const res = await fetch(`/api/destinations/${destinationId}`);
  if (!res.ok) throw new Error(`Failed to fetch destination: ${res.status}`);
  const data = await res.json();
  cacheSet(KEY, data, 10 * 60_000); // 10 min（目的地資料變動少）
  return data;
}

// 取得目的地的所有行程
export async function getDestinationTrips(destinationId: string) {
  const KEY = `dest-trips:${destinationId}`;
  const hit = cacheGet(KEY);
  if (hit) return hit;

  const res = await fetch(`/api/destinations/${destinationId}/trips`);
  if (!res.ok) throw new Error(`Failed to fetch trips: ${res.status}`);
  const data = await res.json();
  cacheSet(KEY, data, 5 * 60_000); // 5 min
  return data;
}

// 依日期搜尋行程
export async function searchTripsByDate(date: string, city?: string) {
  const qs = new URLSearchParams({ date });
  if (city) qs.set('city', city);
  const KEY = `search:${qs.toString()}`;
  const hit = cacheGet(KEY);
  if (hit) return hit;

  const res = await fetch(`/api/search-trips?${qs.toString()}`);
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  const data = await res.json();
  cacheSet(KEY, data, 60_000); // 1 min
  return data;
}

// 取得單一行程（含每日明細）
export async function getTripWithDays(tripId: string) {
  const KEY = `trip:${tripId}`;
  const hit = cacheGet(KEY);
  if (hit) return hit;

  const res = await fetch(`/api/trips/${tripId}`);
  if (!res.ok) throw new Error(`Failed to fetch trip: ${res.status}`);
  const data = await res.json();
  cacheSet(KEY, data, 5 * 60_000); // 5 min
  return data;
}

// 提交諮詢
export async function submitInquiry(data: {
  trip_id?: string;
  trip_title: string;
  customer_name: string;
  customer_phone?: string;
  customer_email?: string;
  message?: string;
  source: string;
}) {
  const res = await fetch('/api/inquiries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error('提交失敗，請稍後再試');
  }
  return res.json();
}

// 取得同地區 + 同類別相關行程（目的地無行程時使用）
export async function getRelatedTrips(
  regionId: string,
  categoryLabel: string,
  excludeDestinationId: string
): Promise<{ regionTrips: Trip[]; categoryTrips: Trip[] }> {
  const qs = new URLSearchParams({
    category_label: categoryLabel,
    exclude_destination_id: excludeDestinationId,
  });
  const KEY = `related:${regionId}:${qs}`;
  const hit = cacheGet<{ regionTrips: Trip[]; categoryTrips: Trip[] }>(KEY);
  if (hit) return hit;

  const res = await fetch(`/api/regions/${regionId}/related-trips?${qs}`);
  if (!res.ok) throw new Error('Failed to fetch related trips');
  const data = await res.json();
  cacheSet(KEY, data, 3 * 60_000); // 3 min
  return data;
}

// 記錄點擊事件（使用 sendBeacon 避免阻塞頁面跳轉）
export function trackClick(destinationId: string) {
  try {
    const data = JSON.stringify({ destination_id: destinationId });
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon('/api/track-click', new Blob([data], { type: 'application/json' }));
    } else {
      fetch('/api/track-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: data,
        keepalive: true,
      });
    }
  } catch {
    // 靜默失敗
  }
}

// 上傳目的地圖片
export async function uploadImage(destinationId: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('destination_id', destinationId);

  const res = await fetch('/api/upload-image', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Upload failed');
  }

  const data = await res.json();
  return data.url;
}

// 上傳行程封面圖片
export async function uploadTripImage(tripId: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('trip_id', tripId);

  const res = await fetch('/api/upload-trip-image', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || '上傳失敗');
  }

  const data = await res.json();
  return data.url;
}

export async function uploadTripBannerImage(tripId: string, file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('trip_id', tripId);

  const res = await fetch('/api/upload-trip-banner-image', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || '上傳失敗');
  }

  const data = await res.json();
  return data.url;
}

// 上傳行程檔案（僅限 PDF）— 直傳 Supabase，不經過 Vercel，無大小限制
export async function uploadTripDocument(tripId: string, file: File): Promise<{ url: string; document_is_available: boolean }> {
  // 前端檢查：僅接受 PDF
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext !== 'pdf') {
    throw new Error('僅支援 PDF 檔案格式，請先將檔案轉換為 PDF 後再上傳');
  }

  // Step 1: 取得 signed upload URL
  const urlRes = await fetch('/api/upload-trip-document', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trip_id: tripId, file_name: file.name }),
  });

  if (!urlRes.ok) {
    const err = await urlRes.json();
    throw new Error(err.error || '無法建立上傳連結');
  }

  const { signedUrl, publicUrl } = await urlRes.json();

  // Step 2: 直接上傳到 Supabase Storage
  const uploadRes = await fetch(signedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/pdf' },
    body: file,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text().catch(() => '');
    console.error('Supabase upload failed:', uploadRes.status, errText);
    throw new Error(`檔案上傳失敗（${uploadRes.status}），請稍後再試`);
  }

  // Step 3: 更新資料庫
  const confirmRes = await fetch('/api/upload-trip-document', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trip_id: tripId, url: publicUrl }),
  });

  if (!confirmRes.ok) {
    const err = await confirmRes.json();
    throw new Error(err.error || '更新資料庫失敗');
  }

  const data = await confirmRes.json();
  return {
    url: data.url,
    document_is_available: Boolean(data.document_is_available),
  };
}

// 刪除行程檔案
export async function deleteTripDocument(tripId: string): Promise<void> {
  const res = await fetch('/api/upload-trip-document', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trip_id: tripId }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || '刪除失敗');
  }
}

// 更新行程欄位（天數、標題等）
export async function updateTrip(tripId: string, fields: Record<string, any>): Promise<Trip> {
  const res = await fetch(`/api/trips/${tripId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || '更新失敗');
  }

  invalidateCache('trip:');
  invalidateCache('dest-trips:');
  invalidateCache('related:');
  invalidateCache('regions');
  invalidateCache('dest:');
  return res.json();
}

// 新增行程
export async function createTrip(destinationId: string, title?: string): Promise<Trip> {
  const res = await fetch('/api/trips', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ destination_id: destinationId, title }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || '新增失敗');
  }

  invalidateCache('dest-trips:');
  invalidateCache('regions');
  return res.json();
}

// 刪除行程
export async function deleteTrip(tripId: string): Promise<void> {
  const res = await fetch(`/api/trips/${tripId}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || '刪除失敗');
  }

  invalidateCache('trip:');
  invalidateCache('dest-trips:');
  invalidateCache('related:');
}

// 複製行程（含 trip_banner、出發日期）
export async function cloneTrip(tripId: string): Promise<Trip> {
  const res = await fetch(`/api/trips/${tripId}/clone`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || '複製失敗');
  }
  invalidateCache('dest-trips:');
  return res.json();
}

export async function getSiteLogo(): Promise<string> {
  const fallback = '/travel-logo.svg';
  const KEY = 'site-logo';

  // 記憶體快取最優先
  const memHit = cacheGet<string>(KEY);
  if (memHit) return memHit;

  // localStorage 次之
  let cached: string | null = null;
  if (typeof window !== 'undefined') {
    try { cached = localStorage.getItem('site_logo_url'); } catch { /* ignore */ }
  }

  try {
    const res = await fetch('/api/site-logo');
    if (!res.ok) {
      if (cached) { cacheSet(KEY, cached, 30 * 60_000); return cached; }
      throw new Error('Failed to fetch site logo');
    }

    const data = await res.json();
    const url = data.url || fallback;
    cacheSet(KEY, url, 30 * 60_000); // 30 min

    if (typeof window !== 'undefined') {
      try { localStorage.setItem('site_logo_url', url); } catch { /* ignore */ }
    }

    return url;
  } catch {
    if (cached) { cacheSet(KEY, cached, 30 * 60_000); return cached; }
    return fallback;
  }
}

export async function uploadSiteLogo(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/site-logo', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || '上傳失敗');
  }

  const data = await res.json();
  const url = data.url;

  if (typeof window !== 'undefined' && url) {
    try {
      localStorage.setItem('site_logo_url', url);
    } catch {
      // ignore cache write errors
    }
  }

  return url;
}
