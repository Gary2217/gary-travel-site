import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// POST - 提交聯絡表單
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, line_id, email, message } = body;

    // 驗證：暱稱必填
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: '請填寫姓名或暱稱' }, { status: 400 });
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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - 讀取聯絡表單記錄（開發者模式用）
export async function GET(request: NextRequest) {
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
      const startDate = `${year}-${month.padStart(2, '0')}-01T00:00:00.000Z`;
      const endMonth = parseInt(month) === 12 ? 1 : parseInt(month) + 1;
      const endYear = parseInt(month) === 12 ? parseInt(year) + 1 : parseInt(year);
      const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01T00:00:00.000Z`;
      query = query.gte('created_at', startDate).lt('created_at', endDate);
    } else if (year) {
      const startDate = `${year}-01-01T00:00:00.000Z`;
      const endDate = `${parseInt(year) + 1}-01-01T00:00:00.000Z`;
      query = query.gte('created_at', startDate).lt('created_at', endDate);
    }

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
