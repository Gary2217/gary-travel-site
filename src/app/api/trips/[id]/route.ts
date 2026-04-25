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

    if (data?.document_url) {
      const storagePath = getStoragePathFromPublicUrl(data.document_url);
      if (storagePath) {
        const probe = await supabase.storage.from('images').download(storagePath);
        data.document_is_available = !probe.error;
      }
    }

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
