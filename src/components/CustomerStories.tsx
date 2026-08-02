"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import InstagramEmbed from "./InstagramEmbed";

interface CustomerStory {
  id: string;
  type: "photo" | "video";
  media_url: string;
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
  const [caption, setCaption] = useState("");
  const [tripQuery, setTripQuery] = useState("");
  const [tripResults, setTripResults] = useState<TripSearchResult[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<TripSearchResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tripSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    setCaption("");
    setTripQuery("");
    setTripResults([]);
    setSelectedTrip(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleSubmit = async () => {
    if (!caption.trim()) { alert("請輸入說明文字（例如：杜拜7日團．2026年6月）"); return; }
    if (mediaKind === "photo" && !file) { alert("請選擇照片檔案"); return; }
    if (mediaKind === "video" && !videoUrl.trim()) { alert("請輸入 Instagram 貼文網址"); return; }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("caption", caption.trim());
      if (selectedTrip) fd.append("trip_id", selectedTrip.id);
      if (mediaKind === "photo" && file) fd.append("file", file);
      if (mediaKind === "video") fd.append("video_url", videoUrl.trim());

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
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="shrink-0 rounded-full bg-sky-500 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-sky-400"
          >
            {showForm ? "取消" : "+ 新增花絮"}
          </button>
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
              IG 影片連結
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
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="貼上 Instagram 貼文網址，例如 https://www.instagram.com/p/xxxxx/"
              className="mb-2 w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 outline-none focus:border-sky-400"
            />
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
              ) : (
                <InstagramEmbed url={story.media_url} />
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
    </section>
  );
}
