"use client";

import { createPortal } from "react-dom";

interface SourceUrlModalProps {
  open: boolean;
  draft: string;
  saving: boolean;
  onDraftChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
}

/** 開發者模式：設定此行程的朋威來源網址（供「抓取此行程」使用） */
export default function SourceUrlModal({ open, draft, saving, onDraftChange, onSave, onClose }: SourceUrlModalProps) {
  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-modal-top flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="text-base font-bold text-gray-900">🔗 朋威來源網址</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        <div className="px-5 py-4">
          <p className="mb-2 text-xs leading-relaxed text-gray-500">
            貼上此行程在朋威旅行社的<strong className="text-gray-700">行程詳情頁</strong>網址（例：
            <span className="break-all text-sky-600">https://www.pwgotravel.com.tw/products/group/...</span>）。
            設定後即可用「🔄 抓取此行程」自動更新價格、出發日期、航班等資料。
          </p>
          <input
            type="url"
            value={draft}
            onChange={e => onDraftChange(e.target.value)}
            placeholder="https://www.pwgotravel.com.tw/products/group/..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          {draft.trim().startsWith('http') && (
            <a
              href={draft.trim()}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex items-start gap-1 break-all text-xs font-semibold text-sky-600 transition hover:text-sky-500"
            >
              ↗ 在朋威開啟此行程（點擊確認是不是同一個行程）
            </a>
          )}
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-500 transition hover:bg-gray-100"
            >
              取消
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:opacity-60"
            >
              {saving ? '儲存中...' : '儲存'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
