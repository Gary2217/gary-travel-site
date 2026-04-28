"use client";

import { useState, useRef, useEffect } from "react";
import { type DepartureDate, lineMessageHref } from "@/lib/supabase";

const CITIES = ["桃園", "台中", "高雄", "松山", "其他"];

const AIRLINES = [
  { name: "中華航空", code: "CI", en: "China Airlines" },
  { name: "長榮航空", code: "BR", en: "EVA Air" },
  { name: "星宇航空", code: "JX", en: "STARLUX Airlines" },
  { name: "台灣虎航", code: "IT", en: "Tigerair Taiwan" },
  { name: "華信航空", code: "AE", en: "Mandarin Airlines" },
  { name: "立榮航空", code: "B7", en: "UNI Air" },
  { name: "樂桃航空", code: "MM", en: "Peach Aviation" },
  { name: "捷星日本", code: "GK", en: "Jetstar Japan" },
  { name: "酷航", code: "TR", en: "Scoot" },
  { name: "亞洲航空", code: "AK", en: "AirAsia" },
  { name: "宿霧太平洋", code: "5J", en: "Cebu Pacific" },
  { name: "越捷航空", code: "VJ", en: "VietJet Air" },
  { name: "菲律賓航空", code: "PR", en: "Philippine Airlines" },
  { name: "越南航空", code: "VN", en: "Vietnam Airlines" },
  { name: "泰國獅航", code: "SL", en: "Thai Lion Air" },
  { name: "泰國航空", code: "TG", en: "Thai Airways" },
  { name: "新加坡航空", code: "SQ", en: "Singapore Airlines" },
  { name: "國泰航空", code: "CX", en: "Cathay Pacific" },
  { name: "日本航空", code: "JL", en: "Japan Airlines" },
  { name: "全日空", code: "NH", en: "All Nippon Airways" },
  { name: "大韓航空", code: "KE", en: "Korean Air" },
  { name: "韓亞航空", code: "OZ", en: "Asiana Airlines" },
  { name: "真航空", code: "LJ", en: "Jin Air" },
  { name: "濟州航空", code: "7C", en: "Jeju Air" },
  { name: "德威航空", code: "TW", en: "T'way Air" },
  { name: "釜山航空", code: "BX", en: "Air Busan" },
  { name: "易斯達航空", code: "ZE", en: "Eastar Jet" },
  { name: "阿聯酋航空", code: "EK", en: "Emirates" },
  { name: "土耳其航空", code: "TK", en: "Turkish Airlines" },
  { name: "荷蘭皇家航空", code: "KL", en: "KLM Royal Dutch Airlines" },
  { name: "法國航空", code: "AF", en: "Air France" },
  { name: "馬來西亞航空", code: "MH", en: "Malaysia Airlines" },
  { name: "印尼航空", code: "GA", en: "Garuda Indonesia" },
];

interface DepartureDatesProps {
  tripId: string;
  tripTitle: string;
  dates: DepartureDate[];
  isDevMode: boolean;
  onDatesChange: (dates: DepartureDate[]) => void;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const weekday = ["日", "一", "二", "三", "四", "五", "六"][d.getDay()];
  return { full: `${yyyy}/${mm}/${dd}（${weekday}）`, short: `${mm}/${dd}（${weekday}）`, month: d.getMonth() + 1, year: d.getFullYear(), weekday };
}

function getWeekdayFromDate(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return "";
  return ["日", "一", "二", "三", "四", "五", "六"][d.getDay()];
}

const inputClass = "w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:border-sky-400";
const labelClass = "mb-1 block text-[10px] text-white/50";

export default function DepartureDates({ tripId, tripTitle, dates, isDevMode, onDatesChange }: DepartureDatesProps) {
  const [activeMonth, setActiveMonth] = useState<string>("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const today = new Date().toLocaleDateString("sv-SE");
  // 基本欄位
  const [formDate, setFormDate] = useState(today);
  const [formCity, setFormCity] = useState("桃園");
  const [formAirline, setFormAirline] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formLabel, setFormLabel] = useState("");
  // 去程航班
  const [formOutboundFlight, setFormOutboundFlight] = useState("");
  const [formOutboundTime, setFormOutboundTime] = useState("");
  const [formOutboundFrom, setFormOutboundFrom] = useState("");
  const [formOutboundArrivalTime, setFormOutboundArrivalTime] = useState("");
  const [formOutboundTo, setFormOutboundTo] = useState("");
  const [formOutboundNextDay, setFormOutboundNextDay] = useState(false);
  // 回程航班
  const [formReturnDate, setFormReturnDate] = useState("");
  const [formReturnFlight, setFormReturnFlight] = useState("");
  const [formReturnTime, setFormReturnTime] = useState("");
  const [formReturnFrom, setFormReturnFrom] = useState("");
  const [formReturnArrivalTime, setFormReturnArrivalTime] = useState("");
  const [formReturnTo, setFormReturnTo] = useState("");
  const [formReturnNextDay, setFormReturnNextDay] = useState(false);

  const [airlineDropdownOpen, setAirlineDropdownOpen] = useState(false);
  const airlineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!airlineDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (airlineRef.current && !airlineRef.current.contains(e.target as Node)) {
        setAirlineDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [airlineDropdownOpen]);

  const filteredAirlines = formAirline.trim()
    ? AIRLINES.filter((a) => {
        const q = formAirline.trim().toLowerCase();
        return a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q) || a.en.toLowerCase().includes(q);
      })
    : AIRLINES;

  const months = Array.from(
    new Set(dates.map((d) => {
      const info = formatDate(d.departure_date);
      return `${info.year}-${info.month}`;
    }))
  ).sort();

  const monthLabels = months.map((m) => {
    const [, mo] = m.split("-");
    return { key: m, label: `${mo}月` };
  });

  const filtered = activeMonth === "all"
    ? dates
    : dates.filter((d) => {
        const info = formatDate(d.departure_date);
        return `${info.year}-${info.month}` === activeMonth;
      });

  const resetForm = () => {
    setFormDate(today);
    setFormCity("桃園");
    setFormAirline("");
    setFormPrice("");
    setFormLabel("");
    setFormOutboundFlight("");
    setFormOutboundTime("");
    setFormOutboundFrom("");
    setFormOutboundArrivalTime("");
    setFormOutboundTo("");
    setFormOutboundNextDay(false);
    setFormReturnDate("");
    setFormReturnFlight("");
    setFormReturnTime("");
    setFormReturnFrom("");
    setFormReturnArrivalTime("");
    setFormReturnTo("");
    setFormReturnNextDay(false);
    setEditingId(null);
  };

  const buildPayload = () => ({
    departure_date: formDate,
    departure_city: formCity,
    airline: formAirline || null,
    price: formPrice ? parseInt(formPrice.replace(/,/g, "")) : null,
    label: formLabel || null,
    outbound_flight: formOutboundFlight || null,
    outbound_time: formOutboundTime || null,
    outbound_from: formOutboundFrom || null,
    outbound_arrival_time: formOutboundArrivalTime || null,
    outbound_to: formOutboundTo || null,
    outbound_next_day: formOutboundNextDay,
    return_date: formReturnDate || null,
    return_flight: formReturnFlight || null,
    return_time: formReturnTime || null,
    return_from: formReturnFrom || null,
    return_arrival_time: formReturnArrivalTime || null,
    return_to: formReturnTo || null,
    return_next_day: formReturnNextDay,
  });

  const handleAdd = async () => {
    if (!formDate) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/departure-dates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
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
      const res = await fetch(`/api/trips/${tripId}/departure-dates?dateId=${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
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
    setFormLabel(d.label || "");
    setFormOutboundFlight(d.outbound_flight || "");
    setFormOutboundTime(d.outbound_time || "");
    setFormOutboundFrom(d.outbound_from || "");
    setFormOutboundArrivalTime(d.outbound_arrival_time || "");
    setFormOutboundTo(d.outbound_to || "");
    setFormOutboundNextDay(d.outbound_next_day || false);
    setFormReturnDate(d.return_date || "");
    setFormReturnFlight(d.return_flight || "");
    setFormReturnTime(d.return_time || "");
    setFormReturnFrom(d.return_from || "");
    setFormReturnArrivalTime(d.return_arrival_time || "");
    setFormReturnTo(d.return_to || "");
    setFormReturnNextDay(d.return_next_day || false);
    setShowAddForm(true);
  };

  const departureDayLabel = getWeekdayFromDate(formDate);
  const returnDayLabel = getWeekdayFromDate(formReturnDate);

  const hasFlightInfo = (d: DepartureDate) =>
    d.outbound_flight || d.outbound_time || d.return_flight || d.return_time;

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

          {/* 基本資訊 */}
          <p className="mb-2 text-[10px] font-semibold text-white/40">基本資訊</p>
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div>
              <label className={labelClass}>出發日期 *</label>
              <div className="flex gap-1">
                <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)}
                  className={`${inputClass} flex-1 [color-scheme:dark]`} />
                {departureDayLabel && (
                  <span className="flex items-center rounded-lg border border-sky-400/20 bg-sky-400/10 px-2 text-xs font-bold text-sky-300">
                    {departureDayLabel}
                  </span>
                )}
              </div>
            </div>
            <div>
              <label className={labelClass}>出發地</label>
              <select value={formCity} onChange={(e) => setFormCity(e.target.value)}
                className={`${inputClass} [color-scheme:dark]`}>
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div ref={airlineRef} className="relative">
              <label className={labelClass}>航空公司</label>
              <input
                type="text"
                value={formAirline}
                onChange={(e) => { setFormAirline(e.target.value); setAirlineDropdownOpen(true); }}
                onFocus={() => setAirlineDropdownOpen(true)}
                placeholder="搜尋航空公司"
                className={inputClass}
                autoComplete="off"
              />
              {airlineDropdownOpen && filteredAirlines.length > 0 && (
                <div className="absolute left-0 top-full z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-white/10 bg-[rgba(20,20,30,0.98)] shadow-xl backdrop-blur-xl">
                  {filteredAirlines.map((a) => (
                    <button
                      key={a.code}
                      type="button"
                      onClick={() => {
                        setFormAirline(`${a.name}（${a.code}）`);
                        setAirlineDropdownOpen(false);
                      }}
                      className="flex w-full items-center justify-between px-2.5 py-2 text-left text-xs text-white transition hover:bg-white/10"
                    >
                      <span>{a.name}（{a.code}）</span>
                      <span className="text-[10px] text-white/40">{a.en}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className={labelClass}>售價</label>
              <input type="text" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} placeholder="如：42000"
                className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>備註</label>
              <input type="text" value={formLabel} onChange={(e) => setFormLabel(e.target.value)} placeholder="如：確認出團"
                className={inputClass} />
            </div>
          </div>

          {/* 去程航班 */}
          <p className="mb-2 text-[10px] font-semibold text-sky-400/70">✈ 去程航班（選填）</p>
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
            <div>
              <label className={labelClass}>航班編號</label>
              <input type="text" value={formOutboundFlight} onChange={(e) => setFormOutboundFlight(e.target.value)} placeholder="如：JX850"
                className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>起飛時間</label>
              <input type="time" value={formOutboundTime} onChange={(e) => setFormOutboundTime(e.target.value)}
                className={`${inputClass} [color-scheme:dark]`} />
            </div>
            <div>
              <label className={labelClass}>起飛城市</label>
              <input type="text" value={formOutboundFrom} onChange={(e) => setFormOutboundFrom(e.target.value)} placeholder="如：台北(桃園)"
                className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>抵達時間</label>
              <input type="time" value={formOutboundArrivalTime} onChange={(e) => setFormOutboundArrivalTime(e.target.value)}
                className={`${inputClass} [color-scheme:dark]`} />
            </div>
            <div>
              <label className={labelClass}>抵達城市</label>
              <input type="text" value={formOutboundTo} onChange={(e) => setFormOutboundTo(e.target.value)} placeholder="如：新千歲機場"
                className={inputClass} />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-1.5 py-1.5 text-xs text-white/70">
                <input type="checkbox" checked={formOutboundNextDay} onChange={(e) => setFormOutboundNextDay(e.target.checked)}
                  className="rounded border-white/20 bg-white/5" />
                跨日+1
              </label>
            </div>
          </div>

          {/* 回程航班 */}
          <p className="mb-2 text-[10px] font-semibold text-amber-400/70">✈ 回程航班（選填）</p>
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-7">
            <div>
              <label className={labelClass}>回程日期</label>
              <div className="flex gap-1">
                <input type="date" value={formReturnDate} onChange={(e) => setFormReturnDate(e.target.value)}
                  className={`${inputClass} flex-1 [color-scheme:dark]`} />
                {returnDayLabel && (
                  <span className="flex items-center rounded-lg border border-amber-400/20 bg-amber-400/10 px-2 text-xs font-bold text-amber-300">
                    {returnDayLabel}
                  </span>
                )}
              </div>
            </div>
            <div>
              <label className={labelClass}>航班編號</label>
              <input type="text" value={formReturnFlight} onChange={(e) => setFormReturnFlight(e.target.value)} placeholder="如：JX861"
                className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>起飛時間</label>
              <input type="time" value={formReturnTime} onChange={(e) => setFormReturnTime(e.target.value)}
                className={`${inputClass} [color-scheme:dark]`} />
            </div>
            <div>
              <label className={labelClass}>起飛城市</label>
              <input type="text" value={formReturnFrom} onChange={(e) => setFormReturnFrom(e.target.value)} placeholder="如：函館市"
                className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>抵達時間</label>
              <input type="time" value={formReturnArrivalTime} onChange={(e) => setFormReturnArrivalTime(e.target.value)}
                className={`${inputClass} [color-scheme:dark]`} />
            </div>
            <div>
              <label className={labelClass}>抵達城市</label>
              <input type="text" value={formReturnTo} onChange={(e) => setFormReturnTo(e.target.value)} placeholder="如：台北(桃園)"
                className={inputClass} />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-1.5 py-1.5 text-xs text-white/70">
                <input type="checkbox" checked={formReturnNextDay} onChange={(e) => setFormReturnNextDay(e.target.checked)}
                  className="rounded border-white/20 bg-white/5" />
                跨日+1
              </label>
            </div>
          </div>

          {/* 送出按鈕 */}
          <button
            disabled={!formDate || saving}
            onClick={editingId ? handleEdit : handleAdd}
            className="rounded-lg bg-sky-600 px-6 py-2 text-xs font-semibold text-white transition hover:bg-sky-500 disabled:opacity-50"
          >
            {saving ? "儲存中..." : editingId ? "更新梯次" : "新增梯次"}
          </button>
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
        <div className="space-y-3">
          {filtered.map((d) => {
            const info = formatDate(d.departure_date);
            const returnInfo = d.return_date ? formatDate(d.return_date) : null;
            const showFlightTable = hasFlightInfo(d);

            return (
              <div
                key={d.id}
                className="overflow-hidden rounded-2xl border border-white/10 bg-[rgba(20,20,30,0.55)] backdrop-blur-sm transition hover:border-white/15"
              >
                {/* 標頭：日期 + 價格 + 按鈕 */}
                <div className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3.5 sm:px-5">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <svg className="h-4 w-4 shrink-0 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm font-bold text-white sm:text-base">{info.short}</span>
                      {d.label && (
                        <span className="rounded-full border border-sky-400/25 bg-sky-400/10 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
                          {d.label}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="text-xs text-white/80">{d.departure_city}出發</span>
                      {d.airline && (
                        <span className="flex items-center gap-1 text-xs text-white/80">
                          <svg className="h-3 w-3 text-white/50" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                          </svg>
                          {d.airline}
                        </span>
                      )}
                      {d.price ? (
                        <span className="text-sm font-bold text-amber-300 sm:text-base">
                          NT$ {d.price.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-xs text-white/50">洽詢報價</span>
                      )}
                    </div>
                  </div>

                  {!isDevMode && (
                    <a
                      href={lineMessageHref(`我想詢問【${tripTitle}】${info.short} ${d.departure_city}出發`)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#06C755] px-4 py-2 text-xs font-bold text-white shadow-md transition hover:bg-[#05b64d] active:scale-95"
                    >
                      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" /></svg>
                      立即詢問
                    </a>
                  )}

                  {isDevMode && (
                    <div className="flex shrink-0 gap-1.5">
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

                {/* 航班詳細資訊表格 */}
                {showFlightTable && (
                  <div className="border-t border-white/5">
                    {/* 表頭 */}
                    <div className="hidden grid-cols-4 gap-2 bg-white/3 px-4 py-2 text-[10px] font-semibold text-white/40 sm:grid">
                      <span>班機日期</span>
                      <span>航空公司及航班</span>
                      <span>起飛時間及城市</span>
                      <span>抵達時間及城市</span>
                    </div>

                    {/* 去程 */}
                    {(d.outbound_flight || d.outbound_time) && (
                      <div className="grid grid-cols-1 gap-1 px-4 py-2.5 sm:grid-cols-4 sm:gap-2 sm:py-2">
                        <div className="flex items-center gap-1.5">
                          <svg className="h-3 w-3 shrink-0 text-sky-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                          </svg>
                          <span className="text-xs text-white/90">{info.full}</span>
                        </div>
                        <div className="pl-[18px] text-xs text-white/90 sm:pl-0">
                          {d.airline && <span>{d.airline} </span>}
                          {d.outbound_flight && <span className="text-white/70">{d.outbound_flight}</span>}
                        </div>
                        <div className="pl-[18px] text-xs sm:pl-0">
                          {d.outbound_time && <span className="font-semibold text-white/90">{d.outbound_time}</span>}
                          {d.outbound_from && <span className="text-white/70"> {d.outbound_from}</span>}
                        </div>
                        <div className="pl-[18px] text-xs sm:pl-0">
                          {d.outbound_arrival_time && <span className="font-semibold text-white/90">{d.outbound_arrival_time}</span>}
                          {d.outbound_to && <span className="text-white/70"> {d.outbound_to}</span>}
                          {d.outbound_next_day && <span className="ml-1 text-[10px] text-amber-300">（跨日+1）</span>}
                        </div>
                      </div>
                    )}

                    {/* 回程 */}
                    {(d.return_flight || d.return_time) && (
                      <div className="grid grid-cols-1 gap-1 border-t border-white/3 px-4 py-2.5 sm:grid-cols-4 sm:gap-2 sm:py-2">
                        <div className="flex items-center gap-1.5">
                          <svg className="h-3 w-3 shrink-0 rotate-180 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                          </svg>
                          <span className="text-xs text-white/90">{returnInfo ? returnInfo.full : "—"}</span>
                        </div>
                        <div className="pl-[18px] text-xs text-white/90 sm:pl-0">
                          {d.airline && <span>{d.airline} </span>}
                          {d.return_flight && <span className="text-white/70">{d.return_flight}</span>}
                        </div>
                        <div className="pl-[18px] text-xs sm:pl-0">
                          {d.return_time && <span className="font-semibold text-white/90">{d.return_time}</span>}
                          {d.return_from && <span className="text-white/70"> {d.return_from}</span>}
                        </div>
                        <div className="pl-[18px] text-xs sm:pl-0">
                          {d.return_arrival_time && <span className="font-semibold text-white/90">{d.return_arrival_time}</span>}
                          {d.return_to && <span className="text-white/70"> {d.return_to}</span>}
                          {d.return_next_day && <span className="ml-1 text-[10px] text-amber-300">（跨日+1）</span>}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-white/50">
          {dates.length > 0 ? "此月份無出團梯次" : "尚未設定出團日期"}
        </p>
      )}
    </div>
  );
}
