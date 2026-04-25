import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const LOGO_PATH = 'site/logo';

export async function GET(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.redirect(new URL('/travel-logo.svg', request.url));
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { data, error } = await supabase.storage.from('images').download(LOGO_PATH);

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
