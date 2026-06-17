import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { createAnonClient } from '@/lib/supabase-server';


export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rateLimited = checkRateLimit(ip, 'inquiries', { windowMs: 60_000, max: 10 });
  if (rateLimited) {
    return NextResponse.json(
      { error: '提交過於頻繁，請稍後再試' },
      { status: 429, headers: { 'Retry-After': String(rateLimited.retryAfterSeconds) } }
    );
  }

  try {
    const body = await request.json();
    const { trip_id, trip_title, customer_name, customer_phone, customer_email, message, source } = body;

    if (!customer_name || typeof customer_name !== 'string' || customer_name.trim().length === 0) {
      return NextResponse.json({ error: '請填寫姓名' }, { status: 400 });
    }
    if (customer_name.trim().length > 50) {
      return NextResponse.json({ error: '姓名長度不得超過 50 字' }, { status: 400 });
    }

    if (!trip_title || typeof trip_title !== 'string') {
      return NextResponse.json({ error: '缺少行程資訊' }, { status: 400 });
    }

    if (customer_phone && typeof customer_phone === 'string' && customer_phone.trim().length > 20) {
      return NextResponse.json({ error: '電話長度不得超過 20 字' }, { status: 400 });
    }
    if (customer_email && typeof customer_email === 'string' && customer_email.trim().length > 100) {
      return NextResponse.json({ error: '信箱長度不得超過 100 字' }, { status: 400 });
    }
    if (message && typeof message === 'string' && message.trim().length > 1000) {
      return NextResponse.json({ error: '留言長度不得超過 1000 字' }, { status: 400 });
    }

    const supabase = createAnonClient();

    const { error } = await supabase
      .from('inquiries')
      .insert({
        trip_id: trip_id || null,
        trip_title: trip_title.trim(),
        customer_name: customer_name.trim(),
        customer_phone: customer_phone?.trim() || null,
        customer_email: customer_email?.trim() || null,
        message: message?.trim() || null,
        source: source || 'FORM',
      });

    if (error) {
      console.error('inquiries insert error:', error.message);
      return NextResponse.json({ error: '提交失敗，請稍後再試' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
