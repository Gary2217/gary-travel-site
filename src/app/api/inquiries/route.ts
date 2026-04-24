import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trip_id, trip_title, customer_name, customer_phone, customer_email, message, source } = body;

    if (!customer_name || typeof customer_name !== 'string' || customer_name.trim().length === 0) {
      return NextResponse.json({ error: '請填寫姓名' }, { status: 400 });
    }

    if (!trip_title || typeof trip_title !== 'string') {
      return NextResponse.json({ error: '缺少行程資訊' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
