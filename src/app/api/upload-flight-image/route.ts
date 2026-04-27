import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { verifyDevAuthCookie, DEV_AUTH_COOKIE_NAME } from '@/lib/dev-auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;

function extractStoragePath(publicUrl: string): string | null {
  try {
    const projectUrl = new URL(supabaseUrl);
    const url = new URL(publicUrl);
    if (url.origin !== projectUrl.origin) return null;
    const prefix = '/storage/v1/object/public/images/';
    if (!url.pathname.startsWith(prefix)) return null;
    return url.pathname.slice(prefix.length) || null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ error: 'Missing server upload configuration. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' }, { status: 500 });
    }

    const cookieStore = cookies();
    const devCookie = cookieStore.get(DEV_AUTH_COOKIE_NAME)?.value;
    if (!verifyDevAuthCookie(devCookie)) {
      return NextResponse.json({ error: '未授權' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const oldImageUrl = formData.get('old_image_url') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: '僅支援 JPG、PNG、WebP' }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: '圖片不可超過 5MB' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const fileExt = (file.name.split('.').pop()?.toLowerCase() || 'jpg').replace(/[^a-z0-9]/g, '');
    const fileName = `flight-${Date.now()}.${fileExt}`;
    const filePath = `flights/${fileName}`;

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

    // 刪除舊圖
    if (oldImageUrl) {
      const oldPath = extractStoragePath(oldImageUrl);
      if (oldPath && oldPath !== filePath) {
        await supabase.storage.from('images').remove([oldPath]);
      }
    }

    return NextResponse.json({ url: versionedUrl });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
