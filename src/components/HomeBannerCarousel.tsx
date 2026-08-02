"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";

export interface HomeBanner {
  url: string;
  link: string;
}

interface HomeBannerCarouselProps {
  banners: HomeBanner[];
  isDevMode?: boolean;
  onBannersChange?: (banners: HomeBanner[]) => void;
}

export default function HomeBannerCarousel({ banners, isDevMode, onBannersChange }: HomeBannerCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [editLink, setEditLink] = useState('');
  const [savingLink, setSavingLink] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [reorderList, setReorderList] = useState<HomeBanner[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dragCounterRef = useRef(0);
  const reorderListRef = useRef<HomeBanner[]>([]);
  useEffect(() => { reorderListRef.current = reorderList; }, [reorderList]);

  // 同步當前 banner 的 link 到編輯欄
  useEffect(() => {
    setEditLink(banners[current]?.link || '');
  }, [current, banners]);

  const total = banners.length;

  const next = useCallback(() => setCurrent((c) => (c + 1) % Math.max(total, 1)), [total]);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + Math.max(total, 1)) % Math.max(total, 1)), [total]);

  // 自動播放（DevMode 下停止，方便設定每張圖的連結）
  useEffect(() => {
    if (isDevMode || total <= 1) return;
    timerRef.current = setInterval(next, 4000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isDevMode, total, next]);

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!isDevMode && total > 1) timerRef.current = setInterval(next, 4000);
  };

  const handlePrev = () => { prev(); resetTimer(); };
  const handleNext = () => { next(); resetTimer(); };
  const handleDot = (i: number) => { setCurrent(i); resetTimer(); };

  // 上傳 banner
  const uploadBanner = async (file: File) => {
    if (uploading) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/home-banners', { method: 'POST', credentials: 'include', body: fd });
      if (!res.ok) { alert('上傳失敗'); return; }
      const data = await res.json();
      onBannersChange?.(data.banners);
      setCurrent(data.banners.length - 1);
    } catch { alert('上傳失敗'); }
    finally { setUploading(false); }
  };

  // 刪除 banner
  const deleteBanner = async (url: string) => {
    if (!confirm('確定刪除此 Banner？')) return;
    const res = await fetch('/api/home-banners', {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) { alert('刪除失敗'); return; }
    const data = await res.json();
    onBannersChange?.(data.banners);
    setCurrent(0);
  };

  // 開啟排序視窗
  const openReorderModal = () => {
    setReorderList([...banners]);
    setShowReorderModal(true);
  };

  // 儲存排序結果
  const saveOrder = useCallback(async () => {
    const list = reorderListRef.current;
    setSavingOrder(true);
    try {
      const res = await fetch('/api/home-banners', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ banners: list }),
      });
      if (!res.ok) { alert('順序調整失敗'); return; }
      onBannersChange?.(list);
    } catch {
      alert('順序調整失敗');
    } finally {
      setSavingOrder(false);
    }
  }, [onBannersChange]);

  // 拖曳排序：追蹤指標移動，即時交換項目位置
  useEffect(() => {
    if (dragIndex === null) return;

    const handleMove = (e: PointerEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const row = el?.closest('[data-reorder-index]') as HTMLElement | null;
      if (!row) return;
      const overIndex = Number(row.dataset.reorderIndex);
      if (Number.isNaN(overIndex) || overIndex === dragIndex) return;
      setReorderList((prev) => {
        const updated = [...prev];
        const [moved] = updated.splice(dragIndex, 1);
        updated.splice(overIndex, 0, moved);
        return updated;
      });
      setDragIndex(overIndex);
    };

    const handleUp = () => {
      setDragIndex(null);
      void saveOrder();
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [dragIndex, saveOrder]);

  // 儲存連結
  const saveLink = async () => {
    if (savingLink) return;
    const nextLink = editLink.trim();
    const updated = banners.map((b, i) => i === current ? { ...b, link: nextLink } : b);
    setSavingLink(true);
    try {
      const res = await fetch('/api/home-banners', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ banners: updated }),
      });
      if (!res.ok) { alert('連結儲存失敗'); return; }
      onBannersChange?.(updated);
      // 儲存成功，畫面中間顯示提示
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 1800);
    } catch {
      alert('連結儲存失敗');
    } finally {
      setSavingLink(false);
    }
  };

  // 空狀態（非 DevMode 不顯示）
  if (total === 0 && !isDevMode) return null;

  return (
    <div
      className="mx-auto max-w-site px-4 py-3 sm:px-5"
    >
    <div
      className="relative w-full overflow-hidden rounded-2xl bg-gray-100"
      onDragEnter={(e) => { if (isDevMode) { e.preventDefault(); dragCounterRef.current++; setDragOver(true); } }}
      onDragOver={(e) => { if (isDevMode) e.preventDefault(); }}
      onDragLeave={() => { dragCounterRef.current--; if (dragCounterRef.current <= 0) { dragCounterRef.current = 0; setDragOver(false); } }}
      onDrop={(e) => {
        if (!isDevMode) return;
        e.preventDefault();
        dragCounterRef.current = 0;
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) void uploadBanner(file);
      }}
    >
      {/* 主圖區 */}
      <div className="relative w-full overflow-hidden">
        {total === 0 ? (
          // 空狀態（DevMode）
          <div className="flex h-[200px] w-full flex-col items-center justify-center gap-3 bg-gray-50 text-gray-400">
            <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm font-medium">點擊或拖曳圖片上傳 Banner</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400"
            >
              上傳圖片
            </button>
          </div>
        ) : (
          banners.map((banner, i) => (
            <div
              key={banner.url}
              className={`${i === 0 ? 'relative' : 'absolute inset-0'} w-full transition-opacity duration-700 ${i === current ? 'opacity-100 z-[1]' : 'opacity-0 z-0'}`}
            >
              <Image
                src={banner.url}
                alt={`Banner ${i + 1}`}
                width={1200}
                height={340}
                priority={i === 0}
                sizes="100vw"
                className="block h-auto w-full select-none pointer-events-none"
                draggable={false}
              />
              {/* 非 DevMode 時，有連結則整張圖可點擊導向 */}
              {!isDevMode && banner.link && (
                <Link href={banner.link} className="absolute inset-0 z-[1]" aria-label="查看詳情" />
              )}
              {/* DevMode 刪除按鈕 */}
              {isDevMode && i === current && (
                <button
                  type="button"
                  onClick={() => void deleteBanner(banner.url)}
                  className="absolute right-3 top-12 z-30 flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white shadow-md transition hover:bg-red-400"
                  title="刪除此 Banner"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))
        )}

        {/* 拖曳覆蓋層 */}
        {dragOver && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-sky-500/20 backdrop-blur-sm">
            <p className="text-lg font-bold text-sky-700">放開以上傳</p>
          </div>
        )}

        {/* 左右箭頭 */}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-2 top-1/2 z-[2] -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition hover:bg-black/50"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-2 top-1/2 z-[2] -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition hover:bg-black/50"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* 底部 dots */}
        {total > 1 && (
          <div className="absolute bottom-2.5 left-1/2 z-[2] flex -translate-x-1/2 gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleDot(i)}
                className={`h-1.5 rounded-full transition-all ${i === current ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* DevMode 工具列 */}
      {isDevMode && (
        <div className="flex items-center gap-2 border-t border-gray-100 bg-gray-50 px-3 py-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 rounded-full bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-400 disabled:opacity-50"
          >
            {uploading ? (
              <>
                <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                上傳中...
              </>
            ) : (
              <>
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                新增 Banner
              </>
            )}
          </button>
          {total > 1 && (
            <button
              type="button"
              onClick={openReorderModal}
              className="flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-sky-400 hover:text-sky-600"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              調整順序
            </button>
          )}
          <span className="text-xs text-gray-400">{total} 張 · 建議尺寸 1200×340px（JPG/PNG/WebP，8MB 以內）</span>
        </div>
      )}
      {/* DevMode 連結設定 */}
      {isDevMode && total > 0 && (
        <div className="flex items-center gap-2 border-t border-gray-100 bg-gray-50 px-3 py-1.5">
          <span className="shrink-0 text-xs text-gray-400">🔗 點擊導向</span>
          <input
            value={editLink}
            onChange={(e) => setEditLink(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void saveLink(); } }}
            placeholder="輸入連結（如 /destination/xxx 或 https://...）"
            className="flex-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700 outline-none focus:border-sky-400"
          />
          <button
            type="button"
            onClick={() => void saveLink()}
            disabled={savingLink}
            className="shrink-0 rounded-lg bg-sky-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-sky-500 disabled:opacity-50"
          >
            {savingLink ? '儲存中...' : '確定'}
          </button>
        </div>
      )}

      {/* 儲存成功提示（畫面中間） */}
      {showSaved && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-2 rounded-2xl bg-white px-6 py-4 text-base font-semibold text-gray-900 shadow-2xl border border-gray-200">
            <span className="text-emerald-500">✅</span>
            <span>儲存成功</span>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void uploadBanner(file);
          e.target.value = '';
        }}
      />

      {/* 調整順序視窗 */}
      {showReorderModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowReorderModal(false)}
        >
          <div
            className="flex max-h-[80vh] w-full max-w-sm flex-col rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <h3 className="text-sm font-bold text-gray-900">調整 Banner 順序</h3>
              <button
                type="button"
                onClick={() => setShowReorderModal(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {reorderList.map((banner, i) => (
                <div
                  key={banner.url}
                  data-reorder-index={i}
                  className={`flex touch-none items-center gap-3 rounded-xl border p-2 transition ${
                    dragIndex === i ? 'border-sky-400 bg-sky-50 shadow-md' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div
                    onPointerDown={(e) => { e.preventDefault(); setDragIndex(i); }}
                    className="flex h-8 w-8 shrink-0 cursor-grab items-center justify-center text-gray-400 active:cursor-grabbing"
                    title="按住拖曳排序"
                  >
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M7 4a1 1 0 100 2 1 1 0 000-2zm6 0a1 1 0 100 2 1 1 0 000-2zM7 9a1 1 0 100 2 1 1 0 000-2zm6 0a1 1 0 100 2 1 1 0 000-2zm-6 5a1 1 0 100 2 1 1 0 000-2zm6 0a1 1 0 100 2 1 1 0 000-2z" />
                    </svg>
                  </div>
                  <Image
                    src={banner.url}
                    alt={`Banner ${i + 1}`}
                    width={80}
                    height={48}
                    className="h-12 w-20 shrink-0 rounded-lg object-cover"
                    draggable={false}
                  />
                  <div className="min-w-0 flex-1 truncate text-xs text-gray-500">
                    {banner.link || '（無連結）'}
                  </div>
                  <span className="shrink-0 text-xs font-bold text-gray-400">{i + 1}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
              <span className="text-xs text-gray-400">{savingOrder ? '儲存中...' : '拖曳把手調整順序，自動儲存'}</span>
              <button
                type="button"
                onClick={() => setShowReorderModal(false)}
                className="rounded-lg bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-500"
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
