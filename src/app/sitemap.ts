import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = 'https://gary-travel-site.vercel.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/flights`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/document-services`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/mini-transit-tickets`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
  ];

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return staticPages;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const [destsRes, tripsRes] = await Promise.all([
      supabase.from('destinations').select('id, updated_at').eq('is_active', true),
      supabase.from('trips').select('id, updated_at').eq('is_active', true),
    ]);

    const dynamicPages: MetadataRoute.Sitemap = [];

    (destsRes.data || []).forEach((d) => {
      dynamicPages.push({
        url: `${BASE_URL}/destination/${d.id}`,
        lastModified: d.updated_at ? new Date(d.updated_at) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    });

    (tripsRes.data || []).forEach((t) => {
      dynamicPages.push({
        url: `${BASE_URL}/trip/${t.id}`,
        lastModified: t.updated_at ? new Date(t.updated_at) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    });

    return [...staticPages, ...dynamicPages];
  } catch {
    return staticPages;
  }
}
