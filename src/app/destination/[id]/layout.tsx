import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = 'https://gary-travel-site.vercel.app';

type LayoutProps = {
  children: React.ReactNode;
  params: { id: string };
};

async function getDestinationSeoData(id: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return null;

  const supabase = createClient(supabaseUrl, supabaseKey);
  const [{ data: destination }, { data: trips }] = await Promise.all([
    supabase
      .from('destinations')
      .select('title, subtitle, image_url, regions (title)')
      .eq('id', id)
      .single(),
    supabase
      .from('trips')
      .select('id, title, price_range')
      .eq('destination_id', id)
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .limit(30),
  ]);

  return { destination, trips: trips || [] };
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) return {};

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data } = await supabase
      .from('destinations')
      .select('title, subtitle, image_url, regions(title)')
      .eq('id', params.id)
      .single();

    if (!data) return {};

    const region = (data.regions as any)?.title || '';
    const title = `${data.title} ${region}行程`;
    const description = data.subtitle || `${data.title}旅遊行程推薦，旅遊規劃師蓋瑞 GARY 為您量身打造。`;
    const ogImage = `${BASE_URL}/api/og?title=${encodeURIComponent(data.title)}&subtitle=${encodeURIComponent(data.subtitle || region)}`;

    return {
      title,
      description,
      alternates: {
        canonical: `${BASE_URL}/destination/${params.id}`,
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

export default async function DestinationLayout({ children, params }: LayoutProps) {
  const seo = await getDestinationSeoData(params.id).catch(() => null);
  const destination = seo?.destination;
  const trips = seo?.trips || [];
  const regionTitle = (destination?.regions as { title?: string } | null)?.title || '';

  const jsonLd = destination
    ? {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: `${destination.title} ${regionTitle}行程`,
        description: destination.subtitle || `${destination.title}旅遊行程推薦`,
        ...(destination.image_url ? { image: destination.image_url } : {}),
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: trips.map((t, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: t.title,
            url: `${BASE_URL}/trip/${t.id}`,
          })),
        },
      }
    : null;

  // 麵包屑：首頁 → 目的地，讓 Google 搜尋結果能顯示路徑列
  const breadcrumbLd = destination
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '首頁', item: BASE_URL },
          { '@type': 'ListItem', position: 2, name: `${destination.title} ${regionTitle}行程`, item: `${BASE_URL}/destination/${params.id}` },
        ],
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {breadcrumbLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
        />
      )}
      {/*
        同行程頁的做法：頁面本體是 client component，資料要等瀏覽器抓完才畫出來，
        Google 第一次讀取原始碼時看不到。這裡在伺服器端先把目的地名稱、簡介，以及
        底下所有行程標題（含價格）寫進 HTML，視覺上用 sr-only 隱藏，但搜尋引擎讀得到，
        內容跟使用者最終看到的一致。
      */}
      {destination && (
        <div className="sr-only">
          <h1>{destination.title} {regionTitle}行程</h1>
          {destination.subtitle && <p>{destination.subtitle}</p>}
          {trips.length > 0 && (
            <ul>
              {trips.map((t) => (
                <li key={t.id}>
                  <a href={`/trip/${t.id}`}>
                    {t.title}
                    {t.price_range ? `（${t.price_range}）` : ''}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {children}
    </>
  );
}
