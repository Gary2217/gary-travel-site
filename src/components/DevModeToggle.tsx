"use client";

import { useState, useEffect } from "react";
import ContactInquiries from "./ContactInquiries";

interface DevModeToggleProps {
  onToggle: (enabled: boolean) => void;
}

export default function DevModeToggle({ onToggle }: DevModeToggleProps) {
  const [isDevMode, setIsDevMode] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [maintenanceOn, setMaintenanceOn] = useState(false);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [showInquiries, setShowInquiries] = useState(false);

  // 同步 dev mode 狀態到 body attribute（供全域 CSS 使用）
  useEffect(() => {
    if (isDevMode) {
      document.body.setAttribute('data-dev-mode', 'true');
    } else {
      document.body.removeAttribute('data-dev-mode');
    }
  }, [isDevMode]);

  // 開發者模式：讓圖片可右鍵存檔 / 長按儲存
  useEffect(() => {
    if (!isDevMode) {
      // 還原被設定 pointer-events:none 的遮罩
      document.querySelectorAll('[data-dev-passthrough]').forEach(el => {
        (el as HTMLElement).style.pointerEvents = '';
        el.removeAttribute('data-dev-passthrough');
      });
      return;
    }

    // 1) gradient 遮罩設為 pointer-events:none，讓右鍵/長按穿透到底下的 <img>
    function disableOverlays() {
      document.querySelectorAll<HTMLElement>('[class*="absolute"][class*="inset-0"]').forEach(el => {
        if (el.getAttribute('data-dev-passthrough') !== null) return;
        const bg = getComputedStyle(el).backgroundImage;
        if (bg && bg.includes('gradient')) {
          el.style.pointerEvents = 'none';
          el.setAttribute('data-dev-passthrough', '');
        }
      });
    }

    disableOverlays();
    const observer = new MutationObserver(disableOverlays);
    observer.observe(document.body, { childList: true, subtree: true });

    // 2) 在圖片容器上注入下載按鈕
    function injectDownloadButtons() {
      // 找所有定位容器內的 <img>（含 Next.js Image）
      document.querySelectorAll<HTMLElement>('img:not([data-dev-overlay]):not([data-dev-btn-done])').forEach(img => {
        const src = (img as HTMLImageElement).src;
        if (!src || src.includes('data:') || img.closest('[data-dev-btn-done]')) return;
        // 找最近的定位父容器
        let container = img.parentElement;
        while (container && getComputedStyle(container).position === 'static') {
          container = container.parentElement;
        }
        if (!container || container.querySelector('[data-dev-dl]')) return;
        container.setAttribute('data-dev-btn-done', '');
        const btn = document.createElement('button');
        btn.setAttribute('data-dev-dl', '');
        btn.title = '下載圖片';
        btn.style.cssText = 'position:absolute;top:6px;right:6px;z-index:50;width:32px;height:32px;border-radius:8px;background:rgba(0,0,0,0.6);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.15s;pointer-events:auto;';
        btn.innerHTML = '<svg width="16" height="16" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M12 5v14M5 12l7 7 7-7"/></svg>';
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const a = document.createElement('a');
          a.href = src;
          a.download = src.split('/').pop()?.split('?')[0] || 'image';
          a.click();
        });
        container.addEventListener('mouseenter', () => { btn.style.opacity = '1'; });
        container.addEventListener('mouseleave', () => { btn.style.opacity = '0'; });
        container.appendChild(btn);
      });
      // 找所有 background-image 元素
      document.querySelectorAll<HTMLElement>('[style*="background-image"]:not([data-dev-btn-done])').forEach(el => {
        const bg = el.style.backgroundImage;
        if (!bg || bg === 'none') return;
        const match = bg.match(/url\(["']?(.+?)["']?\)/);
        if (!match || el.querySelector('[data-dev-dl]')) return;
        el.setAttribute('data-dev-btn-done', '');
        const pos = getComputedStyle(el).position;
        if (pos === 'static') el.style.position = 'relative';
        const btn = document.createElement('button');
        btn.setAttribute('data-dev-dl', '');
        btn.title = '下載圖片';
        btn.style.cssText = 'position:absolute;top:6px;right:6px;z-index:50;width:32px;height:32px;border-radius:8px;background:rgba(0,0,0,0.6);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.15s;pointer-events:auto;';
        btn.innerHTML = '<svg width="16" height="16" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M12 5v14M5 12l7 7 7-7"/></svg>';
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const a = document.createElement('a');
          a.href = match[1];
          a.download = match[1].split('/').pop()?.split('?')[0] || 'image';
          a.click();
        });
        el.addEventListener('mouseenter', () => { btn.style.opacity = '1'; });
        el.addEventListener('mouseleave', () => { btn.style.opacity = '0'; });
        el.appendChild(btn);
      });
    }

    injectDownloadButtons();
    const btnObserver = new MutationObserver(injectDownloadButtons);
    btnObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      btnObserver.disconnect();
      document.querySelectorAll('[data-dev-dl]').forEach(el => el.remove());
      document.querySelectorAll('[data-dev-btn-done]').forEach(el => el.removeAttribute('data-dev-btn-done'));
      document.querySelectorAll('[data-dev-passthrough]').forEach(el => {
        (el as HTMLElement).style.pointerEvents = '';
        el.removeAttribute('data-dev-passthrough');
      });
    };
  }, [isDevMode]);

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
    <>
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
          <button
            onClick={() => setShowInquiries(!showInquiries)}
            className={`inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold text-white transition sm:h-8 sm:px-3 sm:text-xs ${
              showInquiries ? "bg-violet-500" : "bg-violet-500/80 hover:bg-violet-500"
            }`}
            title="聯絡表單記錄"
          >
            <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            表單
          </button>
        </>
      )}
      <button
        onClick={handleToggle}
        className={`inline-flex h-7 w-7 items-center justify-center rounded-full transition active:scale-90 sm:h-8 sm:w-8 ${
          isDevMode
            ? "bg-sky-500/80 text-white"
            : "bg-transparent text-gray-300 hover:text-gray-500"
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

    {/* 聯絡表單記錄浮動面板 */}
    {showInquiries && (
      <div className="fixed inset-0 z-modal flex items-start justify-center pt-16 px-4" onClick={() => setShowInquiries(false)}>
        <div className="absolute inset-0 bg-black/50" />
        <div
          className="relative w-full max-w-3xl max-h-[80vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setShowInquiries(false)}
            className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <ContactInquiries defaultOpen />
        </div>
      </div>
    )}
    </>
  );
}
