import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import MaintenanceGuard from '@/components/MaintenanceGuard';
import './globals.css';

const BASE_URL = 'https://gary-travel-site.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: '旅行沒有終點 | 旅遊規劃師蓋瑞 GARY',
  description: '專業旅遊規劃師蓋瑞，提供日本、韓國、東南亞、歐洲等全球團體旅遊行程，免費諮詢、不收服務費',
  icons: {
    icon: '/travel-logo.svg',
  },
  manifest: '/manifest.json',
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    title: '旅行沒有終點 | 旅遊規劃師蓋瑞 GARY',
    description: '專業旅遊規劃師蓋瑞，提供日本、韓國、東南亞、歐洲等全球團體旅遊行程，免費諮詢、不收服務費',
    type: 'website',
    locale: 'zh_TW',
    siteName: '旅行沒有終點 | 旅遊規劃師蓋瑞 GARY',
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
    title: '旅行沒有終點 | 旅遊規劃師蓋瑞 GARY',
    description: '專業旅遊規劃師蓋瑞，提供日本、韓國、東南亞、歐洲等全球團體旅遊行程，免費諮詢、不收服務費',
    images: [`${BASE_URL}/api/og`],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#ffffff',
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
        <link rel="dns-prefetch" href="https://soujehqympampczeiwcz.supabase.co" />
        <link rel="preconnect" href="https://soujehqympampczeiwcz.supabase.co" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-MWGKSWE0Q8" strategy="afterInteractive" />
        <Script
          id="ga-config"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-MWGKSWE0Q8');`,
          }}
        />
        <Script
          id="img-protect"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `document.addEventListener('contextmenu',function(e){if(e.target.tagName==='IMG'){e.preventDefault()}});document.addEventListener('dragstart',function(e){if(e.target.tagName==='IMG'){e.preventDefault()}});`,
          }}
        />
        <MaintenanceGuard>{children}</MaintenanceGuard>
      </body>
    </html>
  );
}
