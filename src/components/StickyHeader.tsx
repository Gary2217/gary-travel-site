"use client";

import { useRouter } from "next/navigation";

const lineId = process.env.NEXT_PUBLIC_LINE_ID || "@YOUR_LINE_ID";
const lineHref = `https://line.me/ti/p/${lineId.replace("@", "")}`;
const fbHref = process.env.NEXT_PUBLIC_FB_URL || "#";
const igHref = process.env.NEXT_PUBLIC_IG_URL || "#";

interface StickyHeaderProps {
  showBackButton?: boolean;
}

export default function StickyHeader({ showBackButton }: StickyHeaderProps) {
  const router = useRouter();
  const lineHelperText = "詢問行程｜拿行程檔案｜客製｜機票｜機+酒｜員工旅遊｜旅遊規劃師 蓋瑞 GARY";

  return (
    <div className="sticky top-0 z-50 border-b border-white/10 bg-[rgba(20,20,30,0.72)] backdrop-blur-[12px]">
      <div className="mx-auto flex max-w-[1400px] items-center gap-2 px-3 py-2.5 md:gap-4 md:px-6">
        {/* 左側：返回 + Logo + 品牌 */}
        <div className="flex shrink-0 items-center gap-2">
          {showBackButton && (
            <button
              onClick={() => router.back()}
              className="mr-1 rounded-full p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
              title="返回"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <svg className="h-7 w-7 text-sky-400 md:h-8 md:w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
          </svg>
          <p className="hidden text-sm font-semibold text-white md:block">
            旅遊規劃師 蓋瑞 GARY
          </p>
        </div>

        <div className="ml-auto hidden min-w-0 items-center lg:flex">
          <p className="truncate text-sm font-medium text-white/72">
            {lineHelperText}
          </p>
        </div>

        {/* 右側：社群按鈕 */}
        <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
          {/* LINE */}
          <a
            href={lineHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full bg-[#06C755] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#05b64d] md:h-11 md:px-5"
            title="LINE 諮詢"
          >
            <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white">
              <span className="text-[7px] font-black leading-none text-[#06C755] md:text-[8px]">LINE</span>
              <span className="absolute -bottom-[2px] left-[4px] h-0 w-0 border-l-[3px] border-r-[3px] border-t-[4px] border-l-transparent border-r-transparent border-t-white md:left-[5px] md:border-l-[4px] md:border-r-[4px] md:border-t-[5px]" />
            </span>
            <span>LINE立即洽詢</span>
          </a>

          {/* Facebook */}
          <a
            href={fbHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full bg-[#1877F2] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1565d8] md:h-11 md:px-5"
            title="Facebook 粉專"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            <span>FB粉專看優惠</span>
          </a>

          {/* Instagram */}
          <a
            href={igHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full bg-[#E4405F] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#d62d4a] md:h-11 md:px-5"
            title="Instagram"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
            </svg>
            <span>IG私訊</span>
          </a>
        </div>
      </div>
      <div className="border-t border-white/5 px-3 pb-2 pt-1 lg:hidden">
        <p className="overflow-x-auto whitespace-nowrap text-center text-[11px] font-medium text-white/68 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {lineHelperText}
        </p>
      </div>
    </div>
  );
}
