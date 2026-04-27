"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { lineHref, fbHref, igHref } from "@/lib/supabase";

interface StickyHeaderProps {
  showBackButton?: boolean;
  backHref?: string;
  devModeSlot?: React.ReactNode;
  logoUrl?: string;
  logoEditorSlot?: React.ReactNode;
}

export default function StickyHeader({ showBackButton, backHref, devModeSlot, logoUrl = '/travel-logo.svg', logoEditorSlot }: StickyHeaderProps) {
  const router = useRouter();
  const lineHelperText = "詢問行程｜拿行程檔案｜客製｜機票｜機+酒｜員工旅遊｜旅遊規劃師 蓋瑞 GARY";
  const handleBackClick = () => {
    if (backHref?.startsWith("#")) {
      const target = document.querySelector(backHref) as HTMLElement | null;
      if (target) {
        const top = target.getBoundingClientRect().top + window.scrollY - 72;
        window.scrollTo({ top, behavior: "smooth" });
      }
      return;
    }
    if (backHref) {
      router.push(backHref);
      return;
    }
    router.back();
  };

return (
    <div className="fixed inset-x-0 top-0 z-[60] border-b border-white/10 bg-[rgba(20,20,30,0.82)] backdrop-blur-[6px]">
      <div className="mx-auto grid max-w-[1400px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 py-1.5 md:gap-4 md:px-6 md:py-2">
        {/* 左側：返回 + Logo + 品牌 */}
        <div className="flex items-center gap-2 justify-self-start">
        {showBackButton && (
          <button
            onClick={handleBackClick}
            className="mr-1 rounded-full p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
            title="返回"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <Link href="/" className="flex shrink-0 items-center gap-2 transition hover:opacity-90" aria-label="回到首頁">
          <img src={logoUrl} alt="旅行沒有終點 LOGO" className="h-12 w-12 shrink-0 object-contain md:h-14 md:w-14" />
          <p className="-ml-1 text-xs font-semibold tracking-wide text-white sm:text-sm md:text-sm">
            旅行沒有終點
          </p>
        </Link>
        {logoEditorSlot}
        </div>

        <div className="hidden min-w-0 justify-self-center lg:flex">
          <p className="truncate text-sm font-medium text-white/72">
            {lineHelperText}
          </p>
        </div>

        {/* 右側：社群按鈕 */}
        <div className="flex shrink-0 items-center gap-1.5 justify-self-end sm:gap-2 md:gap-3">
          {/* LINE */}
          <a
            href={lineHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-[#06C755] px-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#05b64d] sm:h-9 sm:gap-2 sm:px-4 sm:text-sm md:h-10 md:min-w-[154px] md:px-5"
            title="LINE 諮詢"
          >
            <span className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white sm:h-5 sm:w-5">
              <span className="text-[6px] font-black leading-none text-[#06C755] sm:text-[7px] md:text-[8px]">LINE</span>
              <span className="absolute -bottom-[1px] left-[3px] h-0 w-0 border-l-[3px] border-r-[3px] border-t-[4px] border-l-transparent border-r-transparent border-t-white sm:-bottom-[2px] sm:left-[5px] sm:border-l-[4px] sm:border-r-[4px] sm:border-t-[5px]" />
            </span>
            <span>LINE</span>
            <span className="hidden sm:inline">立即洽詢</span>
          </a>

          {/* Facebook */}
          <a
            href={fbHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-[#1877F2] px-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1565d8] sm:h-9 sm:gap-2 sm:px-4 sm:text-sm md:h-10 md:min-w-[154px] md:px-5"
            title="Facebook 粉專"
          >
            <svg className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            <span>FB</span>
            <span className="hidden sm:inline">粉專看優惠</span>
          </a>

          {/* Instagram */}
          <a
            href={igHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-[#E4405F] px-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#d62d4a] sm:h-9 sm:gap-2 sm:px-4 sm:text-sm md:h-10 md:min-w-[154px] md:px-5"
            title="Instagram"
          >
            <svg className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
            </svg>
            <span>IG</span>
            <span className="hidden sm:inline">私訊</span>
          </a>
          {devModeSlot}
        </div>
      </div>
      {/* 手機版說明文字 - 合併到同一層 */}
      <div className="border-b border-white/5 bg-[rgba(20,20,30,0.82)] px-3 pb-2 pt-1 lg:hidden">
        <p className="overflow-x-auto whitespace-nowrap text-center text-[11px] font-medium text-white/68 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {lineHelperText}
        </p>
      </div>
    </div>
  );
}
