"use client";

import { useState, useEffect } from "react";
import { getSiteLogo } from "@/lib/supabase";
import StickyHeader from "@/components/StickyHeader";

export default function PrivacyPage() {
  const [siteLogoUrl, setSiteLogoUrl] = useState("/travel-logo.svg");

  useEffect(() => {
    getSiteLogo().then(setSiteLogoUrl).catch(() => setSiteLogoUrl("/travel-logo.svg"));
  }, []);

  return (
    <main className="min-h-screen pt-header">
      <StickyHeader showBackButton logoUrl={siteLogoUrl} />

      <section className="mx-auto max-w-3xl px-4 py-8 md:px-6">
        <h1 className="text-2xl font-bold text-gray-900">隱私權政策</h1>
        <p className="mt-2 text-sm text-gray-500">最後更新日期：2025 年 5 月</p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-gray-700">
          <section>
            <h2 className="mb-2 text-base font-bold text-gray-900">一、個人資料的蒐集</h2>
            <p>
              當您透過本網站的「聯絡我們」表單或社群平台（LINE、Facebook、Instagram）聯繫我們時，我們可能會蒐集以下資訊：
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-gray-600">
              <li>姓名</li>
              <li>電子郵件地址</li>
              <li>電話號碼</li>
              <li>您填寫的諮詢內容</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-gray-900">二、資料使用目的</h2>
            <p>我們蒐集的個人資料僅用於以下目的：</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-gray-600">
              <li>回覆您的旅遊諮詢</li>
              <li>提供旅遊行程報價與規劃服務</li>
              <li>改善網站服務品質</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-gray-900">三、資料保護</h2>
            <p>
              您的個人資料儲存於受加密保護的雲端資料庫（Supabase），我們採取合理的安全措施防止資料遭到未經授權的存取、修改或洩露。
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-gray-900">四、第三方服務</h2>
            <p>本網站使用以下第三方服務：</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-gray-600">
              <li><strong>Vercel</strong> — 網站託管服務</li>
              <li><strong>Supabase</strong> — 資料庫與檔案儲存</li>
              <li><strong>Google Analytics</strong> — 匿名網站流量分析（不蒐集個人識別資料）</li>
              <li><strong>LINE / Facebook / Instagram</strong> — 社群平台聯繫管道</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-gray-900">五、Cookie 使用</h2>
            <p>
              本網站使用必要的 Cookie 維持網站正常運作，以及 Google Analytics 的分析 Cookie 了解網站使用情況。您可透過瀏覽器設定管理或停用 Cookie。
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-gray-900">六、您的權利</h2>
            <p>您有權要求：</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-gray-600">
              <li>查閱我們所持有您的個人資料</li>
              <li>更正或刪除您的個人資料</li>
              <li>停止使用您的個人資料</li>
            </ul>
            <p className="mt-2">如需行使上述權利，請透過 LINE 官方帳號或網站「聯絡我們」功能與我們聯繫。</p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-gray-900">七、政策變更</h2>
            <p>
              我們可能不定期更新本隱私權政策。更新後的政策將於本頁面公布，建議您定期查閱。
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-gray-900">八、聯絡方式</h2>
            <p>
              如對本隱私權政策有任何疑問，歡迎透過 LINE 官方帳號或網站「聯絡我們」功能與我們聯繫。
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
