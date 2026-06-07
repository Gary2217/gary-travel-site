"use client";

import { useEffect, useState, useCallback } from "react";
import Toast from "./Toast";

interface DestinationOption {
  id: string;
  title: string;
  source_url?: string | null;
  regions?: { title?: string; category_label?: string } | null;
}

interface RegionStatusEntry {
  last_scraped?: string | null;
  last_applied?: string | null;
}

interface ScrapeSettingsData {
  auto_enabled: boolean;
  frequency_days: number;
  last_scrape_at: string | null;
  region_status: Record<string, RegionStatusEntry>;
  next_region_index: number;
}

interface ScrapeSettingsProps {
  onTrigger?: () => void;
  isRunning?: boolean;
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

export default function ScrapeSettings({ onTrigger, isRunning = false }: ScrapeSettingsProps) {
  const [settings, setSettings] = useState<ScrapeSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [destinations, setDestinations] = useState<DestinationOption[]>([]);
  const [selectedDestinationId, setSelectedDestinationId] = useState("");
  const [destinationLoading, setDestinationLoading] = useState(true);
  const [pageTriggering, setPageTriggering] = useState(false);
  const [pdfTriggering, setPdfTriggering] = useState(false);
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
          region_status: (data.scrape_region_status && typeof data.scrape_region_status === 'object') ? data.scrape_region_status : {},
          next_region_index: Number(data.scrape_next_region_index) || 0,
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

        {/* 區域排程儀表板 */}
        {(() => {
          // 從朋威抓取的區域 key（對應 auto-scrape.mjs REGION_PAGES）
          const REGION_KEYS = [
            { key: 'asia', label: '中東亞非' },
            { key: 'japan', label: '日本' },
            { key: 'south-korea', label: '韓國' },
            { key: 'thailand', label: '泰國' },
            { key: 'vietnam', label: '越南' },
            { key: 'indonesia', label: '印尼' },
            { key: 'malaysia', label: '馬新' },
            { key: 'philippines', label: '菲律賓' },
            { key: 'europe', label: '歐洲' },
            { key: 'china', label: '港澳大陸' },
            { key: 'southasia', label: '南亞' },
            { key: 'new', label: '紐澳美加' },
            { key: 'kinmen', label: '金門' },
            { key: 'mazu', label: '馬祖' },
            { key: 'penghu', label: '澎湖' },
            { key: 'freetour', label: '自由行' },
            { key: 'golf', label: '高爾夫' },
          ];

          const rs = settings?.region_status || {};

          // 按 last_scraped 排序（最久沒抓的排前面）= 智慧輪轉的下一批
          const sorted = [...REGION_KEYS].sort((a, b) => {
            const aTime = rs[a.key]?.last_scraped || '1970-01-01';
            const bTime = rs[b.key]?.last_scraped || '1970-01-01';
            return aTime.localeCompare(bTime);
          });
          const nextBatch = new Set(sorted.slice(0, 4).map(r => r.key));

          const daysSince = (iso: string | null | undefined) => {
            if (!iso) return null;
            const ms = Date.now() - new Date(iso).getTime();
            return Math.floor(ms / 86400000);
          };

          const formatShortDate = (iso: string | null | undefined) => {
            if (!iso) return '從未';
            const d = new Date(iso);
            return `${d.getMonth() + 1}/${d.getDate()}`;
          };

          return (
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-bold text-white/80">📅 區域排程總覽</p>
                <p className="text-[10px] text-white/40">🔵 下次優先抓取</p>
              </div>
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {REGION_KEYS.map(({ key, label }) => {
                  const status = rs[key];
                  const days = daysSince(status?.last_scraped);
                  const isNext = nextBatch.has(key);
                  const never = days === null;
                  const stale = days !== null && days >= 3;

                  return (
                    <div
                      key={key}
                      className={`rounded-lg border p-2 text-center transition ${
                        isNext
                          ? 'border-sky-500/50 bg-sky-500/10'
                          : never
                            ? 'border-red-500/30 bg-red-500/5'
                            : stale
                              ? 'border-amber-500/30 bg-amber-500/5'
                              : 'border-white/10 bg-white/5'
                      }`}
                    >
                      <p className="text-[11px] font-semibold text-white/90">{label}</p>
                      <p className={`mt-0.5 text-[10px] ${never ? 'text-red-400' : stale ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {never ? '❌ 從未' : `✅ ${formatShortDate(status?.last_scraped)}`}
                      </p>
                      {status?.last_applied && (
                        <p className="text-[9px] text-white/30">
                          套用 {formatShortDate(status.last_applied)}
                        </p>
                      )}
                      {isNext && (
                        <span className="mt-1 inline-block rounded-full bg-sky-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-sky-400">
                          下次抓
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* 立即抓取按鈕 */}
        <button
          onClick={handleTrigger}
          disabled={triggering || isRunning}
          className="w-full rounded-full bg-sky-600 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:opacity-50"
        >
          {isRunning ? (
            "⏳ 抓取進行中..."
          ) : triggering ? (
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
              className="h-9 max-w-[200px] flex-1 rounded-lg border border-white/10 bg-[#1a2332] px-2 text-xs text-white outline-none"
            >
              <option value="">{destinationLoading ? "載入中..." : "選擇目的地"}</option>
              {(() => {
                const grouped = new Map<string, DestinationOption[]>();
                for (const d of destinations) {
                  const region = d.regions?.category_label || d.regions?.title || "其他";
                  if (!grouped.has(region)) grouped.set(region, []);
                  grouped.get(region)!.push(d);
                }
                return Array.from(grouped.entries()).map(([region, dests]) => (
                  <optgroup key={region} label={`── ${region} ──`}>
                    {dests.map((d) => (
                      <option key={d.id} value={d.id}>{d.title}</option>
                    ))}
                  </optgroup>
                ));
              })()}
            </select>
            {selectedDestination?.source_url && (
              <span className="hidden truncate text-[10px] text-white/40 sm:inline-block sm:max-w-[200px]">
                → {selectedDestination.source_url.replace('https://www.pwgotravel.com.tw', '')}
              </span>
            )}
            <button
              onClick={handlePageTrigger}
              disabled={pageTriggering || isRunning || !selectedDestinationId || !selectedDestination?.source_url}
              className="shrink-0 rounded-full bg-sky-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-sky-500 disabled:opacity-50"
            >
              {isRunning ? "⏳ 進行中" : pageTriggering ? "抓取中..." : "🔍 抓取此頁"}
            </button>
          </div>
          {selectedDestinationId && !selectedDestination?.source_url && (
            <p className="mt-1.5 text-[10px] text-amber-400">⚠️ 此目的地尚未設定朋威對應 URL</p>
          )}
        </div>

        {/* 抓取 PDF 行程檔 */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="mb-1 text-xs font-bold text-white/80">📄 抓取 PDF 行程檔</p>
          <p className="mb-2 text-[10px] text-white/40">自動從朋威下載行程 PDF，上傳到對應行程。只抓缺 PDF 的行程，已有的不重抓。</p>
          <button
            onClick={async () => {
              setPdfTriggering(true);
              try {
                const res = await fetch("/api/scrape/trigger", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({ mode: "pdfs", batchSize: 30 }),
                });
                if (res.ok) {
                  onTrigger?.();
                  setToast({ message: "已觸發 PDF 抓取（每次最多 30 筆）", type: "success" });
                } else {
                  setToast({ message: `觸發失敗：${await getErrorMessage(res, "請稍後再試")}`, type: "error" });
                }
              } catch (error) {
                setToast({ message: `觸發失敗：${error instanceof Error ? error.message : "請稍後再試"}`, type: "error" });
              } finally {
                setPdfTriggering(false);
              }
            }}
            disabled={pdfTriggering || isRunning}
            className="w-full rounded-full bg-emerald-600 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {isRunning ? "⏳ 進行中..." : pdfTriggering ? "啟動中..." : "📄 抓取 PDF 行程檔"}
          </button>
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
