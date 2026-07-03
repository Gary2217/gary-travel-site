"use client";

import { useState } from "react";

export interface ScrapeChangeItem {
  id: string;
  change_type: string;
  trip_id?: string;
  trip_title?: string;
  destination_id?: string;
  region_label?: string;
  field_name?: string;
  old_value?: unknown;
  new_value?: unknown;
  summary?: string;
  scraped_data?: Record<string, unknown>;
  current_data?: Record<string, unknown>;
  source_url?: string;
  source_code?: string;
  created_at: string;
  status: string;
}

interface ScrapeCompareModalProps {
  change: ScrapeChangeItem;
  onClose: () => void;
  onApply: (id: string) => Promise<boolean>;
  onIgnore: (id: string) => Promise<boolean>;
}

const CHANGE_TYPE_CONFIG: Record<string, { icon: string; label: string; badgeClass: string }> = {
  price: { icon: "🟡", label: "價格變更", badgeClass: "bg-amber-500/20 text-amber-400" },
  new_trip: { icon: "🟢", label: "新行程", badgeClass: "bg-emerald-500/20 text-emerald-400" },
  removed: { icon: "🔴", label: "行程下架", badgeClass: "bg-red-500/20 text-red-400" },
  departure: { icon: "🔵", label: "出發日期", badgeClass: "bg-blue-500/20 text-blue-400" },
  price_detail: { icon: "🟠", label: "售價明細", badgeClass: "bg-orange-500/20 text-orange-400" },
  info: { icon: "⚪", label: "資訊變更", badgeClass: "bg-white/10 text-white/60" },
  flight: { icon: "✈️", label: "航班變更", badgeClass: "bg-cyan-500/20 text-cyan-400" },
  promotion: { icon: "🎁", label: "優惠方案", badgeClass: "bg-pink-500/20 text-pink-400" },
  new_tab: { icon: "🟣", label: "新分頁/區域", badgeClass: "bg-purple-500/20 text-purple-400" },
  warning: { icon: "⚠️", label: "抓取異常", badgeClass: "bg-yellow-500/20 text-yellow-400" },
};

function parsePriceDetail(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  return raw.split("\t");
}

const PRICE_DETAIL_LABELS = ["大人", "小孩佔床", "小孩不佔床", "加床", "嬰兒"];

function PriceDetailTable({ raw, label }: { raw: unknown; label: string }) {
  const cols = parsePriceDetail(raw);
  if (cols.length === 0) {
    return (
      <div className="text-[11px] text-white/30 italic">（無資料）</div>
    );
  }
  return (
    <div>
      <p className="mb-1 text-[10px] font-bold text-white/40 uppercase tracking-wider">{label}</p>
      <div className="grid grid-cols-5 gap-1">
        {PRICE_DETAIL_LABELS.map((lbl, i) => (
          <div key={lbl} className="rounded-lg bg-white/5 p-2 text-center">
            <p className="text-[9px] text-white/40 mb-0.5">{lbl}</p>
            <p className="text-xs font-semibold text-white/90">{cols[i] || "—"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DepartureList({ raw, label }: { raw: unknown; label: string }) {
  const list = Array.isArray(raw) ? raw : [];
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-bold text-white/40 uppercase tracking-wider">{label}</p>
      {list.length === 0 ? (
        <div className="text-[11px] text-white/30 italic">（無出發日期）</div>
      ) : (
        <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
          {list.map((dep: Record<string, unknown>, i: number) => (
            <div key={i} className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2">
              <span className="text-[11px] font-mono text-sky-400 shrink-0">
                {typeof dep.departure_date === "string" ? dep.departure_date : "—"}
              </span>
              <span className="text-[11px] text-white/70 flex-1">
                {typeof dep.departure_city === "string" ? dep.departure_city : ""}
              </span>
              <span className="text-[11px] font-semibold text-amber-400 shrink-0">
                {typeof dep.price === "number"
                  ? `NT$${dep.price.toLocaleString()}`
                  : typeof dep.price === "string"
                  ? dep.price
                  : "—"}
              </span>
              {typeof dep.seats_available === "number" && (
                <span className="text-[10px] text-white/40 shrink-0">
                  餘 {dep.seats_available} 位
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FlightList({ raw, label }: { raw: unknown; label: string }) {
  const list = Array.isArray(raw) ? raw : [];
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-bold text-white/40 uppercase tracking-wider">{label}</p>
      {list.length === 0 ? (
        <div className="text-[11px] text-white/30 italic">（無航班資訊）</div>
      ) : (
        <div className="space-y-1">
          {list.map((seg: Record<string, unknown>, i: number) => (
            <div key={i} className="rounded-lg bg-white/5 px-3 py-2 text-[11px]">
              <span className="text-sky-400 font-mono mr-2">{String(seg.flight_number || "—")}</span>
              <span className="text-white/60">
                {String(seg.departure_airport || "")} {String(seg.departure_time || "")}
                {" → "}
                {String(seg.arrival_airport || "")} {String(seg.arrival_time || "")}
                {seg.next_day ? " (+1天)" : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NewTripPreview({ scraped }: { scraped: Record<string, unknown> | undefined }) {
  if (!scraped) return <div className="text-[11px] text-white/30 italic">（無資料）</div>;
  const fields: [string, string][] = [
    ["標題", String(scraped.title || "—")],
    ["天數", String(scraped.duration || "—")],
    ["價格", String(scraped.price_range || "—")],
    ["出發地", String(scraped.departure_label || "—")],
    ["航空公司", String(scraped.airline || "—")],
    ["標籤", Array.isArray(scraped.tags) ? scraped.tags.join("、") : "—"],
  ];
  return (
    <div className="space-y-2">
      {scraped.cover_image_url && (
        <img
          src={String(scraped.cover_image_url)}
          alt=""
          className="w-full h-32 object-cover rounded-lg"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      )}
      <div className="grid grid-cols-2 gap-2">
        {fields.map(([k, v]) => (
          <div key={k} className="rounded-lg bg-white/5 p-2">
            <p className="text-[9px] text-white/40 mb-0.5">{k}</p>
            <p className="text-[11px] text-white/90 break-words">{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ValueDisplay({ value, label }: { value: unknown; label: string }) {
  const text =
    typeof value === "string"
      ? value
      : typeof value === "number"
      ? String(value)
      : value == null
      ? "（無）"
      : JSON.stringify(value, null, 2);
  return (
    <div>
      <p className="mb-1 text-[10px] font-bold text-white/40 uppercase tracking-wider">{label}</p>
      <pre className="whitespace-pre-wrap break-words rounded-lg bg-white/5 p-3 text-[11px] text-white/80">
        {text}
      </pre>
    </div>
  );
}

function CompareContent({ change }: { change: ScrapeChangeItem }) {
  const { change_type, old_value, new_value, scraped_data, current_data, field_name } = change;

  if (change_type === "price") {
    return (
      <div className="grid grid-cols-2 gap-3">
        <ValueDisplay value={old_value} label="目前價格" />
        <ValueDisplay value={new_value} label="新價格" />
      </div>
    );
  }

  if (change_type === "price_detail") {
    const oldDetail = current_data?.price_detail ?? old_value;
    const newDetail = scraped_data?.price_detail ?? new_value;
    return (
      <div className="space-y-4">
        <PriceDetailTable raw={oldDetail} label="目前售價明細" />
        <div className="border-t border-white/10" />
        <PriceDetailTable raw={newDetail} label="新售價明細" />
      </div>
    );
  }

  if (change_type === "departure") {
    const oldDeps = current_data?.departures ?? old_value;
    const newDeps = scraped_data?.departures ?? new_value;
    return (
      <div className="space-y-4">
        <DepartureList raw={oldDeps} label="目前出發日期" />
        <div className="border-t border-white/10" />
        <DepartureList raw={newDeps} label="新出發日期" />
      </div>
    );
  }

  if (change_type === "flight") {
    const oldFlights = current_data?.flight_segments ?? old_value;
    const newFlights = scraped_data?.flight_segments ?? new_value;
    return (
      <div className="space-y-4">
        <FlightList raw={oldFlights} label="目前航班" />
        <div className="border-t border-white/10" />
        <FlightList raw={newFlights} label="新航班" />
      </div>
    );
  }

  if (change_type === "new_trip") {
    return (
      <div>
        <p className="mb-2 text-[10px] font-bold text-white/40 uppercase tracking-wider">新行程資訊</p>
        <NewTripPreview scraped={scraped_data} />
      </div>
    );
  }

  if (change_type === "removed") {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center">
        <p className="text-sm font-semibold text-red-400">確認下架此行程？</p>
        <p className="mt-1 text-[11px] text-white/40">
          套用後將把行程標記為 is_active = false，不再公開顯示。
        </p>
        {current_data?.title && (
          <p className="mt-2 text-xs text-white/60 font-mono">{String(current_data.title)}</p>
        )}
      </div>
    );
  }

  if (change_type === "promotion") {
    return (
      <div className="grid grid-cols-2 gap-3">
        <ValueDisplay value={old_value} label="目前優惠方案" />
        <ValueDisplay value={new_value} label="新優惠方案" />
      </div>
    );
  }

  // info 和其他 change_type
  return (
    <div className="space-y-3">
      {field_name && (
        <div className="rounded-lg bg-white/5 px-3 py-2">
          <span className="text-[10px] text-white/40">欄位：</span>
          <span className="ml-1 text-[11px] font-mono text-sky-400">{field_name}</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <ValueDisplay value={old_value} label="目前值" />
        <ValueDisplay value={new_value} label="新值" />
      </div>
    </div>
  );
}

export default function ScrapeCompareModal({
  change,
  onClose,
  onApply,
  onIgnore,
}: ScrapeCompareModalProps) {
  const [applyLoading, setApplyLoading] = useState(false);
  const [ignoreLoading, setIgnoreLoading] = useState(false);

  const config = CHANGE_TYPE_CONFIG[change.change_type] ?? CHANGE_TYPE_CONFIG.info;

  const handleApply = async () => {
    setApplyLoading(true);
    const ok = await onApply(change.id);
    setApplyLoading(false);
    if (ok) onClose();
  };

  const handleIgnore = async () => {
    setIgnoreLoading(true);
    const ok = await onIgnore(change.id);
    setIgnoreLoading(false);
    if (ok) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* 半透明背景 */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal 本體 */}
      <div className="relative z-10 flex w-full max-w-xl flex-col rounded-2xl border border-white/10 bg-[rgba(14,14,22,0.95)] shadow-2xl max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <span className="text-lg">{config.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-white truncate">
                {change.trip_title || (change.scraped_data?.title as string) || "（未知行程）"}
              </h3>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${config.badgeClass}`}>
                {config.label}
              </span>
            </div>
            {change.summary && (
              <p className="mt-0.5 text-[11px] text-white/40 truncate">{change.summary}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-full p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white"
            aria-label="關閉"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 內容 */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <CompareContent change={change} />

          {/* 來源連結 */}
          {change.source_url && (
            <div className="mt-4 border-t border-white/10 pt-4">
              <a
                href={change.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] text-sky-400 hover:text-sky-300 transition"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                開啟來源頁面
              </a>
            </div>
          )}
        </div>

        {/* Footer 按鈕 */}
        <div className="flex items-center justify-end gap-3 border-t border-white/10 px-5 py-4">
          <button
            onClick={handleIgnore}
            disabled={ignoreLoading || applyLoading}
            className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-white/40 transition hover:bg-white/5 hover:text-white/70 disabled:opacity-50"
          >
            {ignoreLoading ? "處理中..." : "忽略"}
          </button>
          <button
            onClick={handleApply}
            disabled={applyLoading || ignoreLoading}
            className="flex items-center gap-1.5 rounded-full bg-sky-600 px-5 py-2 text-xs font-semibold text-white transition hover:bg-sky-500 disabled:opacity-50"
          >
            {applyLoading ? (
              <>
                <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                套用中...
              </>
            ) : (
              "確認更新"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
