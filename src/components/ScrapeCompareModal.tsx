"use client";

import { useState } from "react";

// ── Types ────────────────────────────────────────────────
interface FlightSegment {
  airline: string;
  flight_number: string;
  day_text: string;
  dep_time: string;
  dep_airport: string;
  arr_time: string;
  arr_airport: string;
  next_day: boolean;
}

interface DepartureDate {
  date: string;
  price: number;
  seats_total: number;
  seats_available: number;
  label: string;
  departure_city: string;
  airline: string;
}

interface DateChange {
  date: string;
  old_price: number;
  new_price: number;
}

interface ScrapeChangeDetails {
  basic_info?: {
    ours: Record<string, string>;
    theirs: Record<string, string>;
  };
  price_detail?: {
    ours: string;
    theirs: string;
  };
  flight_segments?: {
    ours: FlightSegment[];
    theirs: FlightSegment[];
  };
  departure_dates?: {
    added: DepartureDate[];
    removed: DepartureDate[];
    changed: DateChange[];
    unchanged: DepartureDate[];
  };
  combined_fields?: {
    ours: Record<string, string>;
    theirs: Record<string, string>;
  };
}

export interface ScrapeChangeItem {
  id: string;
  trip_id: string | null;
  trip_title: string;
  change_type: string;
  summary: string;
  status: string;
  created_at: string;
  source_url?: string;
  scraped_data?: Record<string, unknown>;
  details: ScrapeChangeDetails;
}

interface ScrapeCompareModalProps {
  change: ScrapeChangeItem;
  onClose: () => void;
  onApply: (id: string) => void;
  onIgnore: (id: string) => void;
}

// ── Helpers ──────────────────────────────────────────────
const BASIC_FIELD_LABELS: Record<string, string> = {
  title: "行程標題",
  subtitle: "副標題",
  code_label: "團型編號",
  duration: "旅遊天數",
  duration_label: "天數標示",
  min_group_size: "成團人數",
  airport: "出發機場",
  airline: "航空公司",
  departure_label: "出發地",
  tags: "標籤",
};

const PRICE_COLS = ["大人", "小孩佔床", "小孩不佔床", "加床", "嬰兒"];

const COMBINED_FIELD_LABELS: Record<string, string> = {
  price_range: "售價顯示",
  price_label: "售價標籤",
  display_order: "排序位置",
  custom_tour: "客製行程",
  seats_total: "機位數",
};

function DiffCell({
  ours,
  theirs,
  label,
}: {
  ours: string;
  theirs: string;
  label: string;
}) {
  const isDiff = ours !== theirs;
  return (
    <div
      className={`rounded-lg border p-2.5 ${
        isDiff
          ? "border-red-400/30 bg-red-500/10"
          : "border-white/5 bg-white/[0.02]"
      }`}
    >
      <p className="text-[10px] text-white/40">{label}</p>
      <div className="mt-1 grid grid-cols-2 gap-2">
        <div>
          <p className="text-[9px] text-sky-400/70">我的網站</p>
          <p
            className={`mt-0.5 text-xs ${isDiff ? "text-red-300" : "text-white/70"}`}
          >
            {ours || "—"}
          </p>
        </div>
        <div>
          <p className="text-[9px] text-amber-400/70">朋威</p>
          <p
            className={`mt-0.5 text-xs ${isDiff ? "font-semibold text-amber-300" : "text-white/70"}`}
          >
            {theirs || "—"}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────
export default function ScrapeCompareModal({
  change,
  onClose,
  onApply,
  onIgnore,
}: ScrapeCompareModalProps) {
  const [applying, setApplying] = useState(false);
  const details = change.details;

  const handleApply = async () => {
    setApplying(true);
    onApply(change.id);
  };

  const oursPrice = details.price_detail?.ours?.split("\t") ?? [];
  const theirsPrice = details.price_detail?.theirs?.split("\t") ?? [];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0f1923] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-white">
              {change.trip_title}
            </h2>
            <p className="mt-0.5 text-[11px] text-white/40">
              變更比對 · 左側為我的網站、右側為朋威最新
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition hover:bg-white/10 hover:text-white"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {/* ① 基本資訊 */}
          {details.basic_info && (
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-xs font-bold text-white/70">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-sky-500/20 text-[10px] font-bold text-sky-400">
                  ①
                </span>
                基本資訊
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.keys(BASIC_FIELD_LABELS).map((key) => {
                  const ours = details.basic_info?.ours[key] ?? "";
                  const theirs = details.basic_info?.theirs[key] ?? "";
                  if (!ours && !theirs) return null;
                  return (
                    <DiffCell
                      key={key}
                      ours={ours}
                      theirs={theirs}
                      label={BASIC_FIELD_LABELS[key]}
                    />
                  );
                })}
              </div>
            </section>
          )}

          {/* ② 售價明細 */}
          {details.price_detail && (
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-xs font-bold text-white/70">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-sky-500/20 text-[10px] font-bold text-sky-400">
                  ②
                </span>
                售價明細
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className="border-b border-white/10 text-[11px] text-white/40">
                      <th className="px-3 py-2 text-left">來源</th>
                      {PRICE_COLS.map((col) => (
                        <th key={col} className="px-3 py-2 text-center">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-white/5 text-xs">
                      <td className="px-3 py-2 text-sky-400/70">我的網站</td>
                      {PRICE_COLS.map((_, i) => {
                        const isDiff =
                          (oursPrice[i] ?? "") !== (theirsPrice[i] ?? "");
                        return (
                          <td
                            key={i}
                            className={`px-3 py-2 text-center ${isDiff ? "rounded bg-red-500/10 text-red-300" : "text-white/60"}`}
                          >
                            {oursPrice[i] || "—"}
                          </td>
                        );
                      })}
                    </tr>
                    <tr className="text-xs">
                      <td className="px-3 py-2 text-amber-400/70">朋威</td>
                      {PRICE_COLS.map((_, i) => {
                        const isDiff =
                          (oursPrice[i] ?? "") !== (theirsPrice[i] ?? "");
                        return (
                          <td
                            key={i}
                            className={`px-3 py-2 text-center ${isDiff ? "rounded bg-amber-500/10 font-semibold text-amber-300" : "text-white/60"}`}
                          >
                            {theirsPrice[i] || "—"}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ③ 航班資訊 */}
          {details.flight_segments && (
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-xs font-bold text-white/70">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-sky-500/20 text-[10px] font-bold text-sky-400">
                  ③
                </span>
                航班資訊
              </h3>
              <div className="grid gap-3 lg:grid-cols-2">
                {(["ours", "theirs"] as const).map((side) => {
                  const segments = details.flight_segments?.[side] ?? [];
                  return (
                    <div
                      key={side}
                      className="rounded-xl border border-white/5 bg-white/[0.02] p-3"
                    >
                      <p
                        className={`mb-2 text-[10px] font-semibold ${side === "ours" ? "text-sky-400/70" : "text-amber-400/70"}`}
                      >
                        {side === "ours" ? "我的網站" : "朋威"}
                      </p>
                      {segments.length === 0 ? (
                        <p className="text-xs text-white/30">無航班資料</p>
                      ) : (
                        <div className="space-y-1.5">
                          {segments.map((seg, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px]"
                            >
                              <span className="text-white/40">{seg.day_text}</span>
                              <span className="text-sky-300/70">{seg.airline}</span>
                              <span className="font-semibold text-white/80">
                                {seg.flight_number}
                              </span>
                              <span className="text-white/50">
                                {seg.dep_time}
                              </span>
                              <span className="text-white/40">
                                {seg.dep_airport}
                              </span>
                              <span className="text-white/20">→</span>
                              <span className="text-white/50">
                                {seg.arr_time}
                              </span>
                              <span className="text-white/40">
                                {seg.arr_airport}
                              </span>
                              {seg.next_day && (
                                <span className="rounded bg-amber-500/20 px-1 text-[9px] text-amber-400">
                                  +1天
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ④ 出發日期 */}
          {details.departure_dates && (
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-xs font-bold text-white/70">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-sky-500/20 text-[10px] font-bold text-sky-400">
                  ④
                </span>
                出發日期
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-white/10 text-[11px] text-white/40">
                      <th className="px-3 py-2 text-left">狀態</th>
                      <th className="px-3 py-2 text-left">日期</th>
                      <th className="px-3 py-2 text-center">售價</th>
                      <th className="px-3 py-2 text-center">機位</th>
                      <th className="px-3 py-2 text-center">可售</th>
                      <th className="px-3 py-2 text-center">時段</th>
                      <th className="px-3 py-2 text-left">出發地</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* 新增 */}
                    {details.departure_dates.added.map((d) => (
                      <tr
                        key={`add-${d.date}`}
                        className="border-b border-white/5 text-xs"
                      >
                        <td className="px-3 py-2">
                          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                            🟢 新增
                          </span>
                        </td>
                        <td className="px-3 py-2 text-emerald-300">
                          {d.date}
                        </td>
                        <td className="px-3 py-2 text-center text-emerald-300">
                          {d.price.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-center text-white/50">
                          {d.seats_total}
                        </td>
                        <td className="px-3 py-2 text-center text-white/50">
                          {d.seats_available}
                        </td>
                        <td className="px-3 py-2 text-center text-white/50">
                          {d.label}
                        </td>
                        <td className="px-3 py-2 text-white/50">
                          {d.departure_city}
                        </td>
                      </tr>
                    ))}
                    {/* 改價 */}
                    {details.departure_dates.changed.map((d) => (
                      <tr
                        key={`chg-${d.date}`}
                        className="border-b border-white/5 bg-amber-500/5 text-xs"
                      >
                        <td className="px-3 py-2">
                          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                            🟡 改價
                          </span>
                        </td>
                        <td className="px-3 py-2 text-white/70">{d.date}</td>
                        <td className="px-3 py-2 text-center">
                          <span className="text-red-300 line-through">
                            {d.old_price.toLocaleString()}
                          </span>
                          <span className="ml-1.5 font-semibold text-amber-300">
                            {d.new_price.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center text-white/30">
                          —
                        </td>
                        <td className="px-3 py-2 text-center text-white/30">
                          —
                        </td>
                        <td className="px-3 py-2 text-center text-white/30">
                          —
                        </td>
                        <td className="px-3 py-2 text-white/30">—</td>
                      </tr>
                    ))}
                    {/* 移除 */}
                    {details.departure_dates.removed.map((d) => (
                      <tr
                        key={`rm-${d.date}`}
                        className="border-b border-white/5 bg-red-500/5 text-xs"
                      >
                        <td className="px-3 py-2">
                          <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400">
                            🔴 移除
                          </span>
                        </td>
                        <td className="px-3 py-2 text-red-300/70 line-through">
                          {d.date}
                        </td>
                        <td className="px-3 py-2 text-center text-red-300/50 line-through">
                          {d.price.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-center text-white/30">
                          {d.seats_total}
                        </td>
                        <td className="px-3 py-2 text-center text-white/30">
                          {d.seats_available}
                        </td>
                        <td className="px-3 py-2 text-center text-white/30">
                          {d.label}
                        </td>
                        <td className="px-3 py-2 text-white/30">
                          {d.departure_city}
                        </td>
                      </tr>
                    ))}
                    {/* 不變 */}
                    {details.departure_dates.unchanged.map((d) => (
                      <tr
                        key={`ok-${d.date}`}
                        className="border-b border-white/5 text-xs"
                      >
                        <td className="px-3 py-2">
                          <span className="text-[10px] text-white/30">
                            ✅ 不變
                          </span>
                        </td>
                        <td className="px-3 py-2 text-white/50">{d.date}</td>
                        <td className="px-3 py-2 text-center text-white/50">
                          {d.price.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-center text-white/30">
                          {d.seats_total}
                        </td>
                        <td className="px-3 py-2 text-center text-white/30">
                          {d.seats_available}
                        </td>
                        <td className="px-3 py-2 text-center text-white/30">
                          {d.label}
                        </td>
                        <td className="px-3 py-2 text-white/30">
                          {d.departure_city}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ⑤ 組合欄位 */}
          {details.combined_fields && (
            <section>
              <h3 className="mb-3 flex items-center gap-2 text-xs font-bold text-white/70">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-sky-500/20 text-[10px] font-bold text-sky-400">
                  ⑤
                </span>
                組合欄位
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.keys(COMBINED_FIELD_LABELS).map((key) => {
                  const ours = details.combined_fields?.ours[key] ?? "";
                  const theirs = details.combined_fields?.theirs[key] ?? "";
                  if (!ours && !theirs) return null;
                  return (
                    <DiffCell
                      key={key}
                      ours={ours}
                      theirs={theirs}
                      label={COMBINED_FIELD_LABELS[key]}
                    />
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-white/10 px-5 py-4">
          <button
            onClick={() => onIgnore(change.id)}
            className="rounded-full border border-white/10 px-5 py-2 text-xs font-semibold text-white/50 transition hover:bg-white/5 hover:text-white/80"
          >
            忽略此筆
          </button>
          <button
            onClick={handleApply}
            disabled={applying}
            className="rounded-full bg-sky-600 px-5 py-2 text-xs font-semibold text-white transition hover:bg-sky-500 disabled:opacity-50"
          >
            {applying ? "更新中..." : "✓ 確認更新"}
          </button>
        </div>
      </div>
    </div>
  );
}
