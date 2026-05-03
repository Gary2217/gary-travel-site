"use client";

import { useState, useRef, useEffect } from "react";
import { type DepartureDate, lineMessageHref } from "@/lib/supabase";

const CITIES = ["桃園", "台中", "高雄", "松山", "其他"];

// 機場清單：tw:true 為台灣出發機場（預設優先顯示）
const AIRPORTS = [
  { code: "TPE", name: "台北桃園 T1", tw: true },
  { code: "TPE", name: "台北桃園 T2", tw: true },
  { code: "TSA", name: "台北松山", tw: true },
  { code: "RMQ", name: "台中", tw: true },
  { code: "KHH", name: "高雄", tw: true },
  { code: "HUN", name: "花蓮", tw: true },
  { code: "TNN", name: "台南", tw: true },
  { code: "CTS", name: "新千歲（北海道）", tw: false },
  { code: "HKD", name: "函館", tw: false },
  { code: "AOJ", name: "青森", tw: false },
  { code: "SDJ", name: "仙台", tw: false },
  { code: "HND", name: "東京羽田", tw: false },
  { code: "NRT", name: "東京成田", tw: false },
  { code: "KIX", name: "大阪關西", tw: false },
  { code: "ITM", name: "大阪伊丹", tw: false },
  { code: "NGO", name: "名古屋", tw: false },
  { code: "FUK", name: "福岡", tw: false },
  { code: "KMJ", name: "熊本", tw: false },
  { code: "KOJ", name: "鹿兒島", tw: false },
  { code: "OKA", name: "那霸（沖繩）", tw: false },
  { code: "ISG", name: "石垣島", tw: false },
  { code: "MMY", name: "宮古島", tw: false },
  { code: "ICN", name: "首爾仁川", tw: false },
  { code: "GMP", name: "首爾金浦", tw: false },
  { code: "PUS", name: "釜山", tw: false },
  { code: "CJU", name: "濟州島", tw: false },
  { code: "BKK", name: "曼谷素萬那普", tw: false },
  { code: "DMK", name: "曼谷廊曼", tw: false },
  { code: "HKT", name: "普吉島", tw: false },
  { code: "CNX", name: "清邁", tw: false },
  { code: "KUL", name: "吉隆坡", tw: false },
  { code: "SIN", name: "新加坡樟宜", tw: false },
  { code: "DPS", name: "峇里島登巴薩", tw: false },
  { code: "SGN", name: "胡志明市", tw: false },
  { code: "HAN", name: "河內內排", tw: false },
  { code: "DAD", name: "峴港", tw: false },
  { code: "MNL", name: "馬尼拉", tw: false },
  { code: "CEB", name: "宿霧", tw: false },
  { code: "CGK", name: "雅加達", tw: false },
  { code: "SUB", name: "泗水", tw: false },
  { code: "LHR", name: "倫敦希斯洛", tw: false },
  { code: "CDG", name: "巴黎戴高樂", tw: false },
  { code: "FRA", name: "法蘭克福", tw: false },
  { code: "VIE", name: "維也納", tw: false },
  { code: "AMS", name: "阿姆斯特丹", tw: false },
  { code: "FCO", name: "羅馬達文西", tw: false },
  { code: "ZRH", name: "蘇黎世", tw: false },
  { code: "DXB", name: "杜拜", tw: false },
  { code: "SYD", name: "雪梨", tw: false },
  { code: "AKL", name: "奧克蘭", tw: false },
  { code: "LAX", name: "洛杉磯", tw: false },
  { code: "JFK", name: "紐約甘迺迪", tw: false },
  { code: "YVR", name: "溫哥華", tw: false },
  { code: "YYZ", name: "多倫多", tw: false },
];

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
  selectedDateId: string | null;
  onSelectedDateChange: (dateId: string | null) => void;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const weekday = ["日", "一", "二", "三", "四", "五", "六"][d.getDay()];
  return {
    full: `${d.getFullYear()}/${mm}/${dd}（${weekday}）`,
    short: `${mm}/${dd}`,
    weekday,
    month: d.getMonth() + 1,
    year: d.getFullYear(),
  };
}

function getWeekdayFromDate(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return "";
  return ["日", "一", "二", "三", "四", "五", "六"][d.getDay()];
}

const inputClass = "w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:border-sky-400";
const labelClass = "mb-1 block text-[10px] text-white/50";

function AirportInput({ value, onChange, placeholder, preferTw = false }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  preferTw?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const q = value.trim().toLowerCase();
  const filtered = q
    ? AIRPORTS.filter((a) =>
        a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q)
      )
    : preferTw
    ? AIRPORTS.filter((a) => a.tw)
    : AIRPORTS.slice(0, 20);

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className={inputClass}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-52 w-52 overflow-y-auto rounded-lg border border-white/10 bg-[rgba(15,15,25,0.98)] shadow-xl backdrop-blur-xl">
          {!q && (
            <div className="border-b border-white/8 px-2.5 py-1.5 text-[10px] text-white/30">
              {preferTw ? "台灣出發機場" : "常用機場"}
            </div>
          )}
          {filtered.map((a, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { onChange(a.name); setOpen(false); }}
              className="flex w-full items-center justify-between px-2.5 py-2 text-left text-xs text-white transition hover:bg-white/10"
            >
              <span>{a.name}</span>
              <span className="ml-2 shrink-0 text-[10px] text-white/35">{a.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DepartureDates({ tripId, tripTitle, dates, isDevMode, onDatesChange, selectedDateId, onSelectedDateChange }: DepartureDatesProps) {
  const [activeMonth, setActiveMonth] = useState<string>("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const today = new Date().toLocaleDateString("sv-SE");
  const [formDate, setFormDate] = useState(today);
  const [formCity, setFormCity] = useState("桃園");
  const [formAirline, setFormAirline] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formLabel, setFormLabel] = useState("");
  const [formOutboundFlight, setFormOutboundFlight] = useState("");
  const [formOutboundTime, setFormOutboundTime] = useState("");
  const [formOutboundFrom, setFormOutboundFrom] = useState("");
  const [formOutboundArrivalTime, setFormOutboundArrivalTime] = useState("");
  const [formOutboundTo, setFormOutboundTo] = useState("");
  const [formOutboundNextDay, setFormOutboundNextDay] = useState(false);
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

  // 月份分組
  const grouped = new Map<string, DepartureDate[]>();
  dates.forEach((d) => {
    const info = formatDate(d.departure_date);
    const key = `${info.year}-${info.month}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(d);
  });
  const monthKeys = Array.from(grouped.keys()).sort();

  const filtered = activeMonth === "all"
    ? dates
    : dates.filter((d) => {
        const info = formatDate(d.departure_date);
        return `${info.year}-${info.month}` === activeMonth;
      });

  // 按月分組 filtered
  const filteredGrouped = new Map<string, DepartureDate[]>();
  filtered.forEach((d) => {
    const info = formatDate(d.departure_date);
    const key = `${info.month}月`;
    if (!filteredGrouped.has(key)) filteredGrouped.set(key, []);
    filteredGrouped.get(key)!.push(d);
  });

  const resetForm = () => {
    setFormDate(today);
    setFormCity("桃園");
    setFormAirline("");
    setFormPrice("");
    setFormLabel("");
    setFormOutboundFlight(""); setFormOutboundTime(""); setFormOutboundFrom("");
    setFormOutboundArrivalTime(""); setFormOutboundTo(""); setFormOutboundNextDay(false);
    setFormReturnDate(""); setFormReturnFlight(""); setFormReturnTime("");
    setFormReturnFrom(""); setFormReturnArrivalTime(""); setFormReturnTo(""); setFormReturnNextDay(false);
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
    seats_available: 0,
    seats_total: 0,
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
      if (selectedDateId === id) onSelectedDateChange(null);
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
              <input type="text" value={formAirline}
                onChange={(e) => { setFormAirline(e.target.value); setAirlineDropdownOpen(true); }}
                onFocus={() => setAirlineDropdownOpen(true)}
                placeholder="搜尋航空公司" className={inputClass} autoComplete="off" />
              {airlineDropdownOpen && filteredAirlines.length > 0 && (
                <div className="absolute left-0 top-full z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-white/10 bg-[rgba(20,20,30,0.98)] shadow-xl backdrop-blur-xl">
                  {filteredAirlines.map((a) => (
                    <button key={a.code} type="button"
                      onClick={() => { setFormAirline(`${a.name}（${a.code}）`); setAirlineDropdownOpen(false); }}
                      className="flex w-full items-center justify-between px-2.5 py-2 text-left text-xs text-white transition hover:bg-white/10">
                      <span>{a.name}（{a.code}）</span>
                      <span className="text-[10px] text-white/40">{a.en}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className={labelClass}>售價</label>
              <input type="text" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} placeholder="如：42000" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>備註</label>
              <input type="text" value={formLabel} onChange={(e) => setFormLabel(e.target.value)} placeholder="如：確認出團" className={inputClass} />
            </div>
          </div>

          <p className="mb-2 text-[10px] font-semibold text-sky-400/70">✈ 去程航班（選填）</p>
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
            <div><label className={labelClass}>航班編號</label><input type="text" value={formOutboundFlight} onChange={(e) => setFormOutboundFlight(e.target.value)} placeholder="如：JX850" className={inputClass} /></div>
            <div><label className={labelClass}>起飛時間</label><input type="time" value={formOutboundTime} onChange={(e) => setFormOutboundTime(e.target.value)} className={`${inputClass} [color-scheme:dark]`} /></div>
            <div><label className={labelClass}>起飛機場</label><AirportInput value={formOutboundFrom} onChange={setFormOutboundFrom} placeholder="如：台北桃園 T1" preferTw /></div>
            <div><label className={labelClass}>抵達時間</label><input type="time" value={formOutboundArrivalTime} onChange={(e) => setFormOutboundArrivalTime(e.target.value)} className={`${inputClass} [color-scheme:dark]`} /></div>
            <div><label className={labelClass}>抵達機場</label><AirportInput value={formOutboundTo} onChange={setFormOutboundTo} placeholder="如：新千歲" /></div>
            <div className="flex items-end"><label className="flex items-center gap-1.5 py-1.5 text-xs text-white/70"><input type="checkbox" checked={formOutboundNextDay} onChange={(e) => setFormOutboundNextDay(e.target.checked)} className="rounded border-white/20 bg-white/5" />跨日+1</label></div>
          </div>

          <p className="mb-2 text-[10px] font-semibold text-amber-400/70">✈ 回程航班（選填）</p>
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-7">
            <div>
              <label className={labelClass}>回程日期</label>
              <div className="flex gap-1">
                <input type="date" value={formReturnDate} onChange={(e) => setFormReturnDate(e.target.value)} className={`${inputClass} flex-1 [color-scheme:dark]`} />
                {returnDayLabel && <span className="flex items-center rounded-lg border border-amber-400/20 bg-amber-400/10 px-2 text-xs font-bold text-amber-300">{returnDayLabel}</span>}
              </div>
            </div>
            <div><label className={labelClass}>航班編號</label><input type="text" value={formReturnFlight} onChange={(e) => setFormReturnFlight(e.target.value)} placeholder="如：JX861" className={inputClass} /></div>
            <div><label className={labelClass}>起飛時間</label><input type="time" value={formReturnTime} onChange={(e) => setFormReturnTime(e.target.value)} className={`${inputClass} [color-scheme:dark]`} /></div>
            <div><label className={labelClass}>起飛機場</label><AirportInput value={formReturnFrom} onChange={setFormReturnFrom} placeholder="如：函館" /></div>
            <div><label className={labelClass}>抵達時間</label><input type="time" value={formReturnArrivalTime} onChange={(e) => setFormReturnArrivalTime(e.target.value)} className={`${inputClass} [color-scheme:dark]`} /></div>
            <div><label className={labelClass}>抵達機場</label><AirportInput value={formReturnTo} onChange={setFormReturnTo} placeholder="如：台北桃園 T1" preferTw /></div>
            <div className="flex items-end"><label className="flex items-center gap-1.5 py-1.5 text-xs text-white/70"><input type="checkbox" checked={formReturnNextDay} onChange={(e) => setFormReturnNextDay(e.target.checked)} className="rounded border-white/20 bg-white/5" />跨日+1</label></div>
          </div>

          <button disabled={!formDate || saving} onClick={editingId ? handleEdit : handleAdd}
            className="rounded-lg bg-sky-600 px-6 py-2 text-xs font-semibold text-white transition hover:bg-sky-500 disabled:opacity-50">
            {saving ? "儲存中..." : editingId ? "更新梯次" : "新增梯次"}
          </button>
        </div>
      )}

      {/* 月份篩選 */}
      {monthKeys.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          <button onClick={() => setActiveMonth("all")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${activeMonth === "all" ? "bg-sky-500 text-white" : "border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"}`}>
            全部
          </button>
          {monthKeys.map((m) => {
            const [, mo] = m.split("-");
            return (
              <button key={m} onClick={() => setActiveMonth(m)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${activeMonth === m ? "bg-sky-500 text-white" : "border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"}`}>
                {mo}月
              </button>
            );
          })}
        </div>
      )}

      {/* 出團卡片列 + 下方展開區 */}
      {filtered.length > 0 ? (
        <div>
          {/* 卡片橫排 */}
          <div className="flex flex-wrap gap-2">
            {Array.from(filteredGrouped.entries()).map(([monthLabel, monthDates]) => (
              <div key={monthLabel} className="contents">
                {/* 月份分隔標籤 */}
                <div className="flex items-center rounded-xl bg-white/5 px-3 py-2">
                  <span className="text-xs font-bold text-white/50">{monthLabel}</span>
                </div>
                {monthDates.map((d) => {
                  const info = formatDate(d.departure_date);
                   const isSelected = selectedDateId === d.id;
                   return (
                     <button
                       key={d.id}
                       type="button"
                       onClick={() => onSelectedDateChange(isSelected ? null : d.id)}
                      className={`rounded-xl border px-3 py-2 text-center transition ${
                        isSelected
                          ? "border-sky-400/40 bg-sky-500/15"
                          : "border-white/10 bg-[rgba(20,20,30,0.55)] hover:border-white/20"
                      }`}
                    >
                      <div className="text-sm font-bold text-white">{info.short}（{info.weekday}）</div>
                      <div className="mt-0.5">
                        {d.price ? (
                          <span className="text-xs font-bold text-amber-300">${d.price.toLocaleString()}</span>
                        ) : (
                          <span className="text-[10px] text-white/40">洽詢</span>
                        )}
                      </div>
                      {(d.seats_available > 0 || d.seats_total > 0) && (
                        <div className="mt-0.5 text-[10px] text-white/50">
                          可售{d.seats_available}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* 選中卡片的展開詳情（在卡片列下方） */}
          {selectedDateId && (() => {
            const d = filtered.find((x) => x.id === selectedDateId);
            if (!d) return null;
            const info = formatDate(d.departure_date);
            const returnInfo = d.return_date ? formatDate(d.return_date) : null;
            const showFlight = hasFlightInfo(d);

            return (
              <div className="mt-3 rounded-xl border border-sky-400/20 bg-[rgba(20,20,30,0.6)] p-4 backdrop-blur-sm">
                {isDevMode && (
                  <div className="mb-3 flex items-center gap-2">
                    <button onClick={() => openEditForm(d)}
                      className="rounded-full bg-amber-500/20 px-3 py-1.5 text-[11px] font-semibold text-amber-300 transition hover:bg-amber-500/30">編輯</button>
                    <button onClick={() => handleDelete(d.id)}
                      className="rounded-full bg-red-500/20 px-3 py-1.5 text-[11px] font-semibold text-red-300 transition hover:bg-red-500/30">刪除</button>
                  </div>
                )}

                {/* 航班表格 */}
                {showFlight && (
                  <div className="mb-3">
                    <div className="mb-1 hidden grid-cols-[60px_1fr_1fr_1fr_1fr] gap-2 text-[10px] font-semibold text-white/40 sm:grid">
                      <span></span><span>班機日期</span><span>航空公司及航班</span><span>起飛時間及機場</span><span>抵達時間及機場</span>
                    </div>
                    {(d.outbound_flight || d.outbound_time) && (
                      <div className="grid grid-cols-1 gap-1 py-2 sm:grid-cols-[60px_1fr_1fr_1fr_1fr] sm:gap-2">
                        <span className="text-xs font-bold text-sky-400">去程</span>
                        <div className="flex items-center gap-1">
                          <svg className="h-3 w-3 shrink-0 text-sky-400" fill="currentColor" viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" /></svg>
                          <span className="text-xs text-white/90">{info.full}</span>
                        </div>
                        <div className="text-xs text-white/90">{d.airline} {d.outbound_flight && <span className="text-white/60">{d.outbound_flight}</span>}</div>
                        <div className="text-xs">{d.outbound_time && <span className="font-semibold text-white/90">{d.outbound_time}</span>}{d.outbound_from && <span className="text-white/60"> {d.outbound_from}</span>}</div>
                        <div className="text-xs">{d.outbound_arrival_time && <span className="font-semibold text-white/90">{d.outbound_arrival_time}</span>}{d.outbound_to && <span className="text-white/60"> {d.outbound_to}</span>}{d.outbound_next_day && <span className="ml-1 text-[10px] text-amber-300">+1</span>}</div>
                      </div>
                    )}
                    {(d.return_flight || d.return_time) && (
                      <div className="grid grid-cols-1 gap-1 border-t border-white/5 py-2 sm:grid-cols-[60px_1fr_1fr_1fr_1fr] sm:gap-2">
                        <span className="text-xs font-bold text-amber-400">回程</span>
                        <div className="flex items-center gap-1">
                          <svg className="h-3 w-3 shrink-0 rotate-180 text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" /></svg>
                          <span className="text-xs text-white/90">{returnInfo ? returnInfo.full : "—"}</span>
                        </div>
                        <div className="text-xs text-white/90">{d.airline} {d.return_flight && <span className="text-white/60">{d.return_flight}</span>}</div>
                        <div className="text-xs">{d.return_time && <span className="font-semibold text-white/90">{d.return_time}</span>}{d.return_from && <span className="text-white/60"> {d.return_from}</span>}</div>
                        <div className="text-xs">{d.return_arrival_time && <span className="font-semibold text-white/90">{d.return_arrival_time}</span>}{d.return_to && <span className="text-white/60"> {d.return_to}</span>}{d.return_next_day && <span className="ml-1 text-[10px] text-amber-300">+1</span>}</div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            );
          })()}
        </div>
      ) : (
        <p className="text-sm text-white/50">
          {dates.length > 0 ? "此月份無出團梯次" : "尚未設定出團日期"}
        </p>
      )}
    </div>
  );
}
