import type { Metadata } from 'next';

const BASE_URL = 'https://gary-travel-site.vercel.app';

export const metadata: Metadata = {
  title: '隱私權政策',
  description: '「旅遊沒有終點」旅遊網站隱私權政策，說明我們如何蒐集、使用與保護您的個人資料。',
  alternates: {
    canonical: `${BASE_URL}/privacy`,
  },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
