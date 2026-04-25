import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const LOGO_DIR = 'site';

export async function GET(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.redirect(new URL('/travel-logo.svg', request.url));
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
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

    return new NextResponse(data, {
      headers: {
        'Content-Type': data.type || 'application/octet-stream',
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return NextResponse.redirect(new URL('/travel-logo.svg', request.url));
  }
}
