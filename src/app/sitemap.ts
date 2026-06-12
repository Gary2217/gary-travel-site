import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = 'https://gary-travel-site.vercel.app';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const [destinationsResult, tripsResult] = await Promise.all([
    supabase
      .from('destinations')
      .select('id, updated_at')
      .eq('is_active', true)
      .order('updated_at', { ascending: false }),
    supabase
      .from('trips')
      .select('id, updated_at')
      .eq('is_active', true)
      .order('updated_at', { ascending: false }),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/flights`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];

  const destinationRoutes: MetadataRoute.Sitemap = (destinationsResult.data ?? []).map((destination) => ({
    url: `${BASE_URL}/destination/${destination.id}`,
    lastModified: destination.updated_at ? new Date(destination.updated_at) : new Date(),
    changeFrequency: 'daily',
    priority: 0.9,
  }));

  const tripRoutes: MetadataRoute.Sitemap = (tripsResult.data ?? []).map((trip) => ({
    url: `${BASE_URL}/trip/${trip.id}`,
    lastModified: trip.updated_at ? new Date(trip.updated_at) : new Date(),
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  return [...staticRoutes, ...destinationRoutes, ...tripRoutes];
}
