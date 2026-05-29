"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Toast from "./Toast";

interface ScrapeRegionProgress {
  region: string;
  status: "completed" | "in_progress" | "pending";
  completed_trips: number;
  total_trips: number;
}

interface ScrapeLog {
  status?: "running" | "completed" | "failed" | "cancelled" | string;
  error_message?: string | null;
  current_region?: string | null;
  current_trip?: string | null;
  completed_trips?: number | null;
  total_trips?: number | null;
  regions?: ScrapeRegionProgress[] | null;
  started_at?: string | null;
  estimated_remaining_seconds?: number | null;
}

interface ScrapeProgressData {
  running: boolean;
  latest: ScrapeLog | null;
  pending_count: number;
}

interface ScrapeProgressProps {
  refreshKey?: number;
  onRunningChange?: (running: boolean) => void;
  onRetry?: () => void | Promise<void>;
}

async function getErrorMessage(res: Response, fallback: string) {
  try {
    const data = await res.json();
    return typeof data?.error === "string" && data.error.trim()
      ? data.error
      : fallback;
  } catch {
    return fallback;
  }
}

export default function ScrapeProgress({ refreshKey, onRunningChange, onRetry }: ScrapeProgressProps) {
  const [progress, setProgress] = useState<ScrapeProgressData | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [waitingForStart, setWaitingForStart] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type?: "success" | "error" | "warning";
  } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previousRunningRef = useRef(false);
  const cancelRequestedRef = useRef(false);
  const pollErrorNotifiedRef = useRef(false);

  const formatDateTime = (iso: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatRemaining = (seconds: number | null) => {
    if (seconds === null || seconds <= 0) return "計算中...";
    if (seconds < 60) return `約 ${seconds} 秒`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `約 ${m} 分 ${s} 秒`;
  };

  const fetchProgress = useCallback(async () => {
    try {
      const res = await fetch("/api/scrape/progress", {
        cache: "no-store",
        credentials: "include",
      });

      if (!res.ok) {
        if (!pollErrorNotifiedRef.current) {
          pollErrorNotifiedRef.current = true;
          setToast({
            message: `抓取進度讀取失敗：${await getErrorMessage(res, "請稍後再試")}`,
            type: "error",
          });
        }
        return;
      }

      const data = (await res.json()) as ScrapeProgressData;
      const previousRunning = previousRunningRef.current;
      const nextRunning = Boolean(data.running);
      setProgress(data);
      onRunningChange?.(nextRunning);
      if (nextRunning) setWaitingForStart(false);
      pollErrorNotifiedRef.current = false;

      if (previousRunning && !nextRunning) {
        const latest = data.latest;
        const status = latest?.status;

        if (cancelRequestedRef.current || status === "cancelled") {
          setToast({ message: "抓取已取消", type: "warning" });
          cancelRequestedRef.current = false;
        } else if (status === "failed") {
          setToast({
            message: `抓取失敗：${latest?.error_message || "請稍後再試"}`,
            type: "error",
          });
        } else {
          const changedCount = data.pending_count || 0;
          setToast({
            message:
              changedCount > 0
                ? `抓取完成，發現 ${changedCount} 筆變更`
                : "抓取完成，所有行程資料一致",
            type: "success",
          });
        }
      }

      previousRunningRef.current = nextRunning;
    } catch (error) {
      if (!pollErrorNotifiedRef.current) {
        pollErrorNotifiedRef.current = true;
        setToast({
          message: `抓取進度讀取失敗：${error instanceof Error ? error.message : "請稍後再試"}`,
          type: "error",
        });
      }
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
      const res = await fetch("/api/scrape/trigger", {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(await getErrorMessage(res, "請稍後再試"));
      }
      cancelRequestedRef.current = true;
      await fetchProgress();
    } catch (error) {
      setToast({
        message: `取消抓取失敗：${error instanceof Error ? error.message : "請稍後再試"}`,
        type: "error",
      });
    } finally {
      setCancelling(false);
    }
  };

  const latest = progress?.latest ?? null;
  const completedTrips = latest?.completed_trips ?? 0;
  const totalTrips = latest?.total_trips ?? 0;
  const pct = totalTrips > 0 ? Math.round((completedTrips / totalTrips) * 100) : 0;
  const regions = latest?.regions ?? [];
  const currentRegion = latest?.current_region ?? "—";
  const currentTrip = latest?.current_trip ?? null;
  const startedAt = latest?.started_at ?? null;
  const remainingSeconds = latest?.estimated_remaining_seconds ?? null;

  return (
    <>
      {progress?.running ? (
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
            <div className="rounded-xl bg-white/5 p-3">
              <p className="text-[10px] text-white/40">目前正在抓取</p>
              <p className="mt-1 text-sm font-semibold text-sky-300">
                {currentRegion}
                {currentTrip && (
                  <span className="ml-1.5 text-white/60">› {currentTrip}</span>
                )}
              </p>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-white/50">
                  {completedTrips} / {totalTrips} 行程
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

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                <span className="text-[11px] text-white/40">預估剩餘時間</span>
                <span className="text-xs font-semibold text-white/70">
                  {formatRemaining(remainingSeconds)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2">
                <span className="text-[11px] text-white/40">開始時間</span>
                <span className="text-xs font-semibold text-white/70">
                  {formatDateTime(startedAt)}
                </span>
              </div>
            </div>

            {regions.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-white/50">各區域進度</p>
                <div className="space-y-1">
                  {regions.map((r) => (
                    <div
                      key={r.region}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                        r.status === "in_progress"
                          ? "bg-sky-500/10"
                          : "bg-white/[0.02]"
                      }`}
                    >
                      <span className="shrink-0">
                        {r.status === "completed"
                          ? "✅"
                          : r.status === "in_progress"
                            ? "🔄"
                            : "⏳"}
                      </span>
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
      ) : waitingForStart ? (
        <div className="rounded-2xl border border-sky-500/20 bg-[rgba(20,20,30,0.55)] backdrop-blur-[12px]">
          <div className="flex items-center gap-3 px-4 py-6">
            <svg className="h-5 w-5 animate-spin text-sky-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <div>
              <p className="text-sm font-bold text-white">等待 GitHub Actions 啟動...</p>
              <p className="mt-0.5 text-[11px] text-white/40">通常需要 20-60 秒，啟動後會自動顯示進度</p>
            </div>
          </div>
        </div>
      ) : latest?.status === "failed" ? (
        <div className="rounded-2xl border border-red-500/20 bg-[rgba(20,20,30,0.55)] backdrop-blur-[12px]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-red-400">❌</span>
              <h2 className="text-sm font-bold text-red-400">上次抓取失敗</h2>
            </div>
            <span className="text-[10px] text-white/30">
              {latest?.started_at ? new Date(latest.started_at).toLocaleString("zh-TW") : ""}
            </span>
          </div>
          <div className="space-y-3 p-4">
            <div className="rounded-xl bg-red-500/5 p-3">
              <p className="text-[10px] font-semibold text-white/40">失敗原因</p>
              <p className="mt-1 text-sm text-red-300">{latest?.error_message || "未知錯誤"}</p>
            </div>
            {latest?.current_region && (
              <div className="rounded-xl bg-white/5 p-3">
                <p className="text-[10px] font-semibold text-white/40">停在哪裡</p>
                <p className="mt-1 text-sm text-white/70">
                  區域：{latest.current_region}
                  {latest.current_trip && <span className="ml-1.5 text-white/40">› {latest.current_trip}</span>}
                </p>
                <p className="mt-1 text-[11px] text-white/40">
                  進度：{latest.completed_trips || 0} / {latest.total_trips || 0} 行程
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  try {
                    const res = await fetch("/api/scrape/progress", {
                      method: "DELETE",
                      credentials: "include",
                    });
                    if (!res.ok) {
                      throw new Error("清除失敗");
                    }
                    setProgress((prev) => prev ? { ...prev, latest: null } : prev);
                    setToast({ message: "已清除錯誤紀錄", type: "success" });
                  } catch {
                    setToast({ message: "清除失敗，請稍後再試", type: "error" });
                  }
                }}
                className="flex-1 rounded-full border border-white/10 py-2.5 text-sm font-semibold text-white/50 transition hover:bg-white/5 hover:text-white/70"
              >
                清除
              </button>
              <button
                onClick={async () => {
                  setRetrying(true);
                  try {
                    if (onRetry) {
                      await onRetry();
                      setWaitingForStart(true);
                      setToast({ message: "🔄 已觸發，等待 GitHub Actions 啟動...", type: "success" });
                    }
                  } catch {
                    setToast({ message: "觸發失敗，請稍後再試", type: "error" });
                  } finally {
                    setRetrying(false);
                  }
                }}
                disabled={retrying}
                className="flex-[2] rounded-full bg-sky-600 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:opacity-50"
              >
                {retrying ? "⏳ 觸發中..." : "🔄 重新抓取"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
          duration={toast.type === "error" ? 5000 : 3000}
        />
      )}
    </>
  );
}
