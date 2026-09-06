import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = 'https://gary-travel-site.vercel.app';

type LayoutProps = {
  children: React.ReactNode;
  params: { id: string };
};

async function getTripSeoData(id: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return null;

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data } = await supabase
    .from('trips')
    .select('title, subtitle, price_range, duration, cover_image_url, trip_banner, destinations (id, title)')
    .eq('id', id)
    .single();
  return data;
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  try {
    const data = await getTripSeoData(params.id);
    if (!data) return {};

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

export default async function TripLayout({ children, params }: LayoutProps) {
  const data = await getTripSeoData(params.id).catch(() => null);

  const tags: string[] = Array.isArray(data?.trip_banner?.tags) ? data.trip_banner.tags : [];
  const destination = data?.destinations as { id?: string; title?: string } | null;
  const destinationTitle = destination?.title || '';
  const priceNumber = data?.price_range ? Number(data.price_range.replace(/\D/g, '')) || undefined : undefined;

  const jsonLd = data
    ? {
        '@context': 'https://schema.org',
        '@type': 'TouristTrip',
        name: data.title,
        description: data.subtitle || data.title,
        ...(data.cover_image_url ? { image: data.cover_image_url } : {}),
        touristType: '團體旅遊',
        ...(destinationTitle ? { itinerary: { '@type': 'Place', name: destinationTitle } } : {}),
        provider: {
          '@type': 'TravelAgency',
          name: '旅遊沒有終點 GARY Travel',
          url: BASE_URL,
        },
        ...(priceNumber
          ? {
              offers: {
                '@type': 'Offer',
                priceCurrency: 'TWD',
                price: priceNumber,
                availability: 'https://schema.org/InStock',
                url: `${BASE_URL}/trip/${params.id}`,
              },
            }
          : {}),
      }
    : null;

  // 麵包屑：首頁 → 目的地 → 行程，讓 Google 搜尋結果能顯示路徑列，也幫助建立頁面之間的關聯
  const breadcrumbLd = data
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '首頁', item: BASE_URL },
          ...(destination?.id
            ? [{ '@type': 'ListItem', position: 2, name: destinationTitle, item: `${BASE_URL}/destination/${destination.id}` }]
            : []),
          { '@type': 'ListItem', position: destination?.id ? 3 : 2, name: data.title, item: `${BASE_URL}/trip/${params.id}` },
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
        給搜尋引擎／輔助工具讀的真實內容：頁面本體是 client component，資料要等瀏覽器抓完
        才畫出來，Google 第一次讀取原始碼時看不到。這裡在伺服器端就先把同樣的內容（標題、
        簡介、價格、標籤）寫進 HTML，視覺上用 sr-only 隱藏（畫面上看不到、不影響設計），
        但搜尋引擎和螢幕報讀器讀得到——內容跟使用者最終看到的完全一致，不是另外編造的文字。
      */}
      {data && (
        <div className="sr-only">
          <h1>{data.title}</h1>
          {destinationTitle && <p>目的地：{destinationTitle}</p>}
          {data.duration && <p>天數：{data.duration}</p>}
          {data.price_range && <p>售價：{data.price_range}</p>}
          {data.subtitle && <p>{data.subtitle}</p>}
          {tags.length > 0 && (
            <ul>
              {tags.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {children}
    </>
  );
}
