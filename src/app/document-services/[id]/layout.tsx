import type { Metadata } from 'next';
import { getDocumentServiceById } from '@/lib/document-services';

const BASE_URL = 'https://gary-travel-site.vercel.app';

type LayoutProps = {
  children: React.ReactNode;
  params: { id: string };
};

// 用跟頁面本體同一份靜態資料（src/lib/document-services.ts），不用另外查 DB——
// 這份資料本來就是頁面顯示的標題來源（admin 後台編輯的內容只是選填覆蓋層，
// 沒填的話顯示的就是這份靜態標題），拿來當 SEO 標題完全準確。
export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const service = getDocumentServiceById(params.id);
  if (!service) return {};

  return {
    title: service.title,
    description: `${service.title}代辦服務，${service.summary}。旅遊規劃師蓋瑞協助確認申辦條件與流程。`,
    alternates: {
      canonical: `${BASE_URL}/document-services/${params.id}`,
    },
  };
}

export default function DocumentServiceDetailLayout({ children }: LayoutProps) {
  return children;
}
