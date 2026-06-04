"use client";

import { Fragment, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ScrapeSettings from "../../components/ScrapeSettings";
import ScrapeProgress from "../../components/ScrapeProgress";
import ScrapeChanges from "../../components/ScrapeChanges";

// ── Types ────────────────────────────────────────────────
interface StatsOverview { total_views: number; total_downloads: number; total_shares: number; total_inquiries: number }
interface StatsTrend    { date: string; views: number; downloads: number; shares: number }
interface StatsTrip     { trip_id: string; trip_title: string; views: number; downloads: number; shares: number; dl_line: number; dl_fb: number; dl_ig: number; share_line: number; share_fb: number; share_ig: number }
interface StatsPlatform { line: number; facebook: number; instagram: number }
interface StatsFlight   { flight_id: string; flight_route: string; views: number; inquiries: number; line: number; fb: number; ig: number }
interface StatsRecent   { created_at: string; event_type: string; platform: string | null; trip_title: string | null; flight_route: string | null }
interface Stats { overview: StatsOverview; trend: StatsTrend[]; trips: StatsTrip[]; platform: StatsPlatform; flights: StatsFlight[]; recent: StatsRecent[] }
interface CleanupResult {
  dry_run: boolean;
  max_delete: number;
  summary: {
    scanned_files: number;
    referenced_files: number;
    orphan_files: number;
    deleted_files: number;
  };
  orphan_paths: string[];
  deleted_paths: string[];
}
interface EndpointCheck {
  name: string;
  desc: string;
  url: string;
  status: "ok" | "error";
  statusCode?: number;
  latency_ms?: number;
  error?: string;
}
interface EnvCheck {
  name: string;
  ok: boolean;
  impact: string;
  fix: string;
}
interface DataCheck {
  name: string;
  ok: boolean;
  count?: number;
  items?: string[];
  impact: string;
  fix: string;
}
interface PageCheck {
  name: string;
  desc: string;
  url: string;
  status: "ok" | "error";
  statusCode?: number;
  latency_ms?: number;
  error?: string;
}
interface HealthResult {
  db: "connected" | "error";
  db_latency_ms: number;
  endpoints: EndpointCheck[];
  pages: PageCheck[];
  env_checks: EnvCheck[];
  data_checks: DataCheck[];
  checked_at: string;
}
interface ContactFormSubmission {
  id: string;
  name: string;
  phone: string | null;
  line_id: string | null;
  email: string | null;
  message: string | null;
  created_at: string;
}

// ── Helpers ──────────────────────────────────────────────
function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "剛剛";
  if (m < 60) return `${m}分鐘前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}小時前`;
  return `${Math.floor(h / 24)}天前`;
}

function eventLabel(event_type: string, platform: string | null) {
  const p = platform ? ` ${platform}` : "";
  const map: Record<string, string> = {
    trip_view:      "瀏覽行程",
    trip_download:  `${platform ?? ""}下載`,
    trip_share:     `${platform ?? ""}分享`,
    trip_inquiry:   `${platform ?? ""}詢問`,
    flight_view:    "瀏覽機票",
    flight_inquiry: `${platform ?? ""}詢問`,
  };
  return map[event_type] ?? event_type + p;
}

// ── Chart Components ─────────────────────────────────────
function LineChart({ data }: { data: StatsTrend[] }) {
  const maxVal = Math.max(...data.map(d => d.views), 1);
  const W = 600, H = 160, pad = { t: 16, r: 16, b: 32, l: 40 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const xStep = innerW / Math.max(data.length - 1, 1);
  const yScale = (v: number) => innerH - (v / maxVal) * innerH;
  const path = (key: keyof StatsTrend) =>
    data.map((d, i) => `${i === 0 ? "M" : "L"}${pad.l + i * xStep},${pad.t + yScale(d[key] as number)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 160 }}>
      {[0, 0.25, 0.5, 0.75, 1].map(f => (
        <line key={f} x1={pad.l} x2={W - pad.r} y1={pad.t + f * innerH} y2={pad.t + f * innerH} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
      ))}
      {[0, 0.5, 1].map(f => (
        <text key={f} x={pad.l - 6} y={pad.t + f * innerH + 4} textAnchor="end" fontSize={10} fill="rgba(255,255,255,0.35)">{Math.round(maxVal * (1 - f))}</text>
      ))}
      {data.map((d, i) => (
        <text key={i} x={pad.l + i * xStep} y={H - 6} textAnchor="middle" fontSize={10} fill="rgba(255,255,255,0.35)">{d.date}</text>
      ))}
      <path d={path("views")}     fill="none" stroke="#38bdf8" strokeWidth={2} strokeLinejoin="round" />
      <path d={path("downloads")} fill="none" stroke="#34d399" strokeWidth={2} strokeLinejoin="round" />
      <path d={path("shares")}    fill="none" stroke="#a78bfa" strokeWidth={2} strokeLinejoin="round" />
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={pad.l + i * xStep} cy={pad.t + yScale(d.views)}     r={3} fill="#38bdf8" />
          <circle cx={pad.l + i * xStep} cy={pad.t + yScale(d.downloads)} r={3} fill="#34d399" />
          <circle cx={pad.l + i * xStep} cy={pad.t + yScale(d.shares)}    r={3} fill="#a78bfa" />
        </g>
      ))}
    </svg>
  );
}

function PieChart({ data }: { data: StatsPlatform }) {
  const total = data.line + data.facebook + data.instagram;
  const slices = [
    { label: "LINE",      value: data.line,      color: "#06C755" },
    { label: "Facebook",  value: data.facebook,  color: "#1877F2" },
    { label: "Instagram", value: data.instagram, color: "#E4405F" },
  ];
  const cx = 80, cy = 80, r = 64, gap = 2;
  let cumulative = 0;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const polar = (angle: number) => ({ x: cx + r * Math.cos(toRad(angle - 90)), y: cy + r * Math.sin(toRad(angle - 90)) });
  const arcs = total === 0 ? [] : slices.map(s => {
    const sa = (cumulative / total) * 360 + gap / 2;
    cumulative += s.value;
    const ea = (cumulative / total) * 360 - gap / 2;
    const st = polar(sa), en = polar(ea);
    return { ...s, path: `M ${cx} ${cy} L ${st.x} ${st.y} A ${r} ${r} 0 ${ea - sa > 180 ? 1 : 0} 1 ${en.x} ${en.y} Z` };
  });
  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox="0 0 160 160" className="w-28 shrink-0">
        {arcs.map(a => <path key={a.label} d={a.path} fill={a.color} opacity={0.85} />)}
        {total === 0 && <circle cx={cx} cy={cy} r={r} fill="rgba(255,255,255,0.05)" />}
        <circle cx={cx} cy={cy} r={32} fill="rgba(20,20,30,0.9)" />
        <text x={cx} y={cy - 6}  textAnchor="middle" fontSize={11} fill="rgba(255,255,255,0.6)">總互動</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize={15} fontWeight="bold" fill="white">{total}</text>
      </svg>
      <div className="w-full space-y-2">
        {slices.map(s => (
          <div key={s.label} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
            <span className="flex-1 text-white/70">{s.label}</span>
            <span className="font-semibold text-white">{s.value}</span>
            <span className="w-8 text-right text-white/40">{total > 0 ? Math.round((s.value / total) * 100) : 0}%</span>
          </div>
        ))}
        <p className="pt-1 text-[11px] text-white/30">下載 + 分享 + 詢問的平台分佈</p>
      </div>
    </div>
  );
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-5 shrink-0 text-center text-xs text-white/40">{label}</span>
      <div className="flex-1 overflow-hidden rounded-full bg-white/5">
        <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="w-8 text-right text-xs font-semibold text-white">{value}</span>
    </div>
  );
}

function PlatformBars({ line, fb, ig, label }: { line: number; fb: number; ig: number; label: string }) {
  const max = Math.max(line, fb, ig, 1);
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold text-white/50">{label}</p>
      <div className="space-y-1.5">
        {[{ name: "LINE", value: line, color: "#06C755" }, { name: "FB", value: fb, color: "#1877F2" }, { name: "IG", value: ig, color: "#E4405F" }].map(({ name, value, color }) => (
          <div key={name} className="flex items-center gap-2">
            <span className="w-7 shrink-0 text-[10px] font-semibold" style={{ color }}>{name}</span>
            <div className="flex-1 overflow-hidden rounded-full bg-white/5">
              <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${(value / max) * 100}%`, background: color }} />
            </div>
            <span className="w-6 shrink-0 text-right text-xs font-semibold text-white">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const PLATFORM_BADGE: Record<string, string> = {
  LINE: "bg-[#06C755]/20 text-[#06C755]",
  FB:   "bg-[#1877F2]/20 text-[#1877F2]",
  IG:   "bg-[#E4405F]/20 text-[#E4405F]",
};

// ── Main Page ────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [checking,       setChecking]       = useState(true);
  const [activeTab,      setActiveTab]      = useState<"overview" | "trips" | "flights" | "events" | "health" | "forms" | "scrape">("overview");
  const [stats,          setStats]          = useState<Stats | null>(null);
  const [statsLoading,   setStatsLoading]   = useState(false);
  const [selectedTrip,   setSelectedTrip]   = useState<string | null>(null);
  const [selectedFlight, setSelectedFlight] = useState<string | null>(null);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupError, setCleanupError] = useState<string | null>(null);
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null);
  const [healthLoading,  setHealthLoading]  = useState(false);
  const [healthResult,   setHealthResult]   = useState<HealthResult | null>(null);
  const [forms, setForms] = useState<ContactFormSubmission[]>([]);
  const [formsLoading, setFormsLoading] = useState(false);
  const [deletingFormId, setDeletingFormId] = useState<string | null>(null);
  const [scrapePendingCount, setScrapePendingCount] = useState(0);
  const [scrapeRefreshKey, setScrapeRefreshKey] = useState(0);
  const [scrapeIsRunning, setScrapeIsRunning] = useState(false);

  // 讀取 query param ?tab=scrape
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "scrape") setActiveTab("scrape");
  }, [searchParams]);

  // 載入 pending 變更數量
  const fetchPendingCount = useCallback(async () => {
    try {
      const res = await fetch("/api/scrape/changes?status=pending&count_only=1", {
        cache: "no-store",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setScrapePendingCount(typeof data.count === "number" ? data.count : Array.isArray(data) ? data.length : 0);
      }
    } catch {
      // 靜默失敗
    }
  }, []);

  useEffect(() => {
    fetchPendingCount();
  }, [fetchPendingCount]);

  async function runOrphanCleanup(dryRun: boolean) {
    setCleanupLoading(true);
    setCleanupError(null);

    try {
      const res = await fetch("/api/admin/cleanup-orphan-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dry_run: dryRun, max_delete: 200 }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "清理失敗");
      }

      setCleanupResult(data as CleanupResult);
    } catch (error) {
      setCleanupError(error instanceof Error ? error.message : "清理失敗");
    } finally {
      setCleanupLoading(false);
    }
  }

  async function checkHealth() {
    setHealthLoading(true);

    // 1. 先完成 health API（含 DB 查詢），避免與端點檢查搶資源
    let healthData: any = { db: "error", latency_ms: 0, env_checks: [], data_checks: [] };
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      healthData = await res.json();
    } catch { /* keep defaults */ }

    // 2. API 端點依序檢查（準確延遲量測）
    const eps = [
      { name: "地區分類", desc: "首頁上方的地區切換（日本、歐洲等）", url: "/api/regions" },
      { name: "目的地列表", desc: "各地區下的旅遊目的地資料", url: "/api/destinations" },
      { name: "熱門行程", desc: "首頁推薦行程列表", url: "/api/popular-trips" },
      { name: "行程搜尋", desc: "搜尋列關鍵字查詢功能", url: "/api/search?q=test" },
    ];
    const endpoints: EndpointCheck[] = [];
    for (const ep of eps) {
      try {
        const start = performance.now();
        const res = await fetch(ep.url, { cache: "no-store" });
        endpoints.push({ name: ep.name, desc: ep.desc, url: ep.url, status: res.ok ? "ok" : "error", statusCode: res.status, latency_ms: Math.round(performance.now() - start) });
      } catch {
        endpoints.push({ name: ep.name, desc: ep.desc, url: ep.url, status: "error", error: "無法連線" });
      }
    }

    // 3. 頁面檢查（並行，不影響端點量測）
    const pageList = [
      { name: "首頁", desc: "網站首頁（目的地總覽）", url: "/" },
      { name: "機票頁", desc: "機票資訊頁面", url: "/flights" },
      { name: "文件服務", desc: "代辦文件服務頁面", url: "/document-services" },
      { name: "迷你轉機票", desc: "迷你轉機票頁面", url: "/mini-transit-tickets" },
    ];
    const pages: PageCheck[] = await Promise.all(
      pageList.map(async (p): Promise<PageCheck> => {
        try {
          const start = performance.now();
          const res = await fetch(p.url, { cache: "no-store" });
          return { name: p.name, desc: p.desc, url: p.url, status: res.ok ? "ok" : "error", statusCode: res.status, latency_ms: Math.round(performance.now() - start) };
        } catch {
          return { name: p.name, desc: p.desc, url: p.url, status: "error", error: "無法開啟" };
        }
      })
    );

    setHealthResult({
      db: healthData.db === "connected" ? "connected" : "error",
      db_latency_ms: healthData.latency_ms ?? 0,
      endpoints,
      pages,
      env_checks: healthData.env_checks || [],
      data_checks: healthData.data_checks || [],
      checked_at: new Date().toISOString(),
    });
    setHealthLoading(false);
  }

  async function loadForms() {
    setFormsLoading(true);

    try {
      const res = await fetch("/api/contact-forms", { cache: "no-store" });
      const data: unknown = await res.json();

      if (!res.ok) {
        throw new Error(
          typeof data === "object" && data && "error" in data && typeof data.error === "string"
            ? data.error
            : "讀取諮詢表單失敗"
        );
      }

      setForms(Array.isArray(data) ? (data as ContactFormSubmission[]) : []);
    } catch {
      setForms([]);
    } finally {
      setFormsLoading(false);
    }
  }

  async function deleteForm(id: string) {
    const targetForm = forms.find((form) => form.id === id);
    if (!targetForm) return;

    const confirmed = window.confirm(`確定要刪除 ${targetForm.name} 的諮詢表單嗎？`);
    if (!confirmed) return;

    setDeletingFormId(id);

    try {
      const res = await fetch("/api/contact-forms", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        const data: unknown = await res.json();
        throw new Error(
          typeof data === "object" && data && "error" in data && typeof data.error === "string"
            ? data.error
            : "刪除失敗"
        );
      }

      setForms((prev) => prev.filter((form) => form.id !== id));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "刪除失敗");
    } finally {
      setDeletingFormId(null);
    }
  }

  useEffect(() => {
    if (activeTab === "health" && !healthResult && !healthLoading) {
      checkHealth();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "forms" && !formsLoading && forms.length === 0) {
      loadForms();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    fetch("/api/dev-auth/status", { cache: "no-store" })
      .then(r => r.json())
      .then(async (d: { authorized?: boolean }) => {
        if (!d.authorized) { router.replace("/"); return; }
        setStatsLoading(true);
        const res = await fetch("/api/admin/stats", { cache: "no-store" });
        if (res.ok) setStats(await res.json());
      })
      .catch(() => router.replace("/"))
      .finally(() => { setChecking(false); setStatsLoading(false); });
  }, [router]);

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0f1923]">
        <div className="flex items-center gap-2 text-white/50">
          <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          驗證中...
        </div>
      </main>
    );
  }

  const ov       = stats?.overview ?? { total_views: 0, total_downloads: 0, total_shares: 0, total_inquiries: 0 };
  const trend    = stats?.trend    ?? Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return { date: `${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`, views: 0, downloads: 0, shares: 0 }; });
  const trips    = stats?.trips    ?? [];
  const platform = stats?.platform ?? { line: 0, facebook: 0, instagram: 0 };
  const flights  = stats?.flights  ?? [];
  const recent   = stats?.recent   ?? [];

  const overviewCards = [
    { label: "總瀏覽次數", value: ov.total_views,     icon: "👁",  color: "#38bdf8" },
    { label: "PDF 下載次數", value: ov.total_downloads, icon: "📥", color: "#34d399" },
    { label: "分享好友次數", value: ov.total_shares,    icon: "🔗", color: "#a78bfa" },
    { label: "詢問報價次數", value: ov.total_inquiries, icon: "💬", color: "#fbbf24" },
  ];

  const maxViews       = Math.max(...trips.map(t => t.views), 1);
  const maxFlightViews = Math.max(...flights.map(f => f.views), 1);

  return (
    <main className="min-h-screen bg-[#0f1923] text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-white/10 bg-[rgba(10,10,20,0.85)] backdrop-blur-[12px]">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <button onClick={() => { const from = searchParams.get('from'); from ? router.push(decodeURIComponent(from)) : router.back(); }} className="rounded-full p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <a href="/" className="shrink-0" title="回首頁">
            <img src="/travel-logo.svg" alt="旅行沒有終點" className="h-8 w-auto opacity-80 transition hover:opacity-100" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </a>
          <div>
            <h1 className="text-sm font-bold text-white sm:text-base">蓋瑞旅遊 後台數據</h1>
            <p className="text-[10px] text-white/40">Gary Travel · Admin Dashboard</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <a href="https://analytics.google.com/analytics/web/#/a197676302p273301846/reports/intelligenthome" target="_blank" rel="noopener noreferrer" className="rounded-full bg-blue-500/20 px-2.5 py-1 text-[10px] font-semibold text-blue-400 transition hover:bg-blue-500/30">📈 GA4 流量</a>
            <span className="rounded-full bg-amber-500/20 px-2.5 py-1 text-[10px] font-semibold text-amber-400">開發者模式</span>
            {statsLoading && <span className="text-[10px] text-white/30">載入中...</span>}
            {!statsLoading && stats && <button onClick={async () => { setStatsLoading(true); const r = await fetch("/api/admin/stats", { cache: "no-store" }); if (r.ok) setStats(await r.json()); setStatsLoading(false); }} className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] text-white/40 hover:text-white/70">↻ 重新整理</button>}
          </div>
        </div>
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-6">
          {([["overview", "📊 總覽"], ["trips", "🗺 行程統計"], ["flights", "✈️ 機票統計"], ["events", "📋 最新動態"], ["health", "🏥 系統健康"], ["forms", "📬 諮詢表單"], ["scrape", "🔄 行程抓取"]] as const).map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`relative shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${activeTab === tab ? "bg-sky-600 text-white" : "text-white/50 hover:text-white/80"}`}>
              {label}
              {tab === "scrape" && scrapePendingCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                  {scrapePendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">

        {/* ── Overview Tab ── */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-[rgba(20,20,30,0.55)] p-4 backdrop-blur-[12px]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white">圖片殘留清理</h2>
                  <p className="mt-1 text-xs text-white/50">先預覽 orphan 檔案，再決定是否正式刪除。正式刪除預設安全上限為 200 筆。</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => runOrphanCleanup(true)}
                    disabled={cleanupLoading}
                    className="rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-200 transition hover:bg-sky-500/20 disabled:opacity-50"
                  >
                    {cleanupLoading ? "處理中..." : "先預覽 orphan"}
                  </button>
                  <button
                    onClick={() => runOrphanCleanup(false)}
                    disabled={cleanupLoading}
                    className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/20 disabled:opacity-50"
                  >
                    正式刪除 orphan
                  </button>
                </div>
              </div>

              {cleanupError && (
                <div className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  {cleanupError}
                </div>
              )}

              {cleanupResult && (
                <div className="mt-4 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-4">
                    <div className="rounded-xl bg-white/5 p-3">
                      <p className="text-[10px] text-white/40">掃描檔案</p>
                      <p className="mt-1 text-lg font-bold text-white">{cleanupResult.summary.scanned_files}</p>
                    </div>
                    <div className="rounded-xl bg-white/5 p-3">
                      <p className="text-[10px] text-white/40">有效參照</p>
                      <p className="mt-1 text-lg font-bold text-white">{cleanupResult.summary.referenced_files}</p>
                    </div>
                    <div className="rounded-xl bg-white/5 p-3">
                      <p className="text-[10px] text-white/40">orphan 檔案</p>
                      <p className="mt-1 text-lg font-bold text-amber-300">{cleanupResult.summary.orphan_files}</p>
                    </div>
                    <div className="rounded-xl bg-white/5 p-3">
                      <p className="text-[10px] text-white/40">已刪除</p>
                      <p className="mt-1 text-lg font-bold text-emerald-300">{cleanupResult.summary.deleted_files}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <p className="text-[11px] text-white/50">
                      {cleanupResult.dry_run ? "目前為預覽模式，尚未刪除任何檔案。" : "已執行正式刪除。"}
                    </p>
                    {(cleanupResult.orphan_paths.length > 0 || cleanupResult.deleted_paths.length > 0) && (
                      <div className="mt-3 max-h-48 overflow-y-auto rounded-lg bg-black/20 p-2 text-[11px] text-white/70">
                        {(cleanupResult.dry_run ? cleanupResult.orphan_paths : cleanupResult.deleted_paths).map((path) => (
                          <div key={path} className="border-b border-white/5 px-1.5 py-1 last:border-b-0">
                            {path}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {overviewCards.map(item => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-[rgba(20,20,30,0.55)] p-4 backdrop-blur-[12px]">
                  <div className="mb-2 text-xl">{item.icon}</div>
                  <p className="text-2xl font-bold text-white sm:text-3xl">{item.value.toLocaleString()}</p>
                  <p className="mt-0.5 text-xs text-white/50">{item.label}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
              <div className="rounded-2xl border border-white/10 bg-[rgba(20,20,30,0.55)] p-4 backdrop-blur-[12px]">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white">最近 7 天趨勢</h2>
                  <div className="flex items-center gap-3 text-[10px] text-white/50">
                    <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-4 rounded-full bg-sky-400" />瀏覽</span>
                    <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-4 rounded-full bg-emerald-400" />下載</span>
                    <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-4 rounded-full bg-violet-400" />分享</span>
                  </div>
                </div>
                <LineChart data={trend} />
              </div>
              <div className="rounded-2xl border border-white/10 bg-[rgba(20,20,30,0.55)] p-4 backdrop-blur-[12px]">
                <h2 className="mb-3 text-sm font-bold text-white">社群平台分佈</h2>
                <PieChart data={platform} />
              </div>
            </div>

            {trips.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-[rgba(20,20,30,0.55)] p-4 backdrop-blur-[12px]">
                <h2 className="mb-4 text-sm font-bold text-white">熱門行程 Top 5（瀏覽次數）</h2>
                <div className="space-y-3">
                  {trips.slice(0, 5).map((t, i) => (
                    <div key={t.trip_id} className="flex items-center gap-3">
                      <span className="w-4 shrink-0 text-center text-xs text-white/40">{i + 1}</span>
                      <span className="w-0 min-w-0 flex-1 truncate text-[11px] text-white/60 sm:text-xs">{t.trip_title}</span>
                      <div className="hidden w-48 sm:block lg:w-72 xl:w-96">
                        <div className="h-2 overflow-hidden rounded-full bg-white/5">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.round((t.views / maxViews) * 100)}%`, background: i === 0 ? "#38bdf8" : i === 1 ? "#34d399" : "rgba(255,255,255,0.3)" }} />
                        </div>
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-sky-400">{t.views} 瀏覽</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {trips.length === 0 && !statsLoading && (
              <div className="rounded-2xl border border-white/10 bg-[rgba(20,20,30,0.55)] p-8 text-center backdrop-blur-[12px]">
                <p className="text-sm text-white/40">尚無瀏覽紀錄，用戶開始瀏覽後將自動顯示數據</p>
              </div>
            )}
          </div>
        )}

        {/* ── Trips Tab ── */}
        {activeTab === "trips" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-[rgba(20,20,30,0.55)] backdrop-blur-[12px]">
              <div className="border-b border-white/10 px-4 py-3 flex items-center justify-between">
                <h2 className="text-sm font-bold text-white">行程完整統計</h2>
                <span className="text-[10px] text-white/30">點擊行程查看平台明細</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px]">
                  <thead>
                    <tr className="border-b border-white/5 text-[11px] text-white/40">
                      <th className="px-4 py-2.5 text-left">行程名稱</th>
                      <th className="px-4 py-2.5 text-center">👁 瀏覽</th>
                      <th className="px-4 py-2.5 text-center">📥 下載</th>
                      <th className="px-4 py-2.5 text-center">🔗 分享</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trips.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-white/30">尚無資料</td></tr>
                    )}
                    {trips.map((t, i) => {
                      const isOpen = selectedTrip === t.trip_id;
                      return (
                        <Fragment key={t.trip_id}>
                          <tr onClick={() => setSelectedTrip(isOpen ? null : t.trip_id)}
                            className={`cursor-pointer border-b border-white/5 text-sm transition hover:bg-white/5 ${i === 0 ? "bg-sky-500/5" : ""} ${isOpen ? "bg-white/5" : ""}`}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {i === 0 && <span className="rounded-full bg-sky-500/20 px-1.5 py-0.5 text-[9px] font-bold text-sky-400">TOP</span>}
                                <span className="text-white/90">{t.trip_title}</span>
                                <svg className={`ml-auto h-3.5 w-3.5 shrink-0 text-white/30 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center font-semibold text-sky-300">{t.views}</td>
                            <td className="px-4 py-3 text-center font-semibold text-emerald-300">{t.downloads}</td>
                            <td className="px-4 py-3 text-center font-semibold text-violet-300">{t.shares}</td>
                          </tr>
                          {isOpen && (
                            <tr className="border-b border-white/5 bg-white/[0.03]">
                              <td colSpan={4} className="px-4 py-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                  <PlatformBars line={t.dl_line} fb={t.dl_fb} ig={t.dl_ig} label="📥 下載來源" />
                                  <PlatformBars line={t.share_line} fb={t.share_fb} ig={t.share_ig} label="🔗 分享來源" />
                                </div>
                                <div className="mt-3 flex gap-4 text-[11px] text-white/30">
                                  <span>下載合計：<span className="text-emerald-400">{t.dl_line + t.dl_fb + t.dl_ig}</span></span>
                                  <span>分享合計：<span className="text-violet-400">{t.share_line + t.share_fb + t.share_ig}</span></span>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Download totals */}
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: "LINE 下載", value: trips.reduce((a, t) => a + t.dl_line, 0), color: "#06C755" },
                { label: "FB 下載",   value: trips.reduce((a, t) => a + t.dl_fb,   0), color: "#1877F2" },
                { label: "IG 下載",   value: trips.reduce((a, t) => a + t.dl_ig,   0), color: "#E4405F" },
              ].map(item => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-[rgba(20,20,30,0.55)] p-4 text-center backdrop-blur-[12px]">
                  <p className="text-3xl font-bold" style={{ color: item.color }}>{item.value}</p>
                  <p className="mt-1 text-xs text-white/50">{item.label}</p>
                </div>
              ))}
            </div>

            {/* Share stats */}
            {trips.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-[rgba(20,20,30,0.55)] p-4 backdrop-blur-[12px]">
                <h2 className="mb-4 text-sm font-bold text-white">🔗 分享統計（各行程平台明細）</h2>
                <div className="space-y-5">
                  {trips.map(t => {
                    const total = t.share_line + t.share_fb + t.share_ig;
                    return (
                      <div key={t.trip_id}>
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-medium text-white/80">{t.trip_title}</span>
                          <span className="text-[11px] text-white/40">共 {total} 次</span>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-3">
                          {[{ name: "LINE", value: t.share_line, color: "#06C755" }, { name: "FB", value: t.share_fb, color: "#1877F2" }, { name: "IG", value: t.share_ig, color: "#E4405F" }].map(({ name, value, color }) => (
                            <div key={name} className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2">
                              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
                              <span className="text-[11px] text-white/60">{name}</span>
                              <span className="ml-auto text-xs font-semibold" style={{ color }}>{value}</span>
                              <span className="text-[10px] text-white/30">{total > 0 ? Math.round((value / total) * 100) : 0}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-3">
                  {[{ label: "LINE 分享", value: trips.reduce((a, t) => a + t.share_line, 0), color: "#06C755" }, { label: "FB 分享", value: trips.reduce((a, t) => a + t.share_fb, 0), color: "#1877F2" }, { label: "IG 分享", value: trips.reduce((a, t) => a + t.share_ig, 0), color: "#E4405F" }].map(item => (
                    <div key={item.label} className="rounded-xl bg-white/5 p-3 text-center">
                      <p className="text-2xl font-bold" style={{ color: item.color }}>{item.value}</p>
                      <p className="mt-0.5 text-[11px] text-white/40">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Flights Tab ── */}
        {activeTab === "flights" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-[rgba(20,20,30,0.55)] backdrop-blur-[12px]">
              <div className="border-b border-white/10 px-4 py-3 flex items-center justify-between">
                <h2 className="text-sm font-bold text-white">機票航線瀏覽統計</h2>
                <span className="text-[10px] text-white/30">點擊航線查看詢問明細</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px]">
                  <thead>
                    <tr className="border-b border-white/5 text-[11px] text-white/40">
                      <th className="px-4 py-2.5 text-left">航線</th>
                      <th className="px-4 py-2.5 text-center">👁 瀏覽次數</th>
                      <th className="px-4 py-2.5 text-center">💬 詢問次數</th>
                      <th className="px-4 py-2.5 text-center">轉換率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flights.length === 0 && (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-white/30">尚無資料</td></tr>
                    )}
                    {flights.map((f, i) => {
                      const isOpen = selectedFlight === f.flight_id;
                      return (
                        <Fragment key={f.flight_id}>
                          <tr onClick={() => setSelectedFlight(isOpen ? null : f.flight_id)}
                            className={`cursor-pointer border-b border-white/5 text-sm transition hover:bg-white/5 ${isOpen ? "bg-white/5" : ""}`}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {i === 0 && <span className="rounded-full bg-sky-500/20 px-1.5 py-0.5 text-[9px] font-bold text-sky-400">TOP</span>}
                                <span className="text-white/90">{f.flight_route}</span>
                                <svg className={`ml-auto h-3.5 w-3.5 shrink-0 text-white/30 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center font-semibold text-sky-300">{f.views}</td>
                            <td className="px-4 py-3 text-center font-semibold text-amber-300">{f.inquiries}</td>
                            <td className="px-4 py-3 text-center text-white/60">{f.views > 0 ? Math.round((f.inquiries / f.views) * 100) : 0}%</td>
                          </tr>
                          {isOpen && (
                            <tr className="border-b border-white/5 bg-white/[0.03]">
                              <td colSpan={4} className="px-4 py-4">
                                <PlatformBars line={f.line} fb={f.fb} ig={f.ig} label="💬 詢問來源（LINE / FB / IG）" />
                                <p className="mt-2 text-[11px] text-white/30">詢問合計：<span className="text-amber-400">{f.line + f.fb + f.ig}</span></p>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {flights.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-[rgba(20,20,30,0.55)] p-4 backdrop-blur-[12px]">
                <h2 className="mb-4 text-sm font-bold text-white">航線瀏覽排行</h2>
                <div className="space-y-3">
                  {flights.map(f => (
                    <div key={f.flight_id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/70">{f.flight_route}</span>
                        <span className="font-semibold text-sky-300">{f.views}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/5">
                        <div className="h-full rounded-full bg-sky-500/60 transition-all duration-500" style={{ width: `${(f.views / maxFlightViews) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Events Tab ── */}
        {activeTab === "events" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-[rgba(20,20,30,0.55)] backdrop-blur-[12px]">
              <div className="border-b border-white/10 px-4 py-3 flex items-center justify-between">
                <h2 className="text-sm font-bold text-white">最新動態紀錄</h2>
                <span className="text-[10px] text-white/30">即時更新</span>
              </div>
              {recent.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-white/30">尚無動態紀錄</p>
              ) : (
                <div className="divide-y divide-white/5">
                  {recent.map((e, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3 transition hover:bg-white/5">
                      <span className="w-14 shrink-0 text-[10px] text-white/30">{relativeTime(e.created_at)}</span>
                      <span className="flex-1 text-sm text-white/80">{e.trip_title ?? e.flight_route ?? "—"}</span>
                      <span className="text-xs text-white/50">{eventLabel(e.event_type, e.platform)}</span>
                      {e.platform && (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${PLATFORM_BADGE[e.platform] ?? "bg-white/10 text-white/50"}`}>{e.platform}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Health Tab ── */}
        {activeTab === "health" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white">系統健康狀態</h2>
                {healthResult && (
                  <p className="mt-0.5 text-[11px] text-white/40">最後檢查：{new Date(healthResult.checked_at).toLocaleString("zh-TW")}</p>
                )}
              </div>
              <button
                onClick={checkHealth}
                disabled={healthLoading}
                className="rounded-full bg-sky-600/20 px-3 py-1.5 text-xs font-semibold text-sky-400 transition hover:bg-sky-600/30 disabled:opacity-50"
              >
                {healthLoading ? "檢查中..." : "↻ 重新檢查"}
              </button>
            </div>

            {healthLoading && !healthResult && (
              <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-[rgba(20,20,30,0.55)] p-12 backdrop-blur-[12px]">
                <div className="flex items-center gap-2 text-white/40">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span className="text-sm">系統健康檢查中...</span>
                </div>
              </div>
            )}

            {!healthLoading && !healthResult && (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-[rgba(20,20,30,0.55)] p-12 text-center backdrop-blur-[12px]">
                <p className="text-sm text-white/40">點擊「↻ 重新檢查」開始健康檢查</p>
                <p className="mt-1 text-[11px] text-white/25">將依序檢查資料庫連線與各 API 端點狀態</p>
              </div>
            )}

            {healthResult && (
              <>
                {/* 整體狀態摘要 */}
                {(() => {
                  const apiOk = healthResult.endpoints.filter(e => e.status === "ok").length;
                  const apiTotal = healthResult.endpoints.length;
                  const pageOk = healthResult.pages.filter(p => p.status === "ok").length;
                  const pageTotal = healthResult.pages.length;
                  const envIssues = healthResult.env_checks.filter(e => !e.ok).length;
                  const dataIssues = healthResult.data_checks.filter(d => !d.ok).length;
                  const totalIssues = (healthResult.db !== "connected" ? 1 : 0) + (apiTotal - apiOk) + (pageTotal - pageOk) + envIssues + dataIssues;
                  const isError = healthResult.db !== "connected" || apiOk < apiTotal || pageOk < pageTotal;
                  const isWarning = !isError && (envIssues > 0 || dataIssues > 0);
                  const allOk = !isError && !isWarning;
                  return (
                    <div className={`rounded-2xl border p-4 ${allOk ? "border-emerald-500/20 bg-emerald-500/5" : isError ? "border-red-500/20 bg-red-500/5" : "border-amber-500/20 bg-amber-500/5"}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{allOk ? "✅" : isError ? "❌" : "⚠️"}</span>
                        <div>
                          <p className={`text-sm font-bold ${allOk ? "text-emerald-400" : isError ? "text-red-400" : "text-amber-400"}`}>
                            {allOk ? "系統一切正常，網站運作中" : isError ? `有 ${totalIssues} 個問題需要注意` : `有 ${totalIssues} 個警告，建議處理`}
                          </p>
                          <p className="text-[11px] text-white/40">
                            {allOk ? "所有設定、功能、頁面、資料都正常" : "往下查看詳細問題說明與處理方式"}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 資料庫狀態 */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className={`rounded-2xl border p-5 backdrop-blur-[12px] ${healthResult.db === "connected" ? "border-emerald-500/30 bg-emerald-500/10" : "border-red-500/30 bg-red-500/10"}`}>
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${healthResult.db === "connected" ? "bg-emerald-500/20" : "bg-red-500/20"}`}>
                        <span className={`h-3 w-3 rounded-full ${healthResult.db === "connected" ? "animate-pulse bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-red-400 shadow-[0_0_8px_#f87171]"}`} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white/70">資料庫連線狀態</p>
                        <p className="mt-0.5 text-[11px] text-white/40">行程、目的地等所有資料的儲存位置</p>
                        <p className={`mt-1 text-base font-bold ${healthResult.db === "connected" ? "text-emerald-400" : "text-red-400"}`}>
                          {healthResult.db === "connected" ? "✓ 連線正常" : "✗ 連線失敗"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[rgba(20,20,30,0.55)] p-5 backdrop-blur-[12px]">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-500/20">
                        <svg className="h-5 w-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white/70">資料庫反應速度</p>
                        <p className="mt-0.5 text-[11px] text-white/40">從資料庫取得資料需要多久（越低越好）</p>
                        <p className={`mt-1 text-base font-bold ${healthResult.db_latency_ms < 200 ? "text-emerald-400" : healthResult.db_latency_ms < 500 ? "text-amber-400" : "text-red-400"}`}>
                          {healthResult.db_latency_ms} ms
                          <span className="ml-2 text-[11px] font-normal opacity-60">
                            {healthResult.db_latency_ms < 200 ? "（快速）" : healthResult.db_latency_ms < 500 ? "（一般）" : "（較慢）"}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 環境設定檢查 */}
                {healthResult.env_checks.length > 0 && (
                  <div className="rounded-2xl border border-white/10 bg-[rgba(20,20,30,0.55)] backdrop-blur-[12px]">
                    <div className="border-b border-white/10 px-4 py-3">
                      <h2 className="text-sm font-bold text-white">環境設定檢查</h2>
                      <p className="mt-0.5 text-[11px] text-white/40">確認網站必要的設定是否齊全</p>
                    </div>
                    <div className="divide-y divide-white/5">
                      {healthResult.env_checks.map((check, i) => (
                        <div key={i} className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${check.ok ? "bg-emerald-400" : "bg-red-400"}`} />
                            <span className="flex-1 text-sm text-white/90">{check.name}</span>
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${check.ok ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                              {check.ok ? "已設定" : "未設定"}
                            </span>
                          </div>
                          {!check.ok && (
                            <div className="mt-2 ml-6 space-y-1">
                              <p className="text-[12px] text-amber-300/80">⚡ 影響：{check.impact}</p>
                              <p className="text-[12px] text-sky-300/80">🔧 處理：{check.fix}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* API 端點 */}
                <div className="rounded-2xl border border-white/10 bg-[rgba(20,20,30,0.55)] backdrop-blur-[12px]">
                  <div className="border-b border-white/10 px-4 py-3">
                    <h2 className="text-sm font-bold text-white">各功能運作狀況</h2>
                    <p className="mt-0.5 text-[11px] text-white/40">檢查網站每個功能是否正常回應，以及回應速度</p>
                  </div>
                  <div className="divide-y divide-white/5">
                    {healthResult.endpoints.map((ep, i) => (
                      <div key={i} className="px-4 py-4">
                        <div className="flex items-center gap-4">
                          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${ep.status === "ok" ? "bg-emerald-400" : "bg-red-400"}`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-white/90">{ep.name}</p>
                            <p className="mt-0.5 text-[11px] text-white/40">{ep.desc}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {ep.latency_ms !== undefined && (
                              <span className={`text-xs font-semibold ${ep.latency_ms < 300 ? "text-emerald-400" : ep.latency_ms < 800 ? "text-amber-400" : "text-red-400"}`}>
                                {ep.latency_ms < 300 ? "快速" : ep.latency_ms < 800 ? "一般" : "較慢"} · {ep.latency_ms}ms
                              </span>
                            )}
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${ep.status === "ok" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                              {ep.status === "ok" ? "正常" : ep.error ?? `異常 ${ep.statusCode ?? ""}`}
                            </span>
                          </div>
                        </div>
                        {ep.status !== "ok" && (
                          <div className="mt-2 ml-6 space-y-1">
                            <p className="text-[12px] text-amber-300/80">⚡ 影響：此功能目前無法使用，相關頁面可能顯示不完整</p>
                            <p className="text-[12px] text-sky-300/80">🔧 處理：通常會自動恢復，若持續異常請聯絡工程師</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 前端頁面狀態 */}
                <div className="rounded-2xl border border-white/10 bg-[rgba(20,20,30,0.55)] backdrop-blur-[12px]">
                  <div className="border-b border-white/10 px-4 py-3">
                    <h2 className="text-sm font-bold text-white">前端頁面狀態</h2>
                    <p className="mt-0.5 text-[11px] text-white/40">確認訪客能正常開啟各個頁面</p>
                  </div>
                  <div className="divide-y divide-white/5">
                    {healthResult.pages.map((page, i) => (
                      <div key={i} className="px-4 py-4">
                        <div className="flex items-center gap-4">
                          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${page.status === "ok" ? "bg-emerald-400" : "bg-red-400"}`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-white/90">{page.name}</p>
                            <p className="mt-0.5 text-[11px] text-white/40">{page.desc}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {page.latency_ms !== undefined && (
                              <span className="text-xs text-white/40">{page.latency_ms}ms</span>
                            )}
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${page.status === "ok" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                              {page.status === "ok" ? "正常" : "無法開啟"}
                            </span>
                          </div>
                        </div>
                        {page.status !== "ok" && (
                          <div className="mt-2 ml-6 space-y-1">
                            <p className="text-[12px] text-amber-300/80">⚡ 影響：訪客無法開啟此頁面，會看到錯誤畫面</p>
                            <p className="text-[12px] text-sky-300/80">🔧 處理：請聯絡工程師檢查此頁面</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 資料完整性 */}
                <div className="rounded-2xl border border-white/10 bg-[rgba(20,20,30,0.55)] backdrop-blur-[12px]">
                  <div className="border-b border-white/10 px-4 py-3">
                    <h2 className="text-sm font-bold text-white">資料完整性</h2>
                    <p className="mt-0.5 text-[11px] text-white/40">檢查網站內容是否完整，避免訪客看到空白或錯誤</p>
                  </div>
                  {healthResult.data_checks.filter(d => !d.ok).length === 0 ? (
                    <div className="flex items-center gap-3 px-4 py-4">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400" />
                      <span className="text-sm text-emerald-400">所有資料都完整，沒有問題</span>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {healthResult.data_checks.filter(d => !d.ok).map((check, i) => (
                        <div key={i} className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-400" />
                            <span className="flex-1 text-sm font-medium text-white/90">{check.name}</span>
                            {check.count !== undefined && (
                              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-bold text-amber-400">{check.count} 項</span>
                            )}
                          </div>
                          {check.items && check.items.length > 0 && (
                            <div className="mt-2 ml-6 flex flex-wrap gap-1.5">
                              {check.items.map((item, j) => (
                                <span key={j} className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/60">{item}</span>
                              ))}
                            </div>
                          )}
                          <div className="mt-2 ml-6 space-y-1">
                            <p className="text-[12px] text-amber-300/80">⚡ 影響：{check.impact}</p>
                            <p className="text-[12px] text-sky-300/80">🔧 處理：{check.fix}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-white/10 bg-[rgba(20,20,30,0.55)] p-4 backdrop-blur-[12px]">
                  <p className="text-[11px] font-semibold text-white/40">速度說明</p>
                  <p className="mt-1.5 text-[11px] text-white/30">
                    ms（毫秒）= 越小代表越快。
                    <span className="mx-1 text-emerald-400">● 快速</span>資料庫 &lt;200ms、功能 &lt;300ms；
                    <span className="mx-1 text-amber-400">● 一般</span>資料庫 &lt;500ms、功能 &lt;800ms；
                    <span className="mx-1 text-red-400">● 較慢</span>超過以上標準，建議留意。
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Scrape Tab ── */}
        {activeTab === "scrape" && (
          <div className="space-y-4">
            <ScrapeSettings onTrigger={() => setScrapeRefreshKey((k) => k + 1)} isRunning={scrapeIsRunning} />
            <ScrapeProgress refreshKey={scrapeRefreshKey} onRunningChange={setScrapeIsRunning} onRetry={async () => {
              try {
                const res = await fetch('/api/scrape/trigger', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({}) });
                if (res.ok) setScrapeRefreshKey((k) => k + 1);
              } catch { /* ignore */ }
            }} />
            <ScrapeChanges onCountChange={setScrapePendingCount} />
          </div>
        )}

        {/* ── Forms Tab ── */}
        {activeTab === "forms" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-[rgba(20,20,30,0.55)] backdrop-blur-[12px]">
              <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-white">諮詢表單管理</h2>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/60">{forms.length} 筆</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-white/40">查看網站訪客提交的聯絡資訊與留言</p>
                </div>
                <button
                  onClick={loadForms}
                  disabled={formsLoading}
                  className="rounded-full bg-sky-600/20 px-3 py-1.5 text-xs font-semibold text-sky-400 transition hover:bg-sky-600/30 disabled:opacity-50"
                >
                  {formsLoading ? "載入中..." : "↻ 重新整理"}
                </button>
              </div>

              {formsLoading ? (
                <div className="flex items-center justify-center px-4 py-12">
                  <div className="flex items-center gap-2 text-white/40">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span className="text-sm">載入諮詢表單中...</span>
                  </div>
                </div>
              ) : forms.length === 0 ? (
                <div className="px-4 py-12 text-center text-sm text-white/30">目前沒有諮詢表單</div>
              ) : (
                <>
                  <div className="hidden overflow-x-auto lg:block">
                    <table className="w-full min-w-[920px]">
                      <thead>
                        <tr className="border-b border-white/10 text-left text-[11px] text-white/35">
                          <th className="px-4 py-3 font-medium">時間</th>
                          <th className="px-4 py-3 font-medium">姓名</th>
                          <th className="px-4 py-3 font-medium">聯繫方式</th>
                          <th className="px-4 py-3 font-medium">留言</th>
                          <th className="px-4 py-3 font-medium">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {forms.map((form) => {
                          const messagePreview = form.message && form.message.trim().length > 0 ? form.message.trim() : "—";
                          return (
                            <tr key={form.id} className="border-b border-white/5 align-top text-sm text-white/70 transition hover:bg-white/5 last:border-b-0">
                              <td className="px-4 py-3 text-[11px] text-white/35">{relativeTime(form.created_at)}</td>
                              <td className="px-4 py-3 font-semibold text-white">{form.name}</td>
                              <td className="px-4 py-3 text-xs text-white/55">
                                <div className="space-y-1">
                                  {form.phone && <p>電話：{form.phone}</p>}
                                  {form.line_id && <p>LINE：{form.line_id}</p>}
                                  {form.email && <p>Email：{form.email}</p>}
                                  {!form.phone && !form.line_id && !form.email && <p>—</p>}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-white/65">
                                <p className="max-w-[360px] whitespace-pre-wrap break-words">{messagePreview.length > 120 ? `${messagePreview.slice(0, 120)}…` : messagePreview}</p>
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => deleteForm(form.id)}
                                  disabled={deletingFormId === form.id}
                                  className="rounded-full bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/25 disabled:opacity-50"
                                >
                                  {deletingFormId === form.id ? "刪除中..." : "刪除"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="divide-y divide-white/5 lg:hidden">
                    {forms.map((form) => {
                      const messagePreview = form.message && form.message.trim().length > 0 ? form.message.trim() : "—";
                      return (
                        <div key={form.id} className="space-y-3 px-4 py-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-white">{form.name}</p>
                              <p className="mt-1 text-[11px] text-white/35">{relativeTime(form.created_at)}</p>
                            </div>
                            <button
                              onClick={() => deleteForm(form.id)}
                              disabled={deletingFormId === form.id}
                              className="rounded-full bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/25 disabled:opacity-50"
                            >
                              {deletingFormId === form.id ? "刪除中..." : "刪除"}
                            </button>
                          </div>
                          <div className="space-y-1 text-xs text-white/55">
                            {form.phone && <p>電話：{form.phone}</p>}
                            {form.line_id && <p>LINE：{form.line_id}</p>}
                            {form.email && <p>Email：{form.email}</p>}
                            {!form.phone && !form.line_id && !form.email && <p>—</p>}
                          </div>
                          <p className="text-sm text-white/65">{messagePreview.length > 120 ? `${messagePreview.slice(0, 120)}…` : messagePreview}</p>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
