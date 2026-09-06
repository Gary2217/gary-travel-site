import type { Metadata } from 'next';

const BASE_URL = 'https://gary-travel-site.vercel.app';

export const metadata: Metadata = {
  title: '證件代辦',
  description: '護照、台胞證等證件代辦服務，以下服務項目為站內整理內容，實際申辦條件與所需文件請以顧問最新說明為準。',
  alternates: {
    canonical: `${BASE_URL}/document-services`,
  },
};

export default function DocumentServicesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
