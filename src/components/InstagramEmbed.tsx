"use client";

import Image from "next/image";

interface InstagramEmbedProps {
  url: string;
  thumbnailUrl?: string;
  height?: number;
}

/**
 * 小尺寸縮圖卡片不適合塞入 IG 的可互動 iframe（畫面會被裁切、沒辦法放大，
 * 點裡面的「在 Instagram 觀看」也是 IG 自己 iframe 內的連結，不會跳出到新分頁）。
 * 改成單純的可點擊海報卡片，點擊直接開新分頁到 Instagram 原生播放。
 * IG 沒有可靠的公開縮圖 API，縮圖需由後台上傳，沒有上傳時用漸層底圖代替。
 */
export default function InstagramEmbed({ url, thumbnailUrl, height = 240 }: InstagramEmbedProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative flex w-full items-center justify-center overflow-hidden ${
        thumbnailUrl ? "bg-black" : "bg-gradient-to-br from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]"
      }`}
      style={{ height }}
    >
      {thumbnailUrl && (
        <Image src={thumbnailUrl} alt="" fill sizes="240px" className="object-cover opacity-90" />
      )}
      <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-lg transition group-hover:scale-110 group-hover:bg-white">
        <svg className="ml-1 h-6 w-6 text-[#ee2a7b]" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
      </span>
      <span className="absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/40 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
        在 Instagram 觀看
      </span>
    </a>
  );
}
