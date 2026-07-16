"use client";

import { createPortal } from "react-dom";
import type { DepartureDate } from "@/lib/supabase";

interface MobileDatePickerModalProps {
  open: boolean;
  departureDates: DepartureDate[];
  selectedDepartureId: string | null;
  /**
   * 選定某梯次。第二個參數回傳該梯次的 label，
   * 讓行程頁自行決定是否要跳「限時優惠」促銷彈窗（該判斷需要頁面的 promoContent）。
   */
  onSelect: (id: string, label: string | null | undefined) => void;
  onClose: () => void;
}

/** 手機版全螢幕出發日期選擇（仿易飛網樣式） */
export default function MobileDatePickerModal({
  open,
  departureDates,
  selectedDepartureId,
  onSelect,
  onClose,
}: MobileDatePickerModalProps) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-modal-top flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center border-b border-gray-200 bg-[#0077b6] px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="mr-3 text-white"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="flex-1 text-center text-base font-bold text-white">出發日期</h3>
        <div className="w-8" />
      </div>

      {/* 排序提示 */}
      <div className="flex items-center justify-end border-b border-gray-100 px-4 py-2">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <span className="font-medium text-gray-700">排序</span>
          <span className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px]">日期近到遠</span>
        </div>
      </div>

      {/* 表頭 */}
      <div className="grid grid-cols-[1fr_44px_44px_44px_76px] items-center border-b border-gray-200 bg-gray-50 px-4 py-2 text-[11px] font-semibold text-gray-500">
        <span>出發日</span>
        <span className="text-center">團位</span>
        <span className="text-center">可售</span>
        <span className="text-center">狀態</span>
        <span className="text-right">價格</span>
      </div>

      {/* 日期列表 */}
      <div className="flex-1 overflow-y-auto">
        {departureDates.map((d) => {
          const isSelected = selectedDepartureId === d.id;
          const soldOut = d.seats_available === 0 && d.seats_total > 0;
          const dt = new Date(d.departure_date + 'T00:00:00');
          const shortDate = `${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getDate()).padStart(2, '0')}`;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => onSelect(d.id, d.label)}
              className={`grid w-full grid-cols-[1fr_44px_44px_44px_76px] items-center border-b border-gray-100 px-4 py-3.5 text-left transition ${
                isSelected ? "bg-sky-50 border-l-[3px] border-l-sky-500" : "border-l-[3px] border-l-transparent"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`text-sm font-medium ${isSelected ? 'text-sky-600' : 'text-gray-900'}`}>{shortDate}</span>
                {d.label === '保證出團' && <span className="rounded bg-red-100 px-1 py-0.5 text-[9px] font-bold text-red-600">保證出團</span>}
                {d.label === '即將成團' && <span className="rounded bg-amber-100 px-1 py-0.5 text-[9px] font-bold text-amber-600">即將成團</span>}
                {d.label === '限時優惠' && <span className="rounded bg-gradient-to-r from-red-100 to-rose-100 px-1 py-0.5 text-[9px] font-bold text-red-600">🔥 限時優惠</span>}
              </div>
              <span className="text-center text-sm text-gray-700">{d.seats_total || '—'}</span>
              <span className="text-center text-sm text-gray-700">{d.seats_available ?? '—'}</span>
              <span className="text-center">
                {soldOut
                  ? <span className="text-[11px] text-gray-400">已售罄</span>
                  : <span className="text-[11px] font-semibold text-sky-600">報名</span>
                }
              </span>
              <span className="text-right text-sm font-bold text-[#0077b6]">
                {d.price ? `NT$${d.price.toLocaleString()}` : '洽詢'}
              </span>
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  );
}
