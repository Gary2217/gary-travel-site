"use client";

import { lineHref } from "@/lib/supabase";
import { openExternalLink } from "@/lib/external-link";

/**
 * 日本目的地／行程頁專用的詢問橫條內容。不含定位樣式——目的地頁本身沒有固定底部區塊，
 * 由外層包 `fixed bottom-0` 即可；行程頁已有自己的固定底部售價列，由外層的
 * flex-col 容器把這個橫條疊在售價列上方，避免兩者互相覆蓋。
 */
export default function JapanInquiryBar() {
  return (
    <div className="border-t border-gray-200 bg-gradient-to-r from-sky-600 to-sky-500 px-4 py-2.5 shadow-lg">
      <div className="mx-auto flex max-w-[1000px] items-center justify-center gap-4">
        <p className="truncate text-xs font-semibold text-white sm:text-sm">
          日本行程數量多，請洽詢蓋瑞詢問
        </p>
        <button
          type="button"
          onClick={() => openExternalLink(lineHref)}
          className="shrink-0 rounded-full bg-[#06C755] px-5 py-2 text-sm font-bold text-white transition hover:bg-[#05b64d]"
        >
          詢問
        </button>
      </div>
    </div>
  );
}
