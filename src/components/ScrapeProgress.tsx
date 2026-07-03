"use client";

import { useEffect, useState, useCallback } from "react";

interface ScrapeProgressProps {
  refreshKey: number;
  onRunningChange: (running: boolean) => void;
  onRetry: () => Promise<void>;
}

interface ScrapeLog {
  id: string;
  status: string;
  started_at: string;
  finished_at?: string;
  error_message?: string;
  regions_scraped?: number;
  total_scraped?: number;
  total_changes?: number;
}

interface ProgressData {
  running: boolean;
  latest: ScrapeLog | null;
  pending_count: number;
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("zh-TW", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

function duration(start: string, end?: string): string {
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  const diff = Math.round((e - s) / 1000);
  if (diff < 60) return `${diff} 秒`;
  const m = Math.floor(diff / 60);
  const sec = diff % 60;
  return `${m} 分 ${sec} 秒`;
}

export default function ScrapeProgress({ refreshKey, onRunningChange, onRetry }: ScrapeProgressProps) {
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryLoading, setRetryLoading] = useState(false);
  const [clearing, setClearing] = useState(false);

  const fetchProgress = useCallback(async () => {
    try {
      const res = await fetch("/api/scrape/progress", {
        cache: "no-store",
        credentials: "include",
      });
      if (res.ok) {
        const json = (await res.json()) as ProgressData;
        setData(json);
        onRunningChange(json.running);
      }
    } catch {
      // 靜默失敗
    } finally {
      setLoading(false);
    }
  }, [onRunningChange]);

  // refreshKey 變化時重新 fetch
  useEffect(() => {
    setLoading(true);
    fetchProgress();
  }, [refreshKey, fetchProgress]);

  // 進行中時每 3 秒輪詢一次
  useEffect(() => {
    if (!data?.running) return;
    const id = setInterval(fetchProgress, 3000);
    return () => clearInterval(id);
  }, [data?.running, fetchProgress]);

  const handleRetry = async () => {
    setRetryLoading(true);
    try {
      await onRetry();
      await fetchProgress();
    } finally {
      setRetryLoading(false);
    }
  };

  const handleClear = async () => {
    setClearing(true);
    try {
      await fetch("/api/scrape/progress", {
        method: "DELETE",
        credentials: "include",
      });
      await fetchProgress();
    } catch {
      // 靜默失敗
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[rgba(20,20,30,0.55)] backdrop-blur-[12px]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-white">抓取進度</h2>
          {data?.running && (
            <span className="flex items-center gap-1 rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-bold text-sky-400">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
              進行中
            </span>
          )}
          {data?.pending_count != null && data.pending_count > 0 && (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">
              待確認 {data.pending_count} 筆
            </span>
          )}
        </div>
        <button
          onClick={fetchProgress}
          disabled={loading}
          className="rounded-full bg-sky-600/20 px-3 py-1.5 text-xs font-semibold text-sky-400 transition hover:bg-sky-600/30 disabled:opacity-50"
        >
          {loading ? "載入中..." : "↻ 重新整理"}
        </button>
      </div>

      <div className="px-4 py-4">
        {loading && !data ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 text-white/40">
              <Spinner />
              <span className="text-sm">載入中...</span>
            </div>
          </div>
        ) : data?.running ? (
          /* 進行中 */
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl bg-sky-500/10 border border-sky-500/20 px-4 py-3">
              <div className="text-sky-400">
                <Spinner />
              </div>
              <div>
                <p className="text-sm font-semibold text-sky-300">抓取進行中...</p>
                {data.latest?.started_at && (
                  <p className="mt-0.5 text-[11px] text-white/40">
                    開始於 {formatTime(data.latest.started_at)}，已執行 {duration(data.latest.started_at)}
                  </p>
                )}
              </div>
            </div>
            {data.latest && (
              <div className="grid grid-cols-3 gap-2">
                <StatBox label="已抓取區域" value={data.latest.regions_scraped ?? 0} />
                <StatBox label="已抓取行程" value={data.latest.total_scraped ?? 0} />
                <StatBox label="發現變更" value={data.latest.total_changes ?? 0} />
              </div>
            )}
          </div>
        ) : data?.latest ? (
          data.latest.status === "failed" ? (
            /* 失敗 */
            <div className="space-y-3">
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
                <p className="text-sm font-semibold text-red-400">抓取失敗</p>
                {data.latest.error_message && (
                  <pre className="mt-1.5 whitespace-pre-wrap text-[11px] text-red-300/70">
                    {data.latest.error_message}
                  </pre>
                )}
                <p className="mt-1 text-[11px] text-white/40">
                  {data.latest.started_at && `開始：${formatTime(data.latest.started_at)}`}
                  {data.latest.finished_at && `　結束：${formatTime(data.latest.finished_at)}`}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleRetry}
                  disabled={retryLoading}
                  className="flex items-center gap-1.5 rounded-full bg-sky-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-sky-500 disabled:opacity-50"
                >
                  {retryLoading ? <><Spinner />重試中...</> : "重新抓取"}
                </button>
                <button
                  onClick={handleClear}
                  disabled={clearing}
                  className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-white/40 transition hover:bg-white/5 disabled:opacity-50"
                >
                  {clearing ? "清除中..." : "清除紀錄"}
                </button>
              </div>
            </div>
          ) : (
            /* 完成 */
            <div className="space-y-3">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
                <p className="text-sm font-semibold text-emerald-400">抓取完成</p>
                <p className="mt-0.5 text-[11px] text-white/40">
                  {data.latest.started_at && `開始：${formatTime(data.latest.started_at)}`}
                  {data.latest.finished_at && (
                    <>
                      {"　完成：" + formatTime(data.latest.finished_at)}
                      {"　耗時 " + duration(data.latest.started_at!, data.latest.finished_at)}
                    </>
                  )}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <StatBox label="抓取區域" value={data.latest.regions_scraped ?? 0} />
                <StatBox label="抓取行程" value={data.latest.total_scraped ?? 0} />
                <StatBox label="發現變更" value={data.latest.total_changes ?? 0} color={data.latest.total_changes ? "amber" : undefined} />
              </div>
            </div>
          )
        ) : (
          /* 無紀錄 */
          <div className="py-8 text-center text-sm text-white/30">
            尚未執行過抓取
          </div>
        )}
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: "amber" | "sky";
}) {
  const textClass =
    color === "amber"
      ? "text-amber-400"
      : color === "sky"
      ? "text-sky-400"
      : "text-white/90";
  return (
    <div className="rounded-xl bg-white/5 px-3 py-2 text-center">
      <p className={`text-base font-bold ${textClass}`}>{value}</p>
      <p className="mt-0.5 text-[10px] text-white/40">{label}</p>
    </div>
  );
}
