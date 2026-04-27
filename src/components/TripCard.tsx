"use client";

import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import ImageEditor from "@/components/ImageEditor";
import { uploadTripImage, uploadTripDocument, lineHref, fbHref, igHref } from "@/lib/supabase";

interface TripCardProps {
  id: string;
  title: string;
  duration: string;
  cover_image_url?: string;
  document_url?: string;
  document_is_available?: boolean;
  isDevMode?: boolean;
  onImageUpdate?: (tripId: string, newImageUrl: string) => void;
  onDocumentUpdate?: (tripId: string, newDocUrl: string) => void;
  onDocumentAvailabilityUpdate?: (tripId: string, available: boolean) => void;
  onDurationUpdate?: (tripId: string, newDuration: string) => void;
  onTitleUpdate?: (tripId: string, newTitle: string) => void;
  onDelete?: (tripId: string) => void;
}

export default function TripCard({
  id,
  title,
  duration,
  cover_image_url,
  document_url,
  document_is_available,
  isDevMode = false,
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

  const handleCoverClick = () => {
    if (!isDevMode) {
      const from = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/trip/${id}?from=${from}`;
    }
  };

  const handleFollowAndDownload = (socialUrl: string) => {
    window.open(socialUrl, '_blank');
    setTimeout(() => {
      if (document_url) {
        window.open(document_url, '_blank');
      }
      setShowDownloadGate(false);
    }, 1500);
  };

  return (
    <>
      <div className="group relative overflow-hidden rounded-[1.25rem] border border-white/10 bg-[rgba(20,20,30,0.45)] shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:shadow-xl sm:rounded-[1.5rem]">
        {/* 封面圖 */}
        <div
          className={`relative h-28 overflow-hidden sm:h-36 md:h-44${!isDevMode ? ' cursor-pointer' : ''}`}
          onClick={handleCoverClick}
        >
          {cover_image_url ? (
            <div
              className="h-full w-full bg-cover bg-center transition duration-500 group-hover:scale-105"
              style={{ backgroundImage: `url(${cover_image_url})` }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[rgba(20,20,30,0.6)]">
              <svg className="h-10 w-10 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

          {/* 天數標籤 */}
          <div className="absolute right-2 top-2 rounded-full bg-sky-500/90 px-2.5 py-0.5 text-xs font-bold text-white backdrop-blur-sm">
            {duration}
          </div>

          {/* 有檔案時顯示小圖示 */}
          {!isDevMode && document_url && document_is_available && (
            <div className="absolute left-2 top-2 rounded-full bg-emerald-500/90 p-1 backdrop-blur-sm" title="點擊查看行程表">
              <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          )}

          {isDevMode && document_url && document_is_available && (
            <div className="absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-full border border-emerald-400/30 bg-emerald-500/90 px-3 py-1 text-[11px] font-bold text-white shadow-lg backdrop-blur-sm">
              已有行程表
            </div>
          )}

          {/* Dev mode 圖片編輯 */}
          {isDevMode && onImageUpdate && (
            <ImageEditor
              entityId={id}
              currentImageUrl={cover_image_url || ""}
              title={title}
              onUpdate={(newUrl) => onImageUpdate(id, newUrl)}
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

        {/* 行程名稱 + 按鈕 */}
        <div className="p-2 sm:p-3 md:p-4">
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
                className="mb-1 w-full border-b border-sky-400 bg-transparent text-xs font-bold text-white outline-none sm:text-sm md:text-base"
                autoFocus
              />
            ) : (
              <h3
                className="line-clamp-2 min-h-[2rem] cursor-pointer border-b border-dashed border-white/30 text-xs font-bold leading-tight text-white hover:border-sky-400 hover:text-sky-300 sm:min-h-[2.5rem] sm:text-sm md:text-base"
                onClick={() => setEditingTitle(true)}
                title="點擊編輯名稱"
              >
                {titleValue}
              </h3>
            )
          ) : (
            <h3 className="line-clamp-2 min-h-[2rem] text-xs font-bold leading-tight text-white sm:min-h-[2.5rem] sm:text-sm md:text-base">
              {title}
            </h3>
          )}
          <button
            type="button"
            onClick={() => {
              const from = encodeURIComponent(window.location.pathname + window.location.search);
              window.location.href = `/trip/${id}?from=${from}`;
            }}
            className="mt-2 flex w-full items-center justify-center gap-1 rounded-full bg-sky-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow transition hover:bg-sky-500 active:scale-95 sm:mt-3 sm:px-4 sm:py-2 sm:text-xs md:text-sm"
          >
            點我看行程
            <svg className="h-3 w-3 sm:h-3.5 sm:w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Dev mode 刪除行程 */}
          {isDevMode && onDelete && (
            <button
              type="button"
              onClick={() => {
                if (confirm(`確定要刪除「${title}」嗎？此操作無法復原。`)) {
                  onDelete(id);
                }
              }}
              className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-full border border-red-500/30 bg-red-600/20 px-3 py-1.5 text-[11px] font-semibold text-red-300 shadow transition hover:bg-red-600/30 active:scale-95 sm:mt-2 sm:px-4 sm:py-2 sm:text-xs md:text-sm"
            >
              <svg className="h-3 w-3 sm:h-3.5 sm:w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              刪除行程
            </button>
          )}

          {/* 下載 PDF 行程檔 */}
          {!isDevMode && document_url && document_is_available && (
            <button
              onClick={() => setShowDownloadGate(true)}
              className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-600/20 px-3 py-1.5 text-[11px] font-semibold text-emerald-300 shadow transition hover:bg-emerald-600/30 active:scale-95 sm:mt-2 sm:px-4 sm:py-2 sm:text-xs md:text-sm"
            >
              <svg className="h-3 w-3 sm:h-3.5 sm:w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              下載 PDF 行程檔
            </button>
          )}

        </div>
      </div>

      {/* 下載門檻彈窗 */}
      {showDownloadGate && createPortal(
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDownloadGate(false);
          }}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-[rgba(20,20,30,0.98)] p-5 shadow-2xl backdrop-blur-xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-white sm:text-lg">下載行程檔</h3>
              <button
                onClick={() => setShowDownloadGate(false)}
                className="text-white/50 transition hover:text-white"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="mb-2 text-sm text-white/80">
              想下載「{title}」的行程檔嗎？
            </p>
            <p className="mb-4 text-xs leading-5 text-white/60">
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

            <p className="mt-3 text-center text-[10px] text-white/40 sm:text-[11px]">
              加入後將自動開始下載行程檔
            </p>
          </div>
        </div>,
        document.body
      )}

    </>
  );
}
