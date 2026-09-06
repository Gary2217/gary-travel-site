import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { cookies } from 'next/headers';
import MaintenanceGuard from '@/components/MaintenanceGuard';
import { DEV_AUTH_COOKIE_NAME, verifyDevAuthCookie } from '@/lib/dev-auth';
import { createServiceClient, hasServiceRoleConfig } from '@/lib/supabase-server';
import './globals.css';

const BASE_URL = 'https://gary-travel-site.vercel.app';

/**
 * 伺服器端先查好維護模式狀態（跟 /api/maintenance 同一套邏輯），讓頁面第一次送出去
 * 就已經知道要不要顯示內容，不用等瀏覽器裡的程式跑完才知道——這樣 Google 讀取頁面時
 * 才看得到真正的內容，不會卡在「載入中...」畫面。
 */
async function getInitialMaintenanceStatus(): Promise<'ok' | 'maintenance'> {
  try {
    const isDevUser = verifyDevAuthCookie(cookies().get(DEV_AUTH_COOKIE_NAME)?.value);
    if (isDevUser) return 'ok';

    if (!hasServiceRoleConfig()) return 'ok';

    const supabase = createServiceClient();
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'maintenance_mode')
      .single();

    const enabled = data?.value === true || data?.value === 'true';
    return enabled ? 'maintenance' : 'ok';
  } catch {
    // 查詢失敗時預設不擋，與 /api/maintenance 的容錯行為一致
    return 'ok';
  }
}

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: '「旅遊沒有終點」旅遊網站',
  description: '專業旅遊規劃師蓋瑞，提供日本、韓國、東南亞、歐洲等全球團體旅遊行程，免費諮詢、不收服務費',
  icons: {
    icon: '/travel-logo.svg',
  },
  manifest: '/manifest.webmanifest',
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    title: '「旅遊沒有終點」旅遊網站',
    description: '專業旅遊規劃師蓋瑞，提供日本、韓國、東南亞、歐洲等全球團體旅遊行程，免費諮詢、不收服務費',
    type: 'website',
    locale: 'zh_TW',
    siteName: '「旅遊沒有終點」旅遊網站',
    url: BASE_URL,
    images: [
      {
        url: 'https://pub-3881231e994f4158b5d05c0ec109b3ef.r2.dev/images/site/logo-1779445005490.png',
        width: 1440,
        height: 720,
        alt: '旅遊沒有終點',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '「旅遊沒有終點」旅遊網站',
    description: '專業旅遊規劃師蓋瑞，提供日本、韓國、東南亞、歐洲等全球團體旅遊行程，免費諮詢、不收服務費',
    images: ['https://pub-3881231e994f4158b5d05c0ec109b3ef.r2.dev/images/site/logo-1779445005490.png'],
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

export default async function RootLayout({ children }: RootLayoutProps) {
  const initialMaintenanceStatus = await getInitialMaintenanceStatus();
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
            // 未投放 Google 廣告：關閉廣告訊號/個人化與 Conversion Linker，
            // 停止向 doubleclick 等發送再行銷／轉換比對請求
            // （消除被 CSP 擋下的無用請求；不影響 GA4 流量統計）
            //
            // 2026-07-18 追記：allow_google_signals/allow_ad_personalization_signals
            // 只關閉「訊號」與「個人化」，不會停止 Conversion Linker —— 它是獨立機制，
            // 預設開啟，會定期 ping ad.doubleclick.net/ccm/s/ 比對廣告點擊、寫入
            // _gcl_* cookie，與 allow_google_signals 設什麼無關。此前只關了前兩者，
            // doubleclick 請求其實從未真正停止，只是恰好沒被截圖抓到。
            // 須額外加 conversion_linker:false 才會真正停止。
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-MWGKSWE0Q8',{allow_google_signals:false,allow_ad_personalization_signals:false,conversion_linker:false});`,
          }}
        />
        <Script
          id="img-protect"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `document.addEventListener('contextmenu',function(e){if(e.target.tagName==='IMG'){e.preventDefault()}});document.addEventListener('dragstart',function(e){if(e.target.tagName==='IMG'){e.preventDefault()}});`,
          }}
        />
        <MaintenanceGuard initialStatus={initialMaintenanceStatus}>{children}</MaintenanceGuard>
      </body>
    </html>
  );
}
