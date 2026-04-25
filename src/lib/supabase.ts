// 社群連結常數
const lineId = process.env.NEXT_PUBLIC_LINE_ID || "@YOUR_LINE_ID";
export const lineHref = `https://line.me/ti/p/${lineId.replace("@", "")}`;
export const fbHref = process.env.NEXT_PUBLIC_FB_URL || "#";
export const igHref = process.env.NEXT_PUBLIC_IG_URL || "#";
export const flightHref = process.env.NEXT_PUBLIC_FLIGHT_URL || lineHref;

// 資料型別定義
export type Destination = {
  id: string;
  region_id: string;
  title: string;
  subtitle: string;
  image_url: string;
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
  highlights: string[];
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  trip_days?: TripDay[];
  destinations?: Destination;
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
  const res = await fetch('/api/regions', {
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch regions: ${res.status}`);
  }
  return res.json();
}

// 取得單一目的地資訊
export async function getDestination(destinationId: string) {
  const res = await fetch(`/api/destinations/${destinationId}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch destination: ${res.status}`);
  }
  return res.json();
}

// 取得目的地的所有行程
export async function getDestinationTrips(destinationId: string) {
  const res = await fetch(`/api/destinations/${destinationId}/trips`);
  if (!res.ok) {
    throw new Error(`Failed to fetch trips: ${res.status}`);
  }
  return res.json();
}

// 取得單一行程（含每日明細）
export async function getTripWithDays(tripId: string) {
  const res = await fetch(`/api/trips/${tripId}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch trip: ${res.status}`);
  }
  return res.json();
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

// 上傳行程檔案（PDF、DOC 等）— 直傳 Supabase，不經過 Vercel，無大小限制
export async function uploadTripDocument(tripId: string, file: File): Promise<{ url: string; document_is_available: boolean }> {
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
    headers: { 'Content-Type': file.type },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error('檔案上傳失敗，請稍後再試');
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

export async function getSiteLogo(): Promise<string> {
  const res = await fetch('/api/site-logo', { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Failed to fetch site logo');
  }

  const data = await res.json();
  return data.url || '/travel-logo.svg';
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
  return data.url;
}
