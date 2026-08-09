"use client";

interface InstagramEmbedProps {
  url: string;
  height?: number;
}

// 從 IG 網址取得嵌入用的短碼
function getIgPostId(url: string): string | null {
  const match = url.match(/instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}

/**
 * 用 IG 原生 iframe embed（非官方 blockquote widget）並裁切，
 * 只留貼文本身內容，不顯示大頭貼/追蹤按鈕/留言框等 IG 自帶的大塊 UI。
 */
export default function InstagramEmbed({ url, height = 240 }: InstagramEmbedProps) {
  const postId = getIgPostId(url);
  if (!postId) return null;

  return (
    <div className="relative w-full overflow-hidden bg-black" style={{ height }}>
      <iframe
        src={`https://www.instagram.com/p/${postId}/embed/?autoplay=1&hidecaption=true`}
        className="absolute border-0"
        style={{ top: -64, left: -1, width: "calc(100% + 2px)", height: "calc(100% + 300px)" }}
        allow="autoplay; encrypted-media"
        allowFullScreen
        scrolling="no"
      />
    </div>
  );
}
