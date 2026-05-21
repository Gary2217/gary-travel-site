"use client";

import Link from "next/link";

interface LegalNoticeProps {
  className?: string;
}

export default function LegalNotice({ className = "" }: LegalNoticeProps) {
  return (
    <section className={`border-t border-gray-100 pt-4 ${className}`.trim()}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">免責聲明與防詐提醒</span>
        <Link href="/privacy" className="text-[10px] text-sky-500 hover:text-sky-400">隱私權政策</Link>
      </div>

      <p className="text-[10px] leading-relaxed text-gray-400">
        本網站提供之行程、價格、航班與相關資訊僅供參考，實際內容以最終報價與服務內容為準；遇航空公司、飯店、匯率、天候或不可抗力因素，行程與費用可能調整。第三方平台（LINE、Facebook、Instagram）服務穩定性依各平台實際狀態為準。
      </p>

      <p className="mt-2 text-[10px] leading-relaxed text-gray-400">
        ⚠️ 我們不會以「旅行沒有終點」或本站名義要求匯款／轉帳至私人帳戶，也不會要求提供 ATM 操作、銀行密碼、驗證碼或信用卡完整資訊；如遇可疑訊息請先透過官方管道確認或撥打 165。
      </p>

      <p className="mt-2 text-[10px] leading-relaxed text-gray-400">
        本網站透過「聯絡我們」表單蒐集之姓名、電話、LINE ID、信箱等個人資料，僅用於回覆您的旅遊諮詢，不會提供給任何第三方。您可隨時要求查閱、更正或刪除個人資料。詳見<Link href="/privacy" className="text-sky-500 underline hover:text-sky-400">隱私權政策</Link>。
      </p>
    </section>
  );
}
