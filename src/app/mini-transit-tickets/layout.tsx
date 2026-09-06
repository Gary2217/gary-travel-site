import type { Metadata } from 'next';

const BASE_URL = 'https://gary-travel-site.vercel.app';

export const metadata: Metadata = {
  title: '小三通票卷',
  description: '金廈小三通票券，松山／高雄／台中／嘉義／台南出發，旅遊規劃師蓋瑞為您確認票務資訊。',
  alternates: {
    canonical: `${BASE_URL}/mini-transit-tickets`,
  },
};

export default function MiniTransitTicketsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
