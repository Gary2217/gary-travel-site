"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// ── Mock Data ────────────────────────────────────────────
const MOCK_OVERVIEW = [
  { label: "總瀏覽次數", value: 1284, icon: "👁", color: "sky", delta: "+12%" },
  { label: "PDF 下載次數", value: 347, icon: "📥", color: "emerald", delta: "+8%" },
  { label: "分享好友次數", value: 193, icon: "🔗", color: "violet", delta: "+23%" },
  { label: "詢問報價次數", value: 89, icon: "💬", color: "amber", delta: "+5%" },
];

const MOCK_TREND = [
  { date: "04/21", views: 142, downloads: 38, shares: 21 },
  { date: "04/22", views: 168, downloads: 44, shares: 27 },
  { date: "04/23", views: 201, downloads: 52, shares: 33 },
  { date: "04/24", views: 175, downloads: 41, shares: 19 },
  { date: "04/25", views: 230, downloads: 61, shares: 42 },
  { date: "04/26", views: 189, downloads: 49, shares: 28 },
  { date: "04/27", views: 179, downloads: 62, shares: 23 },
];

const MOCK_TRIPS = [
  { title: "北海道溫泉美食5日", views: 312, downloads: 87, shares: 45, line: 22, fb: 14, ig: 9 },
  { title: "峇里島耍廢慢遊5天4夜", views: 278, downloads: 71, shares: 38, line: 19, fb: 11, ig: 8 },
  { title: "沖繩親子歡樂4日", views: 201, downloads: 54, shares: 27, line: 14, fb: 8, ig: 5 },
  { title: "首爾美妝購物5天", views: 187, downloads: 48, shares: 31, line: 16, fb: 9, ig: 6 },
  { title: "東京迪士尼圓夢6日", views: 166, downloads: 42, shares: 22, line: 11, fb: 7, ig: 4 },
];

const MOCK_PLATFORM = { line: 58, facebook: 24, instagram: 18 };

const MOCK_FLIGHTS = [
  { route: "台北 → 東京", views: 203, inquiries: 31 },
  { route: "台北 → 首爾", views: 178, inquiries: 24 },
  { route: "台北 → 峇里島", views: 145, inquiries: 19 },
  { route: "台北 → 沖繩", views: 132, inquiries: 17 },
  { route: "台北 → 新加坡", views: 98, inquiries: 12 },
];

const MOCK_RECENT = [
  { time: "2分鐘前", event: "瀏覽行程", detail: "北海道溫泉美食5日", platform: "" },
  { time: "5分鐘前", event: "LINE 下載", detail: "峇里島耍廢慢遊5天4夜", platform: "LINE" },
  { time: "12分鐘前", event: "IG 分享", detail: "沖繩親子歡樂4日", platform: "IG" },
  { time: "18分鐘前", event: "瀏覽機票", detail: "台北 → 東京", platform: "" },
  { time: "25分鐘前", event: "FB 下載", detail: "首爾美妝購物5天", platform: "FB" },
  { time: "31分鐘前", event: "LINE 詢問", detail: "東京迪士尼圓夢6日", platform: "LINE" },
  { time: "47分鐘前", event: "瀏覽行程", detail: "首爾美妝購物5天", platform: "" },
  { time: "1小時前", event: "LINE 分享", detail: "北海道溫泉美食5日", platform: "LINE" },
];

// ── Chart Components ─────────────────────────────────────

function LineChart({ data }: { data: typeof MOCK_TREND }) {
  const maxVal = Math.max(...data.map(d => d.views));
  const W = 600, H = 160, pad = { t: 16, r: 16, b: 32, l: 40 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;

  const xStep = innerW / (data.length - 1);
  const yScale = (v: number) => innerH - (v / maxVal) * innerH;

  const viewsPath = data.map((d, i) => `${i === 0 ? "M" : "L"}${pad.l + i * xStep},${pad.t + yScale(d.views)}`).join(" ");
  const dlPath = data.map((d, i) => `${i === 0 ? "M" : "L"}${pad.l + i * xStep},${pad.t + yScale(d.downloads)}`).join(" ");
  const sharePath = data.map((d, i) => `${i === 0 ? "M" : "L"}${pad.l + i * xStep},${pad.t + yScale(d.shares)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 160 }}>
      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1={pad.l} x2={W - pad.r} y1={pad.t + f * innerH} y2={pad.t + f * innerH} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
      ))}
      {/* Y labels */}
      {[0, 0.5, 1].map((f) => (
        <text key={f} x={pad.l - 6} y={pad.t + f * innerH + 4} textAnchor="end" fontSize={10} fill="rgba(255,255,255,0.35)">
          {Math.round(maxVal * (1 - f))}
        </text>
      ))}
      {/* X labels */}
      {data.map((d, i) => (
        <text key={i} x={pad.l + i * xStep} y={H - 6} textAnchor="middle" fontSize={10} fill="rgba(255,255,255,0.35)">{d.date}</text>
      ))}
      {/* Lines */}
      <path d={viewsPath} fill="none" stroke="#38bdf8" strokeWidth={2} strokeLinejoin="round" />
      <path d={dlPath} fill="none" stroke="#34d399" strokeWidth={2} strokeLinejoin="round" />
      <path d={sharePath} fill="none" stroke="#a78bfa" strokeWidth={2} strokeLinejoin="round" />
      {/* Dots */}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={pad.l + i * xStep} cy={pad.t + yScale(d.views)} r={3} fill="#38bdf8" />
          <circle cx={pad.l + i * xStep} cy={pad.t + yScale(d.downloads)} r={3} fill="#34d399" />
          <circle cx={pad.l + i * xStep} cy={pad.t + yScale(d.shares)} r={3} fill="#a78bfa" />
        </g>
      ))}
    </svg>
  );
}

function PieChart({ data }: { data: { line: number; facebook: number; instagram: number } }) {
  const total = data.line + data.facebook + data.instagram;
  const slices = [
    { label: "LINE", value: data.line, color: "#06C755" },
    { label: "Facebook", value: data.facebook, color: "#1877F2" },
    { label: "Instagram", value: data.instagram, color: "#E4405F" },
  ];

  const cx = 80, cy = 80, r = 64, gap = 2;
  let cumulative = 0;

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const polarToCartesian = (angle: number) => ({
    x: cx + r * Math.cos(toRad(angle - 90)),
    y: cy + r * Math.sin(toRad(angle - 90)),
  });

  const arcs = slices.map((s) => {
    const startAngle = (cumulative / total) * 360 + gap / 2;
    cumulative += s.value;
    const endAngle = (cumulative / total) * 360 - gap / 2;
    const large = endAngle - startAngle > 180 ? 1 : 0;
    const start = polarToCartesian(startAngle);
    const end = polarToCartesian(endAngle);
    return { ...s, path: `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y} Z` };
  });

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 160 160" className="w-32 shrink-0 sm:w-36">
        {arcs.map((a) => (
          <path key={a.label} d={a.path} fill={a.color} opacity={0.85} />
        ))}
        <circle cx={cx} cy={cy} r={32} fill="rgba(20,20,30,0.9)" />
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize={11} fill="rgba(255,255,255,0.6)">總分享</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize={15} fontWeight="bold" fill="white">{total}</text>
      </svg>
      <div className="min-w-0 flex-1 space-y-2.5">
        {slices.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
            <span className="w-16 shrink-0 text-white/70">{s.label}</span>
            <span className="w-7 shrink-0 text-right font-semibold text-white">{s.value}</span>
            <span className="w-8 shrink-0 text-right text-xs text-white/40">{Math.round((s.value / total) * 100)}%</span>
          </div>
        ))}
        <p className="pt-1 text-[11px] text-white/30">分享 + 下載的平台選擇比例</p>
      </div>
    </div>
  );
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.round((value / max) * 100);
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

// ── Platform badge ───────────────────────────────────────
const PLATFORM_BADGE: Record<string, string> = {
  LINE: "bg-[#06C755]/20 text-[#06C755]",
  FB: "bg-[#1877F2]/20 text-[#1877F2]",
  IG: "bg-[#E4405F]/20 text-[#E4405F]",
};

// ── Main Page ────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "trips" | "flights" | "events">("overview");

  useEffect(() => {
    fetch("/api/dev-auth/status", { cache: "no-store" })
      .then(r => r.json())
      .then((d: { authorized?: boolean }) => {
        if (!d.authorized) router.replace("/");
      })
      .catch(() => router.replace("/"))
      .finally(() => setChecking(false));
  }, [router]);

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#0b0f2a_0%,#0a0a0a_50%,#1a0d0d_100%)]">
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

  const maxViews = Math.max(...MOCK_TRIPS.map(t => t.views));

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#0b0f2a_0%,#0a0a0a_50%,#1a0d0d_100%)] text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-white/10 bg-[rgba(10,10,20,0.85)] backdrop-blur-[12px]">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <button onClick={() => router.back()} className="rounded-full p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-sm font-bold text-white sm:text-base">蓋瑞旅遊 後台數據</h1>
            <p className="text-[10px] text-white/40">Gary Travel · Admin Dashboard</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="rounded-full bg-amber-500/20 px-2.5 py-1 text-[10px] font-semibold text-amber-400">開發者模式</span>
            <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] text-white/40">⚠ 目前為模擬資料</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-6">
          {([["overview", "📊 總覽"], ["trips", "🗺 行程統計"], ["flights", "✈️ 機票統計"], ["events", "📋 最新動態"]] as const).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${activeTab === tab ? "bg-sky-600 text-white" : "text-white/50 hover:text-white/80"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">

        {/* ── Overview Tab ── */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Overview cards */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {MOCK_OVERVIEW.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-[rgba(20,20,30,0.55)] p-4 backdrop-blur-[12px]">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xl">{item.icon}</span>
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">{item.delta}</span>
                  </div>
                  <p className="text-2xl font-bold text-white sm:text-3xl">{item.value.toLocaleString()}</p>
                  <p className="mt-0.5 text-xs text-white/50">{item.label}</p>
                </div>
              ))}
            </div>

            {/* Charts row */}
            <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
              {/* Line chart */}
              <div className="rounded-2xl border border-white/10 bg-[rgba(20,20,30,0.55)] p-4 backdrop-blur-[12px]">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white">最近 7 天趨勢</h2>
                  <div className="flex items-center gap-3 text-[10px] text-white/50">
                    <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-4 rounded-full bg-sky-400" />瀏覽</span>
                    <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-4 rounded-full bg-emerald-400" />下載</span>
                    <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-4 rounded-full bg-violet-400" />分享</span>
                  </div>
                </div>
                <LineChart data={MOCK_TREND} />
              </div>

              {/* Pie chart */}
              <div className="rounded-2xl border border-white/10 bg-[rgba(20,20,30,0.55)] p-4 backdrop-blur-[12px]">
                <h2 className="mb-3 text-sm font-bold text-white">社群平台分佈</h2>
                <PieChart data={MOCK_PLATFORM} />
              </div>
            </div>

            {/* Top trips quick view */}
            <div className="rounded-2xl border border-white/10 bg-[rgba(20,20,30,0.55)] p-4 backdrop-blur-[12px]">
              <h2 className="mb-4 text-sm font-bold text-white">熱門行程 Top 5（瀏覽次數）</h2>
              <div className="space-y-3">
                {MOCK_TRIPS.map((t, i) => (
                  <BarRow key={t.title} label={String(i + 1)} value={t.views} max={maxViews} color={i === 0 ? "#38bdf8" : i === 1 ? "#34d399" : "rgba(255,255,255,0.3)"} />
                ))}
              </div>
              <div className="mt-3 space-y-1">
                {MOCK_TRIPS.map((t, i) => (
                  <div key={t.title} className="flex items-center gap-2 text-[11px] text-white/60">
                    <span className="w-4 text-center text-white/30">{i + 1}</span>
                    <span className="flex-1 truncate">{t.title}</span>
                    <span className="text-sky-400">{t.views} 瀏覽</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Trips Tab ── */}
        {activeTab === "trips" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-[rgba(20,20,30,0.55)] backdrop-blur-[12px]">
              <div className="border-b border-white/10 px-4 py-3">
                <h2 className="text-sm font-bold text-white">行程完整統計</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-white/5 text-[11px] text-white/40">
                      <th className="px-4 py-2.5 text-left">行程名稱</th>
                      <th className="px-4 py-2.5 text-center">👁 瀏覽</th>
                      <th className="px-4 py-2.5 text-center">📥 下載</th>
                      <th className="px-4 py-2.5 text-center">🔗 分享</th>
                      <th className="px-4 py-2.5 text-center text-[#06C755]">LINE</th>
                      <th className="px-4 py-2.5 text-center text-[#1877F2]">FB</th>
                      <th className="px-4 py-2.5 text-center text-[#E4405F]">IG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_TRIPS.map((t, i) => (
                      <tr key={t.title} className={`border-b border-white/5 text-sm transition hover:bg-white/5 ${i === 0 ? "bg-sky-500/5" : ""}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {i === 0 && <span className="rounded-full bg-sky-500/20 px-1.5 py-0.5 text-[9px] font-bold text-sky-400">TOP</span>}
                            <span className="text-white/90">{t.title}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-sky-300">{t.views}</td>
                        <td className="px-4 py-3 text-center font-semibold text-emerald-300">{t.downloads}</td>
                        <td className="px-4 py-3 text-center font-semibold text-violet-300">{t.shares}</td>
                        <td className="px-4 py-3 text-center text-white/70">{t.line}</td>
                        <td className="px-4 py-3 text-center text-white/70">{t.fb}</td>
                        <td className="px-4 py-3 text-center text-white/70">{t.ig}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Download platform distribution */}
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: "LINE 下載", value: MOCK_TRIPS.reduce((a, t) => a + t.line, 0), color: "#06C755", emoji: "" },
                { label: "FB 下載", value: MOCK_TRIPS.reduce((a, t) => a + t.fb, 0), color: "#1877F2", emoji: "" },
                { label: "IG 下載", value: MOCK_TRIPS.reduce((a, t) => a + t.ig, 0), color: "#E4405F", emoji: "" },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-[rgba(20,20,30,0.55)] p-4 text-center backdrop-blur-[12px]">
                  <p className="text-3xl font-bold" style={{ color: item.color }}>{item.value}</p>
                  <p className="mt-1 text-xs text-white/50">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Flights Tab ── */}
        {activeTab === "flights" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-[rgba(20,20,30,0.55)] backdrop-blur-[12px]">
              <div className="border-b border-white/10 px-4 py-3">
                <h2 className="text-sm font-bold text-white">機票航線瀏覽統計</h2>
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
                    {MOCK_FLIGHTS.map((f, i) => (
                      <tr key={f.route} className="border-b border-white/5 text-sm transition hover:bg-white/5">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {i === 0 && <span className="rounded-full bg-sky-500/20 px-1.5 py-0.5 text-[9px] font-bold text-sky-400">TOP</span>}
                            <span className="text-white/90">{f.route}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-sky-300">{f.views}</td>
                        <td className="px-4 py-3 text-center font-semibold text-amber-300">{f.inquiries}</td>
                        <td className="px-4 py-3 text-center text-white/60">{Math.round((f.inquiries / f.views) * 100)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bar chart for flights */}
            <div className="rounded-2xl border border-white/10 bg-[rgba(20,20,30,0.55)] p-4 backdrop-blur-[12px]">
              <h2 className="mb-4 text-sm font-bold text-white">航線瀏覽排行</h2>
              <div className="space-y-3">
                {MOCK_FLIGHTS.map((f, i) => (
                  <div key={f.route} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/70">{f.route}</span>
                      <span className="font-semibold text-sky-300">{f.views}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/5">
                      <div className="h-full rounded-full bg-sky-500/60 transition-all duration-500" style={{ width: `${(f.views / MOCK_FLIGHTS[0].views) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
              <div className="divide-y divide-white/5">
                {MOCK_RECENT.map((e, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 transition hover:bg-white/5">
                    <span className="w-14 shrink-0 text-[10px] text-white/30">{e.time}</span>
                    <span className="flex-1 text-sm text-white/80">{e.detail}</span>
                    <span className="text-xs text-white/50">{e.event}</span>
                    {e.platform && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${PLATFORM_BADGE[e.platform] || "bg-white/10 text-white/50"}`}>
                        {e.platform}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <p className="mt-8 text-center text-[10px] text-white/20">⚠ 目前顯示模擬資料 · 真實數據串接後將自動更新</p>
      </div>
    </main>
  );
}
