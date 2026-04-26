import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
const MAX_SIZE = 5 * 1024 * 1024;
const LOGO_DIR = 'site';

function buildLogoPublicUrl(path: string, version: string) {
  const { data } = createClient(supabaseUrl, supabaseServiceRoleKey).storage.from('images').getPublicUrl(path);
  return `${data.publicUrl}?v=${version}`;
}

export async function GET() {
  noStore();
  try {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ url: '/travel-logo.svg' });
    }

    // 用 anon key 讀取公開 storage 列表
    const supabaseRead = createClient(supabaseUrl, supabaseAnonKey);
    const { data: files, error } = await supabaseRead.storage
      .from('images')
      .list(LOGO_DIR, { limit: 100 });

    if (error || !files || files.length === 0) {
      return NextResponse.json({ url: '/travel-logo.svg' });
    }

    // 依檔名降序排列，取最新上傳的
    const sorted = [...files].filter((f) => f.name).sort((a, b) => b.name.localeCompare(a.name));
    const latestFile = sorted[0];

    if (!latestFile) {
      return NextResponse.json({ url: '/travel-logo.svg' });
    }

    // 刪除舊 logo（用 service role key）
    const stalePaths = files
      .filter((file) => file.name && file.name !== latestFile.name)
      .map((file) => `${LOGO_DIR}/${file.name}`);

    if (stalePaths.length > 0) {
      const supabaseWrite = createClient(supabaseUrl, supabaseServiceRoleKey);
      const { error: removeError } = await supabaseWrite.storage.from('images').remove(stalePaths);
      if (removeError) {
        console.error('Failed to remove old site logos:', removeError.message);
      }
    }

    return NextResponse.json(
      { url: buildLogoPublicUrl(`${LOGO_DIR}/${latestFile.name}`, latestFile.updated_at || Date.now().toString()) },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch {
    return NextResponse.json({ url: '/travel-logo.svg' });
  }
}

// DELETE: 清除所有舊 logo，重置為預設
export async function DELETE() {
  try {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ error: 'Missing server configuration.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { data: files, error } = await supabase.storage
      .from('images')
      .list(LOGO_DIR, { limit: 100 });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (files && files.length > 0) {
      const paths = files.filter((f) => f.name).map((f) => `${LOGO_DIR}/${f.name}`);
      await supabase.storage.from('images').remove(paths);
    }

    return NextResponse.json({ success: true, deleted: files?.length ?? 0 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
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

    return NextResponse.json({ url: buildLogoPublicUrl(filePath, Date.now().toString()) });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
