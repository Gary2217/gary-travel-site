import type { Metadata } from 'next';

const BASE_URL = 'https://gary-travel-site.vercel.app';

// 搜尋結果頁本身沒有獨立、可長期索引的內容（結果隨查詢字串變動），
// 一律 noindex（但 follow，讓 Google 能繼續順著頁面內的行程連結爬到真正的內容頁），
// 避免跟真正的行程/目的地頁互相稀釋排名。
export const metadata: Metadata = {
  title: '搜尋行程',
  robots: {
    index: false,
    follow: true,
  },
  alternates: {
    canonical: `${BASE_URL}/search`,
  },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
