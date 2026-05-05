"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { uploadTripBannerImage } from "@/lib/supabase";

export interface SideMedia {
  id: string;
  trip_id: string;
  media_type: "image" | "instagram_video";
  url: string;
  display_order: number;
}

interface SideMediaCarouselProps {
  tripId: string;
  fallbackImageUrl?: string;
  tripTitle: string;
  isDevMode: boolean;
}

// 從 IG 網址取得嵌入用的短碼
function getIgPostId(url: string): string | null {
  const match = url.match(/instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}

export default function SideMediaCarousel({
  tripId,
  fallbackImageUrl,
  tripTitle,
  isDevMode,
}: SideMediaCarouselProps) {
  const [mediaList, setMediaList] = useState<SideMedia[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [igUrl, setIgUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 載入媒體
  const fetchMedia = useCallback(async () => {
    try {
      const res = await fetch(`/api/trip-side-media?trip_id=${tripId}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setMediaList(data);
      }
    } catch {
      // 靜默失敗
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  // 自動輪播
  useEffect(() => {
    if (mediaList.length <= 1) return;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % mediaList.length);
    }, 1500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mediaList.length]);

  // 有影片時停止自動輪播
  useEffect(() => {
    if (mediaList.length > 0 && mediaList[currentIndex]?.media_type === "instagram_video") {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [currentIndex, mediaList]);

  const goTo = (index: number) => {
    setCurrentIndex(index);
    // 重設計時器
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaList.length > 1 && mediaList[index]?.media_type !== "instagram_video") {
      timerRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % mediaList.length);
      }, 1500);
    }
  };

  const goPrev = () => goTo((currentIndex - 1 + mediaList.length) % mediaList.length);
  const goNext = () => goTo((currentIndex + 1) % mediaList.length);

  // 新增 IG 影片
  const handleAddIg = async () => {
    if (!igUrl.trim() || adding) return;
    const postId = getIgPostId(igUrl.trim());
    if (!postId) {
      alert("請輸入正確的 Instagram 貼文網址");
      return;
    }

    setAdding(true);
    try {
      const res = await fetch("/api/trip-side-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trip_id: tripId,
          media_type: "instagram_video",
          url: igUrl.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "新增失敗");
        return;
      }

      setIgUrl("");
      fetchMedia();
    } catch {
      alert("新增失敗");
    } finally {
      setAdding(false);
    }
  };

  // 上傳圖片
  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || uploading) return;

    setUploading(true);
    try {
      const imageUrl = await uploadTripBannerImage(tripId, file);

      const res = await fetch("/api/trip-side-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trip_id: tripId,
          media_type: "image",
          url: imageUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "新增失敗");
        return;
      }

      fetchMedia();
    } catch (err) {
      alert(err instanceof Error ? err.message : "上傳失敗");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // 刪除媒體
  const handleDelete = async (id: string) => {
    if (!confirm("確定要刪除這個媒體嗎？")) return;

    try {
      await fetch(`/api/trip-side-media?id=${id}`, { method: "DELETE" });
      setMediaList((prev) => prev.filter((m) => m.id !== id));
      setCurrentIndex(0);
    } catch {
      alert("刪除失敗");
    }
  };

  // 無媒體時顯示 fallback
  const hasMedia = mediaList.length > 0;
  const currentMedia = hasMedia ? mediaList[currentIndex] : null;
  const isVideo = currentMedia?.media_type === "instagram_video";

  return (
    <div>
      <div className={`relative w-full overflow-hidden rounded-xl border border-white/[0.08] bg-[#1a3347] ${isVideo ? "" : "aspect-[4/3]"}`}>
        {loading ? (
          <div className="flex aspect-[4/3] items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
          </div>
        ) : hasMedia && currentMedia ? (
          <>
            {currentMedia.media_type === "image" ? (
              <img
                src={currentMedia.url}
                alt={`${tripTitle} 圖片 ${currentIndex + 1}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="relative w-full overflow-hidden" style={{ aspectRatio: "9/16" }}>
                <iframe
                  src={`https://www.instagram.com/p/${getIgPostId(currentMedia.url)}/embed/?autoplay=1&hidecaption=true`}
                  className="absolute border-0"
                  style={{
                    top: -64,
                    left: 0,
                    width: "100%",
                    height: "calc(100% + 230px)",
                  }}
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                  scrolling="no"
                />
              </div>
            )}

            {/* 左右箭頭 */}
            {mediaList.length > 1 && (
              <>
                <button
                  onClick={goPrev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white/80 transition hover:bg-black/70 hover:text-white"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={goNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white/80 transition hover:bg-black/70 hover:text-white"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            {/* 指示點 */}
            {mediaList.length > 1 && (
              <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
                {mediaList.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    className={`h-1.5 rounded-full transition ${
                      i === currentIndex ? "w-4 bg-white" : "w-1.5 bg-white/40"
                    }`}
                  />
                ))}
              </div>
            )}

            {/* 計數 */}
            <div className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white/70">
              {currentIndex + 1} / {mediaList.length}
            </div>

            {/* Dev mode: 刪除當前媒體 */}
            {isDevMode && (
              <button
                onClick={() => handleDelete(currentMedia.id)}
                className="absolute left-2 top-2 rounded-full bg-red-500/80 p-1.5 text-white transition hover:bg-red-500"
                title="刪除此媒體"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </>
        ) : fallbackImageUrl ? (
          <img src={fallbackImageUrl} alt={tripTitle} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,rgba(56,189,248,0.16),rgba(255,255,255,0.04),rgba(251,191,36,0.08))] px-8 text-center">
            <div>
              <p className="text-sm font-semibold tracking-[0.22em] text-white/55">行程形象圖</p>
              <p className="mt-3 text-base text-white/45">開發者模式可在這裡上傳圖片</p>
            </div>
          </div>
        )}
      </div>

      {/* Dev mode: 新增媒體面板 */}
      {isDevMode && (
        <div className="mt-2">
          <button
            onClick={() => setShowAddPanel(!showAddPanel)}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-sky-500/30 bg-sky-500/5 py-2 text-xs font-medium text-sky-400 transition hover:bg-sky-500/10"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            新增媒體 ({mediaList.length}/15)
          </button>

          {showAddPanel && (
            <div className="mt-2 space-y-2 rounded-xl border border-white/[0.08] bg-[#1a3347] p-3">
              {/* 上傳圖片 */}
              <div>
                <p className="mb-1.5 text-[11px] font-medium text-white/50">上傳圖片</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUploadImage}
                  className="w-full text-xs text-white/60 file:mr-2 file:rounded-lg file:border-0 file:bg-sky-500/20 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-sky-300 file:cursor-pointer hover:file:bg-sky-500/30"
                />
                {uploading && <p className="mt-1 text-[11px] text-sky-400">上傳中...</p>}
              </div>

              {/* IG 影片連結 */}
              <div>
                <p className="mb-1.5 text-[11px] font-medium text-white/50">Instagram 影片連結</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={igUrl}
                    onChange={(e) => setIgUrl(e.target.value)}
                    placeholder="https://www.instagram.com/p/xxx/ 或 /reel/xxx/"
                    className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-sky-500"
                  />
                  <button
                    onClick={handleAddIg}
                    disabled={!igUrl.trim() || adding}
                    className="shrink-0 rounded-lg bg-[#E4405F] px-3 py-2 text-xs font-semibold text-white transition hover:opacity-85 disabled:opacity-40"
                  >
                    {adding ? "新增中..." : "新增"}
                  </button>
                </div>
              </div>

              {/* 媒體列表 */}
              {mediaList.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[11px] font-medium text-white/50">已新增媒體</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {mediaList.map((m, i) => (
                      <div
                        key={m.id}
                        className={`relative cursor-pointer overflow-hidden rounded-lg border transition ${
                          i === currentIndex ? "border-sky-400" : "border-white/10"
                        }`}
                        onClick={() => goTo(i)}
                      >
                        {m.media_type === "image" ? (
                          <img src={m.url} alt="" className="aspect-square w-full object-cover" />
                        ) : (
                          <div className="flex aspect-square items-center justify-center bg-[#E4405F]/20">
                            <svg className="h-5 w-5 text-[#E4405F]" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }}
                          className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white/70 hover:text-white"
                        >
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
