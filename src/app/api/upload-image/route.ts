import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

function getStoragePathFromPublicUrl(publicUrl: string) {
  try {
    const currentProjectUrl = new URL(supabaseUrl);
    const url = new URL(publicUrl);

    if (url.origin !== currentProjectUrl.origin) {
      return null;
    }

    const prefix = '/storage/v1/object/public/images/';

    if (!url.pathname.startsWith(prefix)) {
      return null;
    }

    const storagePath = url.pathname.slice(prefix.length);
    return storagePath || null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json(
        { error: 'Missing server upload configuration. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const destinationId = formData.get('destination_id') as string | null;

    if (!file || !destinationId) {
      return NextResponse.json({ error: 'Missing file or destination_id' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Allowed: JPG, PNG, WebP' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large. Max 5MB' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: existingDestination, error: destinationError } = await supabase
      .from('destinations')
      .select('image_url')
      .eq('id', destinationId)
      .single();

    if (destinationError) {
      return NextResponse.json({ error: destinationError.message }, { status: 500 });
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const sanitizedExt = fileExt.replace(/[^a-z0-9]/g, '');
    const fileName = `${destinationId}-${Date.now()}.${sanitizedExt}`;
    const filePath = `destinations/${fileName}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: 'no-cache',
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
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
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (!updatedDestination || updatedDestination.image_url !== versionedUrl) {
      return NextResponse.json({ error: 'Destination image update did not persist.' }, { status: 500 });
    }

    const { data: confirmedDestination, error: confirmError } = await supabase
      .from('destinations')
      .select('id,image_url,updated_at')
      .eq('id', destinationId)
      .single();

    if (confirmError) {
      return NextResponse.json({ error: confirmError.message }, { status: 500 });
    }

    if (!confirmedDestination || confirmedDestination.image_url !== versionedUrl) {
      return NextResponse.json({ error: 'Destination image read-back verification failed.' }, { status: 500 });
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
      destination: confirmedDestination,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
