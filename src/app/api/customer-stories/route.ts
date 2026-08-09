import { NextRequest, NextResponse } from 'next/server';
import { API_ERRORS, apiError } from '@/lib/api-error';
import { requireDevAuth } from '@/lib/api-auth';
import { validateFileSignature } from '@/lib/file-validation';
import { r2Delete, r2KeyFromUrl, r2PublicUrl, r2Upload } from '@/lib/r2';
import { createAnonClientNoCache, createServiceClient, hasServiceRoleConfig } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 8 * 1024 * 1024; // 8MB
const PHOTO_DIR = 'customer-stories';
const SETTINGS_KEY = 'customer_stories';

interface CustomerStory {
  id: string;
  type: 'photo' | 'video';
  media_url: string; // photo: R2 網址；video: IG 貼文網址
  thumbnail_url?: string; // video 專用：手動上傳的縮圖（R2 網址），IG 無公開縮圖 API 可抓
  caption: string;
  trip_id: string | null;
  created_at: string;
}

async function getStories(supabase: ReturnType<typeof createServiceClient>): Promise<CustomerStory[]> {
  const { data } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', SETTINGS_KEY)
    .single();
  return Array.isArray(data?.value) ? (data.value as CustomerStory[]) : [];
}

async function saveStories(supabase: ReturnType<typeof createServiceClient>, stories: CustomerStory[]) {
  await supabase.from('site_settings').upsert({
    key: SETTINGS_KEY,
    value: stories,
    updated_at: new Date().toISOString(),
  });
}

// GET: 取得所有客戶花絮（公開）
export async function GET() {
  try {
    const supabase = createAnonClientNoCache();
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .single();
    const stories: CustomerStory[] = Array.isArray(data?.value) ? (data.value as CustomerStory[]) : [];
    return NextResponse.json(stories, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (err) {
    return API_ERRORS.internal(err);
  }
}

// POST: 新增一筆花絮（照片上傳 or IG 影片連結）
export async function POST(request: NextRequest) {
  const authError = requireDevAuth();
  if (authError) return authError;

  try {
    if (!hasServiceRoleConfig()) return API_ERRORS.missingConfig();

    const formData = await request.formData();
    const caption = String(formData.get('caption') || '').trim();
    const tripId = (formData.get('trip_id') as string) || null;
    const file = formData.get('file') as File | null;
    const videoUrl = (formData.get('video_url') as string) || '';
    const thumbnailFile = formData.get('thumbnail') as File | null;

    if (!caption) return apiError('請輸入說明文字', 400);

    const supabase = createServiceClient();
    let story: CustomerStory;

    if (file) {
      if (!ALLOWED_TYPES.includes(file.type)) return apiError('僅支援 JPG、PNG、WebP', 400);
      if (file.size > MAX_SIZE) return apiError('檔案過大（最大 8MB）', 400);

      const buffer = Buffer.from(await file.arrayBuffer());
      if (!validateFileSignature(buffer, file.type)) return apiError('檔案內容與類型不符', 400);

      const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const filePath = `images/${PHOTO_DIR}/story-${Date.now()}.${ext}`;
      await r2Upload(filePath, buffer, file.type);

      story = {
        id: crypto.randomUUID(),
        type: 'photo',
        media_url: `${r2PublicUrl(filePath)}?v=${Date.now()}`,
        caption,
        trip_id: tripId,
        created_at: new Date().toISOString(),
      };
    } else if (videoUrl) {
      if (!/^https:\/\/(www\.)?instagram\.com\//.test(videoUrl)) {
        return apiError('影片連結必須是 Instagram 貼文網址', 400);
      }

      let thumbnailUrl: string | undefined;
      if (thumbnailFile) {
        if (!ALLOWED_TYPES.includes(thumbnailFile.type)) return apiError('縮圖僅支援 JPG、PNG、WebP', 400);
        if (thumbnailFile.size > MAX_SIZE) return apiError('縮圖檔案過大（最大 8MB）', 400);

        const buffer = Buffer.from(await thumbnailFile.arrayBuffer());
        if (!validateFileSignature(buffer, thumbnailFile.type)) return apiError('縮圖檔案內容與類型不符', 400);

        const ext = thumbnailFile.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
        const filePath = `images/${PHOTO_DIR}/story-thumb-${Date.now()}.${ext}`;
        await r2Upload(filePath, buffer, thumbnailFile.type);
        thumbnailUrl = `${r2PublicUrl(filePath)}?v=${Date.now()}`;
      }

      story = {
        id: crypto.randomUUID(),
        type: 'video',
        media_url: videoUrl,
        ...(thumbnailUrl ? { thumbnail_url: thumbnailUrl } : {}),
        caption,
        trip_id: tripId,
        created_at: new Date().toISOString(),
      };
    } else {
      return apiError('缺少照片檔案或影片連結', 400);
    }

    const existing = await getStories(supabase);
    const updated = [...existing, story];
    await saveStories(supabase, updated);

    return NextResponse.json({ story, stories: updated }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    return API_ERRORS.internal(err);
  }
}

// DELETE: 刪除指定花絮（body: { id }）
export async function DELETE(request: NextRequest) {
  const authError = requireDevAuth();
  if (authError) return authError;

  try {
    if (!hasServiceRoleConfig()) return API_ERRORS.missingConfig();

    const { id } = await request.json();
    if (!id) return apiError('缺少 id', 400);

    const supabase = createServiceClient();
    const existing = await getStories(supabase);
    const target = existing.find((s) => s.id === id);
    const updated = existing.filter((s) => s.id !== id);
    await saveStories(supabase, updated);

    if (target?.type === 'photo') {
      try {
        const key = r2KeyFromUrl(target.media_url);
        if (key) await r2Delete([key]);
      } catch { /* 靜默失敗 */ }
    }
    if (target?.thumbnail_url) {
      try {
        const key = r2KeyFromUrl(target.thumbnail_url);
        if (key) await r2Delete([key]);
      } catch { /* 靜默失敗 */ }
    }

    return NextResponse.json({ success: true, stories: updated }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    return API_ERRORS.internal(err);
  }
}

// PATCH: 更新花絮（排序/文字/連結行程）（body: { stories: CustomerStory[] }）
export async function PATCH(request: NextRequest) {
  const authError = requireDevAuth();
  if (authError) return authError;

  try {
    if (!hasServiceRoleConfig()) return API_ERRORS.missingConfig();

    const { stories } = await request.json();
    if (!Array.isArray(stories)) return apiError('缺少 stories', 400);

    const supabase = createServiceClient();
    await saveStories(supabase, stories);

    return NextResponse.json({ success: true, stories }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    return API_ERRORS.internal(err);
  }
}
