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

async function getBannerUrls(supabase: ReturnType<typeof createServiceClient>): Promise<string[]> {
  const { data } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', SETTINGS_KEY)
    .single();
  return Array.isArray(data?.value) ? (data.value as string[]) : [];
}

async function saveBannerUrls(supabase: ReturnType<typeof createServiceClient>, urls: string[]) {
  await supabase.from('site_settings').upsert({
    key: SETTINGS_KEY,
    value: urls,
    updated_at: new Date().toISOString(),
  });
}

// GET: 取得所有 banner
export async function GET() {
  try {
    const supabase = createAnonClientNoCache();
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .single();
    const urls = Array.isArray(data?.value) ? (data.value as string[]) : [];
    return NextResponse.json(urls, {
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

    const existing = await getBannerUrls(supabase);
    await saveBannerUrls(supabase, [...existing, url]);

    return NextResponse.json({ url, banners: [...existing, url] });
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
    const existing = await getBannerUrls(supabase);
    const updated = existing.filter((u) => u !== url);
    await saveBannerUrls(supabase, updated);

    // 從 Storage 刪除檔案
    try {
      const match = url.match(/\/images\/([^?]+)/);
      if (match) await supabase.storage.from('images').remove([match[1]]);
    } catch { /* 靜默失敗 */ }

    return NextResponse.json({ success: true, banners: updated });
  } catch (err) {
    return API_ERRORS.internal(err);
  }
}

// PATCH: 重新排序 banners（body: { urls: string[] }）
export async function PATCH(request: NextRequest) {
  const authError = requireDevAuth();
  if (authError) return authError;

  try {
    if (!hasServiceRoleConfig()) return API_ERRORS.missingConfig();

    const { urls } = await request.json();
    if (!Array.isArray(urls)) return apiError('缺少 urls', 400);

    const supabase = createServiceClient();
    await saveBannerUrls(supabase, urls);

    return NextResponse.json({ success: true, banners: urls });
  } catch (err) {
    return API_ERRORS.internal(err);
  }
}
