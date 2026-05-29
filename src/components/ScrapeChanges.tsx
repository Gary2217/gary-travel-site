"use client";

import { useEffect, useState, useCallback } from "react";
import ScrapeCompareModal from "./ScrapeCompareModal";
import type { ScrapeChangeItem } from "./ScrapeCompareModal";
import Toast from "./Toast";

interface ScrapeChangesProps {
  onCountChange?: (count: number) => void;
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
  flight: {
    icon: "✈️",
    label: "航班變更",
    badgeClass: "bg-cyan-500/20 text-cyan-400",
  },
  new_tab: {
    icon: "🟣",
    label: "新分頁/區域",
    badgeClass: "bg-purple-500/20 text-purple-400",
  },
  warning: {
    icon: "⚠️",
    label: "抓取異常",
    badgeClass: "bg-yellow-500/20 text-yellow-400",
  },
};

const REGION_LABELS: Record<string, string> = {
  asia: "中東亞非",
  japan: "日本",
  "south-korea": "韓國",
  thailand: "泰國",
  vietnam: "越南",
  indonesia: "印尼",
  malaysia: "馬新",
  philippines: "菲律賓",
  europe: "歐洲",
  china: "港澳大陸",
  southasia: "南亞",
  new: "紐澳美加",
};

function getRegionDisplay(change: ScrapeChangeItem): string {
  const raw = change.region_label || "";
  return REGION_LABELS[raw] || raw || "未分類";
}

function getTripCoverUrl(change: ScrapeChangeItem): string {
  const scraped = change.scraped_data;
  if (!scraped) return "";
  return String(scraped.cover_image_url || "");
}

function groupByRegion(changes: ScrapeChangeItem[]): Map<string, ScrapeChangeItem[]> {
  const map = new Map<string, ScrapeChangeItem[]>();
  for (const change of changes) {
    const region = getRegionDisplay(change);
    const list = map.get(region) || [];
    list.push(change);
    map.set(region, list);
  }
  return map;
}

function getAlertMessage(change: ScrapeChangeItem): string | null {
  if (change.change_type !== "new_tab" && change.change_type !== "warning") return null;
  const msg = change.scraped_data?.message;
  return typeof msg === "string" ? msg : null;
}

function getAlertSummary(change: ScrapeChangeItem): string {
  const msg = getAlertMessage(change);
  if (msg) return msg.split("\n")[0];
  return change.summary || "";
}

function getTypeConfig(type: string) {
  return CHANGE_TYPE_CONFIG[type] ?? CHANGE_TYPE_CONFIG.info;
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

export default function ScrapeChanges({ onCountChange }: ScrapeChangesProps) {
  const [changes, setChanges] = useState<ScrapeChangeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChange, setSelectedChange] = useState<ScrapeChangeItem | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{
    message: string;
    type?: "success" | "error" | "warning";
  } | null>(null);

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCheckAll = () => {
    if (checkedIds.size === changes.length) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(changes.map((c) => c.id)));
    }
  };

  const removeChange = useCallback(
    (id: string) => {
      setChanges((prev) => {
        const next = prev.filter((c) => c.id !== id);
        onCountChange?.(next.length);
        return next;
      });
      setSelectedChange((prev) => (prev?.id === id ? null : prev));
    },
    [onCountChange],
  );

  const removeChanges = useCallback(
    (ids: string[]) => {
      setChanges((prev) => {
        const next = prev.filter((c) => !ids.includes(c.id));
        onCountChange?.(next.length);
        return next;
      });
    },
    [onCountChange],
  );

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
      } else {
        setToast({
          message: `載入變更失敗：${await getErrorMessage(res, "請稍後再試")}`,
          type: "error",
        });
      }
    } catch (error) {
      setToast({
        message: `載入變更失敗：${error instanceof Error ? error.message : "請稍後再試"}`,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    fetchChanges();
  }, [fetchChanges]);

  const handleIgnore = async (id: string) => {
    try {
      const res = await fetch("/api/scrape/changes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids: [id], status: "dismissed" }),
      });
      if (!res.ok) {
        throw new Error(await getErrorMessage(res, "操作失敗"));
      }
      const change = changes.find((c) => c.id === id);
      removeChange(id);
      setToast({
        message: `已忽略「${change?.trip_title || "此行程"}」`,
        type: "success",
      });
      return true;
    } catch (error) {
      setToast({
        message: `操作失敗：${error instanceof Error ? error.message : "請稍後再試"}`,
        type: "error",
      });
      return false;
    }
  };

  const handleApply = async (id: string) => {
    try {
      const res = await fetch("/api/scrape/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ changeIds: [id] }),
      });
      if (!res.ok) {
        throw new Error(await getErrorMessage(res, "更新失敗"));
      }
      const data = (await res.json()) as {
        results?: Array<{ id: string; success: boolean; error?: string }>;
      };
      const result = data.results?.[0];
      if (!result?.success) {
        throw new Error(result?.error || "更新失敗");
      }
      const change = changes.find((c) => c.id === id);
      removeChange(id);
      setToast({
        message: `已更新「${change?.trip_title || "此行程"}」`,
        type: "success",
      });
      return true;
    } catch (error) {
      setToast({
        message: `更新失敗：${error instanceof Error ? error.message : "請稍後再試"}`,
        type: "error",
      });
      return false;
    }
  };

  const handleSelectedIgnore = async () => {
    if (checkedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const ids = Array.from(checkedIds);
      const res = await fetch("/api/scrape/changes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids, status: "dismissed" }),
      });
      if (!res.ok) {
        throw new Error(await getErrorMessage(res, "操作失敗"));
      }
      removeChanges(ids);
      setCheckedIds(new Set());
      setToast({ message: `已忽略 ${ids.length} 筆`, type: "success" });
    } catch (error) {
      setToast({
        message: `操作失敗：${error instanceof Error ? error.message : "請稍後再試"}`,
        type: "error",
      });
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkIgnore = async () => {
    setBulkLoading(true);
    try {
      const ids = changes.map((c) => c.id);
      const res = await fetch("/api/scrape/changes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids, status: "dismissed" }),
      });
      if (!res.ok) {
        throw new Error(await getErrorMessage(res, "操作失敗"));
      }
      removeChanges(ids);
      setCheckedIds(new Set());
      setToast({ message: `已忽略 ${ids.length} 筆`, type: "success" });
    } catch (error) {
      setToast({
        message: `操作失敗：${error instanceof Error ? error.message : "請稍後再試"}`,
        type: "error",
      });
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkApply = async () => {
    setBulkLoading(true);
    try {
      const ids = changes.map((c) => c.id);
      const res = await fetch("/api/scrape/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ changeIds: ids }),
      });
      if (!res.ok) {
        throw new Error(await getErrorMessage(res, "更新失敗"));
      }
      const data = (await res.json()) as {
        success?: number;
        failed?: number;
        results?: Array<{ id: string; success: boolean; error?: string }>;
      };
      const successIds = (data.results || [])
        .filter((result) => result.success)
        .map((result) => result.id);
      const successCount = data.success ?? successIds.length;
      const failCount = data.failed ?? Math.max(ids.length - successCount, 0);

      if (successIds.length > 0) {
        removeChanges(successIds);
        setCheckedIds((prev) => {
          const next = new Set(prev);
          for (const id of successIds) next.delete(id);
          return next;
        });
      }

      if (failCount > 0) {
        setToast({
          message: `更新失敗：${successCount} 筆成功，${failCount} 筆失敗`,
          type: "error",
        });
      } else {
        setToast({ message: `已更新 ${successCount} 筆行程`, type: "success" });
      }
    } catch (error) {
      setToast({
        message: `更新失敗：${error instanceof Error ? error.message : "請稍後再試"}`,
        type: "error",
      });
    } finally {
      setBulkLoading(false);
    }
  };

  const handleClearProcessed = async () => {
    setClearing(true);
    try {
      const res = await fetch("/api/scrape/changes?status=dismissed", {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(await getErrorMessage(res, "清除失敗"));
      }
      setToast({ message: "已清除", type: "success" });
    } catch (error) {
      setToast({
        message: `清除失敗：${error instanceof Error ? error.message : "請稍後再試"}`,
        type: "error",
      });
    } finally {
      setClearing(false);
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-white/10 bg-[rgba(20,20,30,0.55)] backdrop-blur-[12px]">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            {changes.length > 0 && (
              <button
                onClick={toggleCheckAll}
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-white/20 transition hover:border-white/40"
                title={checkedIds.size === changes.length ? "取消全選" : "全選"}
              >
                {checkedIds.size === changes.length && changes.length > 0 ? (
                  <span className="text-[10px] text-sky-400">✓</span>
                ) : checkedIds.size > 0 ? (
                  <span className="text-[10px] text-white/40">—</span>
                ) : null}
              </button>
            )}
            <h2 className="text-sm font-bold text-white">待確認變更</h2>
            {changes.length > 0 && (
              <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400">
                {changes.length}
              </span>
            )}
            {checkedIds.size > 0 && (
              <span className="text-[11px] text-white/40">
                （已選 {checkedIds.size} 筆）
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
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
            <div>
              {Array.from(groupByRegion(changes).entries()).map(([region, regionChanges]) => (
                <div key={region}>
                  <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/5 bg-white/[0.03] px-4 py-2 backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-sky-400">{region}</span>
                      <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-bold text-white/40">
                        {regionChanges.length}
                      </span>
                    </div>
                  </div>
                  <div className="divide-y divide-white/5">
                    {regionChanges.map((change) => {
                      const config = getTypeConfig(change.change_type);
                      const isChecked = checkedIds.has(change.id);
                      const coverUrl = getTripCoverUrl(change);
                      return (
                        <div
                          key={change.id}
                          className={`flex items-center gap-3 px-4 py-3 transition hover:bg-white/5 ${isChecked ? "bg-sky-500/5" : ""}`}
                        >
                          <button
                            onClick={() => toggleCheck(change.id)}
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${isChecked ? "border-sky-500 bg-sky-500/20" : "border-white/20 hover:border-white/40"}`}
                          >
                            {isChecked && <span className="text-[10px] text-sky-400">✓</span>}
                          </button>
                          {coverUrl ? (
                            <img
                              src={coverUrl}
                              alt=""
                              className="h-10 w-14 shrink-0 rounded-md object-cover"
                              loading="lazy"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                          ) : (
                            <span className="text-base">{config.icon}</span>
                          )}
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
                            <p className="mt-0.5 text-[11px] text-white/40">
                              {getAlertSummary(change)}
                            </p>
                            {getAlertMessage(change) && (
                              <pre className="mt-1 max-w-full overflow-x-auto whitespace-pre-wrap rounded bg-white/5 p-2 text-[10px] text-white/50">
                                {getAlertMessage(change)}
                              </pre>
                            )}
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
                            {change.change_type !== "new_tab" && change.change_type !== "warning" ? (
                              <button
                                onClick={() => setSelectedChange(change)}
                                className="rounded-full bg-sky-600/20 px-3 py-1.5 text-[11px] font-semibold text-sky-400 transition hover:bg-sky-600/30"
                              >
                                查看詳情
                              </button>
                            ) : (
                              <a
                                href={change.source_url || "#"}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-full bg-purple-600/20 px-3 py-1.5 text-[11px] font-semibold text-purple-400 transition hover:bg-purple-600/30"
                              >
                                開啟來源
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-white/10 px-4 py-3">
              {checkedIds.size > 0 && (
                <button
                  onClick={handleSelectedIgnore}
                  disabled={bulkLoading}
                  className="rounded-full bg-red-500/15 px-4 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/25 disabled:opacity-50"
                >
                  {bulkLoading ? "處理中..." : `忽略已選（${checkedIds.size}）`}
                </button>
              )}
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
              <button
                onClick={handleClearProcessed}
                disabled={clearing}
                className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-white/40 transition hover:bg-white/5 hover:text-white/70 disabled:opacity-50"
              >
                {clearing ? "清除中..." : "清除已處理紀錄"}
              </button>
            </div>
          </>
        )}
      </div>

      {selectedChange && (
        <ScrapeCompareModal
          change={selectedChange}
          onClose={() => setSelectedChange(null)}
          onApply={handleApply}
          onIgnore={handleIgnore}
        />
      )}

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
