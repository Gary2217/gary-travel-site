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
    setMounted(true);
    // 檢查是否為授權用戶（使用簡單的密碼驗證）
    const devPassword = localStorage.getItem('dev_password');
    const envPassword = process.env.NEXT_PUBLIC_DEV_PASSWORD;
    if (devPassword && envPassword && devPassword === envPassword) {
      setIsAuthorized(true);
    }
  }, []);

  const handleToggle = () => {
    if (!isAuthorized) {
      const password = prompt('請輸入開發者密碼：');
      const envPassword = process.env.NEXT_PUBLIC_DEV_PASSWORD || 'Gary2217';
      if (password === envPassword) {
        localStorage.setItem('dev_password', password);
        setIsAuthorized(true);
        setIsDevMode(true);
        onToggle(true);
      } else {
        alert('密碼錯誤！');
      }
    } else {
      const newState = !isDevMode;
      setIsDevMode(newState);
      onToggle(newState);
    }
  };

  // 避免 hydration 錯誤
  if (!mounted) {
    return null;
  }

  // 始終顯示按鈕
  if (!isAuthorized && !isDevMode) {
    return (
      <button
        onClick={handleToggle}
        className="fixed right-4 top-20 z-50 rounded-full bg-gray-800/80 p-2.5 text-white/70 backdrop-blur-sm transition hover:bg-gray-700/80 hover:text-white hover:scale-110"
        title="開發者模式"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      className={`fixed right-4 top-4 z-50 flex items-center gap-2 rounded-full px-4 py-2 font-semibold backdrop-blur-sm transition ${
        isDevMode
          ? 'bg-green-600 text-white shadow-lg shadow-green-600/50'
          : 'bg-gray-800/50 text-white/70 hover:bg-gray-700/50 hover:text-white'
      }`}
    >
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      <span className="text-sm">{isDevMode ? '已啟用' : '開發者模式'}</span>
    </button>
  );
}
