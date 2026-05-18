import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireDevAuth } from '@/lib/api-auth';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// POST - 提交聯絡表單
export async function POST(request: NextRequest) {
  // Rate limit：每 IP 每分鐘最多 5 次提交
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rateLimited = checkRateLimit(ip, 'contact-forms', { windowMs: 60_000, max: 5 });
  if (rateLimited) {
    return NextResponse.json(
      { error: '提交過於頻繁，請稍後再試' },
      { status: 429, headers: { 'Retry-After': String(rateLimited.retryAfterSeconds) } }
    );
  }

  try {
    const body = await request.json();
    const { name, phone, line_id, email, message } = body;

    // 驗證：暱稱必填 + 長度限制
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: '請填寫姓名或暱稱' }, { status: 400 });
    }
    if (name.trim().length > 50) {
      return NextResponse.json({ error: '姓名長度不得超過 50 字' }, { status: 400 });
    }

    // 各欄位長度限制
    if (phone && typeof phone === 'string' && phone.trim().length > 20) {
      return NextResponse.json({ error: '電話長度不得超過 20 字' }, { status: 400 });
    }
    if (line_id && typeof line_id === 'string' && line_id.trim().length > 50) {
      return NextResponse.json({ error: 'LINE ID 長度不得超過 50 字' }, { status: 400 });
    }
    if (email && typeof email === 'string' && email.trim().length > 100) {
      return NextResponse.json({ error: '信箱長度不得超過 100 字' }, { status: 400 });
    }
    if (message && typeof message === 'string' && message.trim().length > 1000) {
      return NextResponse.json({ error: '留言長度不得超過 1000 字' }, { status: 400 });
    }

    // 驗證：至少一個聯繫方式
    const hasPhone = phone && typeof phone === 'string' && phone.trim().length > 0;
    const hasLineId = line_id && typeof line_id === 'string' && line_id.trim().length > 0;
    const hasEmail = email && typeof email === 'string' && email.trim().length > 0;

    if (!hasPhone && !hasLineId && !hasEmail) {
      return NextResponse.json({ error: '請至少填寫一個聯繫方式（電話、LINE ID 或信箱）' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { error } = await supabase
      .from('contact_forms')
      .insert({
        name: name.trim(),
        phone: hasPhone ? phone.trim() : null,
        line_id: hasLineId ? line_id.trim() : null,
        email: hasEmail ? email.trim() : null,
        message: message?.trim() || null,
      });

    if (error) {
      console.error('contact-forms insert error:', error.message);
      return NextResponse.json({ error: '提交失敗，請稍後再試' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '提交失敗，請稍後再試' }, { status: 500 });
  }
}

// GET - 讀取聯絡表單記錄（需登入）
export async function GET(request: NextRequest) {
  const authError = requireDevAuth();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const year = searchParams.get('year');
  const month = searchParams.get('month');

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    let query = supabase
      .from('contact_forms')
      .select('*')
      .order('created_at', { ascending: false });

    // 篩選年月
    if (year && month) {
      const monthNum = parseInt(month, 10);
      if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        return NextResponse.json({ error: '無效的月份參數' }, { status: 400 });
      }
      const startDate = `${year}-${String(monthNum).padStart(2, '0')}-01T00:00:00.000Z`;
      const endMonth = monthNum === 12 ? 1 : monthNum + 1;
      const endYear = monthNum === 12 ? parseInt(year, 10) + 1 : parseInt(year, 10);
      const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01T00:00:00.000Z`;
      query = query.gte('created_at', startDate).lt('created_at', endDate);
    } else if (year) {
      const startDate = `${year}-01-01T00:00:00.000Z`;
      const endDate = `${parseInt(year) + 1}-01-01T00:00:00.000Z`;
      query = query.gte('created_at', startDate).lt('created_at', endDate);
    }

    // 分頁保護，預設最多 500 筆
    const rawLimit = Number.parseInt(searchParams.get('limit') || '500', 10);
    const rawOffset = Number.parseInt(searchParams.get('offset') || '0', 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 500) : 500;
    const offset = Number.isFinite(rawOffset) ? Math.max(rawOffset, 0) : 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || [], {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - 刪除單筆聯絡表單記錄（需登入）
export async function DELETE(request: NextRequest) {
  const authError = requireDevAuth();
  if (authError) return authError;

  try {
    const body = await request.json();
    const { id } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: '缺少 id' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: existingForm, error: existingError } = await supabase
      .from('contact_forms')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    if (!existingForm) {
      return NextResponse.json({ error: '找不到指定表單' }, { status: 404 });
    }

    const { error } = await supabase
      .from('contact_forms')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
