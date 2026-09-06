import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';
import { DOCUMENT_SERVICE_ITEMS } from '@/lib/document-services';
import { MINI_TRANSIT_TICKET_ITEMS } from '@/lib/mini-transit-tickets';

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
      url: `${BASE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/document-services`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    ...DOCUMENT_SERVICE_ITEMS.map((item) => ({
      url: `${BASE_URL}/document-services/${item.id}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
    {
      url: `${BASE_URL}/mini-transit-tickets`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    ...MINI_TRANSIT_TICKET_ITEMS.map((item) => ({
      url: `${BASE_URL}/mini-transit-tickets/${item.id}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
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
