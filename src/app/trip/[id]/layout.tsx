import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = 'https://gary-travel-site.vercel.app';

type LayoutProps = {
  children: React.ReactNode;
  params: { id: string };
};

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return {};
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data } = await supabase
      .from('trips')
      .select('title, subtitle, price_range')
      .eq('id', params.id)
      .single();

    if (!data) {
      return {};
    }

    const title = data.title;
    const description = data.subtitle || (data.price_range ? `${data.price_range}起，旅遊規劃師蓋瑞 GARY 為您量身打造。` : '旅遊規劃師蓋瑞 GARY 為您量身打造專屬行程。');
    const ogImage = `${BASE_URL}/api/og?title=${encodeURIComponent(title)}&subtitle=${encodeURIComponent(data.subtitle || data.price_range || '')}`;

    return {
      title,
      description,
      alternates: {
        canonical: `${BASE_URL}/trip/${params.id}`,
      },
      openGraph: {
        title,
        description,
        images: [{ url: ogImage, width: 1200, height: 630 }],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImage],
      },
    };
  } catch {
    return {};
  }
}

export default function TripLayout({ children }: LayoutProps) {
  return children;
}
