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
      .select('*')
      .eq('destination_id', params.id)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const trips = (data || []).map((trip: any) => ({
      ...trip,
      document_is_available: Boolean(trip.document_url),
    }));

    return NextResponse.json(trips, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
