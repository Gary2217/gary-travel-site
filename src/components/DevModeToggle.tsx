"use client";

import { useState, useEffect } from "react";

interface DevModeToggleProps {
  onToggle: (enabled: boolean) => void;
}

export default function DevModeToggle({ onToggle }: DevModeToggleProps) {
  const [isDevMode, setIsDevMode] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    async function loadAuth() {
      setMounted(true);
      const res = await fetch("/api/dev-auth/status", { cache: "no-store" });
      const data = (await res.json()) as { authorized?: boolean };
      const authorized = Boolean(data.authorized);
      setIsAuthorized(authorized);

      const storedEnabled = localStorage.getItem("dev_mode_enabled");
      const enabled = authorized && storedEnabled !== "0";
      setIsDevMode(enabled);
      onToggle(enabled);
    }

    loadAuth();
  }, []);

  const handleToggle = () => {
    if (!isAuthorized) {
      window.location.href = "/api/dev-auth/start";
      return;
    }

    const nextState = !isDevMode;
    setIsDevMode(nextState);
    localStorage.setItem("dev_mode_enabled", nextState ? "1" : "0");
    onToggle(nextState);
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5">
      {isDevMode && (
        <a
          href="/admin"
          className="inline-flex h-7 items-center gap-1 rounded-full bg-amber-500/80 px-2.5 text-[11px] font-semibold text-white transition hover:bg-amber-500 sm:h-8 sm:px-3 sm:text-xs"
          title="後台管理"
        >
          <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          後台
        </a>
      )}
      <button
        onClick={handleToggle}
        className={`inline-flex h-7 w-7 items-center justify-center rounded-full transition active:scale-90 sm:h-8 sm:w-8 ${
          isDevMode
            ? "bg-sky-500/80 text-white"
            : "bg-transparent text-white/20 hover:text-white/40"
        }`}
        title={isDevMode ? "關閉開發者模式" : isAuthorized ? "啟用開發者模式" : "LINE 登入驗證"}
      >
        <svg className="h-3 w-3 sm:h-3.5 sm:w-3.5" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="2.5" />
          <circle cx="12" cy="12" r="2.5" />
          <circle cx="12" cy="19" r="2.5" />
        </svg>
      </button>
    </div>
  );
}
