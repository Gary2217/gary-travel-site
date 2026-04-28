"use client";

import { useState, useEffect } from "react";

interface DevModeToggleProps {
  onToggle: (enabled: boolean) => void;
}

export default function DevModeToggle({ onToggle }: DevModeToggleProps) {
  const [isDevMode, setIsDevMode] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [maintenanceOn, setMaintenanceOn] = useState(false);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);

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

      // 載入維護模式狀態
      if (authorized) {
        try {
          const mRes = await fetch("/api/maintenance", { cache: "no-store" });
          const mData = await mRes.json();
          setMaintenanceOn(Boolean(mData.enabled));
        } catch {
          // 靜默失敗
        }
      }
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

  const handleMaintenanceToggle = async () => {
    if (maintenanceLoading) return;

    setMaintenanceLoading(true);
    try {
      const nextState = !maintenanceOn;
      const res = await fetch("/api/maintenance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextState }),
      });

      if (res.ok) {
        setMaintenanceOn(nextState);
      }
    } catch {
      // 靜默失敗
    } finally {
      setMaintenanceLoading(false);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5">
      {isDevMode && (
        <>
          <button
            onClick={handleMaintenanceToggle}
            disabled={maintenanceLoading}
            className={`inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold text-white transition sm:h-8 sm:px-3 sm:text-xs ${
              maintenanceOn
                ? "bg-red-500/80 hover:bg-red-500"
                : "bg-emerald-600/80 hover:bg-emerald-600"
            } ${maintenanceLoading ? "opacity-50" : ""}`}
            title={maintenanceOn ? "點擊開放網站" : "點擊關閉網站（維護模式）"}
          >
            {maintenanceOn ? (
              <>
                <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                已關閉
              </>
            ) : (
              <>
                <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                已上線
              </>
            )}
          </button>
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
        </>
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
