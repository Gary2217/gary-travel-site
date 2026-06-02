"use client";

import { useState, useRef, useEffect } from "react";
import { type DepartureDate, type FlightSegment, lineMessageHref } from "@/lib/supabase";

const CITIES = ["桃園", "台中", "高雄", "松山", "其他"];

// 機場清單：tw:true 為台灣出發機場（預設優先顯示）
const AIRPORTS = [
  { code: "TPE", name: "桃園國際機場", tw: true },
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
  { name: "卡達航空", code: "QR", en: "Qatar Airways" },
  { name: "阿提哈德航空", code: "EY", en: "Etihad Airways" },
  { name: "土耳其航空", code: "TK", en: "Turkish Airlines" },
  { name: "阿曼航空", code: "WY", en: "Oman Air" },
  { name: "海灣航空", code: "GF", en: "Gulf Air" },
  { name: "皇家乃彬航空", code: "RJ", en: "Royal Jordanian" },
  { name: "以色列航空", code: "LY", en: "El Al" },
  { name: "烏茲別克航空", code: "HY", en: "Uzbekistan Airways" },
  { name: "哈薩克航空", code: "KC", en: "Air Astana" },
  { name: "亞塞拜然航空", code: "J2", en: "Azerbaijan Airlines" },
  { name: "喬治亞航空", code: "A9", en: "Georgian Airways" },
  { name: "土庫曼航空", code: "T5", en: "Turkmenistan Airlines" },
  { name: "塔吉克航空", code: "7J", en: "Tajik Air" },
  { name: "荷蘭皇家航空", code: "KL", en: "KLM Royal Dutch Airlines" },
  { name: "法國航空", code: "AF", en: "Air France" },
  { name: "漢莎航空", code: "LH", en: "Lufthansa" },
  { name: "英國航空", code: "BA", en: "British Airways" },
  { name: "瑞士航空", code: "LX", en: "Swiss International" },
  { name: "奧地利航空", code: "OS", en: "Austrian Airlines" },
  { name: "北歐航空", code: "SK", en: "SAS" },
  { name: "芬蘭航空", code: "AY", en: "Finnair" },
  { name: "義大利航空", code: "AZ", en: "ITA Airways" },
  { name: "西班牙航空", code: "IB", en: "Iberia" },
  { name: "冰島航空", code: "FI", en: "Icelandair" },
  { name: "中國南方航空", code: "CZ", en: "China Southern" },
  { name: "中國東方航空", code: "MU", en: "China Eastern" },
  { name: "中國國際航空", code: "CA", en: "Air China" },
  { name: "廈門航空", code: "MF", en: "Xiamen Airlines" },
  { name: "深圳航空", code: "ZH", en: "Shenzhen Airlines" },
  { name: "四川航空", code: "3U", en: "Sichuan Airlines" },
  { name: "海南航空", code: "HU", en: "Hainan Airlines" },
  { name: "春秋航空", code: "9C", en: "Spring Airlines" },
  { name: "吉祥航空", code: "HO", en: "Juneyao Airlines" },
  { name: "香港快運", code: "UO", en: "HK Express" },
  { name: "香港航空", code: "HX", en: "Hong Kong Airlines" },
  { name: "澳門航空", code: "NX", en: "Air Macau" },
  { name: "馬來西亞航空", code: "MH", en: "Malaysia Airlines" },
  { name: "印尼航空", code: "GA", en: "Garuda Indonesia" },
  { name: "汶萊皇家航空", code: "BI", en: "Royal Brunei" },
  { name: "斯里蘭卡航空", code: "UL", en: "SriLankan Airlines" },
  { name: "印度航空", code: "AI", en: "Air India" },
  { name: "不丹皇家航空", code: "KB", en: "Druk Air" },
  { name: "尼泊爾航空", code: "RA", en: "Nepal Airlines" },
  { name: "紐西蘭航空", code: "NZ", en: "Air New Zealand" },
  { name: "澳洲航空", code: "QF", en: "Qantas" },
  { name: "美國航空", code: "AA", en: "American Airlines" },
  { name: "聯合航空", code: "UA", en: "United Airlines" },
  { name: "達美航空", code: "DL", en: "Delta Air Lines" },
  { name: "加拿大航空", code: "AC", en: "Air Canada" },
  { name: "衣索比亞航空", code: "ET", en: "Ethiopian Airlines" },
  { name: "南非航空", code: "SA", en: "South African Airways" },
  { name: "埃及航空", code: "MS", en: "EgyptAir" },
  { name: "摩洛哥航空", code: "AT", en: "Royal Air Maroc" },
  { name: "肯亞航空", code: "KQ", en: "Kenya Airways" },
];

interface DepartureDatesProps {
  tripId: string;
  tripTitle: string;
  dates: DepartureDate[];
  isDevMode: boolean;
  onDatesChange: (dates: DepartureDate[]) => void;
  selectedDateId: string | null;
  onSelectedDateChange: (dateId: string | null) => void;
  onSaveSuccess?: () => void;
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

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function CountdownBadge({ days }: { days: number }) {
  if (days < 0) return null;
  if (days === 0) return <span className="mt-0.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-600">今日出發</span>;
  if (days <= 3) return <span className="mt-0.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-600">還有 {days} 天</span>;
  if (days <= 14) return <span className="mt-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-600">還有 {days} 天</span>;
  if (days <= 60) return <span className="mt-0.5 rounded-full bg-sky-100 px-1.5 py-0.5 text-[9px] font-bold text-sky-600">還有 {days} 天</span>;
  return null;
}

function SeatsBadge({ available, total }: { available: number; total: number }) {
  if (total === 0 && available === 0) return null;
  if (available === 0 && total > 0) return <span className="mt-0.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">已售罄</span>;
  if (available <= 3) return <span className="mt-0.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">僅剩 {available} 位</span>;
  if (available <= 10) return <span className="mt-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">剩 {available} 位</span>;
  return <span className="mt-0.5 text-xs font-medium text-gray-500">可售 {available}</span>;
}

function getWeekdayFromDate(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return "";
  return ["日", "一", "二", "三", "四", "五", "六"][d.getDay()];
}

const inputClass = "w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-900 placeholder-gray-400 outline-none focus:border-sky-400";
const labelClass = "mb-1 block text-[10px] text-gray-500";

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
        <div className="absolute left-0 top-full z-50 mt-1 max-h-52 w-52 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl">
          {!q && (
            <div className="border-b border-gray-100 px-2.5 py-1.5 text-[10px] text-gray-400">
              {preferTw ? "台灣出發機場" : "常用機場"}
            </div>
          )}
          {filtered.map((a, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { onChange(a.name); setOpen(false); }}
              className="flex w-full items-center justify-between px-2.5 py-2 text-left text-xs text-gray-900 transition hover:bg-gray-100"
            >
              <span>{a.name}</span>
              <span className="ml-2 shrink-0 text-[10px] text-gray-400">{a.code}</span>
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
        <div className="absolute left-0 top-full z-50 mt-1 max-h-48 w-52 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl">
          {filtered.map((a, i) => (
            <button key={i} type="button"
              onClick={() => { onChange(`${a.name}（${a.code}）`); setOpen(false); }}
              className="flex w-full items-center justify-between px-2.5 py-2 text-left text-xs text-gray-900 transition hover:bg-gray-100">
              <span>{a.name}</span>
              <span className="ml-2 shrink-0 text-[10px] text-gray-400">{a.code}</span>
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
    index === 0 ? "bg-sky-100 text-sky-600" :
    total > 1 && index === total - 1 ? "bg-amber-100 text-amber-600" :
    "bg-violet-100 text-violet-600";
  const dayLabel = segment.date ? getWeekdayFromDate(segment.date) : "";

  return (
    <div className="mb-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400">第 {index + 1} 段</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${labelColor}`}>{label}</span>
        </div>
        <button type="button" onClick={onDelete} className="text-[10px] text-red-400/50 transition hover:text-red-400">✕ 刪除</button>
      </div>

      <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="overflow-hidden">
          <label className={labelClass}>日期</label>
          <div className="flex gap-1 overflow-hidden">
            <input type="date" value={segment.date} onChange={(e) => onChange("date", e.target.value)}
              className={`${inputClass} flex-1`} />
            {dayLabel && <span className="flex items-center rounded-lg border border-amber-200 bg-amber-50 px-2 text-xs font-bold text-amber-600">{dayLabel}</span>}
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
            className={`${inputClass} [color-scheme:light]`} />
        </div>
        <div>
          <label className={labelClass}>起飛機場</label>
          <AirportInput value={segment.dep_airport} onChange={(v) => onChange("dep_airport", v)} placeholder="出發地" preferTw={index === 0} />
        </div>
        <div>
          <label className={labelClass}>抵達時間</label>
          <input type="time" value={segment.arr_time} onChange={(e) => onChange("arr_time", e.target.value)}
            className={`${inputClass} [color-scheme:light]`} />
        </div>
        <div>
          <label className={labelClass}>抵達機場</label>
          <AirportInput value={segment.arr_airport} onChange={(v) => onChange("arr_airport", v)} placeholder="目的地" preferTw={total > 1 && index === total - 1} />
        </div>
        <div className="col-span-2 flex items-end sm:col-span-1">
          <label className="flex items-center gap-1.5 py-1.5 text-xs text-gray-600">
            <input type="checkbox" checked={segment.next_day} onChange={(e) => onChange("next_day", e.target.checked)} className="rounded border-gray-300 bg-white" />
            跨日+1
          </label>
        </div>
      </div>
    </div>
  );
}

export default function DepartureDates({ tripId, tripTitle, dates, isDevMode, onDatesChange, selectedDateId, onSelectedDateChange, onSaveSuccess }: DepartureDatesProps) {
  const [activeMonth, setActiveMonth] = useState<string>("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [datesExpanded, setDatesExpanded] = useState(false);
  const ROW_LIMIT = 7; // PC 一排顯示幾個日期卡片

  const today = new Date().toLocaleDateString("sv-SE");
  const [formDate, setFormDate] = useState(today);
  const [formSchedule, setFormSchedule] = useState("");
  const [formSegments, setFormSegments] = useState<FlightSegment[]>([]);

  const emptySegment = (date?: string): FlightSegment => ({
    date: date || "", airline: "", flight_number: "", dep_time: "", dep_airport: "", arr_time: "", arr_airport: "", next_day: false,
  });
  const addSegment = () => setFormSegments((prev) => [...prev, emptySegment(prev.length === 0 ? formDate : "")]);
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
    setFormSchedule("");
    setFormSegments([]);
    setEditingId(null);
  };

  // 出發日期變更時同步第一段航班日期
  const handleFormDateChange = (newDate: string) => {
    setFormDate(newDate);
    if (formSegments.length > 0) {
      setFormSegments((prev) => prev.map((s, i) => i === 0 ? { ...s, date: newDate } : s));
    }
  };

  /** 新增梯次時，使用空白資料 */
  const prefillFromLast = () => {
    setEditingId(null);
    setFormDate(today);
    setFormSegments([]);
  };

  /** 完整 payload（新增梯次用，含 price/label/seats 初始值） */
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

  /** 航班專用 payload（編輯梯次用，含 schedule label） */
  const buildFlightPayload = () => {
    const out = formSegments[0];
    const ret = formSegments.length > 1 ? formSegments[formSegments.length - 1] : null;
    return {
      departure_date: formDate,
      ...(formSchedule ? { label: formSchedule } : {}),
      airline: out?.airline || null,
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
    };
  };

  /** 檢查航段日期是否與出發日期一致 */
  const validateFlightDates = (): boolean => {
    if (formSegments.length === 0) return true;
    const depTime = new Date(formDate + 'T00:00:00').getTime();
    for (let i = 0; i < formSegments.length; i++) {
      const seg = formSegments[i];
      if (!seg.date) continue;
      const segTime = new Date(seg.date + 'T00:00:00').getTime();
      const diffDays = Math.abs(segTime - depTime) / 86400000;
      // 第一段去程不應早於出發日，回程可晚幾天
      if (i === 0 && segTime < depTime) {
        return !confirm(`第 ${i + 1} 段航班日期（${seg.date}）早於出發日期（${formDate}），確定要儲存嗎？`);
      }
      if (diffDays > 30) {
        return !confirm(`第 ${i + 1} 段航班日期（${seg.date}）與出發日期差距 ${Math.round(diffDays)} 天，確定要儲存嗎？`);
      }
    }
    return true;
  };

  const handleAdd = async () => {
    if (!formDate) return;
    if (!validateFlightDates()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/departure-dates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      if (!res.ok) {
        alert('新增梯次失敗，請再試一次');
        return;
      }
      const added = await res.json();
      onDatesChange([...dates, added].sort((a, b) => a.departure_date.localeCompare(b.departure_date)));
      onSelectedDateChange(added.id);
      resetForm();
      setShowAddForm(false);
      onSaveSuccess?.();
    } catch {
      alert('新增梯次失敗，請再試一次');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editingId || !formDate) return;
    if (!validateFlightDates()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/departure-dates?dateId=${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildFlightPayload()),
      });
      if (!res.ok) {
        alert('更新梯次失敗，請再試一次');
        return;
      }
      const updated = await res.json();
      onDatesChange(
        dates.map((d) => (d.id === editingId ? updated : d)).sort((a, b) => a.departure_date.localeCompare(b.departure_date))
      );
      resetForm();
      setShowAddForm(false);
      onSaveSuccess?.();
    } catch {
      alert('更新梯次失敗，請再試一次');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("確定刪除此出團梯次？")) return;
    try {
      const res = await fetch(`/api/trips/${tripId}/departure-dates?dateId=${id}`, { method: "DELETE" });
      if (!res.ok) {
        alert('刪除梯次失敗，請再試一次');
        return;
      }
      onDatesChange(dates.filter((d) => d.id !== id));
      if (selectedDateId === id) onSelectedDateChange(null);
    } catch {
      alert('刪除梯次失敗，請再試一次');
    }
  };

  const openEditForm = (d: DepartureDate) => {
    setEditingId(d.id);
    setFormDate(d.departure_date);
    setFormSchedule(d.label && d.label.includes('去') ? d.label : "");
    if (d.flight_segments && d.flight_segments.length > 0) {
      // 自動同步第一段航班日期為出發日期
      setFormSegments(d.flight_segments.map((s, i) => i === 0 ? { ...s, date: d.departure_date } : s));
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
        <h2 className="text-sm font-medium uppercase tracking-wider text-gray-500">出團日期</h2>
        {isDevMode && (
          <button
            onClick={() => {
              if (showAddForm) { resetForm(); setShowAddForm(false); }
              else { prefillFromLast(); setShowAddForm(true); }
            }}
            className="rounded-full bg-sky-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-sky-500"
          >
            {showAddForm ? "取消" : "新增梯次"}
          </button>
        )}
      </div>

      {/* Dev mode 新增/編輯表單 */}
      {isDevMode && showAddForm && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="mb-3 text-xs font-bold text-amber-600">{editingId ? "編輯梯次" : "新增梯次"}</p>

          <p className="mb-2 text-[10px] font-semibold text-gray-400">基本資訊</p>
          <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label className={labelClass}>出發日期 *</label>
              <div className="flex gap-1">
                <input type="date" value={formDate} onChange={(e) => handleFormDateChange(e.target.value)}
                  className={`${inputClass} flex-1`} />
                {departureDayLabel && (
                  <span className="flex items-center rounded-lg border border-sky-200 bg-sky-50 px-2 text-xs font-bold text-sky-600">
                    {departureDayLabel}
                  </span>
                )}
              </div>
            </div>
            <div>
              <label className={labelClass}>航班時段</label>
              <select value={formSchedule} onChange={(e) => setFormSchedule(e.target.value)} className={inputClass}>
                <option value="">無</option>
                <option value="早去早回">早去早回</option>
                <option value="早去午回">早去午回</option>
                <option value="早去晚回">早去晚回</option>
                <option value="午去早回">午去早回</option>
                <option value="午去午回">午去午回</option>
                <option value="午去晚回">午去晚回</option>
                <option value="晚去早回">晚去早回</option>
                <option value="晚去午回">晚去午回</option>
                <option value="晚去晚回">晚去晚回</option>
                <option value="早去夜回">早去夜回</option>
                <option value="午去夜回">午去夜回</option>
                <option value="晚去夜回">晚去夜回</option>
              </select>
            </div>
          </div>

          {/* 航班明細 */}
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-semibold text-sky-600">✈ 航班明細（選填）</p>
            <button type="button" onClick={addSegment}
              className="text-[10px] font-semibold text-sky-600 transition hover:text-sky-500">
              + 新增航段
            </button>
          </div>

          {formSegments.length === 0 ? (
            <div className="mb-4 flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 py-5">
              <p className="text-[11px] text-gray-400">尚未新增航班，可直接儲存或點擊新增航段</p>
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => { addSegment(); }}
                  className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] text-sky-600 transition hover:bg-sky-100">
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
                className="mb-4 mt-1 text-[11px] text-sky-600 transition hover:text-sky-500">
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
              className={`rounded-full px-3 py-2 text-sm font-medium transition ${activeMonth === "all" ? "bg-sky-500 text-white" : "border border-gray-200 text-gray-600 hover:border-sky-400 hover:text-sky-600"}`}>
            全部
          </button>
          {monthKeys.map((m) => {
            const [, mo] = m.split("-");
            return (
              <button key={m} onClick={() => setActiveMonth(m)}
              className={`rounded-full px-3 py-2 text-sm font-medium transition ${activeMonth === m ? "bg-sky-500 text-white" : "border border-gray-200 text-gray-600 hover:border-sky-400 hover:text-sky-600"}`}>
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
          {(() => {
            // 把月份標籤 + 日期卡片攤平成一個列表，方便計算顯示數量
            const allItems: { type: 'month'; label: string } | { type: 'date'; date: DepartureDate } & { type: string }[] = [];
            let dateCount = 0;
            Array.from(filteredGrouped.entries()).forEach(([monthLabel, monthDates]) => {
              (allItems as { type: string; label?: string; date?: DepartureDate }[]).push({ type: 'month', label: monthLabel });
              monthDates.forEach((d) => {
                (allItems as { type: string; label?: string; date?: DepartureDate }[]).push({ type: 'date', date: d });
                dateCount++;
              });
            });
            const needCollapse = dateCount > ROW_LIMIT && !isDevMode;
            let visibleDateCount = 0;

            return (
              <>
                <div className="flex gap-2 overflow-x-auto pb-2 sm:flex-wrap sm:overflow-x-visible sm:pb-0">
                  {(allItems as { type: string; label?: string; date?: DepartureDate }[]).map((item, idx) => {
                    if (item.type === 'month') {
                      // 收合模式下，如果已超出限制就隱藏後面的月份標籤
                      if (needCollapse && !datesExpanded && visibleDateCount >= ROW_LIMIT) return null;
                      return (
                        <div key={`m-${idx}`} className="flex items-center rounded-lg bg-gray-50 px-3 py-2">
                          <span className="text-xs font-bold text-gray-500">{item.label}</span>
                        </div>
                      );
                    }
                    const d = item.date!;
                    visibleDateCount++;
                    if (needCollapse && !datesExpanded && visibleDateCount > ROW_LIMIT) return null;
                    const info = formatDate(d.departure_date);
                    const days = daysUntil(d.departure_date);
                    const isSelected = selectedDateId === d.id;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => onSelectedDateChange(isSelected ? null : d.id)}
                        className={`flex shrink-0 flex-col items-center rounded-lg border px-3.5 py-2.5 text-center transition sm:px-3 sm:py-2 ${
                          isSelected
                            ? "border-sky-400 bg-sky-50 shadow-sm"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <div className="text-sm font-bold text-gray-900 sm:text-sm">{info.short}（{info.weekday}）</div>
                        <div className="mt-1 sm:mt-0.5">
                          {d.price ? (
                            <span className="text-sm font-bold text-amber-600 sm:text-xs">${d.price.toLocaleString()}</span>
                          ) : (
                            <span className="text-xs text-gray-400 sm:text-[10px]">洽詢</span>
                          )}
                        </div>
                        <CountdownBadge days={days} />
                        <SeatsBadge available={d.seats_available} total={d.seats_total} />
                      </button>
                    );
                  })}
                </div>
                {needCollapse && (
                  <button
                    type="button"
                    onClick={() => setDatesExpanded(!datesExpanded)}
                    className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-gray-200 bg-gray-50 py-2 text-sm font-medium text-sky-600 transition hover:bg-sky-50 hover:text-sky-700"
                  >
                    {datesExpanded ? (
                      <>收合 <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg></>
                    ) : (
                      <>顯示更多日期（共 {dateCount} 個）<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></>
                    )}
                  </button>
                )}
              </>
            );
          })()}


          {/* 選中卡片的展開詳情（Dev mode 才展開編輯，航班已在主頁顯示不重複） */}
          {isDevMode && selectedDateId && (() => {
            const d = filtered.find((x) => x.id === selectedDateId);
            if (!d) return null;
            const info = formatDate(d.departure_date);
            const showFlight = hasFlightInfo(d);

            return (
              <div className="mt-3 flex items-center gap-2">
                <button onClick={() => openEditForm(d)}
                  className="rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-600 transition hover:bg-amber-100">編輯航班</button>
                <button onClick={() => handleDelete(d.id)}
                  className="rounded-full bg-red-50 px-3 py-1.5 text-[11px] font-semibold text-red-600 transition hover:bg-red-100">刪除梯次</button>
              </div>
            );
          })()}
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          {dates.length > 0 ? "此月份無出團梯次" : "尚未設定出團日期"}
        </p>
      )}
    </div>
  );
}
