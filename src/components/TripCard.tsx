"use client";

import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import FavoriteButton from "@/components/FavoriteButton";
import dynamic from "next/dynamic";

const ImageEditor = dynamic(() => import("@/components/ImageEditor"), { ssr: false });
import ShareButton from "@/components/ShareButton";
import { uploadTripImage, uploadTripDocument, lineHref, fbHref, igHref } from "@/lib/supabase";
import { openExternalLink } from "@/lib/external-link";

interface DepartureDateInfo {
  id: string;
  departure_date: string;
  price: number | null;
  seats_available: number;
  seats_total: number;
  label?: string | null;
  outbound_from?: string | null;
  flight_segments?: Array<{
    dep_airport?: string;
  }> | null;
}

interface TripCardProps {
  id: string;
  title: string;
  duration: string;
  price_range?: string;
  cover_image_url?: string;
  document_url?: string;
  document_is_available?: boolean;
  departure_dates?: DepartureDateInfo[];
  tags?: string[];
  isDevMode?: boolean;
  isCustomTour?: boolean;
  isPromoEnabled?: boolean;
  promoContent?: string;
  onCustomTourToggle?: (tripId: string, value: boolean) => void;
  onImageUpdate?: (tripId: string, newImageUrl: string) => void;
  onDocumentUpdate?: (tripId: string, newDocUrl: string) => void;
  onDocumentAvailabilityUpdate?: (tripId: string, available: boolean) => void;
  onDurationUpdate?: (tripId: string, newDuration: string) => void;
  onTitleUpdate?: (tripId: string, newTitle: string) => void;
  onDelete?: (tripId: string) => void;
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const weekday = ["日", "一", "二", "三", "四", "五", "六"][d.getDay()];
  return `${mm}/${dd}(${weekday})`;
}

export default function TripCard({
  id,
  title,
  duration,
  price_range,
  cover_image_url,
  document_url,
  document_is_available,
  departure_dates,
  tags,
  isDevMode = false,
  isCustomTour = false,
  isPromoEnabled = false,
  promoContent,
  onCustomTourToggle,
  onImageUpdate,
  onDocumentUpdate,
  onDocumentAvailabilityUpdate,
  onDurationUpdate,
  onTitleUpdate,
  onDelete,
}: TripCardProps) {
  const [showDownloadGate, setShowDownloadGate] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(title);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showPromo, setShowPromo] = useState(false);

  const handleCoverClick = () => {
    if (!isDevMode && !isCustomTour) {
      const from = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/trip/${id}?from=${from}`;
    }
  };

  const navigateToTrip = (departureId?: string) => {
    const from = encodeURIComponent(window.location.pathname + window.location.search);
    const departureQuery = departureId ? `&departureId=${encodeURIComponent(departureId)}` : '';
    window.location.href = `/trip/${id}?from=${from}${departureQuery}`;
  };

  const handleFollowAndDownload = (socialUrl: string) => {
    openExternalLink(socialUrl);
    const timer = setTimeout(() => {
      if (document_url) {
        openExternalLink(document_url);
      }
      setShowDownloadGate(false);
    }, 1500);
    return () => clearTimeout(timer);
  };

  const displayPriceRange = price_range
    ?.replace(/NT\$\s*/g, 'NT $ ')
    .replace(/\s*[~～]\s*/g, ' ~ ');

  const departurePlace = (() => {
    if (!departure_dates || departure_dates.length === 0) return null;
    const places = departure_dates
      .map(dd => dd.outbound_from || dd.flight_segments?.[0]?.dep_airport || null)
      .filter(Boolean) as string[];
    if (places.length === 0) return null;
    const unique = [...new Set(places)];
    return unique.length === 1 ? unique[0] : '多地出發';
  })();

  return (
    <>
        <div className="group relative flex flex-row md:flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-md">
        {/* 封面圖：手機垂直 / PC 水平左側 */}
        <div
          className={`relative min-h-[160px] w-[140px] shrink-0 self-stretch overflow-hidden sm:min-h-[200px] sm:w-48 md:w-full md:h-[200px]${!isDevMode ? ' cursor-pointer' : ''}`}
          onClick={handleCoverClick}
        >
          <div className="relative h-full w-full">
            {cover_image_url ? (
              <Image
                src={cover_image_url}
                alt={title}
                fill
                sizes="(max-width: 640px) 140px, (max-width: 768px) 192px, (max-width: 1024px) 50vw, 33vw"
                className="object-cover object-center transition duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gray-100">
                <svg className="h-10 w-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

            {/* 天數標籤 */}
            <div className="absolute right-1.5 top-1.5 rounded-full bg-sky-500/90 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm sm:px-2.5 sm:text-xs">
              {duration}
            </div>

            {isDevMode && document_url && document_is_available && (
              <div className="absolute bottom-1.5 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full border border-emerald-400/30 bg-emerald-500/90 px-2 py-0.5 text-[9px] font-bold text-white shadow-lg backdrop-blur-sm sm:text-[10px]">
                已有行程表
              </div>
            )}

            {/* 收藏按鈕 */}
            {!isDevMode && <FavoriteButton tripId={id} />}

            {/* Dev mode 圖片編輯 */}
            {isDevMode && onImageUpdate && (
              <ImageEditor
                entityId={id}
                currentImageUrl={cover_image_url || ""}
                title={title}
                onUpdate={(newUrl) => onImageUpdate(id, newUrl)}
                onSaveSuccess={(msg) => { setToastMessage(msg); setTimeout(() => setToastMessage(null), 2500); }}
                uploadFn={uploadTripImage}
                documentUrl={document_url}
                onDocumentUpdate={onDocumentUpdate ? (url) => onDocumentUpdate(id, url) : undefined}
                onDocumentAvailabilityUpdate={onDocumentAvailabilityUpdate ? (available) => onDocumentAvailabilityUpdate(id, available) : undefined}
                documentUploadFn={uploadTripDocument}
                duration={duration}
                onDurationUpdate={onDurationUpdate ? (newDur) => onDurationUpdate(id, newDur) : undefined}
              />
            )}
          </div>
        </div>

        {/* 右側文字內容 */}
        <div className="flex min-w-0 flex-1 flex-col justify-between p-2.5 sm:p-3 md:p-4">
          <div className="space-y-3">
          <div>
            {isDevMode ? (
              editingTitle ? (
                <input
                  ref={titleInputRef}
                  value={titleValue}
                  onChange={e => setTitleValue(e.target.value)}
                  onBlur={async () => {
                    setEditingTitle(false);
                    if (titleValue.trim() && titleValue !== title) {
                      await fetch(`/api/trips/${id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ title: titleValue.trim() }),
                      });
                      onTitleUpdate?.(id, titleValue.trim());
                    }
                  }}
                  onKeyDown={e => { if (e.key === 'Enter') titleInputRef.current?.blur(); }}
                  onMouseDown={e => e.stopPropagation()}
                  onDragStart={e => e.stopPropagation()}
                  draggable={false}
                  className="mb-1 w-full border-b border-sky-400 bg-transparent text-xs font-bold text-gray-900 outline-none sm:text-sm md:text-base"
                  autoFocus
                />
              ) : (
                <h3
                  className="line-clamp-2 cursor-pointer border-b border-dashed border-gray-300 text-xs font-bold leading-tight text-gray-900 hover:border-sky-400 hover:text-sky-600 sm:text-sm md:text-base"
                  onClick={() => setEditingTitle(true)}
                  title="點擊編輯名稱"
                >
                  {titleValue}
                </h3>
              )
            ) : (
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="line-clamp-2 min-w-0 flex-1 text-sm font-bold leading-snug tracking-[0.08em] text-gray-900 sm:text-base md:text-[1.1rem]">
                    {title}
                  </h3>
                  <div className="shrink-0">
                    <ShareButton title={title} url={`/trip/${id}`} small />
                  </div>
                </div>

                {!isDevMode && departure_dates && departure_dates.filter(dd => dd.departure_date).length > 0 && (
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5">
                      <span className="shrink-0 rounded border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[11px] font-medium text-orange-600 sm:text-xs">日期</span>
                      {departure_dates.filter(dd => dd.departure_date).slice(0, 6).map((dd, i, arr) => {
                        const d = new Date(dd.departure_date + 'T00:00:00');
                        const dateStr = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
                        const isPromo = dd.label === '限時優惠';
                        return (
                          <span key={dd.id} className="inline-flex items-center">
                            {isPromo ? (
                              <button type="button" onClick={(e) => { e.stopPropagation(); if (promoContent) setShowPromo(true); }} className="inline-flex flex-col items-center transition hover:scale-105">
                                <span className="rounded bg-gradient-to-r from-red-500 to-rose-500 px-1.5 py-px text-[8px] font-bold leading-tight text-white sm:text-[9px]">限時優惠</span>
                                <span className="text-sm font-bold text-red-500 sm:text-base">{dateStr}</span>
                              </button>
                            ) : (
                              <span className="text-sm text-gray-700 sm:text-base">{dateStr}</span>
                            )}
                            {i < arr.length - 1 && <span className="ml-0.5 text-sm text-gray-400">、</span>}
                          </span>
                        );
                      })}
                      {departure_dates.filter(dd => dd.departure_date).length > 6 && <span className="text-sm text-gray-400">...更多</span>}
                    </div>
                    {price_range && (
                      <div className="shrink-0 text-right">
                        <span className="text-base font-bold tabular-nums text-amber-600 sm:text-lg">$ {displayPriceRange?.replace(/NT\s*\$\s*/g, '')}</span>
                        <span className="ml-0.5 text-[10px] text-gray-500">起</span>
                      </div>
                    )}
                  </div>
                )}


              </div>
            )}
          </div>

          {/* 下半區：標籤 + 出發地 + 包團（mt-auto 推到底部） */}
          <div className="mt-2 space-y-5">
            {tags && tags.length > 0 && !isDevMode && (
              <div className="flex flex-wrap items-center gap-1">
                {tags.map((tag, i) => (
                  <span key={i} className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600 sm:text-xs">{tag}</span>
                ))}
              </div>
            )}

            {/* 出發地 */}
            {!isDevMode && departurePlace && (
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-900 sm:text-sm">
                <svg className="h-3.5 w-3.5 shrink-0 text-sky-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>出發地：{departurePlace}</span>
              </div>
            )}

            {/* 包團/客製標籤 */}
            {isCustomTour && !isDevMode && (
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-base font-bold text-sky-700 sm:text-lg md:px-3 md:py-1.5 md:text-sm">此團可包團或客製，歡迎詢問</span>
                <a
                  href={lineHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#06C755] px-5 py-2 text-base font-bold text-white transition hover:bg-[#05b64d] sm:text-lg md:px-3 md:py-1.5 md:text-sm"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" /></svg>
                  LINE 詢問
                </a>
              </div>
            )}
          </div>

          {/* 按鈕區 */}
          <div className="mt-2 flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:gap-2">

            {/* Dev mode 包團/客製切換 */}
            {isDevMode && onCustomTourToggle && (
              <button
                type="button"
                onClick={() => onCustomTourToggle(id, !isCustomTour)}
                className={`flex min-h-8 items-center justify-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-semibold shadow transition active:scale-95 sm:min-h-9 sm:w-auto sm:px-5 sm:py-2 sm:text-sm ${isCustomTour ? 'border-sky-300 bg-sky-100 text-sky-700' : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
              >
                {isCustomTour ? '✓ 已設包團/客製' : '+ 設為包團/客製'}
              </button>
            )}

            {/* Dev mode 刪除行程 */}
            {isDevMode && onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`確定要刪除「${title}」嗎？此操作無法復原。`)) {
                    onDelete(id);
                  }
                }}
                className="flex min-h-8 items-center justify-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-4 py-1.5 text-xs font-semibold text-red-600 shadow transition hover:bg-red-100 active:scale-95 sm:min-h-9 sm:w-auto sm:px-5 sm:py-2 sm:text-sm"
              >
                <svg className="h-3 w-3 sm:h-3.5 sm:w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                刪除行程
              </button>
            )}

          </div>
        </div>
      </div>
      </div>

      {/* 下載門檻彈窗 */}
      {/* 限時優惠彈窗 */}
      {showPromo && promoContent && createPortal(
        <div className="fixed inset-0 z-modal-top flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setShowPromo(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="relative rounded-t-2xl bg-gradient-to-r from-red-500 to-rose-500 px-5 py-4">
              <h3 className="text-lg font-black text-white">🎉 限時優惠</h3>
              <button onClick={() => setShowPromo(false)} className="absolute right-3 top-3 rounded-full bg-white/20 p-1 text-white transition hover:bg-white/40">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-5 py-4">
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{promoContent}</div>
              <a href={lineHref} target="_blank" rel="noopener noreferrer" className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#06C755] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#05b64d]">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" /></svg>
                立即 LINE 詢問優惠
              </a>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 上傳成功 toast */}
      {toastMessage && createPortal(
        <div className="fixed inset-x-0 top-20 z-modal-top flex justify-center pointer-events-none">
          <div className="rounded-xl border border-emerald-200 bg-white px-6 py-3 text-sm font-bold text-emerald-600 shadow-lg pointer-events-auto">
            ✓ {toastMessage}
          </div>
        </div>,
        document.body
      )}

      {showDownloadGate && createPortal(
        <div
          className="fixed inset-0 z-modal-top flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDownloadGate(false);
          }}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-5 shadow-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 sm:text-lg">下載行程檔</h3>
              <button
                onClick={() => setShowDownloadGate(false)}
                className="text-gray-400 transition hover:text-gray-700"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="mb-2 text-sm text-gray-600">
              想下載「{title}」的行程檔嗎？
            </p>
            <p className="mb-4 text-xs leading-5 text-gray-500">
              請先加入我們的 LINE、Facebook 或 Instagram 任一帳號，即可立即下載完整行程檔！
            </p>

            <div className="space-y-2">
              <button
                onClick={() => handleFollowAndDownload(lineHref)}
                className="flex w-full items-center gap-3 rounded-xl bg-[#06C755] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#05b64d] active:scale-[0.98]"
              >
                <svg className="h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" /></svg>
                <span className="flex-1 text-left">加入 LINE 好友並下載</span>
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </button>

              <button
                onClick={() => handleFollowAndDownload(fbHref)}
                className="flex w-full items-center gap-3 rounded-xl bg-[#1877F2] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1565d8] active:scale-[0.98]"
              >
                <svg className="h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                <span className="flex-1 text-left">追蹤 FB 粉專並下載</span>
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </button>

              <button
                onClick={() => handleFollowAndDownload(igHref)}
                className="flex w-full items-center gap-3 rounded-xl bg-[#E4405F] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#d62d4a] active:scale-[0.98]"
              >
                <svg className="h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                <span className="flex-1 text-left">追蹤 IG 並下載</span>
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </button>
            </div>

            <p className="mt-3 text-center text-[10px] text-gray-400 sm:text-[11px]">
              加入後將自動開始下載行程檔
            </p>
          </div>
        </div>,
        document.body
      )}

    </>
  );
}

