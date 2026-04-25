import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await supabase
      .from('trips')
      .select(`
        *,
        destinations (*),
        trip_days (*)
      `)
      .eq('id', params.id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (data?.trip_days) {
      data.trip_days.sort((a: any, b: any) => a.day_number - b.day_number);
    }

    data.document_is_available = Boolean(data.document_url);

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
