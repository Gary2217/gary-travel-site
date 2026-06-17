import { NextRequest, NextResponse } from 'next/server';
import { API_ERRORS, apiError } from '@/lib/api-error';
import { requireDevAuth } from '@/lib/api-auth';
import { validateFileSignature } from '@/lib/file-validation';
import { getStoragePathFromPublicUrl } from '@/lib/storage';
import { createServiceClient, hasServiceRoleConfig } from '@/lib/supabase-server';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  const authError = requireDevAuth();
  if (authError) return authError;

  try {
    if (!hasServiceRoleConfig()) {
      return API_ERRORS.missingConfig();
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const destinationId = formData.get('destination_id') as string | null;

    if (!file || !destinationId) {
      return apiError('缺少 file 或 destination_id', 400);
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return apiError('不支援的檔案類型，僅接受 JPG、PNG、WebP', 400);
    }

    if (file.size === 0) {
      return NextResponse.json({ error: '檔案不可為空' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return apiError('檔案過大，最大僅支援 5MB', 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!validateFileSignature(buffer, file.type)) {
      return NextResponse.json({ error: '檔案內容與類型不符' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: existingDestination, error: destinationError } = await supabase
      .from('destinations')
      .select('image_url')
      .eq('id', destinationId)
      .single();

    if (destinationError) {
      return API_ERRORS.dbError(destinationError);
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const sanitizedExt = fileExt.replace(/[^a-z0-9]/g, '');
    const fileName = `${destinationId}-${Date.now()}.${sanitizedExt}`;
    const filePath = `destinations/${fileName}`;

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

    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);

    // 加版本號確保 CDN 每次都視為全新 cache key，避免舊圖快取
    const versionedUrl = `${publicUrl}?v=${Date.now()}`;

    const { data: updatedDestination, error: updateError } = await supabase
      .from('destinations')
      .update({ image_url: versionedUrl })
      .eq('id', destinationId)
      .select('id,image_url,updated_at')
      .single();

    if (updateError) {
      return API_ERRORS.dbError(updateError);
    }

    const oldStoragePath = getStoragePathFromPublicUrl(existingDestination?.image_url || '');

    if (oldStoragePath && oldStoragePath !== filePath) {
      const { error: removeError } = await supabase.storage
        .from('images')
        .remove([oldStoragePath]);

      if (removeError) {
        console.error('Failed to remove old image:', removeError.message);
      }
    }

    return NextResponse.json({
      url: versionedUrl,
      destination: updatedDestination,
    });
  } catch (err) {
    return API_ERRORS.internal(err);
  }
}
