import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireDevAuth } from '@/lib/api-auth';
import { getStoragePathFromPublicUrl } from '@/lib/storage';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Missing server configuration.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        fetch: (url: RequestInfo | URL, options?: RequestInit) =>
          fetch(url, { ...options, cache: 'no-store' }),
      },
    });

    const { data, error } = await supabase
      .from('destinations')
      .select('*, regions(*)')
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('destination query error:', error.message);
      return NextResponse.json({ error: '找不到目的地' }, { status: 404 });
    }

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = requireDevAuth();
  if (authError) return authError;

  try {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ error: 'Missing server configuration.' }, { status: 500 });
    }

    const body = await request.json();
    const updates: { title?: string; subtitle?: string; source_url?: string | null } = {};

    if (typeof body.title === 'string') {
      const title = body.title.trim();
      if (!title) {
        return NextResponse.json({ error: '標題不可為空白' }, { status: 400 });
      }
      updates.title = title;
    }

    if (typeof body.subtitle === 'string') {
      updates.subtitle = body.subtitle.trim();
    }

    if (body.source_url === null || typeof body.source_url === 'string') {
      updates.source_url = body.source_url ? body.source_url.trim() : null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: '沒有可更新的欄位' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { data, error } = await supabase
      .from('destinations')
      .update(updates)
      .eq('id', params.id)
      .select('id,title,subtitle,image_url,source_url,updated_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = requireDevAuth();
  if (authError) return authError;

  try {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ error: 'Missing server configuration.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: destination, error: destinationError } = await supabase
      .from('destinations')
      .select('id, image_url')
      .eq('id', params.id)
      .single();

    if (destinationError || !destination) {
      return NextResponse.json({ error: '找不到目的地' }, { status: 404 });
    }

    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select('id, cover_image_url, document_url, trip_banner')
      .eq('destination_id', params.id);

    if (tripsError) {
      return NextResponse.json({ error: tripsError.message }, { status: 500 });
    }

    const tripIds = (trips || []).map((trip) => trip.id);

    const storagePaths = new Set<string>();
    const destinationImagePath = getStoragePathFromPublicUrl(destination.image_url || '');
    if (destinationImagePath) {
      storagePaths.add(destinationImagePath);
    }

    for (const trip of trips || []) {
      const coverPath = getStoragePathFromPublicUrl(trip.cover_image_url || '');
      if (coverPath) {
        storagePaths.add(coverPath);
      }

      const documentPath = getStoragePathFromPublicUrl(trip.document_url || '');
      if (documentPath) {
        storagePaths.add(documentPath);
      }

      const banner = trip.trip_banner as Record<string, unknown> | null;
      const sideImagePath = getStoragePathFromPublicUrl(String(banner?.side_image_url || ''));
      if (sideImagePath) {
        storagePaths.add(sideImagePath);
      }
    }

    if (tripIds.length > 0) {
      const { data: sideMedia, error: sideMediaError } = await supabase
        .from('trip_side_media')
        .select('url, media_type')
        .in('trip_id', tripIds)
        .eq('media_type', 'image');

      if (sideMediaError) {
        return NextResponse.json({ error: sideMediaError.message }, { status: 500 });
      }

      for (const media of sideMedia || []) {
        const mediaPath = getStoragePathFromPublicUrl(media.url || '');
        if (mediaPath) {
          storagePaths.add(mediaPath);
        }
      }
    }

    if (tripIds.length > 0) {
      await Promise.all([
        supabase.from('trip_days').delete().in('trip_id', tripIds),
        supabase.from('trip_departure_dates').delete().in('trip_id', tripIds),
        supabase.from('trip_side_media').delete().in('trip_id', tripIds),
      ]);

      const { error: deleteTripsError } = await supabase
        .from('trips')
        .delete()
        .eq('destination_id', params.id);

      if (deleteTripsError) {
        return NextResponse.json({ error: deleteTripsError.message }, { status: 500 });
      }
    }

    const { error: deleteDestinationError } = await supabase
      .from('destinations')
      .delete()
      .eq('id', params.id);

    if (deleteDestinationError) {
      return NextResponse.json({ error: deleteDestinationError.message }, { status: 500 });
    }

    if (storagePaths.size > 0) {
      const { error: removeError } = await supabase.storage
        .from('images')
        .remove([...storagePaths]);

      if (removeError) {
        console.error('Failed to remove destination-related storage files:', removeError.message);
      }
    }

    return NextResponse.json({ success: true, deleted_trip_count: tripIds.length });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
