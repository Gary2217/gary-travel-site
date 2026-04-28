import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = 'https://gary-travel-site.vercel.app';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE_URL}/flights`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
  ];

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return staticPages;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: destinations } = await supabase
      .from('destinations')
      .select('id, updated_at')
      .eq('is_active', true);

    const destinationPages: MetadataRoute.Sitemap = (destinations || []).map((dest) => ({
      url: `${BASE_URL}/destination/${dest.id}`,
      lastModified: new Date(dest.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    return [...staticPages, ...destinationPages];
  } catch {
    return staticPages;
  }
}
