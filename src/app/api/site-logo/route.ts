import { NextRequest, NextResponse } from 'next/server';
import { API_ERRORS, apiError } from '@/lib/api-error';
import { requireDevAuth } from '@/lib/api-auth';
import { validateFileSignature } from '@/lib/file-validation';
import { r2Delete, r2List, r2PublicUrl, r2Upload } from '@/lib/r2';
import { hasServiceRoleConfig } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;
const LOGO_DIR = 'images/site';

function buildLogoPublicUrl(key: string, version: string) {
  return `${r2PublicUrl(key)}?v=${version}`;
}

export async function GET() {
  try {
    if (!hasServiceRoleConfig()) {
      return NextResponse.json(
        { url: '/travel-logo.svg' },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    const files = await r2List(`${LOGO_DIR}/`);

    if (files.length === 0) {
      return NextResponse.json(
        { url: '/travel-logo.svg' },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    // 依 key 降序排列（檔名含 timestamp），取最新上傳的
    const sorted = [...files].sort((a, b) => b.key.localeCompare(a.key));
    const latestFile = sorted[0];

    // 刪除舊 logo
    const staleKeys = files.filter((f) => f.key !== latestFile.key).map((f) => f.key);
    if (staleKeys.length > 0) {
      try {
        await r2Delete(staleKeys);
      } catch (removeErr) {
        console.error('Failed to remove old site logos:', removeErr);
      }
    }

    return NextResponse.json(
      { url: buildLogoPublicUrl(latestFile.key, (latestFile.lastModified?.getTime() ?? Date.now()).toString()) },
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

    const files = await r2List(`${LOGO_DIR}/`);

    if (files.length > 0) {
      await r2Delete(files.map((f) => f.key));
    }

    return NextResponse.json({ success: true, deleted: files.length });
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

    const fileExt = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
    const filePath = `${LOGO_DIR}/logo-${Date.now()}.${fileExt}`;

    const existingFiles = await r2List(`${LOGO_DIR}/`);

    await r2Upload(filePath, buffer, file.type);

    const staleKeys = existingFiles.map((f) => f.key).filter((key) => key !== filePath);

    if (staleKeys.length > 0) {
      try {
        await r2Delete(staleKeys);
      } catch (removeErr) {
        console.error('Failed to remove old site logos:', removeErr);
      }
    }

    return NextResponse.json({ url: buildLogoPublicUrl(filePath, Date.now().toString()) });
  } catch (err) {
    return API_ERRORS.internal(err);
  }
}
