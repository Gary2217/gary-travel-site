import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient, hasServiceRoleConfig } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const LOGO_DIR = 'site';

export async function GET(request: NextRequest) {
  try {
    if (!hasServiceRoleConfig()) {
      return NextResponse.redirect(new URL('/travel-logo.svg', request.url));
    }

    const supabase = createServiceClient();
    const { data: files, error: listError } = await supabase.storage
      .from('images')
      .list(LOGO_DIR, { limit: 100, sortBy: { column: 'name', order: 'desc' } });

    if (listError || !files || files.length === 0) {
      return NextResponse.redirect(new URL('/travel-logo.svg', request.url));
    }

    const latestFile = files.find((file) => file.name);

    if (!latestFile) {
      return NextResponse.redirect(new URL('/travel-logo.svg', request.url));
    }

    const { data, error } = await supabase.storage.from('images').download(`${LOGO_DIR}/${latestFile.name}`);

    if (error || !data) {
      return NextResponse.redirect(new URL('/travel-logo.svg', request.url));
    }

    const SAFE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    const contentType = SAFE_TYPES.includes(data.type) ? data.type : 'application/octet-stream';

    return new NextResponse(data, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'inline',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return NextResponse.redirect(new URL('/travel-logo.svg', request.url));
  }
}
