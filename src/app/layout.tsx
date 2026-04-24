import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '旅遊規劃師 蓋瑞 GARY｜熱門旅遊行程總覽',
  description: '日本、韓國、東南亞、歐洲等熱門旅遊目的地行程一覽。旅遊規劃師蓋瑞 GARY 為您量身打造專屬行程，LINE 立即諮詢。',
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    title: '旅遊規劃師 蓋瑞 GARY｜熱門旅遊行程總覽',
    description: '日本、韓國、東南亞、歐洲等熱門旅遊目的地行程一覽。立即 LINE 諮詢，量身打造專屬行程。',
    type: 'website',
    locale: 'zh_TW',
    siteName: '蓋瑞旅遊 GARY Travel',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  );
}
