"use client";

import { useEffect, useState } from "react";
import { lineDmHref } from "@/lib/supabase";
import { openExternalLink } from "@/lib/external-link";

export default function FloatingContact() {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="fixed bottom-[5.5rem] right-3 z-floating flex flex-col items-end gap-1.5 sm:bottom-8 sm:right-4 sm:gap-2">
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="回到頂部"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-lg transition hover:bg-gray-50 hover:text-gray-700 active:scale-95"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      )}

      {/* LINE 私訊主按鈕 */}
      <button
        type="button"
        onClick={() => openExternalLink(lineDmHref)}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-platform-line text-white shadow-lg transition hover:brightness-90 active:scale-95"
        title="LINE 私訊"
        aria-label="透過 LINE 私訊"
      >
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" /></svg>
      </button>
    </div>
  );
}
