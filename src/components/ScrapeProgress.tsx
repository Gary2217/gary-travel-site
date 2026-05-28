"use client";

import { useEffect, useState, useCallback, useRef } from "react";

interface ScrapeRegionProgress {
  region: string;
  status: "completed" | "in_progress" | "pending";
  completed_trips: number;
  total_trips: number;
}

interface ScrapeProgressData {
  is_running: boolean;
  current_region: string | null;
  current_trip: string | null;
  completed_trips: number;
  total_trips: number;
  regions: ScrapeRegionProgress[];
  started_at: string | null;
  estimated_remaining_seconds: number | null;
}

interface ScrapeProgressProps {
  refreshKey?: number;
}

export default function ScrapeProgress({ refreshKey }: ScrapeProgressProps) {
  const [progress, setProgress] = useState<ScrapeProgressData | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchProgress = useCallback(async () => {
    try {
      const res = await fetch("/api/scrape/progress", {
        cache: "no-store",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setProgress(data);
      }
    } catch {
      // 靜默失敗
    }
  }, []);

  useEffect(() => {
    fetchProgress();
    intervalRef.current = setInterval(fetchProgress, 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchProgress, refreshKey]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await fetch("/api/scrape/trigger", {
        method: "DELETE",
        credentials: "include",
      });
      await fetchProgress();
    } catch {
      // 靜默失敗
    } finally {
      setCancelling(false);
    }
  };

  const formatRemaining = (seconds: number | null) => {
    if (seconds === null || seconds <= 0) return "計算中...";
    if (seconds < 60) return `約 ${seconds} 秒`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `約 ${m} 分 ${s} 秒`;
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return "✅";
      case "in_progress":
        return "🔄";
      default:
        return "⏳";
    }
  };

  // 非抓取中時隱藏
  if (!progress?.is_running) return null;

  const pct =
    progress.total_trips > 0
      ? Math.round((progress.completed_trips / progress.total_trips) * 100)
      : 0;

  return (
    <div className="rounded-2xl border border-sky-500/20 bg-[rgba(20,20,30,0.55)] backdrop-blur-[12px]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sky-500" />
          </span>
          <h2 className="text-sm font-bold text-white">抓取進行中</h2>
        </div>
        <button
          onClick={handleCancel}
          disabled={cancelling}
          className="rounded-full bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/25 disabled:opacity-50"
        >
          {cancelling ? "取消中..." : "取消抓取"}
        </button>
      </div>

      <div className="space-y-4 p-4">
        {/* 目前正在抓的 */}
        <div className="rounded-xl bg-white/5 p-3">
          <p className="text-[10px] text-white/40">目前正在抓取</p>
          <p className="mt-1 text-sm font-semibold text-sky-300">
            {progress.current_region ?? "—"}
            {progress.current_trip && (
              <span className="ml-1.5 text-white/60">
                › {progress.current_trip}
              </span>
            )}
          </p>
        </div>

        {/* 進度條 */}
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-white/50">
              {progress.completed_trips} / {progress.total_trips} 行程
            </span>
            <span className="font-semibold text-sky-400">{pct}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-600 to-sky-400 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* 預估剩餘時間 */}
        <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
          <span className="text-[11px] text-white/40">預估剩餘時間</span>
          <span className="text-xs font-semibold text-white/70">
            {formatRemaining(progress.estimated_remaining_seconds)}
          </span>
        </div>

        {/* 各區域列表 */}
        {progress.regions.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-white/50">
              各區域進度
            </p>
            <div className="space-y-1">
              {progress.regions.map((r) => (
                <div
                  key={r.region}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                    r.status === "in_progress"
                      ? "bg-sky-500/10"
                      : "bg-white/[0.02]"
                  }`}
                >
                  <span className="shrink-0">{statusIcon(r.status)}</span>
                  <span
                    className={`flex-1 ${
                      r.status === "in_progress"
                        ? "font-semibold text-sky-300"
                        : r.status === "completed"
                          ? "text-white/50"
                          : "text-white/30"
                    }`}
                  >
                    {r.region}
                  </span>
                  <span className="text-white/30">
                    {r.completed_trips}/{r.total_trips}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
