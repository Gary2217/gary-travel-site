import { NextRequest, NextResponse } from 'next/server';
import { API_ERRORS, apiError } from '@/lib/api-error';
import { requireDevAuth } from '@/lib/api-auth';
import { validateFileSignature } from '@/lib/file-validation';
import { createAnonClientNoCache, createServiceClient, hasServiceRoleConfig } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 8 * 1024 * 1024; // 8MB
const BANNER_DIR = 'banners';
const SETTINGS_KEY = 'home_banners';

interface HomeBanner {
  url: string;
  link: string;
}

async function getBanners(supabase: ReturnType<typeof createServiceClient>): Promise<HomeBanner[]> {
  const { data } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', SETTINGS_KEY)
    .single();
  if (!Array.isArray(data?.value)) return [];
  // 向下相容：舊格式 string[] → 新格式 {url, link}[]
  return (data.value as (string | HomeBanner)[]).map((item) =>
    typeof item === 'string' ? { url: item, link: '' } : item
  );
}

async function saveBanners(supabase: ReturnType<typeof createServiceClient>, banners: HomeBanner[]) {
  await supabase.from('site_settings').upsert({
    key: SETTINGS_KEY,
    value: banners,
    updated_at: new Date().toISOString(),
  });
}

// GET: 取得所有 banner（回傳 {url, link}[]）
export async function GET() {
  try {
    const supabase = createAnonClientNoCache();
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .single();
    if (!Array.isArray(data?.value)) {
      return NextResponse.json([], {
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
      });
    }
    // 向下相容舊格式
    const banners: HomeBanner[] = (data.value as (string | HomeBanner)[]).map((item) =>
      typeof item === 'string' ? { url: item, link: '' } : item
    );
    return NextResponse.json(banners, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (err) {
    return API_ERRORS.internal(err);
  }
}

// POST: 上傳新 banner 圖片
export async function POST(request: NextRequest) {
  const authError = requireDevAuth();
  if (authError) return authError;

  try {
    if (!hasServiceRoleConfig()) return API_ERRORS.missingConfig();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) return apiError('缺少檔案', 400);
    if (!ALLOWED_TYPES.includes(file.type)) return apiError('僅支援 JPG、PNG、WebP', 400);
    if (file.size > MAX_SIZE) return apiError('檔案過大（最大 8MB）', 400);

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!validateFileSignature(buffer, file.type)) return apiError('檔案內容與類型不符', 400);

    const supabase = createServiceClient();
    const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const filePath = `${BANNER_DIR}/banner-${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage.from('images').upload(filePath, buffer, {
      contentType: file.type,
      cacheControl: '0',
      upsert: false,
    });
    if (uploadErr) return API_ERRORS.dbError(uploadErr);

    const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filePath);
    const url = `${publicUrl}?v=${Date.now()}`;
    const link = (formData.get('link') as string) || '';
    const banner: HomeBanner = { url, link };

    const existing = await getBanners(supabase);
    const updated = [...existing, banner];
    await saveBanners(supabase, updated);

    return NextResponse.json({ banner, banners: updated }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    return API_ERRORS.internal(err);
  }
}

// DELETE: 刪除指定 banner（body: { url }）
export async function DELETE(request: NextRequest) {
  const authError = requireDevAuth();
  if (authError) return authError;

  try {
    if (!hasServiceRoleConfig()) return API_ERRORS.missingConfig();

    const { url } = await request.json();
    if (!url) return apiError('缺少 url', 400);

    const supabase = createServiceClient();
    const existing = await getBanners(supabase);
    const updated = existing.filter((b) => b.url !== url);
    await saveBanners(supabase, updated);

    // 從 Storage 刪除檔案
    try {
      const match = url.match(/\/images\/([^?]+)/);
      if (match) await supabase.storage.from('images').remove([match[1]]);
    } catch { /* 靜默失敗 */ }

    return NextResponse.json({ success: true, banners: updated }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    return API_ERRORS.internal(err);
  }
}

// PATCH: 更新 banners（排序/連結）（body: { banners: {url,link}[] }）
export async function PATCH(request: NextRequest) {
  const authError = requireDevAuth();
  if (authError) return authError;

  try {
    if (!hasServiceRoleConfig()) return API_ERRORS.missingConfig();

    const { banners } = await request.json();
    if (!Array.isArray(banners)) return apiError('缺少 banners', 400);

    const supabase = createServiceClient();
    await saveBanners(supabase, banners);

    return NextResponse.json({ success: true, banners }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    return API_ERRORS.internal(err);
  }
}
