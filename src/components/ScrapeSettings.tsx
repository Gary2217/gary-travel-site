"use client";

import { useEffect, useState, useCallback } from "react";

interface ScrapeSettingsProps {
  onTrigger: () => void;
  isRunning: boolean;
}

interface RegionStatus {
  last_scraped_at?: string;
  last_applied_at?: string;
}

interface SettingsData {
  scrape_auto_enabled: boolean;
  scrape_interval_days?: number;
  scrape_time?: string;
  scrape_last_run?: string;
  scrape_regions?: string[];
  scrape_region_status?: Record<string, RegionStatus>;
}

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
  kinmen: "金門",
  mazu: "馬祖",
  penghu: "澎湖",
  freetour: "自由行",
  golf: "高爾夫",
};

function formatTime(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("zh-TW", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function Spinner() {
  return (
    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

export default function ScrapeSettings({ onTrigger, isRunning }: ScrapeSettingsProps) {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [showRegions, setShowRegions] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/scrape/settings", {
        cache: "no-store",
        credentials: "include",
      });
      if (res.ok) {
        const json = (await res.json()) as SettingsData;
        setSettings(json);
      }
    } catch {
      // 靜默失敗
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleTrigger = async () => {
    setTriggerLoading(true);
    try {
      const res = await fetch("/api/scrape/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      if (res.ok) {
        onTrigger();
        await fetchSettings();
      }
    } catch {
      // 靜默失敗
    } finally {
      setTriggerLoading(false);
    }
  };

  const handleToggleAuto = async () => {
    if (!settings) return;
    const next = !settings.scrape_auto_enabled;
    setToggleLoading(true);
    try {
      const res = await fetch("/api/scrape/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ scrape_auto_enabled: next }),
      });
      if (res.ok) {
        setSettings((prev) => prev ? { ...prev, scrape_auto_enabled: next } : prev);
      }
    } catch {
      // 靜默失敗
    } finally {
      setToggleLoading(false);
    }
  };

  const regionStatus = settings?.scrape_region_status ?? {};
  const regionEntries = Object.entries(regionStatus);

  return (
    <div className="rounded-2xl border border-white/10 bg-[rgba(20,20,30,0.55)] backdrop-blur-[12px]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-bold text-white">自動抓取設定</h2>
        {loading && (
          <div className="text-white/40">
            <Spinner />
          </div>
        )}
      </div>

      <div className="divide-y divide-white/5">
        {/* 觸發抓取 */}
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm text-white/90">立即抓取</p>
            <p className="mt-0.5 text-[11px] text-white/40">
              從朋威網站抓取最新行程資料，產生待確認變更
            </p>
          </div>
          <button
            onClick={handleTrigger}
            disabled={isRunning || triggerLoading}
            className="flex items-center gap-1.5 rounded-full bg-sky-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {triggerLoading || isRunning ? (
              <>
                <Spinner />
                {isRunning ? "抓取中..." : "觸發中..."}
              </>
            ) : (
              "開始抓取"
            )}
          </button>
        </div>

        {/* 自動抓取開關 */}
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm text-white/90">自動定期抓取</p>
            <p className="mt-0.5 text-[11px] text-white/40">
              {settings?.scrape_interval_days
                ? `每 ${settings.scrape_interval_days} 天自動執行`
                : "定期自動執行抓取"}
              {settings?.scrape_time ? `（${settings.scrape_time}）` : ""}
            </p>
          </div>
          <button
            onClick={handleToggleAuto}
            disabled={toggleLoading || loading}
            className={`relative h-6 w-11 shrink-0 rounded-full transition ${
              settings?.scrape_auto_enabled ? "bg-sky-600" : "bg-white/15"
            } disabled:opacity-50`}
            title={settings?.scrape_auto_enabled ? "關閉自動抓取" : "開啟自動抓取"}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                settings?.scrape_auto_enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* 上次執行時間 */}
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm text-white/70">上次執行時間</p>
          <p className="text-[11px] text-white/40 font-mono">
            {formatTime(settings?.scrape_last_run)}
          </p>
        </div>

        {/* 區域狀態 */}
        {regionEntries.length > 0 && (
          <div className="px-4 py-3">
            <button
              onClick={() => setShowRegions((v) => !v)}
              className="flex w-full items-center justify-between text-sm text-white/70 hover:text-white/90 transition"
            >
              <span>各區域抓取狀態</span>
              <span className="text-[10px] text-white/40">
                {showRegions ? "▲ 收起" : "▼ 展開"}
              </span>
            </button>
            {showRegions && (
              <div className="mt-3 space-y-1.5">
                {regionEntries.map(([key, status]) => (
                  <div
                    key={key}
                    className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2"
                  >
                    <span className="w-16 shrink-0 text-[11px] font-semibold text-white/80">
                      {REGION_LABELS[key] || key}
                    </span>
                    <div className="flex flex-1 gap-4 text-[10px] text-white/40">
                      <span>
                        抓取：
                        <span className="font-mono text-white/60">
                          {formatTime(status.last_scraped_at)}
                        </span>
                      </span>
                      <span>
                        套用：
                        <span className="font-mono text-white/60">
                          {formatTime(status.last_applied_at)}
                        </span>
                      </span>
                    </div>
                    <div
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        status.last_scraped_at
                          ? "bg-emerald-400"
                          : "bg-white/20"
                      }`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
