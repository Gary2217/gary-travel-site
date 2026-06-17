"use client";

import { useCallback, useEffect, useState } from "react";
import Toast from "@/components/Toast";
import { lineDmHref, lineMessageHref, fbDmHref, igDmHref } from "@/lib/supabase";
import { track } from "@/lib/analytics";
import { openExternalLink } from "@/lib/external-link";

interface InquiryButtonsProps {
  tripTitle: string;
  tripId?: string;
  variant: "floating" | "inline";
  selectedDate?: string; // ISO date string (YYYY-MM-DD)
}

function formatDate(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

export default function InquiryButtons({ tripTitle, tripId, variant, selectedDate }: InquiryButtonsProps) {
  const [toast, setToast] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const lineUrl = selectedDate
    ? lineMessageHref(`您好，我想詢問【${tripTitle}】${formatDate(selectedDate)} 出發的報價`)
    : lineDmHref;

  const copyAndOpen = useCallback(async (url: string, platform: string, platformCode: string) => {
    track({ event_type: "trip_inquiry", platform: platformCode, trip_id: tripId, trip_title: tripTitle });
    const text = `【${tripTitle}】`;
    try {
      await navigator.clipboard.writeText(text);
      setToast(`已複製「${tripTitle}」，請在 ${platform} 訊息中貼上`);
    } catch {
      setToast(`請複製行程名稱：${tripTitle}`);
    }
    setTimeout(() => {
      openExternalLink(url);
    }, 400);
  }, [tripTitle, tripId]);

  const openLine = useCallback(() => {
    track({ event_type: "trip_inquiry", platform: "LINE", trip_id: tripId, trip_title: tripTitle });
    openExternalLink(lineUrl);
  }, [lineUrl, tripId, tripTitle]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = () => setIsOpen(false);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [isOpen]);

  if (variant === "floating") {
    return (
      <>
        {toast && <Toast message={toast} onClose={() => setToast(null)} />}
        <div className="fixed bottom-20 right-3 z-floating flex flex-col items-end gap-1.5 sm:bottom-8 sm:right-4 sm:gap-2">
          {isOpen && (
            <div className="flex flex-col items-end gap-1.5 sm:gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => { openLine(); setIsOpen(false); }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-platform-line text-white shadow-lg transition hover:brightness-90 active:scale-95 sm:h-11 sm:w-11 sm:hover:scale-110"
                title="LINE 詢問"
                aria-label="透過 LINE 詢問行程"
              >
                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" /></svg>
              </button>
              <button
                onClick={() => { copyAndOpen(fbDmHref, "Facebook", "FB"); setIsOpen(false); }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-platform-fb text-white shadow-lg transition hover:brightness-90 active:scale-95 sm:h-11 sm:w-11 sm:hover:scale-110"
                title="FB 詢問"
                aria-label="透過 Facebook 詢問行程"
              >
                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
              </button>
              <button
                onClick={() => { copyAndOpen(igDmHref, "Instagram", "IG"); setIsOpen(false); }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-platform-ig text-white shadow-lg transition hover:brightness-90 active:scale-95 sm:h-11 sm:w-11 sm:hover:scale-110"
                title="IG 詢問"
                aria-label="透過 Instagram 詢問行程"
              >
                <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
            className={`flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition active:scale-95 ${isOpen ? 'bg-gray-600 hover:bg-gray-700' : 'bg-sky-600 hover:bg-sky-500'}`}
            aria-label="私訊聯繫"
          >
            {isOpen ? (
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            )}
          </button>
        </div>
      </>
    );
  }

  // inline variant
  return (
    <>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      <div className="rounded-xl border border-gray-200 bg-white px-2 py-1 shadow-sm md:px-3 md:py-1.5">
        <h3 className="mb-0 text-center text-xs font-bold text-gray-900 md:text-sm">
          對此行程有興趣？
        </h3>
        <p className="mb-0.5 text-center text-[9px] text-gray-500 md:mb-1 md:text-[10px]">
          點擊下方按鈕後，行程名稱會自動複製，請在訊息中貼上
        </p>
        <div className="flex flex-row items-center justify-center gap-1.5 sm:gap-2">
          <button
            onClick={openLine}
            className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-[#06C755] px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-[#05b64d]"
          >
            <span className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white">
              <span className="text-[6px] font-black leading-none text-[#06C755] md:text-[7px]">LINE</span>
              <span className="absolute -bottom-[2px] left-[4px] h-0 w-0 border-l-[3px] border-r-[3px] border-t-[4px] border-l-transparent border-r-transparent border-t-white" />
            </span>
            LINE 私訊
          </button>
          <button
            onClick={() => copyAndOpen(fbDmHref, "Facebook", "FB")}
            className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-[#1877F2] px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1565d8]"
          >
            <svg className="h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
            FB 私訊
          </button>
          <button
            onClick={() => copyAndOpen(igDmHref, "Instagram", "IG")}
            className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-[#E4405F] px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-[#d62d4a]"
          >
            <svg className="h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
            IG 私訊
          </button>
        </div>
      </div>
    </>
  );
}
