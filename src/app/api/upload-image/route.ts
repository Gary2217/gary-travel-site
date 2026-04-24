import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);

    const { error: updateError } = await supabase
      .from('destinations')
      .update({ image_url: publicUrl })
      .eq('id', destinationId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
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

    return NextResponse.json({ url: publicUrl });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
