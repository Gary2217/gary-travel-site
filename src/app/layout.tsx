import type { Metadata, Viewport } from 'next';
import MaintenanceGuard from '@/components/MaintenanceGuard';
import './globals.css';

const BASE_URL = 'https://gary-travel-site.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: '旅遊規劃師 蓋瑞 GARY｜熱門旅遊行程總覽',
    template: '%s｜蓋瑞旅遊 GARY Travel',
  },
  description: '日本、韓國、東南亞、歐洲等熱門旅遊目的地行程一覽。旅遊規劃師蓋瑞 GARY 為您量身打造專屬行程，LINE 立即諮詢。',
  icons: {
    icon: '/travel-logo.svg',
  },
  manifest: '/manifest.json',
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    title: '旅遊規劃師 蓋瑞 GARY｜熱門旅遊行程總覽',
    description: '日本、韓國、東南亞、歐洲等熱門旅遊目的地行程一覽。立即 LINE 諮詢，量身打造專屬行程。',
    type: 'website',
    locale: 'zh_TW',
    siteName: '蓋瑞旅遊 GARY Travel',
    url: BASE_URL,
    images: [
      {
        url: `${BASE_URL}/api/og`,
        width: 1200,
        height: 630,
        alt: '蓋瑞旅遊 GARY Travel',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '旅遊規劃師 蓋瑞 GARY｜熱門旅遊行程總覽',
    description: '日本、韓國、東南亞、歐洲等熱門旅遊目的地行程一覽。立即 LINE 諮詢，量身打造專屬行程。',
    images: [`${BASE_URL}/api/og`],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0b0f2a',
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TravelAgency',
    name: '蓋瑞旅遊 GARY Travel',
    description: '日本、韓國、東南亞、歐洲等熱門旅遊目的地行程。旅遊規劃師蓋瑞為您量身打造專屬行程。',
    url: BASE_URL,
    logo: `${BASE_URL}/travel-logo.svg`,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: 'Chinese',
    },
  };

  return (
    <html lang="zh-TW">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <MaintenanceGuard>{children}</MaintenanceGuard>
      </body>
    </html>
  );
}
