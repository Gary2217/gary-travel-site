"use client";

import { useState, useEffect, useRef, useCallback } from "react";

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dragCounterRef = useRef(0);

  // 同步當前 banner 的 link 到編輯欄
  useEffect(() => {
    setEditLink(banners[current]?.link || '');
  }, [current, banners]);

  const total = banners.length;

  const next = useCallback(() => setCurrent((c) => (c + 1) % Math.max(total, 1)), [total]);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + Math.max(total, 1)) % Math.max(total, 1)), [total]);

  // 自動播放
  useEffect(() => {
    if (total <= 1) return;
    timerRef.current = setInterval(next, 4000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [total, next]);

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (total > 1) timerRef.current = setInterval(next, 4000);
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

  // 儲存連結
  const saveLink = async () => {
    const currentLink = banners[current]?.link || '';
    if (editLink === currentLink) return; // 沒改不送
    const updated = banners.map((b, i) => i === current ? { ...b, link: editLink } : b);
    onBannersChange?.(updated);
    try {
      const res = await fetch('/api/home-banners', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ banners: updated }),
      });
      if (!res.ok) alert('連結儲存失敗');
    } catch { alert('連結儲存失敗'); }
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
              <img
                src={banner.url}
                alt={`Banner ${i + 1}`}
                className="block w-full h-auto select-none pointer-events-none"
                draggable={false}
              />
              {/* 非 DevMode 時，有連結則可點擊導向 */}
              {!isDevMode && banner.link && (
                <a
                  href={banner.link}
                  className="absolute inset-0 z-[1] cursor-pointer"
                />
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
            onBlur={() => void saveLink()}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
            placeholder="輸入連結（如 /destination/xxx 或 https://...）"
            className="flex-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700 outline-none focus:border-sky-400"
          />
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
    </div>
    </div>
  );
}
