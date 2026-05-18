"use client";

import Link from "next/link";

interface LegalNoticeProps {
  className?: string;
}

export default function LegalNotice({ className = "" }: LegalNoticeProps) {
  return (
    <section className={`rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-left sm:px-3.5 sm:py-2.5 ${className}`.trim()}>
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] font-bold text-gray-800">免責聲明與防詐提醒</h4>
        <Link href="/privacy" className="text-[10px] text-sky-600 hover:text-sky-500 sm:text-[11px]">隱私權政策</Link>
      </div>

      <p className="mt-1 text-[10px] leading-4 text-gray-500 sm:text-[11px] sm:leading-5">
        本網站提供之行程、價格、航班與相關資訊僅供參考，實際內容以最終報價與服務內容為準；遇航空公司、飯店、匯率、天候或不可抗力因素，行程與費用可能調整。第三方平台（LINE、Facebook、Instagram）服務穩定性依各平台實際狀態為準。
      </p>

      <p className="mt-1 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] font-semibold leading-4 text-amber-700 sm:text-[11px] sm:leading-5">
        我們不會以「旅行沒有終點」或本站名義要求匯款／轉帳至私人帳戶，也不會要求提供 ATM 操作、銀行密碼、驗證碼或信用卡完整資訊；如遇可疑訊息請先透過官方管道確認或撥打 165。
      </p>

    </section>
  );
}
