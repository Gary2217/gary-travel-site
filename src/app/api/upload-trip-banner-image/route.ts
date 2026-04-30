import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;

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

    return url.pathname.slice(prefix.length) || null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ error: 'Missing server upload configuration.' }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const tripId = formData.get('trip_id') as string | null;

    if (!file || !tripId) {
      return NextResponse.json({ error: 'Missing file or trip_id' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Allowed: JPG, PNG, WebP' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large. Max 5MB' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: existingTrip, error: tripError } = await supabase
      .from('trips')
      .select('trip_banner')
      .eq('id', tripId)
      .single();

    if (tripError) {
      return NextResponse.json({ error: tripError.message }, { status: 500 });
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const sanitizedExt = fileExt.replace(/[^a-z0-9]/g, '');
    const fileName = `${tripId}-banner-${Date.now()}.${sanitizedExt}`;
    const filePath = `trip-banners/${fileName}`;
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

    const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filePath);
    const versionedUrl = `${publicUrl}?v=${Date.now()}`;

    const currentBanner = (existingTrip?.trip_banner as Record<string, unknown> | null) || {};
    const updatedBanner = {
      ...currentBanner,
      side_image_url: versionedUrl,
    };

    const { data: updatedTrip, error: updateError } = await supabase
      .from('trips')
      .update({ trip_banner: updatedBanner })
      .eq('id', tripId)
      .select('id, trip_banner, updated_at')
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const oldStoragePath = getStoragePathFromPublicUrl(String(currentBanner.side_image_url || ''));

    if (oldStoragePath && oldStoragePath !== filePath) {
      const { error: removeError } = await supabase.storage.from('images').remove([oldStoragePath]);
      if (removeError) {
        console.error('Failed to remove old trip banner image:', removeError.message);
      }
    }

    return NextResponse.json({
      url: versionedUrl,
      trip: updatedTrip,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
