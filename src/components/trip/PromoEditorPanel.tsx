"use client";

import { createPortal } from "react-dom";
import { lineHref } from "@/lib/supabase";

interface PromoEditorPanelProps {
  isOpen: boolean;
  enabled: boolean;
  content: string;
  saving: boolean;
  onClose: () => void;
  onToggleEnabled: () => void;
  onContentChange: (value: string) => void;
  onSave: () => void;
}

export function PromoEditorPanel({ isOpen, enabled, content, saving, onClose, onToggleEnabled, onContentChange, onSave }: PromoEditorPanelProps) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-modal-top flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">編輯限時優惠</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <span className="text-sm font-semibold text-gray-700">啟用限時優惠彈窗</span>
            <button type="button" onClick={onToggleEnabled} className={`relative h-6 w-11 rounded-full transition ${enabled ? "bg-emerald-500" : "bg-gray-300"}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${enabled ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">優惠內容（用戶看到的文字）</label>
            <textarea value={content} onChange={(e) => onContentChange(e.target.value)} rows={5} placeholder="例：即日起報名享早鳥優惠折扣 NT$500！&#10;加碼贈送：免費 WiFi 機&#10;活動期限：2026/06/30 止" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-sky-400" />
          </div>
          <button type="button" disabled={saving} onClick={onSave} className="w-full rounded-full bg-sky-600 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:opacity-60">{saving ? "儲存中..." : "儲存"}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

interface PromoPopupModalProps {
  isOpen: boolean;
  content: string;
  onClose: () => void;
}

export function PromoPopupModal({ isOpen, content, onClose }: PromoPopupModalProps) {
  if (!isOpen || !content) return null;

  return createPortal(
    <div className="fixed inset-0 z-modal-top flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="relative rounded-t-2xl bg-gradient-to-r from-red-500 to-rose-500 px-5 py-4">
          <h3 className="text-lg font-black text-white">🎉 限時優惠</h3>
          <button onClick={onClose} className="absolute right-3 top-3 rounded-full bg-white/20 p-1 text-white transition hover:bg-white/40">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="px-5 py-4">
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{content}</div>
          <a href={lineHref} target="_blank" rel="noopener noreferrer" className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#06C755] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#05b64d]">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" /></svg>
            立即 LINE 詢問優惠
          </a>
        </div>
      </div>
    </div>,
    document.body
  );
}
