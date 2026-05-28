"use client";

import { useEffect, useState, useCallback } from "react";
import ScrapeCompareModal from "./ScrapeCompareModal";
import type { ScrapeChangeItem } from "./ScrapeCompareModal";

// ── Types ────────────────────────────────────────────────
interface ScrapeChangesProps {
  onCountChange?: (count: number) => void;
}

// ── Helpers ──────────────────────────────────────────────
const CHANGE_TYPE_CONFIG: Record<
  string,
  { icon: string; label: string; badgeClass: string }
> = {
  price: {
    icon: "🟡",
    label: "價格變更",
    badgeClass: "bg-amber-500/20 text-amber-400",
  },
  new_trip: {
    icon: "🟢",
    label: "新行程",
    badgeClass: "bg-emerald-500/20 text-emerald-400",
  },
  removed: {
    icon: "🔴",
    label: "行程下架",
    badgeClass: "bg-red-500/20 text-red-400",
  },
  departure_dates: {
    icon: "🔵",
    label: "出發日期",
    badgeClass: "bg-blue-500/20 text-blue-400",
  },
  price_detail: {
    icon: "🟠",
    label: "售價明細",
    badgeClass: "bg-orange-500/20 text-orange-400",
  },
  info: {
    icon: "⚪",
    label: "資訊變更",
    badgeClass: "bg-white/10 text-white/60",
  },
};

function getTypeConfig(type: string) {
  return (
    CHANGE_TYPE_CONFIG[type] ??
    CHANGE_TYPE_CONFIG.info
  );
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "剛剛";
  if (m < 60) return `${m}分鐘前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}小時前`;
  return `${Math.floor(h / 24)}天前`;
}

// ── Main Component ───────────────────────────────────────
export default function ScrapeChanges({ onCountChange }: ScrapeChangesProps) {
  const [changes, setChanges] = useState<ScrapeChangeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChange, setSelectedChange] = useState<ScrapeChangeItem | null>(
    null,
  );
  const [bulkLoading, setBulkLoading] = useState(false);

  const fetchChanges = useCallback(async () => {
    try {
      const res = await fetch("/api/scrape/changes?status=pending", {
        cache: "no-store",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : [];
        setChanges(items);
        onCountChange?.(items.length);
      }
    } catch {
      // 靜默失敗
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    fetchChanges();
  }, [fetchChanges]);

  const handleIgnore = async (id: string) => {
    try {
      await fetch("/api/scrape/changes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids: [id], action: "ignore" }),
      });
      setSelectedChange(null);
      setChanges((prev) => prev.filter((c) => c.id !== id));
      onCountChange?.(changes.length - 1);
    } catch {
      // 靜默失敗
    }
  };

  const handleApply = async (id: string) => {
    try {
      await fetch("/api/scrape/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ changeIds: [id] }),
      });
      setSelectedChange(null);
      setChanges((prev) => prev.filter((c) => c.id !== id));
      onCountChange?.(changes.length - 1);
    } catch {
      // 靜默失敗
    }
  };

  const handleBulkIgnore = async () => {
    setBulkLoading(true);
    try {
      await fetch("/api/scrape/changes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ids: changes.map((c) => c.id),
          action: "ignore",
        }),
      });
      setChanges([]);
      onCountChange?.(0);
    } catch {
      // 靜默失敗
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkApply = async () => {
    setBulkLoading(true);
    try {
      await fetch("/api/scrape/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ changeIds: changes.map((c) => c.id) }),
      });
      setChanges([]);
      onCountChange?.(0);
    } catch {
      // 靜默失敗
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-white/10 bg-[rgba(20,20,30,0.55)] backdrop-blur-[12px]">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white">待確認變更</h2>
            {changes.length > 0 && (
              <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400">
                {changes.length}
              </span>
            )}
          </div>
          <button
            onClick={fetchChanges}
            disabled={loading}
            className="rounded-full bg-sky-600/20 px-3 py-1.5 text-xs font-semibold text-sky-400 transition hover:bg-sky-600/30 disabled:opacity-50"
          >
            {loading ? "載入中..." : "↻ 重新整理"}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center px-4 py-12">
            <div className="flex items-center gap-2 text-white/40">
              <svg
                className="h-4 w-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              <span className="text-sm">載入變更中...</span>
            </div>
          </div>
        ) : changes.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-white/30">
            目前沒有待確認的變更
          </div>
        ) : (
          <>
            {/* 變更列表 */}
            <div className="divide-y divide-white/5">
              {changes.map((change) => {
                const config = getTypeConfig(change.change_type);
                return (
                  <div
                    key={change.id}
                    className="flex items-center gap-3 px-4 py-3 transition hover:bg-white/5"
                  >
                    <span className="text-base">{config.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-white/90">
                          {change.trip_title}
                        </span>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${config.badgeClass}`}
                        >
                          {config.label}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-white/40">
                        {change.summary}
                      </p>
                      <p className="mt-0.5 text-[10px] text-white/25">
                        {relativeTime(change.created_at)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => handleIgnore(change.id)}
                        className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/40 transition hover:bg-white/5 hover:text-white/70"
                      >
                        忽略
                      </button>
                      <button
                        onClick={() => setSelectedChange(change)}
                        className="rounded-full bg-sky-600/20 px-3 py-1.5 text-[11px] font-semibold text-sky-400 transition hover:bg-sky-600/30"
                      >
                        查看詳情
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 底部批量按鈕 */}
            <div className="flex items-center justify-end gap-2 border-t border-white/10 px-4 py-3">
              <button
                onClick={handleBulkIgnore}
                disabled={bulkLoading}
                className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-white/40 transition hover:bg-white/5 hover:text-white/70 disabled:opacity-50"
              >
                全部忽略
              </button>
              <button
                onClick={handleBulkApply}
                disabled={bulkLoading}
                className="rounded-full bg-sky-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-sky-500 disabled:opacity-50"
              >
                {bulkLoading ? "處理中..." : "全部更新"}
              </button>
            </div>
          </>
        )}
      </div>

      {/* 比對 Modal */}
      {selectedChange && (
        <ScrapeCompareModal
          change={selectedChange}
          onClose={() => setSelectedChange(null)}
          onApply={handleApply}
          onIgnore={handleIgnore}
        />
      )}
    </>
  );
}
