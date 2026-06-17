import { NextRequest, NextResponse } from 'next/server';
import { API_ERRORS, apiError } from '@/lib/api-error';
import { requireDevAuth } from '@/lib/api-auth';
import { validateFileSignature } from '@/lib/file-validation';
import { getStoragePathFromPublicUrl } from '@/lib/storage';
import { createServiceClient, hasServiceRoleConfig } from '@/lib/supabase-server';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const authError = requireDevAuth();
  if (authError) return authError;

  try {
    if (!hasServiceRoleConfig()) {
      return API_ERRORS.missingConfig();
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const oldImageUrl = formData.get('old_image_url') as string | null;

    if (!file) {
      return apiError('缺少檔案', 400);
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: '僅支援 JPG、PNG、WebP' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: '圖片不可超過 5MB' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!validateFileSignature(buffer, file.type)) {
      return NextResponse.json({ error: '檔案內容與類型不符' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const fileExt = (file.name.split('.').pop()?.toLowerCase() || 'jpg').replace(/[^a-z0-9]/g, '');
    const fileName = `flight-${Date.now()}.${fileExt}`;
    const filePath = `flights/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: 'no-cache',
        upsert: true,
      });

    if (uploadError) {
      return API_ERRORS.dbError(uploadError);
    }

    const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filePath);
    const versionedUrl = `${publicUrl}?v=${Date.now()}`;

    // 刪除舊圖
    if (oldImageUrl) {
      const oldPath = getStoragePathFromPublicUrl(oldImageUrl);
      if (oldPath && oldPath !== filePath) {
        await supabase.storage.from('images').remove([oldPath]);
      }
    }

    return NextResponse.json({ url: versionedUrl });
  } catch (err) {
    return API_ERRORS.internal(err);
  }
}
