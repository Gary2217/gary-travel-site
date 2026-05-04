"use client";

import { useState, useRef, useEffect } from "react";
import { type FlightDepartureDate, type FlightSegment, lineMessageHref } from "@/lib/supabase";

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
  { name: "冰島航空", code: "FI", en: "Icelandair" },
  { name: "北歐航空", code: "SK", en: "Scandinavian Airlines" },
  { name: "漢莎航空", code: "LH", en: "Lufthansa" },
  { name: "英國航空", code: "BA", en: "British Airways" },
  { name: "瑞士航空", code: "LX", en: "Swiss International Air Lines" },
];

/** 根據 IATA 航空公司代碼取得 logo 圖片 URL */
function getAirlineLogoUrl(code: string): string {
  if (!code) return "";
  return `https://pics.avs.io/80/80/${code.toUpperCase()}.png`;
}

function AirlineLogo({ code, name }: { code: string; name: string }) {
  const [failed, setFailed] = useState(false);
  if (!code || failed) {
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/10 text-xs font-bold text-white/60 sm:h-14 sm:w-14 sm:text-sm">
        {code || "✈"}
      </div>
    );
  }
  return (
    <img
      src={getAirlineLogoUrl(code)}
      alt={name}
      className="h-12 w-12 rounded-lg bg-white object-contain p-1 sm:h-14 sm:w-14"
      onError={() => setFailed(true)}
    />
  );
}

const inputClass = "w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:border-sky-400";
const labelClass = "mb-1 block text-[10px] text-white/50";

function getWeekdayFromDate(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return "";
  return ["日", "一", "二", "三", "四", "五", "六"][d.getDay()];
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const weekday = ["日", "一", "二", "三", "四", "五", "六"][d.getDay()];
  return {
    full: `${d.getFullYear()}/${mm}/${dd}（${weekday}）`,
    short: `${mm}/${dd}（${weekday}）`,
    month: d.getMonth() + 1,
    year: d.getFullYear(),
  };
}

/** 從機場全名中擷取機場代碼 */
function extractAirportCode(name: string): string {
  const match = AIRPORTS.find((a) => name.includes(a.name) || a.name.includes(name));
  return match?.code ?? "";
}

/** 從航空公司名中擷取代碼 */
function extractAirlineCode(name: string): string {
  const codeMatch = name.match(/（([A-Z0-9]{2})）/);
  if (codeMatch) return codeMatch[1];
  const match = AIRLINES.find((a) => name.includes(a.name) || a.name.includes(name));
  return match?.code ?? "";
}

/** 擷取機場簡短名 */
function shortAirportName(name: string): string {
  return name
    .replace(/國際機場.*/, "")
    .replace(/機場.*/, "")
    .replace(/（.*）/, "")
    .trim();
}

// ── Autocomplete inputs ──────────────────────────────────

function AirportInput({ value, onChange, placeholder, preferTw = false }: {
  value: string; onChange: (v: string) => void; placeholder?: string; preferTw?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const q = value.trim().toLowerCase();
  const filtered = q
    ? AIRPORTS.filter((a) => a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q))
    : preferTw ? AIRPORTS.filter((a) => a.tw) : AIRPORTS.slice(0, 20);

  return (
    <div ref={ref} className="relative">
      <input type="text" value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder} className={inputClass} autoComplete="off" />
      {open && filtered.length > 0 && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-52 w-52 overflow-y-auto rounded-lg border border-white/10 bg-[rgba(15,15,25,0.98)] shadow-xl backdrop-blur-xl">
          {!q && <div className="border-b border-white/8 px-2.5 py-1.5 text-[10px] text-white/30">{preferTw ? "台灣出發機場" : "常用機場"}</div>}
          {filtered.map((a, i) => (
            <button key={i} type="button" onClick={() => { onChange(a.name); setOpen(false); }}
              className="flex w-full items-center justify-between px-2.5 py-2 text-left text-xs text-white transition hover:bg-white/10">
              <span>{a.name}</span><span className="ml-2 shrink-0 text-[10px] text-white/35">{a.code}</span>
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
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const q = value.trim().toLowerCase();
  const filtered = q
    ? AIRLINES.filter((a) => a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q) || a.en.toLowerCase().includes(q))
    : AIRLINES.slice(0, 20);

  return (
    <div ref={ref} className="relative">
      <input type="text" value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="如：長榮航空" className={inputClass} autoComplete="off" />
      {open && filtered.length > 0 && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-48 w-52 overflow-y-auto rounded-lg border border-white/10 bg-[rgba(15,15,25,0.98)] shadow-xl backdrop-blur-xl">
          {filtered.map((a, i) => (
            <button key={i} type="button" onClick={() => { onChange(`${a.name}（${a.code}）`); setOpen(false); }}
              className="flex w-full items-center justify-between px-2.5 py-2 text-left text-xs text-white transition hover:bg-white/10">
              <span>{a.name}</span><span className="ml-2 shrink-0 text-[10px] text-white/35">{a.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Segment editor row (dev mode) ──────────────────────────

function SegmentRow({ index, total, segment, onChange, onDelete }: {
  index: number; total: number; segment: FlightSegment;
  onChange: (field: keyof FlightSegment, value: string | boolean) => void; onDelete: () => void;
}) {
  const label = index === 0 ? "去程" : total > 1 && index === total - 1 ? "回程" : "轉機";
  const labelColor = index === 0 ? "bg-sky-500/20 text-sky-300" : total > 1 && index === total - 1 ? "bg-amber-500/20 text-amber-300" : "bg-violet-500/20 text-violet-300";
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
            <input type="date" value={segment.date} onChange={(e) => onChange("date", e.target.value)} className={`${inputClass} flex-1 [color-scheme:dark]`} />
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
          <input type="time" value={segment.dep_time} onChange={(e) => onChange("dep_time", e.target.value)} className={`${inputClass} [color-scheme:dark]`} />
        </div>
        <div>
          <label className={labelClass}>起飛機場</label>
          <AirportInput value={segment.dep_airport} onChange={(v) => onChange("dep_airport", v)} placeholder="出發地" preferTw={index === 0} />
        </div>
        <div>
          <label className={labelClass}>抵達時間</label>
          <input type="time" value={segment.arr_time} onChange={(e) => onChange("arr_time", e.target.value)} className={`${inputClass} [color-scheme:dark]`} />
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

// ── Flight segment row (user-facing, colatour table-style) ──

function SegmentRow_Display({ segment, label }: { segment: FlightSegment; label: "去程" | "回程" | "轉機" }) {
  const depCode = extractAirportCode(segment.dep_airport);
  const arrCode = extractAirportCode(segment.arr_airport);
  const depShort = shortAirportName(segment.dep_airport);
  const arrShort = shortAirportName(segment.arr_airport);

  return (
    <div className="py-2 first:pt-0 last:pb-0">
      {/* 表頭：出發機場 / 抵達機場 / 飛行時數 */}
      <div className="mb-1.5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:grid-cols-[1fr_auto_1fr_auto]">
        <div className="text-center text-xs text-white/50">
          {depCode && <span className="font-bold text-white/70">{depCode}</span>}{" "}
          {depShort}
        </div>
        {/* 飛機圖示佔位（表頭） */}
        <div />
        <div className="text-center text-xs text-white/50">
          {arrCode && <span className="font-bold text-white/70">{arrCode}</span>}{" "}
          {arrShort}
        </div>
        <div className="hidden text-center text-xs text-white/50 sm:block">飛行時數</div>
      </div>

      {/* 時間列 */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:grid-cols-[1fr_auto_1fr_auto]">
        {/* 出發時間 */}
        <div className="flex items-center justify-center gap-2">
          <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-[#00b4d8]" />
          <span className="text-xl font-bold tabular-nums text-white">{segment.dep_time || "--:--"}</span>
        </div>

        {/* 飛機圖示 + 連接線 */}
        <div className="flex items-center gap-1.5">
          <div className="h-[2px] w-8 bg-white/20 sm:w-12" />
          <svg className="h-5 w-5 shrink-0 text-white/40" fill="currentColor" viewBox="0 0 24 24">
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
          </svg>
          <div className="h-[2px] w-8 bg-white/20 sm:w-12" />
        </div>

        {/* 抵達時間 */}
        <div className="flex items-center justify-center gap-2">
          <span className="text-xl font-bold tabular-nums text-white">{segment.arr_time || "--:--"}</span>
          {segment.next_day && <span className="text-xs font-bold text-amber-400">+1</span>}
        </div>

        {/* 飛行時數（桌機版） */}
        <div className="hidden min-w-[130px] items-center justify-center text-sm text-white/50 sm:flex">
          {segment.dep_time && segment.arr_time ? (() => {
            const [dh, dm] = segment.dep_time.split(":").map(Number);
            const [ah, am] = segment.arr_time.split(":").map(Number);
            let diff = (ah * 60 + am) - (dh * 60 + dm);
            if (segment.next_day || diff < 0) diff += 24 * 60;
            const hrs = Math.floor(diff / 60);
            const mins = diff % 60;
            return `${String(hrs).padStart(2, "0")}小時${mins > 0 ? `${String(mins).padStart(2, "0")}分鐘` : ""}`;
          })() : ""}
        </div>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────

interface FlightDepartureDatesProps {
  flightRouteId: string;
  routeLabel: string;
  fromCity: string;
  toCity: string;
  duration: string;
  direct: boolean;
  airlines: string;
  dates: FlightDepartureDate[];
  isDevMode: boolean;
  onDatesChange: (dates: FlightDepartureDate[]) => void;
}

export default function FlightDepartureDates({
  flightRouteId, routeLabel, fromCity, toCity, duration, direct, airlines,
  dates, isDevMode, onDatesChange,
}: FlightDepartureDatesProps) {
  const [activeMonth, setActiveMonth] = useState<string>("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const today = new Date().toLocaleDateString("sv-SE");
  const [formDate, setFormDate] = useState(today);
  const [formPrice, setFormPrice] = useState("");
  const [formLabel, setFormLabel] = useState("");
  const [formSegments, setFormSegments] = useState<FlightSegment[]>([]);

  const departureDayLabel = getWeekdayFromDate(formDate);

  const emptySegment = (): FlightSegment => ({
    date: "", airline: "", flight_number: "", dep_time: "", dep_airport: "", arr_time: "", arr_airport: "", next_day: false,
  });
  const addSegment = () => setFormSegments((prev) => [...prev, emptySegment()]);
  const removeSegment = (i: number) => setFormSegments((prev) => prev.filter((_, idx) => idx !== i));
  const updateSegment = (i: number, field: keyof FlightSegment, value: string | boolean) =>
    setFormSegments((prev) => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));

  const months = Array.from(new Set(dates.map((d) => {
    const info = formatDate(d.departure_date);
    return `${info.year}-${info.month}`;
  }))).sort();

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

  const resetForm = () => { setFormDate(today); setFormPrice(""); setFormLabel(""); setFormSegments([]); setEditingId(null); };

  const buildPayload = () => ({
    departure_date: formDate,
    airline: formSegments[0]?.airline || null,
    price: formPrice ? parseInt(formPrice.replace(/,/g, "")) : null,
    label: formLabel || null,
    flight_segments: formSegments.length > 0 ? formSegments : null,
  });

  const handleAdd = async () => {
    if (!formDate) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/flight-routes/${flightRouteId}/departures`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildPayload()),
      });
      if (res.ok) {
        const added = await res.json();
        onDatesChange([...dates, added].sort((a, b) => a.departure_date.localeCompare(b.departure_date)));
        resetForm(); setShowAddForm(false);
      }
    } catch { /* 靜默 */ }
    setSaving(false);
  };

  const handleEdit = async () => {
    if (!editingId || !formDate) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/flight-routes/${flightRouteId}/departures?dateId=${editingId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildPayload()),
      });
      if (res.ok) {
        const updated = await res.json();
        onDatesChange(dates.map((d) => d.id === editingId ? updated : d).sort((a, b) => a.departure_date.localeCompare(b.departure_date)));
        resetForm(); setShowAddForm(false);
      }
    } catch { /* 靜默 */ }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("確定刪除此航班票價？")) return;
    const res = await fetch(`/api/flight-routes/${flightRouteId}/departures?dateId=${id}`, { method: "DELETE" });
    if (res.ok) onDatesChange(dates.filter((d) => d.id !== id));
  };

  const openEditForm = (d: FlightDepartureDate) => {
    setEditingId(d.id);
    setFormDate(d.departure_date);
    setFormPrice(d.price ? String(d.price) : "");
    setFormLabel(d.label || "");
    setFormSegments(d.flight_segments && d.flight_segments.length > 0 ? d.flight_segments : []);
    setShowAddForm(true);
  };

  return (
    <section>
      {/* 標題列 + 月份篩選 + 新增按鈕 */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-sm font-bold text-white">可訂購航班</h2>
        {monthLabels.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setActiveMonth("all")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${activeMonth === "all" ? "bg-[#00b4d8] text-white" : "border border-white/[0.08] text-white/60 hover:border-[#00b4d8] hover:text-[#48cae4]"}`}>
              全部
            </button>
            {monthLabels.map((m) => (
              <button key={m.key} onClick={() => setActiveMonth(m.key)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${activeMonth === m.key ? "bg-[#00b4d8] text-white" : "border border-white/[0.08] text-white/60 hover:border-[#00b4d8] hover:text-[#48cae4]"}`}>
                {m.label}
              </button>
            ))}
          </div>
        )}
        {isDevMode && (
          <button onClick={() => { resetForm(); setShowAddForm(!showAddForm); }}
            className="rounded-lg bg-[#00b4d8] px-3 py-1 text-xs font-semibold text-white transition hover:bg-[#0096c7]">
            {showAddForm ? "取消" : "新增航班"}
          </button>
        )}
      </div>

      {/* Dev 編輯表單 Modal */}
      {isDevMode && showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowAddForm(false); resetForm(); } }}>
          <div className="w-full max-w-lg overflow-y-auto rounded-[1.75rem] border border-white/10 bg-[rgba(18,18,28,0.97)] p-6 shadow-2xl" style={{ maxHeight: "90dvh" }}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">{editingId ? "編輯航班" : "新增航班"}</h2>
              <button type="button" onClick={() => { setShowAddForm(false); resetForm(); }}
                className="rounded-full p-1 text-white/40 transition hover:bg-white/10 hover:text-white">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="mb-2 text-[10px] font-semibold text-white/40">基本資訊</p>
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="overflow-hidden">
                <label className={labelClass}>出發日期 *</label>
                <div className="flex gap-1 overflow-hidden">
                  <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className={`${inputClass} flex-1 [color-scheme:dark]`} />
                  {departureDayLabel && <span className="flex items-center rounded-lg border border-sky-400/20 bg-sky-400/10 px-2 text-xs font-bold text-sky-300">{departureDayLabel}</span>}
                </div>
              </div>
              <div>
                <label className={labelClass}>票價（NT$）</label>
                <input type="text" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} placeholder="如：8900" autoComplete="off" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>備註標籤</label>
                <input type="text" value={formLabel} onChange={(e) => setFormLabel(e.target.value)} placeholder="如：早鳥優惠" className={inputClass} />
              </div>
            </div>

            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-semibold text-sky-400/70">航班明細（選填）</p>
              <button type="button" onClick={addSegment} className="text-[10px] font-semibold text-sky-400/70 transition hover:text-sky-400">+ 新增航段</button>
            </div>
            {formSegments.length === 0 ? (
              <div className="mb-4 flex flex-col items-center justify-center rounded-lg border border-dashed border-white/10 py-5">
                <p className="text-[11px] text-white/30">尚未新增航班，可直接儲存或點擊新增航段</p>
                <button type="button" onClick={addSegment}
                  className="mt-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-[11px] text-sky-400/80 transition hover:bg-sky-500/20">
                  + 新增去程
                </button>
              </div>
            ) : (
              <div className="mb-2">
                {formSegments.map((seg, i) => (
                  <SegmentRow key={i} index={i} total={formSegments.length} segment={seg}
                    onChange={(field, val) => updateSegment(i, field, val)} onDelete={() => removeSegment(i)} />
                ))}
                <button type="button" onClick={addSegment} className="mb-4 mt-1 text-[11px] text-sky-400/60 transition hover:text-sky-400">
                  + 新增航段（轉機或回程）
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <button disabled={!formDate || saving} onClick={editingId ? handleEdit : handleAdd}
                className="flex-1 rounded-xl bg-sky-600 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:opacity-50">
                {saving ? "儲存中..." : editingId ? "更新航班" : "新增航班"}
              </button>
              <button type="button" onClick={() => { setShowAddForm(false); resetForm(); }}
                className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15">
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 航班卡片列表（colatour 表格風格） ── */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((d) => {
            const info = formatDate(d.departure_date);
            const hasSegments = d.flight_segments && d.flight_segments.length > 0;
            const firstSeg = d.flight_segments?.[0];
            const displayAirline = firstSeg?.airline || d.airline || airlines;
            const airlineCode = extractAirlineCode(displayAirline);
            const airlineName = displayAirline.replace(/（[A-Z0-9]{2}）/, "").trim();

            return (
              <div key={d.id} className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#1a3347] transition hover:border-white/15">
                <div className="flex flex-col sm:flex-row">

                  {/* 左欄：航空公司 */}
                  <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-2.5 sm:w-[160px] sm:shrink-0 sm:flex-col sm:justify-center sm:border-b-0 sm:border-r sm:py-3">
                    <AirlineLogo code={airlineCode} name={airlineName} />
                    <div className="sm:text-center">
                      <p className="text-sm font-semibold text-white/80">
                        {airlineName}
                        {airlineCode && <span className="ml-1 text-xs font-semibold text-white/45">{airlineCode}</span>}
                      </p>
                    </div>
                  </div>

                  {/* 中欄：航段資訊 */}
                  <div className="flex-1 px-4 py-2 sm:px-5 sm:py-2">
                    {hasSegments ? (
                      <div className="divide-y divide-white/[0.06]">
                        {d.flight_segments!.map((seg, i) => {
                          const total = d.flight_segments!.length;
                          const segLabel = i === 0 ? "去程" : (total > 1 && i === total - 1) ? "回程" : "轉機";
                          return <SegmentRow_Display key={i} segment={seg} label={segLabel as "去程" | "回程" | "轉機"} />;
                        })}
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 py-2">
                        <svg className="h-4 w-4 text-white/30" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                        </svg>
                        <span className="text-sm text-white/60">{fromCity} → {toCity}</span>
                        <span className="text-[11px] text-white/35">{info.short}</span>
                        <span className="text-xs text-white/40">航班時間待確認</span>
                      </div>
                    )}
                  </div>

                  {/* 右欄：價格 */}
                  <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-2.5 sm:w-[190px] sm:shrink-0 sm:flex-col sm:items-end sm:justify-center sm:gap-2 sm:border-l sm:border-t-0 sm:px-5 sm:py-3">
                    <div className="sm:text-right">
                      <p className="text-xs text-white/45">每人(含稅)</p>
                      {d.price ? (
                        <p className="text-2xl font-bold text-[#ff6b35]">
                          ${d.price.toLocaleString()}
                        </p>
                      ) : (
                        <p className="text-2xl font-bold text-[#ff6b35]">洽詢報價</p>
                      )}
                      {d.label && (
                        <span className="mt-1 inline-block rounded border border-[#00b4d8]/25 bg-[#00b4d8]/10 px-2 py-0.5 text-[11px] font-semibold text-[#48cae4]">{d.label}</span>
                      )}
                    </div>
                    {isDevMode && (
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEditForm(d)}
                          className="rounded bg-amber-500/20 px-2.5 py-1 text-[11px] font-semibold text-amber-300 transition hover:bg-amber-500/30">編輯</button>
                        <button onClick={() => handleDelete(d.id)}
                          className="rounded bg-red-500/20 px-2.5 py-1 text-[11px] font-semibold text-red-300 transition hover:bg-red-500/30">刪除</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.08] bg-[#1a3347] py-10 text-center">
          <svg className="mx-auto mb-3 h-10 w-10 text-white/15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
          <p className="text-sm text-white/50">
            {dates.length > 0
              ? "此月份無航班票價"
              : isDevMode
              ? "尚未新增航班，點擊上方「新增航班」開始"
              : "目前無可訂購航班"}
          </p>
        </div>
      )}
    </section>
  );
}
