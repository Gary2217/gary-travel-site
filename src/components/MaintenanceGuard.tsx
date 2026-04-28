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
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#0b0f2a_0%,#0a0a0a_50%,#1a0d0d_100%)] text-white">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-sky-400 border-r-transparent" />
          <p className="mt-4 text-white/70">載入中...</p>
        </div>
      </div>
    );
  }

  if (status === "maintenance") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[linear-gradient(135deg,#0b0f2a_0%,#0a0a0a_50%,#1a0d0d_100%)] px-4 text-center text-white">
        <div className="rounded-[1.75rem] border border-white/10 bg-[rgba(20,20,30,0.65)] px-8 py-12 shadow-lg backdrop-blur-[12px] sm:px-12 sm:py-16">
          <div className="text-5xl">🔄</div>
          <h1 className="mt-6 text-2xl font-bold sm:text-3xl">網站更新中</h1>
          <p className="mt-3 text-sm leading-relaxed text-white/70 sm:text-base">
            網站正在更新，請稍後再回來
          </p>
          <p className="mt-1 text-xs text-white/50">
            造成不便敬請見諒
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
