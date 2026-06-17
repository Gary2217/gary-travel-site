import { NextRequest, NextResponse } from 'next/server';
import { API_ERRORS, apiError } from '@/lib/api-error';
import { requireDevAuth } from '@/lib/api-auth';
import { validateFileSignature } from '@/lib/file-validation';
import { createAnonClient, createServiceClient, hasServiceRoleConfig } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;
const LOGO_DIR = 'site';

function buildLogoPublicUrl(path: string, version: string) {
  const { data } = createServiceClient().storage.from('images').getPublicUrl(path);
  return `${data.publicUrl}?v=${version}`;
}

export async function GET() {
  try {
    if (!hasServiceRoleConfig()) {
      return NextResponse.json(
        { url: '/travel-logo.svg' },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    // 用 anon key 讀取公開 storage 列表
    const supabaseRead = createAnonClient();
    const { data: files, error } = await supabaseRead.storage
      .from('images')
      .list(LOGO_DIR, { limit: 100 });

    if (error || !files || files.length === 0) {
      return NextResponse.json(
        { url: '/travel-logo.svg' },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    // 依檔名降序排列，取最新上傳的
    const sorted = [...files].filter((f) => f.name).sort((a, b) => b.name.localeCompare(a.name));
    const latestFile = sorted[0];

    if (!latestFile) {
      return NextResponse.json(
        { url: '/travel-logo.svg' },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    // 刪除舊 logo（用 service role key）
    const stalePaths = files
      .filter((file) => file.name && file.name !== latestFile.name)
      .map((file) => `${LOGO_DIR}/${file.name}`);

    if (stalePaths.length > 0) {
      const supabaseWrite = createServiceClient();
      const { error: removeError } = await supabaseWrite.storage.from('images').remove(stalePaths);
      if (removeError) {
        console.error('Failed to remove old site logos:', removeError.message);
      }
    }

    return NextResponse.json(
      { url: buildLogoPublicUrl(`${LOGO_DIR}/${latestFile.name}`, latestFile.updated_at || Date.now().toString()) },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' } }
    );
  } catch (err) {
    console.error('[API 500] 站台 Logo 讀取失敗:', err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { url: '/travel-logo.svg' },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  }
}

// DELETE: 清除所有舊 logo，重置為預設（需登入）
export async function DELETE() {
  const authError = requireDevAuth();
  if (authError) return authError;

  try {
    if (!hasServiceRoleConfig()) {
      return API_ERRORS.missingConfig();
    }

    const supabase = createServiceClient();
    const { data: files, error } = await supabase.storage
      .from('images')
      .list(LOGO_DIR, { limit: 100 });

    if (error) {
      return API_ERRORS.dbError(error);
    }

    if (files && files.length > 0) {
      const paths = files.filter((f) => f.name).map((f) => `${LOGO_DIR}/${f.name}`);
      await supabase.storage.from('images').remove(paths);
    }

    return NextResponse.json({ success: true, deleted: files?.length ?? 0 });
  } catch (err) {
    return API_ERRORS.internal(err);
  }
}

export async function POST(request: NextRequest) {
  const authError = requireDevAuth();
  if (authError) return authError;

  try {
    if (!hasServiceRoleConfig()) {
      return API_ERRORS.missingConfig();
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return apiError('缺少檔案', 400);
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: '不支援的檔案類型，僅接受 JPG、PNG、WebP' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return apiError('檔案過大，最大僅支援 5MB', 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!validateFileSignature(buffer, file.type)) {
      return NextResponse.json({ error: '檔案內容與類型不符' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const fileExt = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
    const filePath = `${LOGO_DIR}/logo-${Date.now()}.${fileExt}`;

    const { data: existingFiles, error: listError } = await supabase.storage
      .from('images')
      .list(LOGO_DIR, { limit: 100, sortBy: { column: 'name', order: 'desc' } });

    if (listError) {
      return API_ERRORS.dbError(listError);
    }

    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '0',
        upsert: false,
      });

    if (uploadError) {
      return API_ERRORS.dbError(uploadError);
    }

    const stalePaths = (existingFiles || [])
      .filter((item) => item.name)
      .map((item) => `${LOGO_DIR}/${item.name}`)
      .filter((path) => path !== filePath);

    if (stalePaths.length > 0) {
      const { error: removeError } = await supabase.storage.from('images').remove(stalePaths);
      if (removeError) {
        console.error('Failed to remove old site logos:', removeError.message);
      }
    }

    return NextResponse.json({ url: buildLogoPublicUrl(filePath, Date.now().toString()) });
  } catch (err) {
    return API_ERRORS.internal(err);
  }
}
