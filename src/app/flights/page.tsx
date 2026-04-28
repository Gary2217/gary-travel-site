"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import StickyHeader from "@/components/StickyHeader";
import SocialCta from "@/components/SocialCta";
import FloatingContact from "@/components/FloatingContact";
import DevModeToggle from "@/components/DevModeToggle";
import { getSiteLogo, type FlightRoute } from "@/lib/supabase";

const REGIONS = ["全部", "日本", "韓國", "東南亞", "中港澳", "歐洲", "美洲", "澳紐"];

const REGION_BADGE_COLOR: Record<string, string> = {
  日本: "bg-rose-600/80",
  韓國: "bg-fuchsia-600/80",
  東南亞: "bg-emerald-600/80",
  中港澳: "bg-amber-600/80",
  歐洲: "bg-blue-600/80",
  美洲: "bg-indigo-600/80",
  澳紐: "bg-teal-600/80",
};

type EditingRoute = Partial<FlightRoute> & { _isNew?: boolean };

export default function FlightsPage() {
  const [routes, setRoutes] = useState<FlightRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRegion, setActiveRegion] = useState("全部");
  const [isDevMode, setIsDevMode] = useState(false);
  const [siteLogoUrl, setSiteLogoUrl] = useState("/travel-logo.svg");

  // Editor state
  const [editingRoute, setEditingRoute] = useState<EditingRoute | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [customFields, setCustomFields] = useState<{ key: string; value: string }[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getSiteLogo().then(setSiteLogoUrl).catch(() => setSiteLogoUrl("/travel-logo.svg"));
    loadRoutes();
  }, []);

  async function loadRoutes() {
    setLoading(true);
    try {
      const res = await fetch("/api/flight-routes", { cache: "no-store" });
      if (!res.ok) throw new Error();
      setRoutes(await res.json());
    } catch {
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  }

  const filtered =
    activeRegion === "全部" ? routes : routes.filter((r) => r.region === activeRegion);

  // ── Editor helpers ──────────────────────────────────────────────

  function openNew() {
    setEditingRoute({
      _isNew: true,
      region: "日本",
      from_city: "台北",
      to_city: "",
      airlines: "",
      duration: "",
      price_range: "",
      image_url: "",
      direct: true,
      metadata: {},
    });
    setCustomFields([]);
    setImageFile(null);
    setImagePreview(null);
    setSaveError(null);
  }

  function openEdit(route: FlightRoute) {
    setEditingRoute({ ...route });
    setCustomFields(Object.entries(route.metadata || {}).map(([key, value]) => ({ key, value: String(value) })));
    setImageFile(null);
    setImagePreview(null);
    setSaveError(null);
  }

  function addCustomField() {
    setCustomFields((prev) => [...prev, { key: "", value: "" }]);
  }

  function removeCustomField(idx: number) {
    setCustomFields((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateCustomField(idx: number, field: "key" | "value", val: string) {
    setCustomFields((prev) => prev.map((f, i) => (i === idx ? { ...f, [field]: val } : f)));
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function updateField<K extends keyof EditingRoute>(key: K, value: EditingRoute[K]) {
    setEditingRoute((prev) => prev ? { ...prev, [key]: value } : prev);
  }

  async function handleSave() {
    if (!editingRoute) return;
    if (!editingRoute.to_city?.trim()) { setSaveError("請填寫目的地"); return; }
    if (!editingRoute.airlines?.trim()) { setSaveError("請填寫航空公司"); return; }
    if (!editingRoute.duration?.trim()) { setSaveError("請填寫飛行時間"); return; }
    if (!editingRoute.price_range?.trim()) { setSaveError("請填寫參考票價"); return; }

    setIsSaving(true);
    setSaveError(null);

    try {
      let imageUrl = editingRoute.image_url || "";

      if (imageFile) {
        const fd = new FormData();
        fd.append("file", imageFile);
        if (editingRoute.image_url) fd.append("old_image_url", editingRoute.image_url);
        const up = await fetch("/api/upload-flight-image", { method: "POST", body: fd });
        if (!up.ok) { const e = await up.json(); throw new Error(e.error || "圖片上傳失敗"); }
        imageUrl = (await up.json()).url;
      }

      const metadata: Record<string, string> = {};
      for (const f of customFields) {
        if (f.key.trim()) metadata[f.key.trim()] = f.value;
      }

      const payload = {
        region: editingRoute.region,
        from_city: editingRoute.from_city || "台北",
        to_city: editingRoute.to_city,
        airlines: editingRoute.airlines,
        duration: editingRoute.duration,
        price_range: editingRoute.price_range,
        image_url: imageUrl,
        direct: editingRoute.direct ?? true,
        metadata,
      };

      if (editingRoute._isNew || !editingRoute.id) {
        const res = await fetch("/api/flight-routes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || "新增失敗"); }
        const created: FlightRoute = await res.json();
        setRoutes((prev) => [...prev, created]);
      } else {
        const res = await fetch(`/api/flight-routes/${editingRoute.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || "儲存失敗"); }
        const updated: FlightRoute = await res.json();
        setRoutes((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      }

      closeEditor();
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "儲存失敗");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!editingRoute?.id) return;
    if (!window.confirm("確定要刪除這條航線？")) return;

    try {
      const res = await fetch(`/api/flight-routes/${editingRoute.id}`, { method: "DELETE" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "刪除失敗"); }
      setRoutes((prev) => prev.filter((r) => r.id !== editingRoute.id));
      closeEditor();
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "刪除失敗");
    }
  }

  function closeEditor() {
    setEditingRoute(null);
    setImageFile(null);
    setImagePreview(null);
    setSaveError(null);
    setCustomFields([]);
  }

  // ── Render ───────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#0b0f2a_0%,#0a0a0a_50%,#1a0d0d_100%)] text-white">
      <StickyHeader
        logoUrl={siteLogoUrl}
        showBackButton
        devModeSlot={<DevModeToggle onToggle={setIsDevMode} />}
      />

      <div className="px-4 pt-[86px] md:pt-[98px] lg:pt-[74px]">

        {/* Hero */}
        <div className="mx-auto max-w-3xl py-8 text-center md:py-10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-1.5 text-sm text-sky-300">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
            </svg>
            <span>Flight Consultation</span>
          </div>
          <h1 className="bg-gradient-to-r from-sky-200 via-cyan-300 to-blue-400 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl md:text-5xl">
            機票諮詢服務
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-white/65 sm:text-base">
            台北出發，飛往亞洲各地熱門航線<br className="hidden sm:block" />
            由旅遊規劃師蓋瑞為您比價，找到最划算票價
          </p>
        </div>

        {/* Region filter tabs */}
        <div className="sticky top-[84px] z-40 overflow-x-auto rounded-none bg-[rgba(10,10,18,0.82)] px-2 py-1.5 shadow-lg shadow-black/20 backdrop-blur-[6px] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:top-[96px] lg:top-[72px]">
          <div className="flex min-w-max justify-center gap-3 md:min-w-0 md:flex-wrap">
            {REGIONS.map((region) => (
              <button
                key={region}
                type="button"
                onClick={() => setActiveRegion(region)}
                className={`rounded-full border px-4 py-2 text-sm font-medium text-white shadow-sm transition ${
                  activeRegion === region
                    ? "border-sky-400/60 bg-sky-600/30 text-sky-200"
                    : "border-white/10 bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.14)]"
                }`}
              >
                {region}
              </button>
            ))}
          </div>
        </div>

        {/* Cards grid */}
        <div className="mx-auto max-w-7xl py-6">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-white/50">
              <svg className="mr-2 h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              載入中...
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((route) => (
                <Link
                  key={route.id}
                  href={`/flights/${route.id}`}
                  className="group relative block overflow-hidden rounded-[1.5rem] border border-white/10 shadow-lg shadow-black/20"
                >
                  {/* Background image */}
                  <div
                    className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-105"
                    style={{ backgroundImage: `url(${route.image_url})` }}
                  />
                  {/* Diagonal overlay: left-bottom very dark → top-right fully transparent */}
                  <div className="absolute inset-0" style={{background:'linear-gradient(to top right, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.68) 38%, rgba(0,0,0,0.18) 62%, transparent 78%)'}} />
                  {/* Small top-left scrim for badge readability */}
                  <div className="absolute left-0 top-0 h-14 w-1/2 bg-gradient-to-br from-black/55 to-transparent" />

                  {/* Content */}
                  <div className="relative z-10 flex h-[210px] flex-col justify-between p-4 sm:h-[228px] sm:p-5">

                    {/* Top badges */}
                    <div className="flex gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm ${REGION_BADGE_COLOR[route.region] ?? "bg-slate-600/80"}`}>
                        {route.region}
                      </span>
                      {route.direct ? (
                        <span className="rounded-full bg-sky-600/75 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                          直飛
                        </span>
                      ) : (
                        <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold text-white/80 backdrop-blur-sm">
                          轉機
                        </span>
                      )}

                      {/* Dev mode edit button */}
                      {isDevMode && (
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); openEdit(route); }}
                          className="ml-auto rounded-full bg-amber-500/80 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-amber-500"
                        >
                          編輯
                        </button>
                      )}
                    </div>

                    {/* Route info */}
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-sm text-white/85">{route.from_city}</span>
                        <svg className="h-3.5 w-3.5 shrink-0 text-sky-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                        </svg>
                        <span className="text-2xl font-bold text-white sm:text-3xl">{route.to_city}</span>
                      </div>
                      <p className="text-[11px] leading-4 text-white/80 sm:text-xs">{route.airlines}</p>
                      {Object.entries(route.metadata || {}).length > 0 && (
                        <div className="mb-1 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                          {Object.entries(route.metadata || {}).map(([k, v]) => (
                            <span key={k} className="text-[10px] text-white/60">
                              <span className="text-white/38">{k}：</span>{v}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="mb-2" />
                      <div>
                        <p className="text-base font-bold text-sky-300 sm:text-lg">{route.price_range}</p>
                        <p className="text-[11px] text-white/75">{route.duration}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}

              {/* Dev mode: 新增航線 */}
              {isDevMode && (
                <button
                  type="button"
                  onClick={openNew}
                  className="flex h-[210px] items-center justify-center gap-2 rounded-[1.5rem] border border-dashed border-white/20 bg-white/5 text-white/50 transition hover:border-sky-500/50 hover:bg-white/10 hover:text-white sm:h-[228px]"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-sm font-medium">新增航線</span>
                </button>
              )}
            </div>
          )}

          {!loading && filtered.length === 0 && !isDevMode && (
            <div className="py-16 text-center text-white/50">
              此地區暫無航線資料
            </div>
          )}
        </div>

        <SocialCta
          className="mb-8 mt-2"
          title="找到理想的航線了嗎？"
          description="聯繫旅遊規劃師蓋瑞 GARY，為您比較票價、規劃完整旅遊行程"
          logoUrl={siteLogoUrl}
          lineLabel="LINE 詢問機票"
        />
      </div>

      {/* ── Flight Route Editor Modal ─────────────────────────────── */}
      {editingRoute && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) closeEditor(); }}
        >
          <div className="w-full max-w-md overflow-y-auto rounded-[1.75rem] border border-white/10 bg-[rgba(18,18,28,0.97)] p-6 shadow-2xl" style={{ maxHeight: "90dvh" }}>
            <h2 className="mb-5 text-lg font-bold text-white">
              {editingRoute._isNew ? "新增航線" : "編輯航線"}
            </h2>

            {/* Image upload */}
            <div
              className="relative mb-4 h-40 cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-white/5"
              onClick={() => imageInputRef.current?.click()}
            >
              {(imagePreview || editingRoute.image_url) ? (
                <img
                  src={imagePreview || editingRoute.image_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-white/30">
                  <svg className="mr-2 h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M7.5 8.25h.008v.008H7.5V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                  </svg>
                  點擊上傳圖片
                </div>
              )}
              <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/50 to-transparent pb-3 opacity-0 transition hover:opacity-100">
                <span className="rounded-full bg-black/60 px-3 py-1 text-xs text-white">更換圖片</span>
              </div>
            </div>
            <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageSelect} />

            {/* Form fields */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {/* 地區 */}
                <div>
                  <label className="mb-1 block text-xs text-white/50">地區</label>
                  <select
                    value={editingRoute.region ?? "日本"}
                    onChange={(e) => updateField("region", e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-sky-500/50"
                  >
                    {REGIONS.filter((r) => r !== "全部").map((r) => (
                      <option key={r} value={r} className="bg-[#0f0f1a]">{r}</option>
                    ))}
                  </select>
                </div>

                {/* 直飛/轉機 */}
                <div>
                  <label className="mb-1 block text-xs text-white/50">飛行方式</label>
                  <div className="flex h-[38px] items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3">
                    <span className="text-sm text-white/70">轉機</span>
                    <button
                      type="button"
                      onClick={() => updateField("direct", !editingRoute.direct)}
                      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${editingRoute.direct ? "bg-sky-600" : "bg-white/20"}`}
                    >
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${editingRoute.direct ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button>
                    <span className="text-sm text-white/70">直飛</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* 出發地 */}
                <div>
                  <label className="mb-1 block text-xs text-white/50">出發地</label>
                  <input
                    type="text"
                    value={editingRoute.from_city ?? "台北"}
                    onChange={(e) => updateField("from_city", e.target.value)}
                    placeholder="台北"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:ring-1 focus:ring-sky-500/50"
                  />
                </div>

                {/* 目的地 */}
                <div>
                  <label className="mb-1 block text-xs text-white/50">目的地 *</label>
                  <input
                    type="text"
                    value={editingRoute.to_city ?? ""}
                    onChange={(e) => updateField("to_city", e.target.value)}
                    placeholder="東京"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:ring-1 focus:ring-sky-500/50"
                  />
                </div>
              </div>

              {/* 航空公司 */}
              <div>
                <label className="mb-1 block text-xs text-white/50">航空公司 *</label>
                <input
                  type="text"
                  value={editingRoute.airlines ?? ""}
                  onChange={(e) => updateField("airlines", e.target.value)}
                  placeholder="長榮 / 華航 / ANA"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:ring-1 focus:ring-sky-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* 飛行時間 */}
                <div>
                  <label className="mb-1 block text-xs text-white/50">飛行時間 *</label>
                  <input
                    type="text"
                    value={editingRoute.duration ?? ""}
                    onChange={(e) => updateField("duration", e.target.value)}
                    placeholder="約 3.5 小時"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:ring-1 focus:ring-sky-500/50"
                  />
                </div>

                {/* 參考票價 */}
                <div>
                  <label className="mb-1 block text-xs text-white/50">參考票價 *</label>
                  <input
                    type="text"
                    value={editingRoute.price_range ?? ""}
                    onChange={(e) => updateField("price_range", e.target.value)}
                    placeholder="NT$ 5,000 起"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:ring-1 focus:ring-sky-500/50"
                  />
                </div>
              </div>
            </div>

            {/* Custom fields */}
            <div className="mt-4 border-t border-white/10 pt-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-white/50">自定義欄位</span>
                <button
                  type="button"
                  onClick={addCustomField}
                  className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  新增欄位
                </button>
              </div>
              {customFields.length === 0 && (
                <p className="text-center text-[11px] text-white/25">點擊「新增欄位」加入自訂資訊</p>
              )}
              <div className="space-y-2">
                {customFields.map((f, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={f.key}
                      onChange={(e) => updateCustomField(i, "key", e.target.value)}
                      placeholder="欄位名稱"
                      className="w-28 shrink-0 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white placeholder-white/25 focus:outline-none focus:ring-1 focus:ring-sky-500/50"
                    />
                    <input
                      type="text"
                      value={f.value}
                      onChange={(e) => updateCustomField(i, "value", e.target.value)}
                      placeholder="內容"
                      className="flex-1 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white placeholder-white/25 focus:outline-none focus:ring-1 focus:ring-sky-500/50"
                    />
                    <button
                      type="button"
                      onClick={() => removeCustomField(i)}
                      className="shrink-0 rounded-xl bg-white/5 px-2 text-white/40 hover:bg-red-500/20 hover:text-red-400"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Error */}
            {saveError && (
              <p className="mt-3 rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-400">{saveError}</p>
            )}

            {/* Action buttons */}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 rounded-xl bg-sky-600 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:opacity-50"
              >
                {isSaving ? "儲存中..." : "儲存"}
              </button>
              {!editingRoute._isNew && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isSaving}
                  className="rounded-xl bg-red-600/50 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600/80 disabled:opacity-50"
                >
                  刪除
                </button>
              )}
              <button
                type="button"
                onClick={closeEditor}
                disabled={isSaving}
                className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15 disabled:opacity-50"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      <FloatingContact />
    </main>
  );
}
