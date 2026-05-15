"use client";

import { useEffect, useState } from "react";

interface MaintenanceGuardProps {
  children: React.ReactNode;
}

export default function MaintenanceGuard({ children }: MaintenanceGuardProps) {
  const [status, setStatus] = useState<"loading" | "ok" | "maintenance">("loading");

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch("/api/maintenance", { cache: "no-store" });
        const data = await res.json();

        if (data.enabled && !data.isDevUser) {
          setStatus("maintenance");
        } else {
          setStatus("ok");
        }
      } catch {
        // API 失敗時不擋用戶
        setStatus("ok");
      }
    }

    check();
  }, []);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-900">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-sky-500 border-r-transparent" />
          <p className="mt-4 text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  if (status === "maintenance") {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center text-gray-900">
        {/* 開發者入口 */}
        <button
          onClick={() => { window.location.href = "/api/dev-auth/start"; }}
          className="absolute right-4 top-4 rounded-full p-2 text-gray-200 transition hover:text-gray-400"
          title="開發者登入"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2.5" />
            <circle cx="12" cy="12" r="2.5" />
            <circle cx="12" cy="19" r="2.5" />
          </svg>
        </button>
        <div className="rounded-[1.75rem] border border-gray-200 bg-white px-8 py-12 shadow-lg sm:px-12 sm:py-16">
          <div className="text-5xl">🔄</div>
          <h1 className="mt-6 text-2xl font-bold sm:text-3xl">網站更新中</h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-600 sm:text-base">
            網站正在更新，請稍後再回來
          </p>
          <p className="mt-1 text-xs text-gray-500">
            造成不便敬請見諒
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
