import { NextRequest, NextResponse } from 'next/server';
import { API_ERRORS, apiError } from '@/lib/api-error';
import { checkRateLimit } from '@/lib/rate-limit';
import { createAnonClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';

  const rateLimited = checkRateLimit(ip, 'track-click', { windowMs: 60_000, max: 30 });
  if (rateLimited) {
    return NextResponse.json({ success: true });
  }

  try {
    const body = await request.json();
    const { destination_id } = body;

    if (!destination_id || typeof destination_id !== 'string') {
      return apiError('缺少 destination_id', 400);
    }

    const supabase = createAnonClient();

    const MAX_HEADER_LEN = 512;
    const userAgent = (request.headers.get('user-agent') || '').slice(0, MAX_HEADER_LEN);
    const referrer = (request.headers.get('referer') || '').slice(0, MAX_HEADER_LEN);

    const { error } = await supabase
      .from('click_analytics')
      .insert({
        destination_id,
        user_agent: userAgent,
        referrer,
        ip_address: ip,
      });

    if (error) {
      return API_ERRORS.dbError(error);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return API_ERRORS.internal(err);
  }
}
