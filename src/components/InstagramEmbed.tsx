"use client";

import Image from "next/image";

interface InstagramEmbedProps {
  url: string;
  thumbnailUrl?: string;
  height?: number;
}

// 從 IG 網址取得嵌入用的短碼
function getIgPostId(url: string): string | null {
  const match = url.match(/instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}

/**
 * 縮圖卡片：優先顯示手動上傳的縮圖；沒有的話用 IG embed iframe 顯示貼文本身的
 * 真實畫面（裁切掉上下的大頭貼/留言等 IG 介面），iframe 本身不可互動
 * （pointer-events-none），整張卡片點擊一律開新分頁到 Instagram 原生播放。
 */
export default function InstagramEmbed({ url, thumbnailUrl, height = 240 }: InstagramEmbedProps) {
  const postId = getIgPostId(url);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block w-full overflow-hidden bg-black"
      style={{ height }}
    >
      {thumbnailUrl ? (
        <Image src={thumbnailUrl} alt="" fill sizes="240px" className="object-cover" />
      ) : postId ? (
        <iframe
          src={`https://www.instagram.com/p/${postId}/embed/?hidecaption=true`}
          className="pointer-events-none absolute border-0"
          style={{ top: -64, left: -1, width: "calc(100% + 2px)", height: "calc(100% + 300px)" }}
          scrolling="no"
          tabIndex={-1}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]" />
      )}
      <div className="absolute inset-0 bg-black/10 transition group-hover:bg-black/20" />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg transition group-hover:scale-110 group-hover:bg-white">
          <svg className="ml-1 h-6 w-6 text-[#ee2a7b]" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
        </span>
      </span>
      <span className="absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/40 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
        在 Instagram 觀看
      </span>
    </a>
  );
}
