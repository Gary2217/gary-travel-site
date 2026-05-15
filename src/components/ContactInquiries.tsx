"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
  const [open, setOpen] = useState(defaultOpen);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

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
    ws["!cols"] = [
      { wch: 18 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
      { wch: 24 },
      { wch: 30 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "聯絡表單");

    const monthLabel = filterMonth ? `${filterYear}-${filterMonth.padStart(2, "0")}` : filterYear;
    const fileName = `聯絡表單_${monthLabel}.xlsx`;

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

  const panel = open && mounted ? createPortal(
    <div className="fixed inset-x-0 top-14 z-[200] flex justify-center px-3 pt-2 sm:px-4">
      <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-2xl">
        {/* 標題列 */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h3 className="text-sm font-bold text-amber-600">
            聯絡表單記錄（{records.length}）
          </h3>
          <button
            onClick={() => setOpen(false)}
            className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 篩選列 */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-900 outline-none"
          >
            {years.map((y) => (
              <option key={y} value={y} className="bg-white">{y} 年</option>
            ))}
          </select>
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-900 outline-none"
          >
            <option value="" className="bg-white">全部月份</option>
            {months.map((m) => (
              <option key={m} value={m} className="bg-white">{m} 月</option>
            ))}
          </select>
          <button
            onClick={downloadXlsx}
            disabled={records.length === 0}
            className="ml-auto inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-600 transition hover:bg-amber-100 disabled:opacity-40"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3" />
            </svg>
            下載 Excel
          </button>
        </div>

        {/* 記錄列表（可捲動） */}
        <div className="max-h-[55vh] overflow-y-auto px-4 pb-4">
          {loading ? (
            <p className="py-6 text-center text-xs text-gray-400">載入中...</p>
          ) : records.length === 0 ? (
            <p className="py-6 text-center text-xs text-gray-400">目前沒有記錄</p>
          ) : (
            <div className="space-y-2">
              {records.map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-gray-900">{r.name}</span>
                    <span className="shrink-0 text-[11px] text-gray-400">{formatDate(r.created_at)}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    {r.phone && <span>電話：{r.phone}</span>}
                    {r.line_id && <span>LINE：{r.line_id}</span>}
                    {r.email && <span>信箱：{r.email}</span>}
                  </div>
                  {r.message && (
                    <p className="mt-2 rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-600">{r.message}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mt-6 flex w-full items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 transition hover:bg-amber-100"
      >
        <h3 className="text-sm font-bold text-amber-600">
          聯絡表單記錄（{records.length}）
        </h3>
        <svg className="h-4 w-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {panel}
    </>
  );
}
