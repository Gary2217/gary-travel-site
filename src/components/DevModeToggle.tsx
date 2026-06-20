"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
  const [showReloginToast, setShowReloginToast] = useState(false);
  const [scrapePendingCount, setScrapePendingCount] = useState(0);

  // 同步 dev mode 狀態到 body attribute（供全域 CSS 使用）
  useEffect(() => {
    if (isDevMode) {
      document.body.setAttribute('data-dev-mode', 'true');
    } else {
      document.body.removeAttribute('data-dev-mode');
    }
  }, [isDevMode]);

  // 全域攔截 fetch 401，偵測開發者登入過期
  useEffect(() => {
    if (!isDevMode) return;
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const res = await originalFetch(...args);
      if (res.status === 401) {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
        if (url.includes('/api/') && !url.includes('/api/dev-auth/')) {
          setShowReloginToast(true);
        }
      }
      return res;
    };
    return () => { window.fetch = originalFetch; };
  }, [isDevMode]);

  // 開發者模式：右鍵圖片區域 → 開新分頁顯示原圖（獨立 useEffect 確保一定註冊）
  useEffect(() => {
    if (!isDevMode) return;
    function handler(e: MouseEvent) {
      const t = e.target as HTMLElement;
      if (t.tagName === 'IMG') return;
      let el: HTMLElement | null = t;
      for (let i = 0; el && el !== document.body && i < 6; i++, el = el.parentElement) {
        // 找同層的 <img>（大於 50px 才算內容圖片）
        for (const child of Array.from(el.children)) {
          if (child.tagName === 'IMG') {
            const img = child as HTMLImageElement;
            if (img.src && img.clientHeight > 50) {
              e.preventDefault();
              window.open(img.src, '_blank');
              return;
            }
          }
          const cEl = child as HTMLElement;
          if (cEl.style?.backgroundImage && cEl.style.backgroundImage !== 'none') {
            const m = cEl.style.backgroundImage.match(/url\(["']?(.+?)["']?\)/);
            if (m) { e.preventDefault(); window.open(m[1], '_blank'); return; }
          }
        }
      }
    }
    document.addEventListener('contextmenu', handler);
    return () => document.removeEventListener('contextmenu', handler);
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

    // 3) 右鍵圖片容器 → 開新分頁顯示原圖（只在有 data-dev-btn-done 的容器內觸發）
    function handleContextMenu(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG') return; // 直接點到 img → 瀏覽器原生處理
      // 往上找最近的圖片容器（有 data-dev-btn-done 標記的）
      const container = target.closest('[data-dev-btn-done]') as HTMLElement | null;
      if (!container) return;
      // 從容器取得圖片 URL
      let url: string | null = null;
      const bg = container.style.backgroundImage;
      if (bg && bg !== 'none') {
        const m = bg.match(/url\(["']?(.+?)["']?\)/);
        if (m) url = m[1];
      }
      if (!url) {
        const img = container.querySelector('img') as HTMLImageElement | null;
        if (img?.src) url = img.src;
      }
      if (url) {
        e.preventDefault();
        window.open(url, '_blank');
      }
    }

    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      observer.disconnect();
      btnObserver.disconnect();
      document.removeEventListener('contextmenu', handleContextMenu);
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

      // 先前有開過 dev mode 但 auth 已過期 → 彈出重新登入提示
      if (!authorized && storedEnabled === "1") {
        setShowReloginToast(true);
      }

      // 載入維護模式狀態 + 抓取待確認數量
      if (authorized) {
        try {
          const mRes = await fetch("/api/maintenance", { cache: "no-store" });
          const mData = await mRes.json();
          setMaintenanceOn(Boolean(mData.enabled));
        } catch {
          // 靜默失敗
        }
        try {
          const sRes = await fetch("/api/scrape/changes?status=pending&count_only=1", { cache: "no-store", credentials: "include" });
          if (sRes.ok) {
            const sData = await sRes.json();
            setScrapePendingCount(typeof sData.count === "number" ? sData.count : Array.isArray(sData) ? sData.length : 0);
          }
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
          <a
            href="/admin?tab=scrape"
            className="relative inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-500/80 text-white transition hover:bg-sky-500 sm:h-8 sm:w-8"
            title="行程抓取通知"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {scrapePendingCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                {scrapePendingCount}
              </span>
            )}
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
          <button
            onClick={() => { window.location.href = "/api/dev-auth/start"; }}
            className="inline-flex h-7 items-center gap-1 rounded-full bg-gray-500/80 px-2.5 text-[11px] font-semibold text-white transition hover:bg-gray-500 sm:h-8 sm:px-3 sm:text-xs"
            title="重新登入開發者模式"
          >
            <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            重登
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

    {/* 開發者登入過期提示 — Portal 到 body，避免被 header backdrop-filter 的 containing block 限制 */}
    {showReloginToast && createPortal(
      <div className="fixed inset-0 z-modal-top flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm" onClick={() => setShowReloginToast(false)}>
        <div className="w-full max-w-xs rounded-2xl border border-amber-300 bg-white p-5 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-sm font-bold text-gray-900">開發者登入已過期</p>
          <p className="mt-1 text-xs text-gray-500">儲存操作需要重新登入才能繼續</p>
          <button
            onClick={() => { window.location.href = "/api/dev-auth/start"; }}
            className="mt-4 w-full rounded-full bg-sky-600 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
          >
            立即重新登入
          </button>
          <button
            onClick={() => setShowReloginToast(false)}
            className="mt-2 w-full rounded-full border border-gray-200 py-2 text-sm text-gray-500 transition hover:bg-gray-50"
          >
            稍後再說
          </button>
        </div>
      </div>,
      document.body,
    )}

    {/* 聯絡表單記錄浮動面板 — Portal 到 body */}
    {showInquiries && createPortal(
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
      </div>,
      document.body,
    )}
    </>
  );
}
