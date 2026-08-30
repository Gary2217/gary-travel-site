"use client";

import Image from "next/image";

interface YouTubeEmbedProps {
  url: string;
  thumbnailUrl?: string;
  height?: number;
}

// 從 YouTube 網址取得影片 ID（支援 watch?v=、youtu.be/、shorts/）
export function getYouTubeVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

/**
 * 縮圖卡片：優先顯示手動上傳的縮圖；沒有的話用 YouTube 官方縮圖圖檔，
 * 整張卡片點擊一律開新分頁到 YouTube 原生播放（跟 InstagramEmbed 同一套視覺語言）。
 */
export default function YouTubeEmbed({ url, thumbnailUrl, height = 240 }: YouTubeEmbedProps) {
  const videoId = getYouTubeVideoId(url);

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
      ) : videoId ? (
        <Image
          src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
          alt=""
          fill
          sizes="240px"
          className="object-cover"
          unoptimized
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#ff0000] via-[#cc0000] to-[#990000]" />
      )}
      <div className="absolute inset-0 bg-black/10 transition group-hover:bg-black/20" />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg transition group-hover:scale-110 group-hover:bg-white">
          <svg className="ml-1 h-6 w-6 text-[#ff0000]" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
        </span>
      </span>
      <span className="absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/40 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
        在 YouTube 觀看
      </span>
    </a>
  );
}
