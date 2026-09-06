import type { Metadata } from 'next';
import { getMiniTransitTicketById } from '@/lib/mini-transit-tickets';

const BASE_URL = 'https://gary-travel-site.vercel.app';

type LayoutProps = {
  children: React.ReactNode;
  params: { id: string };
};

// 用跟頁面本體同一份靜態資料（src/lib/mini-transit-tickets.ts），理由同
// document-services/[id]/layout.tsx——admin 後台編輯內容只是選填覆蓋層。
export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const ticket = getMiniTransitTicketById(params.id);
  if (!ticket) return {};

  return {
    title: ticket.title,
    description: `${ticket.title}，旅遊規劃師蓋瑞為您確認票務資訊。`,
    alternates: {
      canonical: `${BASE_URL}/mini-transit-tickets/${params.id}`,
    },
  };
}

export default function MiniTransitTicketDetailLayout({ children }: LayoutProps) {
  return children;
}
