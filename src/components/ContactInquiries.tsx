"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";

interface ContactForm {
  id: string;
  name: string;
  phone: string | null;
  line_id: string | null;
  email: string | null;
  message: string | null;
  created_at: string;
}

interface ContactInquiriesProps {
  defaultOpen?: boolean;
}

export default function ContactInquiries({ defaultOpen = false }: ContactInquiriesProps) {
  const [records, setRecords] = useState<ContactForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));
  const [filterMonth, setFilterMonth] = useState("");
  const [collapsed, setCollapsed] = useState(!defaultOpen);

  const fetchRecords = async (year: string, month: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (year) params.set("year", year);
      if (month) params.set("month", month);
      const res = await fetch(`/api/contact-forms?${params}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      }
    } catch {
      // 靜默失敗
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords(filterYear, filterMonth);
  }, [filterYear, filterMonth]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${y}/${m}/${day} ${h}:${min}`;
  };

  const downloadXlsx = async () => {
    if (records.length === 0) return;

    const data = records.map((r) => ({
      "發送日期": formatDate(r.created_at),
      "姓名/暱稱": r.name || "",
      "電話": r.phone || "",
      "LINE ID": r.line_id || "",
      "信箱": r.email || "",
      "詢問內容": r.message || "",
    }));

    const ws = XLSX.utils.json_to_sheet(data);

    // 設定欄寬
    ws["!cols"] = [
      { wch: 18 }, // 發送日期
      { wch: 14 }, // 姓名
      { wch: 14 }, // 電話
      { wch: 16 }, // LINE ID
      { wch: 24 }, // 信箱
      { wch: 30 }, // 詢問內容
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "聯絡表單");

    const monthLabel = filterMonth ? `${filterYear}-${filterMonth.padStart(2, "0")}` : filterYear;
    const fileName = `聯絡表單_${monthLabel}.xlsx`;

    // 使用 File System Access API 讓用戶選擇儲存位置
    if (typeof window !== "undefined" && "showSaveFilePicker" in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: "Excel 檔案",
            accept: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] },
          }],
        });
        const writable = await handle.createWritable();
        const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        await writable.write(new Uint8Array(buf));
        await writable.close();
        return;
      } catch {
        // 用戶取消或不支援，改用傳統下載
      }
    }

    XLSX.writeFile(wb, fileName);
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => String(currentYear - i));
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1));

  return (
    <section className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between"
      >
        <h3 className="text-sm font-bold text-amber-300">
          聯絡表單記錄 ({records.length})
        </h3>
        <svg
          className={`h-4 w-4 text-amber-400 transition ${collapsed ? "" : "rotate-180"}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {!collapsed && (
        <div className="mt-4">
          {/* 篩選列 */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none"
            >
              {years.map((y) => (
                <option key={y} value={y} className="bg-[#1a3347]">{y} 年</option>
              ))}
            </select>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none"
            >
              <option value="" className="bg-[#1a3347]">全部月份</option>
              {months.map((m) => (
                <option key={m} value={m} className="bg-[#1a3347]">{m} 月</option>
              ))}
            </select>
            <button
              onClick={downloadXlsx}
              disabled={records.length === 0}
              className="ml-auto inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-40"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3" />
              </svg>
              下載 Excel
            </button>
          </div>

          {/* 記錄列表 */}
          <div className="mt-3 space-y-2">
            {loading ? (
              <p className="py-4 text-center text-xs text-white/40">載入中...</p>
            ) : records.length === 0 ? (
              <p className="py-4 text-center text-xs text-white/40">目前沒有記錄</p>
            ) : (
              records.map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl border border-white/[0.08] bg-white/5 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-white">{r.name}</span>
                    <span className="shrink-0 text-[11px] text-white/40">{formatDate(r.created_at)}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/60">
                    {r.phone && <span>電話：{r.phone}</span>}
                    {r.line_id && <span>LINE：{r.line_id}</span>}
                    {r.email && <span>信箱：{r.email}</span>}
                  </div>
                  {r.message && (
                    <p className="mt-2 rounded-lg bg-white/5 px-3 py-2 text-xs text-white/70">{r.message}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </section>
  );
}
