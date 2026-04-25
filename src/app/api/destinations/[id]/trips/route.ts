import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getStoragePathFromPublicUrl(publicUrl: string) {
  try {
    const url = new URL(publicUrl);
    const prefix = '/storage/v1/object/public/images/';
    if (!url.pathname.startsWith(prefix)) return null;
    return url.pathname.slice(prefix.length) || null;
  } catch {
    return null;
  }
}

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

    const trips = await Promise.all((data || []).map(async (trip: any) => {
      const storagePath = trip.document_url ? getStoragePathFromPublicUrl(trip.document_url) : null;
      let document_is_available = false;

      if (storagePath) {
        const probe = await supabase.storage.from('images').download(storagePath);
        document_is_available = !probe.error;
      }

      return { ...trip, document_is_available };
    }));

    return NextResponse.json(trips, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
