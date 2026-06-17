"use client";

import { createPortal } from "react-dom";
import { fbHref, igHref, lineHref } from "@/lib/supabase";
import { openExternalLink } from "@/lib/external-link";

interface DownloadGateModalProps {
  isOpen: boolean;
  downloadReady: boolean;
  tripTitle: string;
  tripId: string;
  documentUrl?: string;
  backHintText: string;
  onClose: () => void;
  onSetDownloadReady: (ready: boolean) => void;
  onTrack: (platform: "LINE" | "FB" | "IG") => void;
}

export function DownloadGateModal({
  isOpen,
  downloadReady,
  tripTitle,
  documentUrl,
  backHintText,
  onClose,
  onSetDownloadReady,
  onTrack,
}: DownloadGateModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-modal-top flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
          onSetDownloadReady(false);
        }
      }}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900 sm:text-lg">下載行程檔</h3>
          <button
            onClick={() => {
              onClose();
              onSetDownloadReady(false);
            }}
            className="text-gray-400 transition hover:text-gray-700"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!downloadReady ? (
          <>
            <p className="mb-2 text-sm text-gray-700">想下載「{tripTitle}」的行程檔嗎？</p>
            <p className="mb-4 text-xs leading-5 text-gray-500">請先加入我們任一社群帳號，追蹤後切回瀏覽器即可下載！</p>

            <div className="space-y-2">
              {[
                ["LINE", lineHref, "加入 LINE 好友", "#06C755", "#05b64d"],
                ["FB", fbHref, "追蹤 FB 粉專", "#1877F2", "#1565d8"],
                ["IG", igHref, "追蹤 IG", "#E4405F", "#d62d4a"],
              ].map(([platform, href, label, baseColor, hoverColor]) => (
                <a
                  key={platform}
                  href={href}
                  onClick={(e) => {
                    e.preventDefault();
                    onTrack(platform as "LINE" | "FB" | "IG");
                    onSetDownloadReady(true);
                    try {
                      localStorage.setItem("social_followed", "true");
                    } catch {}
                    openExternalLink(href);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white transition active:scale-[0.98]"
                  style={{ backgroundColor: baseColor }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = hoverColor;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = baseColor;
                  }}
                >
                  <span className="flex-1 text-left">{label}</span>
                  <svg className="h-4 w-4 shrink-0 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-center">
              <p className="text-sm font-bold text-amber-700">追蹤完成後，請{backHintText}</p>
              <p className="mt-1 text-xs text-amber-600">回到網站即可下載行程檔</p>
            </div>
          </>
        ) : (
          <>
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
              <svg className="mx-auto mb-2 h-10 w-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-base font-bold text-emerald-600">感謝追蹤！</p>
              <p className="mt-1 text-sm text-gray-600">點擊下方按鈕下載行程檔</p>
            </div>

            <a
              href={`/api/download-trip-pdf?url=${encodeURIComponent(documentUrl || "")}&name=${encodeURIComponent(tripTitle)}`}
              onClick={() => {
                onClose();
                onSetDownloadReady(false);
              }}
              className="flex w-full flex-col items-center gap-1 rounded-xl bg-sky-600 px-4 py-4 text-white shadow-lg transition hover:bg-sky-500 active:scale-[0.98]"
            >
              <div className="flex items-center gap-2 text-base font-bold">
                <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                點此下載行程檔
              </div>
              <div className="text-center text-xs font-medium text-sky-100 opacity-90">「{tripTitle}」</div>
            </a>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

interface ShareGateModalProps {
  isOpen: boolean;
  tripTitle: string;
  tripId: string;
  onClose: () => void;
  onShare: (platform: "LINE" | "FB" | "IG", href: string) => void;
}

export function ShareGateModal({ isOpen, tripTitle, onClose, onShare }: ShareGateModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-modal-top flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900 sm:text-lg">分享行程給好友</h3>
          <button onClick={onClose} className="text-gray-400 transition hover:text-gray-700">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="mb-2 text-sm text-gray-700">想分享「{tripTitle}」給好友嗎？</p>
        <p className="mb-4 text-xs leading-5 text-gray-500">請先加入我們的 LINE、Facebook 或 Instagram 任一帳號，即可分享行程給好友！</p>

        <div className="space-y-2">
          {[
            ["LINE", lineHref, "加入 LINE 好友並分享", "#06C755", "#05b64d"],
            ["FB", fbHref, "追蹤 FB 粉專並分享", "#1877F2", "#1565d8"],
            ["IG", igHref, "追蹤 IG 並分享", "#E4405F", "#d62d4a"],
          ].map(([platform, href, label, baseColor, hoverColor]) => (
            <button
              key={platform}
              onClick={() => {
                try {
                  localStorage.setItem("social_followed", "true");
                } catch {}
                onShare(platform as "LINE" | "FB" | "IG", href);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white transition active:scale-[0.98]"
              style={{ backgroundColor: baseColor }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = hoverColor;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = baseColor;
              }}
            >
              <span className="flex-1 text-left">{label}</span>
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
            </button>
          ))}
        </div>

        <p className="mt-3 text-center text-[10px] text-gray-400 sm:text-[11px]">加入後將開啟分享選單，可選擇 LINE、FB、IG 等好友分享</p>
      </div>
    </div>,
    document.body
  );
}
