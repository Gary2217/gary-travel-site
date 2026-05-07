"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type FocusTopicDetail = {
  id: string;
  title: string;
  summary: string;
  image_url: string;
  source_name: string;
  source_url: string;
  published_at: string | null;
};

export default function FocusTopicDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [item, setItem] = useState<FocusTopicDetail | null>(null);

  useEffect(() => {
    async function loadDetail() {
      if (!id) {
        setError("找不到焦點話題");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/focus-topics?id=${encodeURIComponent(id)}`, { cache: "no-store" });
        if (!res.ok) {
          setError("讀取失敗，請稍後再試");
          setLoading(false);
          return;
        }

        const data = await res.json();
        if (!data) {
          setError("此話題目前不可用");
          setLoading(false);
          return;
        }

        setItem(data as FocusTopicDetail);
      } catch {
        setError("讀取失敗，請稍後再試");
      } finally {
        setLoading(false);
      }
    }

    loadDetail();
  }, [id]);

  return (
    <main className="min-h-screen bg-[#0f1923] pt-16 text-white">
      <div className="mx-auto w-full max-w-[900px] px-4 pb-14">
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/75 transition hover:bg-white/10"
          >
            ← 返回首頁
          </Link>
        </div>

        {loading ? (
          <section className="rounded-[1.5rem] border border-white/10 bg-[rgba(20,20,30,0.38)] p-4 backdrop-blur-[12px] sm:p-5">
            <div className="mb-3 aspect-[16/9] w-full rounded-xl bg-white/10" />
            <div className="h-6 w-4/5 rounded bg-white/10" />
            <div className="mt-3 h-4 w-full rounded bg-white/10" />
            <div className="mt-2 h-4 w-11/12 rounded bg-white/10" />
          </section>
        ) : error || !item ? (
          <section className="rounded-[1.5rem] border border-red-400/30 bg-red-500/10 p-5 text-sm text-red-200">
            {error || "找不到資料"}
          </section>
        ) : (
          <article className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[rgba(20,20,30,0.38)] backdrop-blur-[12px]">
            <div className="relative aspect-[16/9] w-full bg-black/30">
              <img src={item.image_url} alt={item.title} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
            </div>
            <div className="space-y-3 p-4 sm:p-5">
              <p className="text-xs text-sky-300">{item.source_name || "焦點話題"}</p>
              <h1 className="text-xl font-black leading-tight text-white sm:text-2xl">{item.title}</h1>
              {item.summary && <p className="text-sm leading-7 text-white/85">{item.summary}</p>}
              {item.published_at && (
                <p className="text-xs text-white/55">
                  發布時間：{new Date(item.published_at).toLocaleString("zh-TW", { hour12: false })}
                </p>
              )}
            </div>
          </article>
        )}
      </div>
    </main>
  );
}
