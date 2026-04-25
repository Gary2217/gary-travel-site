import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
const MAX_SIZE = 5 * 1024 * 1024;
const LOGO_DIR = 'site';

export async function GET() {
  return NextResponse.json({ url: '/api/site-logo/image' });
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ error: 'Missing server upload configuration.' }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Allowed: JPG, PNG, WebP, SVG' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large. Max 5MB' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileExt = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
    const filePath = `${LOGO_DIR}/logo-${Date.now()}.${fileExt}`;

    const { data: existingFiles, error: listError } = await supabase.storage
      .from('images')
      .list(LOGO_DIR, { limit: 100, sortBy: { column: 'name', order: 'desc' } });

    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '0',
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
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

    return NextResponse.json({ url: `/api/site-logo/image?v=${Date.now()}` });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
