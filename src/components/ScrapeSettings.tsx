"use client";

import { useEffect, useState, useCallback } from "react";
import Toast from "./Toast";

interface DestinationOption {
  id: string;
  title: string;
  source_url?: string | null;
}

interface ScrapeSettingsData {
  auto_enabled: boolean;
  frequency_days: number;
  last_scrape_at: string | null;
}

interface ScrapeSettingsProps {
  onTrigger?: () => void;
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

export default function ScrapeSettings({ onTrigger }: ScrapeSettingsProps) {
  const [settings, setSettings] = useState<ScrapeSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [destinations, setDestinations] = useState<DestinationOption[]>([]);
  const [selectedDestinationId, setSelectedDestinationId] = useState("");
  const [destinationLoading, setDestinationLoading] = useState(true);
  const [pageTriggering, setPageTriggering] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type?: "success" | "error" | "warning";
  } | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/scrape/settings", {
        cache: "no-store",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        // API 回傳 scrape_auto_enabled / scrape_interval_days / scrape_last_run，映射成短 key
        setSettings({
          auto_enabled: data.scrape_auto_enabled === true || data.scrape_auto_enabled === 'true',
          frequency_days: Number(data.scrape_interval_days) || 3,
          last_scrape_at: data.scrape_last_run ?? null,
        });
      } else {
        setToast({
          message: `載入設定失敗：${await getErrorMessage(res, "請稍後再試")}`,
          type: "error",
        });
      }
    } catch (error) {
      setToast({
        message: `載入設定失敗：${error instanceof Error ? error.message : "請稍後再試"}`,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    async function loadDestinations() {
      try {
        const res = await fetch("/api/destinations", {
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok) return;
        const data = (await res.json()) as DestinationOption[];
        setDestinations(Array.isArray(data) ? data : []);
      } catch (error) {
        setToast({
          message: `載入目的地失敗：${error instanceof Error ? error.message : "請稍後再試"}`,
          type: "error",
        });
      } finally {
        setDestinationLoading(false);
      }
    }

    loadDestinations();
  }, []);

  const updateSettings = async (patch: Partial<ScrapeSettingsData>) => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch("/api/scrape/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        // 映射成 API 期望的 scrape_ 前綴 key
        body: JSON.stringify({
          scrape_auto_enabled: patch.auto_enabled ?? settings.auto_enabled,
          scrape_interval_days: patch.frequency_days ?? settings.frequency_days,
        }),
      });
      if (res.ok) {
        setSettings({ ...settings, ...patch });
        setToast({ message: "設定已儲存", type: "success" });
      } else {
        setToast({
          message: `儲存失敗：${await getErrorMessage(res, "請稍後再試")}`,
          type: "error",
        });
      }
    } catch (error) {
      setToast({
        message: `儲存失敗：${error instanceof Error ? error.message : "請稍後再試"}`,
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTrigger = async () => {
    setTriggering(true);
    try {
      const res = await fetch("/api/scrape/trigger", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        onTrigger?.();
        setToast({ message: "已觸發全部抓取", type: "success" });
      } else {
        setToast({
          message: `觸發失敗：${await getErrorMessage(res, "請稍後再試")}`,
          type: "error",
        });
      }
    } catch (error) {
      setToast({
        message: `觸發失敗：${error instanceof Error ? error.message : "請稍後再試"}`,
        type: "error",
      });
    } finally {
      setTriggering(false);
    }
  };

  const selectedDestination = destinations.find(
    (destination) => destination.id === selectedDestinationId
  );

  const handlePageTrigger = async () => {
    if (!selectedDestinationId) return;
    setPageTriggering(true);
    try {
      const res = await fetch("/api/scrape/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ destinationId: selectedDestinationId }),
      });
      if (res.ok) {
        onTrigger?.();
        setToast({
          message: `已觸發「${selectedDestination?.title || "此頁"}」抓取`,
          type: "success",
        });
      } else {
        setToast({
          message: `觸發失敗：${await getErrorMessage(res, "請稍後再試")}`,
          type: "error",
        });
      }
    } catch (error) {
      setToast({
        message: `觸發失敗：${error instanceof Error ? error.message : "請稍後再試"}`,
        type: "error",
      });
    } finally {
      setPageTriggering(false);
    }
  };

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

  const getNextSchedule = () => {
    if (!settings?.last_scrape_at || !settings.auto_enabled) return "—";
    const next = new Date(settings.last_scrape_at);
    next.setDate(next.getDate() + settings.frequency_days);
    return formatDateTime(next.toISOString());
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[rgba(20,20,30,0.55)] p-6 backdrop-blur-[12px]">
        <div className="flex items-center gap-2 text-white/40">
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="text-sm">載入設定中...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-white/10 bg-[rgba(20,20,30,0.55)] backdrop-blur-[12px]">
        <div className="border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-bold text-white">抓取設定</h2>
          <p className="mt-0.5 text-[11px] text-white/40">
            設定自動抓取頻率，或手動立即執行
          </p>
        </div>

        <div className="space-y-4 p-4">
        {/* 自動抓取開關 */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/90">自動定期抓取</p>
            <p className="mt-0.5 text-[11px] text-white/40">
              啟用後將依設定頻率自動抓取朋威行程資料
            </p>
          </div>
          <button
            onClick={() =>
              updateSettings({ auto_enabled: !settings?.auto_enabled })
            }
            disabled={saving}
            className={`relative h-6 w-11 shrink-0 rounded-full transition ${
              settings?.auto_enabled
                ? "bg-sky-600"
                : "bg-white/15"
            } ${saving ? "opacity-50" : ""}`}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                settings?.auto_enabled
                  ? "translate-x-5"
                  : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* 頻率選擇 */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/90">抓取頻率</p>
            <p className="mt-0.5 text-[11px] text-white/40">
              每隔幾天自動執行一次
            </p>
          </div>
          <select
            value={settings?.frequency_days ?? 7}
            onChange={(e) =>
              updateSettings({ frequency_days: Number(e.target.value) })
            }
            disabled={saving || !settings?.auto_enabled}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none transition hover:bg-white/10 disabled:opacity-40"
          >
            {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n} className="bg-[#1a2332] text-white">
                每 {n} 天
              </option>
            ))}
          </select>
        </div>

        {/* 時間資訊 */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-white/5 p-3">
            <p className="text-[10px] text-white/40">上次抓取時間</p>
            <p className="mt-1 text-sm font-semibold text-white">
              {formatDateTime(settings?.last_scrape_at ?? null)}
            </p>
          </div>
          <div className="rounded-xl bg-white/5 p-3">
            <p className="text-[10px] text-white/40">下次排程時間</p>
            <p className="mt-1 text-sm font-semibold text-white">
              {getNextSchedule()}
            </p>
          </div>
        </div>

        {/* 立即抓取按鈕 */}
        <button
          onClick={handleTrigger}
          disabled={triggering}
          className="w-full rounded-full bg-sky-600 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:opacity-50"
        >
          {triggering ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              啟動中...
            </span>
          ) : (
            "🚀 立即抓取"
          )}
        </button>

        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="mb-2 text-xs font-bold text-white/80">指定頁面抓取</p>
          <div className="flex items-center gap-2">
            <select
              value={selectedDestinationId}
              onChange={(e) => setSelectedDestinationId(e.target.value)}
              disabled={destinationLoading}
              className="h-9 max-w-[180px] flex-1 rounded-lg border border-white/10 bg-[#1a2332] px-2 text-xs text-white outline-none"
              style={{ WebkitAppearance: 'none', maxHeight: '200px' }}
            >
              <option value="">{destinationLoading ? "載入中..." : "選擇目的地"}</option>
              {destinations.map((d) => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </select>
            {selectedDestination?.source_url && (
              <span className="hidden truncate text-[10px] text-white/40 sm:inline-block sm:max-w-[200px]">
                → {selectedDestination.source_url.replace('https://www.pwgotravel.com.tw', '')}
              </span>
            )}
            <button
              onClick={handlePageTrigger}
              disabled={pageTriggering || !selectedDestinationId || !selectedDestination?.source_url}
              className="shrink-0 rounded-full bg-sky-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-sky-500 disabled:opacity-50"
            >
              {pageTriggering ? "抓取中..." : "🔍 抓取此頁"}
            </button>
          </div>
          {selectedDestinationId && !selectedDestination?.source_url && (
            <p className="mt-1.5 text-[10px] text-amber-400">⚠️ 此目的地尚未設定朋威對應 URL</p>
          )}
        </div>
        </div>
      </div>

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
