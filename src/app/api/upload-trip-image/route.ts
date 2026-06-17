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
    const tripId = formData.get('trip_id') as string | null;

    if (!file || !tripId) {
      return apiError('缺少 file 或 trip_id', 400);
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return apiError('不支援的檔案類型，僅接受 JPG、PNG、WebP', 400);
    }

    if (file.size > MAX_SIZE) {
      return apiError('檔案過大，最大僅支援 5MB', 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!validateFileSignature(buffer, file.type)) {
      return NextResponse.json({ error: '檔案內容與類型不符' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: existingTrip, error: tripError } = await supabase
      .from('trips')
      .select('cover_image_url')
      .eq('id', tripId)
      .single();

    if (tripError) {
      return API_ERRORS.dbError(tripError);
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const sanitizedExt = fileExt.replace(/[^a-z0-9]/g, '');
    const fileName = `${tripId}-${Date.now()}.${sanitizedExt}`;
    const filePath = `trips/${fileName}`;

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

    const versionedUrl = `${publicUrl}?v=${Date.now()}`;

    const { data: updatedTrip, error: updateError } = await supabase
      .from('trips')
      .update({ cover_image_url: versionedUrl })
      .eq('id', tripId)
      .select('id,cover_image_url,updated_at')
      .single();

    if (updateError) {
      return API_ERRORS.dbError(updateError);
    }

    const oldStoragePath = getStoragePathFromPublicUrl(existingTrip?.cover_image_url || '');

    if (oldStoragePath && oldStoragePath !== filePath) {
      const { error: removeError } = await supabase.storage
        .from('images')
        .remove([oldStoragePath]);

      if (removeError) {
        console.error('Failed to remove old trip image:', removeError.message);
      }
    }

    return NextResponse.json({
      url: versionedUrl,
      trip: updatedTrip,
    });
  } catch (err) {
    return API_ERRORS.internal(err);
  }
}
