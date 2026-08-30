"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import InstagramEmbed from "./InstagramEmbed";
import YouTubeEmbed from "./YouTubeEmbed";

const isYouTubeUrl = (url: string) => /^https:\/\/(www\.)?(youtube\.com\/|youtu\.be\/)/.test(url);

interface CustomerStory {
  id: string;
  type: "photo" | "video";
  media_url: string;
  thumbnail_url?: string;
  caption: string;
  trip_id: string | null;
  created_at: string;
}

interface TripSearchResult {
  id: string;
  title: string;
  destinations: { title: string } | null;
}

interface CustomerStoriesProps {
  isDevMode?: boolean;
}

export default function CustomerStories({ isDevMode = false }: CustomerStoriesProps) {
  const [stories, setStories] = useState<CustomerStory[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [mediaKind, setMediaKind] = useState<"photo" | "video">("photo");
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [tripQuery, setTripQuery] = useState("");
  const [tripResults, setTripResults] = useState<TripSearchResult[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<TripSearchResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [reorderList, setReorderList] = useState<CustomerStory[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const tripSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reorderListRef = useRef<CustomerStory[]>([]);
  useEffect(() => { reorderListRef.current = reorderList; }, [reorderList]);

  useEffect(() => {
    fetch("/api/customer-stories", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setStories(Array.isArray(data) ? data : []))
      .catch(() => setStories([]))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (tripSearchTimerRef.current) clearTimeout(tripSearchTimerRef.current);
    if (!tripQuery.trim()) {
      setTripResults([]);
      return;
    }
    tripSearchTimerRef.current = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(tripQuery.trim())}`)
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => setTripResults(Array.isArray(data) ? data : []))
        .catch(() => setTripResults([]));
    }, 300);
    return () => {
      if (tripSearchTimerRef.current) clearTimeout(tripSearchTimerRef.current);
    };
  }, [tripQuery]);

  const resetForm = useCallback(() => {
    setFile(null);
    setVideoUrl("");
    setThumbnailFile(null);
    setCaption("");
    setTripQuery("");
    setTripResults([]);
    setSelectedTrip(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
  }, []);

  // 開啟排序視窗
  const openReorderModal = () => {
    setReorderList([...stories]);
    setShowReorderModal(true);
  };

  // 儲存排序結果
  const saveOrder = useCallback(async () => {
    const list = reorderListRef.current;
    setSavingOrder(true);
    try {
      const res = await fetch("/api/customer-stories", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stories: list }),
      });
      if (!res.ok) { alert("順序調整失敗"); return; }
      setStories(list);
    } catch {
      alert("順序調整失敗");
    } finally {
      setSavingOrder(false);
    }
  }, []);

  // 拖曳排序：追蹤指標移動，即時交換項目位置
  useEffect(() => {
    if (dragIndex === null) return;

    const handleMove = (e: PointerEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const row = el?.closest("[data-reorder-index]") as HTMLElement | null;
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

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [dragIndex, saveOrder]);

  const handleSubmit = async () => {
    if (!caption.trim()) { alert("請輸入說明文字（例如：杜拜7日團．2026年6月）"); return; }
    if (mediaKind === "photo" && !file) { alert("請選擇照片檔案"); return; }
    if (mediaKind === "video" && !videoUrl.trim()) { alert("請輸入 Instagram 貼文網址或 YouTube 影片網址"); return; }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("caption", caption.trim());
      if (selectedTrip) fd.append("trip_id", selectedTrip.id);
      if (mediaKind === "photo" && file) fd.append("file", file);
      if (mediaKind === "video") {
        fd.append("video_url", videoUrl.trim());
        if (thumbnailFile) fd.append("thumbnail", thumbnailFile);
      }

      const res = await fetch("/api/customer-stories", { method: "POST", credentials: "include", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error || "新增失敗");
        return;
      }
      const data = await res.json();
      setStories(data.stories);
      resetForm();
      setShowForm(false);
    } catch {
      alert("新增失敗");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("確定刪除這則花絮？")) return;
    try {
      const res = await fetch("/api/customer-stories", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) { alert("刪除失敗"); return; }
      const data = await res.json();
      setStories(data.stories);
    } catch {
      alert("刪除失敗");
    }
  };

  if (!loaded) return null;
  if (stories.length === 0 && !isDevMode) return null;

  return (
    <section className="mx-auto mb-12 max-w-[1180px] rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center justify-between px-1">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📸</span>
            <h2 className="text-lg font-bold text-gray-900">真實旅客花絮</h2>
          </div>
          <p className="mt-1 text-xs text-gray-500">參團客人實拍的照片與影片，帶你一起感受現場氛圍</p>
        </div>
        {isDevMode && (
          <div className="flex shrink-0 items-center gap-2">
            {stories.length > 1 && (
              <button
                type="button"
                onClick={openReorderModal}
                className="rounded-full border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
              >
                調整順序
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="rounded-full bg-sky-500 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-sky-400"
            >
              {showForm ? "取消" : "+ 新增花絮"}
            </button>
          </div>
        )}
      </div>

      {isDevMode && showForm && (
        <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
          <div className="mb-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => setMediaKind("photo")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${mediaKind === "photo" ? "bg-sky-500 text-white" : "bg-white text-gray-500 border border-gray-200"}`}
            >
              照片上傳
            </button>
            <button
              type="button"
              onClick={() => setMediaKind("video")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${mediaKind === "video" ? "bg-sky-500 text-white" : "bg-white text-gray-500 border border-gray-200"}`}
            >
              IG / YouTube 影片連結
            </button>
          </div>

          {mediaKind === "photo" ? (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="mb-2 w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700"
            />
          ) : (
            <>
              <input
                type="text"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="貼上 IG 貼文或 YouTube 影片網址，例如 https://www.instagram.com/p/xxxxx/ 或 https://www.youtube.com/watch?v=xxxxx"
                className="mb-2 w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 outline-none focus:border-sky-400"
              />
              <p className="mb-1 text-[11px] text-gray-500">影片縮圖（選填）：不上傳的話，IG 貼文會自動顯示畫面本身，YouTube 會自動用官方縮圖；想換成別的截圖才需要上傳</p>
              <input
                ref={thumbnailInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                className="mb-2 w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700"
              />
            </>
          )}

          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="說明文字，例如：杜拜7日團．2026年6月"
            className="mb-2 w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 outline-none focus:border-sky-400"
          />

          <div className="relative mb-2">
            <input
              type="text"
              value={selectedTrip ? selectedTrip.title : tripQuery}
              onChange={(e) => { setSelectedTrip(null); setTripQuery(e.target.value); }}
              placeholder="搜尋要連結的行程（可留空）"
              className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 outline-none focus:border-sky-400"
            />
            {tripResults.length > 0 && !selectedTrip && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                {tripResults.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => { setSelectedTrip(t); setTripQuery(""); setTripResults([]); }}
                    className="block w-full truncate px-2.5 py-1.5 text-left text-xs text-gray-700 hover:bg-sky-50"
                  >
                    {t.title}
                    {t.destinations?.title && <span className="text-gray-400">（{t.destinations.title}）</span>}
                  </button>
                ))}
              </div>
            )}
            {selectedTrip && (
              <button
                type="button"
                onClick={() => setSelectedTrip(null)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="rounded-lg bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-500 disabled:opacity-50"
          >
            {submitting ? "上傳中..." : "確定新增"}
          </button>
        </div>
      )}

      {stories.length === 0 ? (
        isDevMode && <p className="px-1 text-xs text-gray-400">還沒有花絮，點右上角「+ 新增花絮」開始新增</p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {stories.map((story) => (
            <div
              key={story.id}
              className="relative w-[240px] shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
            >
              {isDevMode && (
                <button
                  type="button"
                  onClick={() => void handleDelete(story.id)}
                  className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md transition hover:bg-red-400"
                  title="刪除"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
              {story.type === "photo" ? (
                <div className="relative h-[240px] w-full bg-gray-100">
                  <Image src={story.media_url} alt={story.caption} fill sizes="240px" className="object-cover" />
                </div>
              ) : isYouTubeUrl(story.media_url) ? (
                <YouTubeEmbed url={story.media_url} thumbnailUrl={story.thumbnail_url} />
              ) : (
                <InstagramEmbed url={story.media_url} thumbnailUrl={story.thumbnail_url} />
              )}
              <div className="p-3">
                <p className="line-clamp-2 text-xs text-gray-600">{story.caption}</p>
                {story.trip_id && (
                  <Link
                    href={`/trip/${story.trip_id}`}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-500"
                  >
                    看此行程
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

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
              <h3 className="text-sm font-bold text-gray-900">調整花絮順序</h3>
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
              {reorderList.map((story, i) => (
                <div
                  key={story.id}
                  data-reorder-index={i}
                  className={`flex touch-none items-center gap-3 rounded-xl border p-2 transition ${
                    dragIndex === i ? "border-sky-400 bg-sky-50 shadow-md" : "border-gray-200 bg-white"
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
                  {story.type === "photo" ? (
                    <Image
                      src={story.media_url}
                      alt={story.caption}
                      width={64}
                      height={48}
                      className="h-12 w-16 shrink-0 rounded-lg object-cover"
                      draggable={false}
                    />
                  ) : story.thumbnail_url ? (
                    <Image
                      src={story.thumbnail_url}
                      alt={story.caption}
                      width={64}
                      height={48}
                      className="h-12 w-16 shrink-0 rounded-lg object-cover"
                      draggable={false}
                    />
                  ) : (
                    <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    </div>
                  )}
                  <div className="min-w-0 flex-1 truncate text-xs text-gray-500">
                    {story.caption}
                  </div>
                  <span className="shrink-0 text-xs font-bold text-gray-400">{i + 1}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
              <span className="text-xs text-gray-400">{savingOrder ? "儲存中..." : "拖曳把手調整順序，自動儲存"}</span>
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
    </section>
  );
}
