"use client";

import { useState, useEffect } from "react";

interface DevModeToggleProps {
  onToggle: (enabled: boolean) => void;
}

export default function DevModeToggle({ onToggle }: DevModeToggleProps) {
  const [isDevMode, setIsDevMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    async function loadAuth() {
      setMounted(true);
      const res = await fetch("/api/dev-auth/status", { cache: "no-store" });
      const data = (await res.json()) as { authorized?: boolean };
      const authorized = Boolean(data.authorized);
      setIsDevMode(authorized);
      onToggle(authorized);
    }

    loadAuth();
  }, []);

  const handleToggle = () => {
    window.location.href = "/api/dev-auth/start";
  };

  // 避免 hydration 錯誤
  if (!mounted) {
    return null;
  }

  return (
    <button
      onClick={handleToggle}
      className={`fixed right-3 top-3 z-[9999] inline-flex h-10 w-10 items-center justify-center rounded-full border-0 shadow-none backdrop-blur-sm transition ${
        isDevMode
          ? 'bg-gray-800/90 text-white hover:bg-gray-700 hover:scale-105'
          : 'bg-gray-800/70 text-white/85 hover:bg-gray-700 hover:text-white'
      }`}
      title={isDevMode ? '重新驗證 LINE Login' : 'LINE 登入驗證'}
    >
      {isDevMode ? (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ) : (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2C6.48 2 2 5.94 2 10.8c0 2.77 1.52 5.2 3.89 6.82V22l4.28-2.35c.59.16 1.21.25 1.83.25 5.52 0 10-3.94 10-8.8S17.52 2 12 2z" />
        </svg>
      )}
    </button>
  );
}
