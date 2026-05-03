"use client";

import { useState, useRef, useEffect } from "react";
import { type DepartureDate, type FlightSegment, lineMessageHref } from "@/lib/supabase";

const CITIES = ["桃園", "台中", "高雄", "松山", "其他"];

// 機場清單：tw:true 為台灣出發機場（預設優先顯示）
const AIRPORTS = [
  { code: "TPE", name: "桃園國際機場第一航廈", tw: true },
  { code: "TPE", name: "桃園國際機場第二航廈", tw: true },
  { code: "TSA", name: "台北松山機場", tw: true },
  { code: "RMQ", name: "台中國際機場", tw: true },
  { code: "KHH", name: "高雄國際機場", tw: true },
  { code: "HUN", name: "花蓮機場", tw: true },
  { code: "TNN", name: "台南機場", tw: true },
  { code: "CTS", name: "新千歲機場（北海道）", tw: false },
  { code: "HKD", name: "函館機場", tw: false },
  { code: "AOJ", name: "青森機場", tw: false },
  { code: "SDJ", name: "仙台機場", tw: false },
  { code: "HND", name: "東京羽田機場", tw: false },
  { code: "NRT", name: "東京成田國際機場", tw: false },
  { code: "KIX", name: "大阪關西國際機場", tw: false },
  { code: "ITM", name: "大阪伊丹機場", tw: false },
  { code: "NGO", name: "名古屋中部國際機場", tw: false },
  { code: "FUK", name: "福岡機場", tw: false },
  { code: "KMJ", name: "熊本機場", tw: false },
  { code: "KOJ", name: "鹿兒島機場", tw: false },
  { code: "OKA", name: "那霸機場（沖繩）", tw: false },
  { code: "ISG", name: "石垣機場", tw: false },
  { code: "MMY", name: "宮古島機場", tw: false },
  { code: "ICN", name: "首爾仁川國際機場", tw: false },
  { code: "GMP", name: "首爾金浦國際機場", tw: false },
  { code: "PUS", name: "釜山金海國際機場", tw: false },
  { code: "CJU", name: "濟州國際機場", tw: false },
  { code: "BKK", name: "曼谷素萬那普國際機場", tw: false },
  { code: "DMK", name: "曼谷廊曼國際機場", tw: false },
  { code: "HKT", name: "普吉國際機場", tw: false },
  { code: "CNX", name: "清邁國際機場", tw: false },
  { code: "KUL", name: "吉隆坡國際機場", tw: false },
  { code: "SIN", name: "新加坡樟宜機場", tw: false },
  { code: "DPS", name: "峇里島烏布旺國際機場", tw: false },
  { code: "SGN", name: "胡志明市新山一國際機場", tw: false },
  { code: "HAN", name: "河內內排國際機場", tw: false },
  { code: "DAD", name: "峴港國際機場", tw: false },
  { code: "MNL", name: "馬尼拉尼諾伊阿基諾國際機場", tw: false },
  { code: "CEB", name: "宿霧麥克坦國際機場", tw: false },
  { code: "CGK", name: "雅加達蘇加諾哈達國際機場", tw: false },
  { code: "SUB", name: "泗水朱安達國際機場", tw: false },
  { code: "LHR", name: "倫敦希斯洛機場", tw: false },
  { code: "CDG", name: "巴黎戴高樂機場", tw: false },
  { code: "FRA", name: "法蘭克福機場", tw: false },
  { code: "VIE", name: "維也納國際機場", tw: false },
  { code: "AMS", name: "阿姆斯特丹史基浦機場", tw: false },
  { code: "FCO", name: "羅馬達文西國際機場", tw: false },
  { code: "ZRH", name: "蘇黎世機場", tw: false },
  { code: "DXB", name: "杜拜國際機場", tw: false },
  { code: "SYD", name: "雪梨機場", tw: false },
  { code: "AKL", name: "奧克蘭機場", tw: false },
  { code: "LAX", name: "洛杉磯國際機場", tw: false },
  { code: "JFK", name: "紐約甘迺迪國際機場", tw: false },
  { code: "YVR", name: "溫哥華國際機場", tw: false },
  { code: "YYZ", name: "多倫多皮爾遜國際機場", tw: false },
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

function AirlineInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
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
    ? AIRLINES.filter((a) => a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q) || a.en.toLowerCase().includes(q))
    : AIRLINES.slice(0, 20);

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="如：長榮航空"
        className={inputClass}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-48 w-52 overflow-y-auto rounded-lg border border-white/10 bg-[rgba(15,15,25,0.98)] shadow-xl backdrop-blur-xl">
          {filtered.map((a, i) => (
            <button key={i} type="button"
              onClick={() => { onChange(`${a.name}（${a.code}）`); setOpen(false); }}
              className="flex w-full items-center justify-between px-2.5 py-2 text-left text-xs text-white transition hover:bg-white/10">
              <span>{a.name}</span>
              <span className="ml-2 shrink-0 text-[10px] text-white/35">{a.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SegmentRow({ index, total, segment, onChange, onDelete }: {
  index: number;
  total: number;
  segment: FlightSegment;
  onChange: (field: keyof FlightSegment, value: string | boolean) => void;
  onDelete: () => void;
}) {
  const label = index === 0 ? "去程" : total > 1 && index === total - 1 ? "回程" : "轉機";
  const labelColor =
    index === 0 ? "bg-sky-500/20 text-sky-300" :
    total > 1 && index === total - 1 ? "bg-amber-500/20 text-amber-300" :
    "bg-violet-500/20 text-violet-300";
  const dayLabel = segment.date ? getWeekdayFromDate(segment.date) : "";

  return (
    <div className="mb-2 rounded-lg border border-white/8 bg-white/[0.03] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/30">第 {index + 1} 段</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${labelColor}`}>{label}</span>
        </div>
        <button type="button" onClick={onDelete} className="text-[10px] text-red-400/50 transition hover:text-red-400">✕ 刪除</button>
      </div>

      <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="overflow-hidden">
          <label className={labelClass}>日期</label>
          <div className="flex gap-1 overflow-hidden">
            <input type="date" value={segment.date} onChange={(e) => onChange("date", e.target.value)}
              className={`${inputClass} flex-1 [color-scheme:dark]`} />
            {dayLabel && <span className="flex items-center rounded-lg border border-amber-400/20 bg-amber-400/10 px-2 text-xs font-bold text-amber-300">{dayLabel}</span>}
          </div>
        </div>
        <div>
          <label className={labelClass}>航空公司</label>
          <AirlineInput value={segment.airline} onChange={(v) => onChange("airline", v)} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className={labelClass}>航班編號</label>
          <input type="text" value={segment.flight_number} onChange={(e) => onChange("flight_number", e.target.value)}
            placeholder="如：BR087" autoComplete="off" className={inputClass} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_2fr_1fr_2fr_auto]">
        <div>
          <label className={labelClass}>起飛時間</label>
          <input type="time" value={segment.dep_time} onChange={(e) => onChange("dep_time", e.target.value)}
            className={`${inputClass} [color-scheme:dark]`} />
        </div>
        <div>
          <label className={labelClass}>起飛機場</label>
          <AirportInput value={segment.dep_airport} onChange={(v) => onChange("dep_airport", v)} placeholder="出發地" preferTw={index === 0} />
        </div>
        <div>
          <label className={labelClass}>抵達時間</label>
          <input type="time" value={segment.arr_time} onChange={(e) => onChange("arr_time", e.target.value)}
            className={`${inputClass} [color-scheme:dark]`} />
        </div>
        <div>
          <label className={labelClass}>抵達機場</label>
          <AirportInput value={segment.arr_airport} onChange={(v) => onChange("arr_airport", v)} placeholder="目的地" preferTw={total > 1 && index === total - 1} />
        </div>
        <div className="col-span-2 flex items-end sm:col-span-1">
          <label className="flex items-center gap-1.5 py-1.5 text-xs text-white/70">
            <input type="checkbox" checked={segment.next_day} onChange={(e) => onChange("next_day", e.target.checked)} className="rounded border-white/20 bg-white/5" />
            跨日+1
          </label>
        </div>
      </div>
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
  const [formSegments, setFormSegments] = useState<FlightSegment[]>([]);

  const emptySegment = (): FlightSegment => ({
    date: "", airline: "", flight_number: "", dep_time: "", dep_airport: "", arr_time: "", arr_airport: "", next_day: false,
  });
  const addSegment = () => setFormSegments((prev) => [...prev, emptySegment()]);
  const removeSegment = (i: number) => setFormSegments((prev) => prev.filter((_, idx) => idx !== i));
  const updateSegment = (i: number, field: keyof FlightSegment, value: string | boolean) =>
    setFormSegments((prev) => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));

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
    setFormSegments([]);
    setEditingId(null);
  };

  const buildPayload = () => {
    const out = formSegments[0];
    const ret = formSegments.length > 1 ? formSegments[formSegments.length - 1] : null;
    return {
      departure_date: formDate,
      departure_city: '桃園',
      airline: out?.airline || null,
      price: null,
      label: null,
      outbound_flight: out?.flight_number || null,
      outbound_time: out?.dep_time || null,
      outbound_from: out?.dep_airport || null,
      outbound_arrival_time: out?.arr_time || null,
      outbound_to: out?.arr_airport || null,
      outbound_next_day: out?.next_day || false,
      return_date: ret?.date || null,
      return_flight: ret?.flight_number || null,
      return_time: ret?.dep_time || null,
      return_from: ret?.dep_airport || null,
      return_arrival_time: ret?.arr_time || null,
      return_to: ret?.arr_airport || null,
      return_next_day: ret?.next_day || false,
      flight_segments: formSegments.length > 0 ? formSegments : null,
      seats_available: 0,
      seats_total: 0,
    };
  };

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
    if (d.flight_segments && d.flight_segments.length > 0) {
      setFormSegments(d.flight_segments);
    } else {
      const segs: FlightSegment[] = [];
      if (d.outbound_flight || d.outbound_time || d.outbound_from || d.outbound_to) {
        segs.push({
          date: d.departure_date,
          airline: d.airline || "",
          flight_number: d.outbound_flight || "",
          dep_time: d.outbound_time || "",
          dep_airport: d.outbound_from || "",
          arr_time: d.outbound_arrival_time || "",
          arr_airport: d.outbound_to || "",
          next_day: d.outbound_next_day || false,
        });
      }
      if (d.return_flight || d.return_time || d.return_from || d.return_to) {
        segs.push({
          date: d.return_date || "",
          airline: d.airline || "",
          flight_number: d.return_flight || "",
          dep_time: d.return_time || "",
          dep_airport: d.return_from || "",
          arr_time: d.return_arrival_time || "",
          arr_airport: d.return_to || "",
          next_day: d.return_next_day || false,
        });
      }
      setFormSegments(segs);
    }
    setShowAddForm(true);
  };

  const departureDayLabel = getWeekdayFromDate(formDate);

  const hasFlightInfo = (d: DepartureDate) =>
    (d.flight_segments && d.flight_segments.length > 0) ||
    !!(d.outbound_flight || d.outbound_time || d.return_flight || d.return_time);

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
          <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
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
          </div>

          {/* 航班明細 */}
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-semibold text-sky-400/70">✈ 航班明細（選填）</p>
            <button type="button" onClick={addSegment}
              className="text-[10px] font-semibold text-sky-400/70 transition hover:text-sky-400">
              + 新增航段
            </button>
          </div>

          {formSegments.length === 0 ? (
            <div className="mb-4 flex flex-col items-center justify-center rounded-lg border border-dashed border-white/10 py-5">
              <p className="text-[11px] text-white/30">尚未新增航班，可直接儲存或點擊新增航段</p>
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => { addSegment(); }}
                  className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-[11px] text-sky-400/80 transition hover:bg-sky-500/20">
                  + 新增去程
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-2">
              {formSegments.map((seg, i) => (
                <SegmentRow
                  key={i}
                  index={i}
                  total={formSegments.length}
                  segment={seg}
                  onChange={(field, val) => updateSegment(i, field, val)}
                  onDelete={() => removeSegment(i)}
                />
              ))}
              <button type="button" onClick={addSegment}
                className="mb-4 mt-1 text-[11px] text-sky-400/60 transition hover:text-sky-400">
                + 新增航段（轉機或回程）
              </button>
            </div>
          )}

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
                    {d.flight_segments && d.flight_segments.length > 0 ? (
                      // 新格式：多航段表格
                      <>
                        <div className="mb-1 hidden grid-cols-[32px_1fr_1fr_1fr_1fr] gap-2 text-[10px] font-semibold text-white/40 sm:grid">
                          <span></span><span>班機日期・航空公司及航班</span><span>起飛時間及機場</span><span>抵達時間及機場</span>
                        </div>
                        {d.flight_segments.map((seg, i) => {
                          const total = d.flight_segments!.length;
                          const isFirst = i === 0;
                          const isLast = i === total - 1 && total > 1;
                          const iconColor = isFirst ? "text-sky-400" : isLast ? "text-amber-400" : "text-violet-400";
                          const segDate = seg.date ? formatDate(seg.date) : null;
                          return (
                            <div key={i} className={`grid grid-cols-1 gap-1 py-2 sm:grid-cols-[32px_1fr_1fr_1fr] sm:gap-2 ${i > 0 ? "border-t border-white/5" : ""}`}>
                              <div className="flex items-start pt-0.5">
                                <svg className={`h-3.5 w-3.5 shrink-0 ${iconColor} ${isLast ? "rotate-180" : ""}`} fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                                </svg>
                              </div>
                              <div>
                                {segDate && <div className="text-[10px] text-white/50">{segDate.full}</div>}
                                <div className="text-xs text-white/90">{seg.airline}{seg.flight_number && <span className="ml-1.5 text-white/55">{seg.flight_number}</span>}</div>
                              </div>
                              <div className="text-xs">
                                {seg.dep_time && <span className="font-semibold text-white/90">{seg.dep_time}</span>}
                                {seg.dep_airport && <span className="text-white/55"> {seg.dep_airport}</span>}
                              </div>
                              <div className="text-xs">
                                {seg.arr_time && <span className="font-semibold text-white/90">{seg.arr_time}</span>}
                                {seg.arr_airport && <span className="text-white/55"> {seg.arr_airport}</span>}
                                {seg.next_day && <span className="ml-1 text-[10px] text-amber-300">+1</span>}
                              </div>
                            </div>
                          );
                        })}
                      </>
                    ) : (
                      // 舊格式：去程 / 回程
                      <>
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
                              <span className="text-xs text-white/90">{d.return_date ? formatDate(d.return_date).full : "—"}</span>
                            </div>
                            <div className="text-xs text-white/90">{d.airline} {d.return_flight && <span className="text-white/60">{d.return_flight}</span>}</div>
                            <div className="text-xs">{d.return_time && <span className="font-semibold text-white/90">{d.return_time}</span>}{d.return_from && <span className="text-white/60"> {d.return_from}</span>}</div>
                            <div className="text-xs">{d.return_arrival_time && <span className="font-semibold text-white/90">{d.return_arrival_time}</span>}{d.return_to && <span className="text-white/60"> {d.return_to}</span>}{d.return_next_day && <span className="ml-1 text-[10px] text-amber-300">+1</span>}</div>
                          </div>
                        )}
                      </>
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
