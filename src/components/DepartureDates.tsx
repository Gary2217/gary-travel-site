"use client";

import { useState } from "react";
import { type DepartureDate, lineMessageHref } from "@/lib/supabase";

const CITIES = ["桃園", "台中", "高雄", "松山", "其他"];

interface DepartureDatesProps {
  tripId: string;
  tripTitle: string;
  dates: DepartureDate[];
  isDevMode: boolean;
  onDatesChange: (dates: DepartureDate[]) => void;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const weekday = ["日", "一", "二", "三", "四", "五", "六"][d.getDay()];
  return { full: `${mm}/${dd}（${weekday}）`, month: d.getMonth() + 1, year: d.getFullYear() };
}

function getSeatsColor(available: number, total: number) {
  if (available <= 0) return "text-red-400";
  if (total > 0 && available <= Math.ceil(total * 0.3)) return "text-amber-400";
  return "text-emerald-400";
}

function getSeatsLabel(available: number) {
  if (available <= 0) return "已額滿";
  if (available <= 5) return `剩 ${available} 位`;
  return `${available} 位`;
}

export default function DepartureDates({ tripId, tripTitle, dates, isDevMode, onDatesChange }: DepartureDatesProps) {
  const [activeMonth, setActiveMonth] = useState<string>("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // 新增表單 state
  const [formDate, setFormDate] = useState("");
  const [formCity, setFormCity] = useState("桃園");
  const [formAirline, setFormAirline] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formSeatsTotal, setFormSeatsTotal] = useState("");
  const [formSeatsAvailable, setFormSeatsAvailable] = useState("");
  const [formLabel, setFormLabel] = useState("");

  // 收集所有月份
  const months = Array.from(
    new Set(dates.map((d) => {
      const info = formatDate(d.departure_date);
      return `${info.year}-${info.month}`;
    }))
  ).sort();

  const monthLabels = months.map((m) => {
    const [y, mo] = m.split("-");
    return { key: m, label: `${mo}月`, year: y };
  });

  // 篩選
  const filtered = activeMonth === "all"
    ? dates
    : dates.filter((d) => {
        const info = formatDate(d.departure_date);
        return `${info.year}-${info.month}` === activeMonth;
      });

  const resetForm = () => {
    setFormDate("");
    setFormCity("桃園");
    setFormAirline("");
    setFormPrice("");
    setFormSeatsTotal("");
    setFormSeatsAvailable("");
    setFormLabel("");
    setEditingId(null);
  };

  const handleAdd = async () => {
    if (!formDate) return;
    setSaving(true);
    try {
      const total = parseInt(formSeatsTotal) || 0;
      const available = formSeatsAvailable ? parseInt(formSeatsAvailable) : total;
      const res = await fetch(`/api/trips/${tripId}/departure-dates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departure_date: formDate,
          departure_city: formCity,
          airline: formAirline || null,
          price: formPrice ? parseInt(formPrice.replace(/,/g, "")) : null,
          seats_total: total,
          seats_available: available,
          label: formLabel || null,
        }),
      });
      if (res.ok) {
        const added = await res.json();
        onDatesChange([...dates, added].sort((a, b) => a.departure_date.localeCompare(b.departure_date)));
        resetForm();
        setShowAddForm(false);
      }
    } catch { /* 靜默 */ }
    setSaving(false);
  };

  const handleEdit = async () => {
    if (!editingId || !formDate) return;
    setSaving(true);
    try {
      const total = parseInt(formSeatsTotal) || 0;
      const available = formSeatsAvailable ? parseInt(formSeatsAvailable) : total;
      const res = await fetch(`/api/trips/${tripId}/departure-dates?dateId=${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departure_date: formDate,
          departure_city: formCity,
          airline: formAirline || null,
          price: formPrice ? parseInt(formPrice.replace(/,/g, "")) : null,
          seats_total: total,
          seats_available: available,
          label: formLabel || null,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        onDatesChange(
          dates.map((d) => (d.id === editingId ? updated : d)).sort((a, b) => a.departure_date.localeCompare(b.departure_date))
        );
        resetForm();
        setShowAddForm(false);
      }
    } catch { /* 靜默 */ }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("確定刪除此出團梯次？")) return;
    const res = await fetch(`/api/trips/${tripId}/departure-dates?dateId=${id}`, { method: "DELETE" });
    if (res.ok) {
      onDatesChange(dates.filter((d) => d.id !== id));
    }
  };

  const openEditForm = (d: DepartureDate) => {
    setEditingId(d.id);
    setFormDate(d.departure_date);
    setFormCity(d.departure_city);
    setFormAirline(d.airline || "");
    setFormPrice(d.price ? String(d.price) : "");
    setFormSeatsTotal(String(d.seats_total || ""));
    setFormSeatsAvailable(String(d.seats_available || ""));
    setFormLabel(d.label || "");
    setShowAddForm(true);
  };

  return (
    <div className="mb-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wider text-white/50">出團日期</h2>
        {isDevMode && (
          <button
            onClick={() => { resetForm(); setShowAddForm(!showAddForm); }}
            className="rounded-full bg-sky-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-sky-500"
          >
            {showAddForm ? "取消" : "新增梯次"}
          </button>
        )}
      </div>

      {/* Dev mode 新增/編輯表單 */}
      {isDevMode && showAddForm && (
        <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="mb-3 text-xs font-bold text-amber-400">{editingId ? "編輯梯次" : "新增梯次"}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-[10px] text-white/50">出發日期 *</label>
              <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white outline-none focus:border-sky-400 [color-scheme:dark]" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-white/50">出發地</label>
              <select value={formCity} onChange={(e) => setFormCity(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white outline-none focus:border-sky-400 [color-scheme:dark]">
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-white/50">航空公司</label>
              <input type="text" value={formAirline} onChange={(e) => setFormAirline(e.target.value)} placeholder="如：長榮航空"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:border-sky-400" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-white/50">售價</label>
              <input type="text" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} placeholder="如：42000"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:border-sky-400" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-white/50">總位數</label>
              <input type="number" value={formSeatsTotal} onChange={(e) => setFormSeatsTotal(e.target.value)} placeholder="如：30"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:border-sky-400" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-white/50">剩餘位數</label>
              <input type="number" value={formSeatsAvailable} onChange={(e) => setFormSeatsAvailable(e.target.value)} placeholder="同總位數"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:border-sky-400" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-white/50">備註</label>
              <input type="text" value={formLabel} onChange={(e) => setFormLabel(e.target.value)} placeholder="如：確認出團"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:border-sky-400" />
            </div>
            <div className="flex items-end">
              <button
                disabled={!formDate || saving}
                onClick={editingId ? handleEdit : handleAdd}
                className="w-full rounded-lg bg-sky-600 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-500 disabled:opacity-50"
              >
                {saving ? "儲存中..." : editingId ? "更新" : "新增"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 月份篩選 */}
      {monthLabels.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveMonth("all")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              activeMonth === "all"
                ? "bg-sky-500 text-white"
                : "border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
            }`}
          >
            全部
          </button>
          {monthLabels.map((m) => (
            <button
              key={m.key}
              onClick={() => setActiveMonth(m.key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                activeMonth === m.key
                  ? "bg-sky-500 text-white"
                  : "border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      {/* 出團列表 */}
      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((d) => {
            const info = formatDate(d.departure_date);
            const seatsColor = getSeatsColor(d.seats_available, d.seats_total);
            const seatsLabel = getSeatsLabel(d.seats_available);
            const isFull = d.seats_available <= 0 && d.seats_total > 0;

            return (
              <div
                key={d.id}
                className={`rounded-xl border bg-[rgba(20,20,30,0.5)] p-3 backdrop-blur-sm transition sm:p-4 ${
                  isFull ? "border-white/5 opacity-60" : "border-white/10"
                }`}
              >
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  {/* 日期 */}
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 shrink-0 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm font-bold text-white sm:text-base">{info.full}</span>
                  </div>

                  {/* 出發地 */}
                  <div className="flex items-center gap-1.5">
                    <svg className="h-3.5 w-3.5 shrink-0 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-xs text-white/70">{d.departure_city}出發</span>
                  </div>

                  {/* 航空 */}
                  {d.airline && (
                    <div className="flex items-center gap-1.5">
                      <svg className="h-3.5 w-3.5 shrink-0 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      <span className="text-xs text-white/70">{d.airline}</span>
                    </div>
                  )}

                  {/* 價格 */}
                  {d.price && (
                    <span className="text-sm font-bold text-amber-300 sm:text-base">
                      NT$ {d.price.toLocaleString()}
                    </span>
                  )}

                  {/* 座位 */}
                  {d.seats_total > 0 && (
                    <span className={`text-xs font-semibold ${seatsColor}`}>
                      {seatsLabel}
                    </span>
                  )}

                  {/* 備註標籤 */}
                  {d.label && (
                    <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-medium text-sky-300">
                      {d.label}
                    </span>
                  )}

                  {/* 間隔推到右邊 */}
                  <div className="flex-1" />

                  {/* 報名按鈕 */}
                  {!isDevMode && !isFull && (
                    <a
                      href={lineMessageHref(`我想報名【${tripTitle}】${info.full} ${d.departure_city}出發`)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-full bg-[#06C755] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#05b64d] active:scale-95"
                    >
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24"><path d="M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" /></svg>
                      我要報名
                    </a>
                  )}

                  {isFull && !isDevMode && (
                    <span className="rounded-full bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-400">
                      已額滿
                    </span>
                  )}

                  {/* Dev mode 編輯/刪除 */}
                  {isDevMode && (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => openEditForm(d)}
                        className="rounded-full bg-amber-500/20 px-2.5 py-1 text-[10px] font-semibold text-amber-300 transition hover:bg-amber-500/30"
                      >
                        編輯
                      </button>
                      <button
                        onClick={() => handleDelete(d.id)}
                        className="rounded-full bg-red-500/20 px-2.5 py-1 text-[10px] font-semibold text-red-300 transition hover:bg-red-500/30"
                      >
                        刪除
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-white/40">
          {dates.length > 0 ? "此月份無出團梯次" : "尚未設定出團日期"}
        </p>
      )}
    </div>
  );
}
