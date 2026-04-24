import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

// 取得所有啟用的區域和目的地（透過 API route）
export async function getRegionsWithDestinations() {
  const res = await fetch('/api/regions');
  if (!res.ok) {
    throw new Error(`Failed to fetch regions: ${res.status}`);
  }
  return res.json();
}

// 記錄點擊事件（透過 API route，可取得 IP）
export async function trackClick(destinationId: string) {
  try {
    await fetch('/api/track-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination_id: destinationId }),
    });
  } catch {
    // 靜默失敗，不影響使用者體驗
  }
}

// 上傳圖片（透過 API route）
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
