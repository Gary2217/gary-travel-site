"use client";

import { createPortal } from "react-dom";
import {
  displayAdultUnit,
  displayChildPrice,
  displayInfantUnit,
  formatSingleRoomText,
  type PriceDetailContent,
} from "./tripShared";

interface PriceInfoModalProps {
  isOpen: boolean;
  detail: PriceDetailContent;
  onClose: () => void;
}

export default function PriceInfoModal({ isOpen, detail, onClose }: PriceInfoModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-modal-top flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl sm:max-w-md sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-bold text-sky-600">$</span>
            <h3 className="text-base font-bold text-gray-900">售價說明</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 transition hover:text-gray-700">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-x-4 gap-y-2 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm">
          <div><div className="text-[11px] text-gray-500">大人</div><div className="font-bold text-sky-600">{displayAdultUnit(detail.adultPrice)}</div></div>
          <div><div className="text-[11px] text-gray-500">小孩佔床</div><div className="font-bold text-gray-900">{displayChildPrice(detail.childWithBedPrice)}</div></div>
          <div><div className="text-[11px] text-gray-500">小孩不佔床</div><div className="font-bold text-sky-600">{displayChildPrice(detail.childNoBedPrice)}</div></div>
          <div><div className="text-[11px] text-gray-500">加床</div><div className="font-bold text-gray-900">{displayChildPrice(detail.childExtraBedPrice)}</div></div>
          <div><div className="text-[11px] text-gray-500">嬰兒</div><div className="font-bold text-sky-600">{displayInfantUnit(detail.infantPrice)}</div></div>
          <div><div className="text-[11px] text-gray-500">單人房差</div><div className="font-bold text-sky-600">{formatSingleRoomText(detail.singleRoom)}</div></div>
        </div>

        <div className="mt-3 space-y-2 text-sm">
          {(detail.surcharge || detail.visaFee) && (
            <div className="flex gap-2">
              <span className="shrink-0 font-medium text-sky-600">○ 包含項目</span>
              <span className="text-gray-600">{[detail.surcharge, detail.visaFee].filter((value) => value && value !== "售價已內含" && value !== "免簽證").join("，") || "含機場稅燃油附加費"}</span>
            </div>
          )}
          {detail.quoteNote && detail.quoteNote !== "《無特殊說明》" && (
            <div className="flex gap-2">
              <span className="shrink-0 font-medium text-red-400">× 不包含項目</span>
              <span className="text-gray-600">{detail.quoteNote}</span>
            </div>
          )}
        </div>

        <button onClick={onClose} className="mt-5 w-full rounded-full bg-sky-600 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500">關閉</button>
      </div>
    </div>,
    document.body
  );
}
