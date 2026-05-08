"use client";

import { useEffect, useState } from "react";

type FocusTopicItem = {
  id: string;
  title: string;
  summary: string;
  image_url: string;
  source_name: string;
  source_url: string;
  status: "pending" | "approved" | "rejected" | "published";
  updated_at?: string;
};

export default function FocusTopicManager() {
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FocusTopicItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [ingestResult, setIngestResult] = useState<string>("");
  const [form, setForm] = useState({
    title: "",
    summary: "",
    image_url: "",
    source_name: "",
    source_url: "",
    status: "pending" as FocusTopicItem["status"],
  });

  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/focus-topics?scope=all", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      }
    } catch {
      // 靜默失敗
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const createItem = async () => {
    if (!form.title.trim() || !form.image_url.trim() || !form.source_url.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/focus-topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setForm({
          title: "",
          summary: "",
          image_url: "",
          source_name: "",
          source_url: "",
          status: "pending",
        });
        await loadItems();
      }
    } catch {
      // 靜默失敗
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id: string, status: FocusTopicItem["status"]) => {
    try {
      const res = await fetch("/api/focus-topics", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) await loadItems();
    } catch {
      // 靜默失敗
    }
  };

  const removeItem = async (id: string) => {
    try {
      const res = await fetch(`/api/focus-topics?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) await loadItems();
    } catch {
      // 靜默失敗
    }
  };

  const ingestLatest = async () => {
    setIngesting(true);
    setIngestResult("");
    try {
      const res = await fetch('/api/focus-topics/ingest', {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await res.json();
      if (res.ok) {
        setIngestResult(`抓取完成：新增 ${data.inserted ?? 0} 筆，略過 ${data.skipped ?? 0} 筆，來源 ${data.sources ?? 0} 個`);
        await loadItems();
      } else {
        setIngestResult(`抓取失敗：${data.error || '未知錯誤'}`);
      }
    } catch {
      setIngestResult('抓取失敗：網路或伺服器錯誤');
    } finally {
      setIngesting(false);
    }
  };

  const statusClass = (status: FocusTopicItem["status"]) => {
    if (status === "published") return "text-emerald-300 bg-emerald-500/15 border-emerald-500/30";
    if (status === "approved") return "text-sky-300 bg-sky-500/15 border-sky-500/30";
    if (status === "rejected") return "text-red-300 bg-red-500/15 border-red-500/30";
    return "text-amber-300 bg-amber-500/15 border-amber-500/30";
  };

  return (
    <section className="mx-auto mt-4 max-w-[1180px] rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between"
      >
        <h3 className="text-sm font-bold text-sky-300">焦點話題管理（開發者）</h3>
        <svg className={`h-4 w-4 text-sky-300 transition ${collapsed ? "" : "rotate-180"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {!collapsed && (
        <div className="mt-4 space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="標題（必填）"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
            />
            <input
              value={form.source_name}
              onChange={(e) => setForm((prev) => ({ ...prev, source_name: e.target.value }))}
              placeholder="來源名稱（例如 Japan Travel）"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
            />
            <input
              value={form.image_url}
              onChange={(e) => setForm((prev) => ({ ...prev, image_url: e.target.value }))}
              placeholder="圖片 URL（必填）"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none sm:col-span-2"
            />
            <input
              value={form.source_url}
              onChange={(e) => setForm((prev) => ({ ...prev, source_url: e.target.value }))}
              placeholder="來源連結 URL（必填）"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none sm:col-span-2"
            />
            <textarea
              value={form.summary}
              onChange={(e) => setForm((prev) => ({ ...prev, summary: e.target.value }))}
              placeholder="摘要（選填）"
              className="min-h-[78px] rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none sm:col-span-2"
            />
            <div className="flex items-center gap-2 sm:col-span-2">
              <select
                value={form.status}
                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as FocusTopicItem["status"] }))}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
              >
                <option value="pending" className="bg-[#1a3347]">pending</option>
                <option value="approved" className="bg-[#1a3347]">approved</option>
                <option value="published" className="bg-[#1a3347]">published</option>
                <option value="rejected" className="bg-[#1a3347]">rejected</option>
              </select>
              <button
                onClick={createItem}
                disabled={submitting}
                className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:opacity-40"
              >
                新增話題
              </button>
              <button
                onClick={loadItems}
                className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white/75 transition hover:bg-white/10"
              >
                重新整理
              </button>
              <button
                onClick={ingestLatest}
                disabled={ingesting}
                className="rounded-lg border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/20 disabled:opacity-40"
              >
                {ingesting ? '抓取中...' : '一鍵抓最新'}
              </button>
            </div>
            {ingestResult && (
              <p className="text-xs text-white/60 sm:col-span-2">{ingestResult}</p>
            )}
          </div>

          <div className="space-y-2">
            {loading ? (
              <p className="py-4 text-center text-xs text-white/40">載入中...</p>
            ) : items.length === 0 ? (
              <p className="py-4 text-center text-xs text-white/40">目前沒有焦點話題資料</p>
            ) : (
              items.map((item) => (
                <div key={item.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusClass(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-white/60">{item.summary || "（無摘要）"}</p>
                  <p className="mt-1 text-[11px] text-white/45">來源：{item.source_name || "未填寫"}</p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      onClick={() => updateStatus(item.id, "published")}
                      className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-emerald-500"
                    >
                      發布
                    </button>
                    <button
                      onClick={() => updateStatus(item.id, "pending")}
                      className="rounded-md bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-amber-500"
                    >
                      轉待審
                    </button>
                    <button
                      onClick={() => updateStatus(item.id, "rejected")}
                      className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-red-500"
                    >
                      拒絕
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="rounded-md border border-white/20 bg-white/5 px-2.5 py-1 text-xs font-semibold text-white/80 transition hover:bg-white/10"
                    >
                      刪除
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </section>
  );
}
