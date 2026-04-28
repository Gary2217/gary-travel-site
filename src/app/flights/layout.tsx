import type { Metadata } from 'next';

const BASE_URL = 'https://gary-travel-site.vercel.app';

export const metadata: Metadata = {
  title: '機票查詢',
  description: '日本、韓國、東南亞、歐洲等熱門航線機票資訊。蓋瑞旅遊為您整理最新票價，LINE 立即諮詢。',
  alternates: {
    canonical: `${BASE_URL}/flights`,
  },
  openGraph: {
    title: '機票查詢｜蓋瑞旅遊 GARY Travel',
    description: '熱門航線機票資訊一覽，LINE 立即諮詢最新票價。',
    images: [
      {
        url: `${BASE_URL}/api/og?title=${encodeURIComponent('機票查詢')}&subtitle=${encodeURIComponent('熱門航線票價一覽')}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '機票查詢｜蓋瑞旅遊 GARY Travel',
    description: '熱門航線機票資訊一覽，LINE 立即諮詢最新票價。',
  },
};

export default function FlightsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
