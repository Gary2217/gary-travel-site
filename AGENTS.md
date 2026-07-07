# AGENTS.md - Gary Travel Site

> 任何 AI（Codex / GPT / 其他）在協助此專案時，都必須遵守以下所有規則。
> 回覆一律使用**繁體中文**。不可使用簡體中文或英文回覆。

---

## 0. 完工必經流程（每次做完事情都必須執行，不可省略）

> **每完成一項任務（改程式碼、改資料、修 bug、加功能）後，都必須依序執行以下四步，並在回覆中回報結果。**

1. **檢視（Review）**：回頭檢查這次改動是否真的完成使用者要求、有沒有漏掉、有沒有副作用。
2. **自檢（Self-check）**：
   - 改程式碼 → 跑 `lsp_diagnostics`（改動檔案）；必要時 `npm run type-check` / `npm run lint` / `npm run build`。
   - 改 DB 資料 → 打線上 API（帶 cache-buster）驗證資料實際生效，不能只看本地。
   - 確認沒有違反本檔規則（型別安全、白名單 merge、洽詢不下架、快取失效等）。
3. **修復（Fix）**：自檢發現任何錯誤/缺漏/副作用，立即修好並重新自檢，直到乾淨。
4. **優化（Optimize）**：清掉 AI slop（無用的 dead code、冗餘變數、`void x` 消警告等）、確認符合既有樣式與慣例。**但不可為了「做點什麼」而製造非必要變更**。

**回報格式**：完工後在回覆中簡述「檢視/自檢/修復/優化」各做了什麼、驗證結果（診斷是否乾淨、API 驗證是否通過）。

---

## 1. 專案概述

- **專案**：旅遊規劃師蓋瑞 GARY 的旅遊網站
- **技術棧**：Next.js 14 App Router + TypeScript + Tailwind CSS + Supabase
- **部署**：Vercel（唯一正式環境，禁止依賴 localhost）
- **用戶流程**：LINE 六宮格入口 → 瀏覽目的地 → 查看行程 → 索取 PDF / 諮詢報價
- **UI 語言**：繁體中文（zh-TW）

---

## 2. 模型分流規則（省 Token 最優先）

**原則：預設 Haiku，確實不夠才升 Sonnet，極少用 Opus。**

### ⛔ 強制執行（違反 = 浪費 Token）

> **每次回覆前必須自問：「這個任務用 Haiku 做得到嗎？」**
> - 改 Tailwind class（顏色、間距、漸層）→ **Haiku**
> - 更新 DB 資料（sub_area、價格、排序）→ **Haiku**
> - 改一行程式碼（href、顯示文字）→ **Haiku**
> - 刪除 / 新增常數 → **Haiku**
> - git commit / push → **Haiku**
> - 調色、微調 UI → **Haiku**
>
> **只有以下情況才用 Sonnet/Opus：**
> - 需要同時理解 3+ 個檔案的資料流
> - 全新功能架構設計
> - 跨模組 debug（試了 2 次以上）
> - 5+ 檔案的架構重構
>
> **如果是 Opus session 收到 Haiku 級任務，必須提醒用戶切換模型。**

### 判斷流程（每次任務前必須跑）

```
步驟一：這個任務改幾個檔案？需要跨檔理解嗎？
  → 1-2 檔、不需跨檔理解 → Haiku
  → 3-4 檔、或需追資料流  → Sonnet
  → 5+ 檔、或整站架構決策  → Opus

步驟二：是已知做法，還是要設計方案？
  → 已知做法（改 class、換 URL、寫 script、套現有模板） → Haiku
  → 要思考設計（新功能架構、效能根因、跨模組串接）    → Sonnet / Opus
```

### Codex 模型對照

| 層級 | 模型 | 何時用 |
|------|------|--------|
| 🟢 **預設** | **Haiku** | 1-2 檔修改、已知解法、不需跨檔理解 |
| 🟡 主力 | **Sonnet** | 3-4 檔、新功能開發、需追資料流 |
| 🔴 極少 | **Opus** | 5+ 檔架構重構、跨模組 bug、安全審查 |

### GPT 模型對照

| 層級 | 模型 | 何時用 |
|------|------|--------|
| 🟢 **預設** | **GPT-4.1-nano** | 同 Haiku |
| 🟡 主力 | **GPT-4o-mini** | 同 Sonnet |
| 🔴 極少 | **GPT-4o** | 同 Opus |

### 本專案任務速查表

#### 🟢 Haiku（八成任務都用這個）

| 任務 | 範例 |
|------|------|
| Tailwind 樣式調整 | 改色、間距、字體、RWD 斷點、`min-h`、`whitespace-nowrap` |
| 文案 / URL 修改 | 按鈕文字、社群連結、SEO 文案、`<a>` 改 `<button>` |
| 單一元件小改 | 改 props、加條件渲染、調排版、加 `"use client"` |
| 單一函式修改 | `openExternalLink` 邏輯、格式化函式 |
| env 變數 | `.env` 新增/修改 + 引用處 |
| git 操作 | commit、push、寫 commit message |
| 行程資料修正 | 改價格、改排序、移動行程到其他目的地、停用行程 |
| 寫/改匯入 Script | 參照現有 `scripts/*.mjs` 模板，改資料內容 |
| 圖片更換 | 換 `cover_image_url`、上傳 Supabase Storage |
| DB 單筆資料操作 | 改某行程 `trip_banner`、更新 `display_order` |

#### 🟡 Sonnet（需要跨檔理解或新功能）

| 任務 | 範例 |
|------|------|
| 新頁面開發 | 整頁 + API route + 型別定義 |
| 新元件開發 | 完整元件（state、事件、樣式、API 串接） |
| 行程抓取全流程 | 從朋威網站抓新區域行程（需開頁面→分析→寫 script→執行→驗證） |
| 跨檔除錯 | 資料流追蹤、API 回傳格式不符、元件互動問題 |
| SQL migration | 新增欄位、建 index、RLS policy |
| Supabase query 優化 | JOIN 查詢、效能調整 |
| 搜尋 / 篩選功能 | 涉及前端 + API + DB query |
| 出團日期功能調整 | `DepartureDates` 元件 + API + DB 連動 |

#### 🔴 Opus（極少用，需明確理由）

| 任務 | 範例 |
|------|------|
| 整站架構重構 | 資料流大改、Pages → App Router 遷移 |
| DB schema 重新設計 | 多表結構調整、FK 關係重建 |
| 跨模組疑難 bug | 試了 2+ 次還找不到原因的問題 |
| 安全性 / 效能審查 | RLS 全面檢查、效能瓶頸分析 |

### OpenCode 模型分流設定檔

**完整路徑**：`C:\Users\sc666\.config\opencode\oh-my-openagent.json`

| 層級 | Agent / Category | 模型 | 說明 |
|------|-----------------|------|------|
| 🟢 Haiku | `explore` | claude-haiku-4-5 | 便宜 grep |
| 🟢 Haiku | `librarian` | claude-haiku-4-5 | 便宜外部參考搜尋 |
| 🟢 Haiku | `quick` (category) | gpt-5.4-mini | 單檔小改、已知解法 |
| 🟢 Haiku | `unspecified-low` (category) | claude-haiku-4-5 | 低負擔雜項 |
| 🟢 Haiku | `writing` (category) | claude-haiku-4-5 | 文案、文件修改 |
| 🟡 Sonnet | `sisyphus-junior` | claude-sonnet-4-6 | 任務執行者 |
| 🟡 Sonnet | `atlas` | claude-sonnet-4-6 | 中階 agent |
| 🟡 Sonnet | `visual-engineering` (category) | claude-sonnet-4-6 | 前端 / UI / 樣式 |
| 🟡 Sonnet | `artistry` (category) | claude-sonnet-4-6 | 創意解法 |
| 🟡 Sonnet | `unspecified-high` (category) | claude-sonnet-4-6 | 高負擔雜項 |
| 🔴 Opus | `sisyphus` | claude-opus-4-6 max | 主控 agent |
| 🔴 Opus | `oracle` | gpt-5.4 high | 架構顧問 |
| 🔴 Opus | `ultrabrain` (category) | gpt-5.4 xhigh | 高難度邏輯 |
| 🔴 Opus | `deep` (category) | gpt-5.4 medium | 深度自主解題 |
| 🔴 Opus | `momus` | gpt-5.4 xhigh | 計畫審查 |
| 🔴 Opus | `metis` | claude-opus-4-6 max | 前置分析 |
| 🔴 Opus | `prometheus` | claude-opus-4-6 max | 規劃 |

### Token 節省策略

- **預設 Haiku**，確實不夠才升級，不要「怕出錯」就用高階模型
- 行程資料修正（改價格、改排序、停用）→ 都是 Haiku，因為只改 DB 資料
- 抓新區域行程（朋威→分析→寫 script）→ Sonnet，因為跨多頁比對
- 不跑不必要的背景探索，直接讀已知檔案
- 一次只修必要檔案，不做「順便改善」
- 回覆精簡，不加多餘解釋
- 同類型小修改合併一次請求（三個元件都改 class → 一次講完）

---

## 3. 目錄結構（不要自己發明新的）

```
src/
├── app/
│   ├── page.tsx                              # 首頁（目的地總覽）
│   ├── layout.tsx                            # Root layout
│   ├── loading.tsx                           # 全域 loading 頁
│   ├── not-found.tsx                         # 404 頁
│   ├── globals.css                           # 全域樣式（亮色主題）
│   ├── destination/[id]/page.tsx             # 目的地詳情 → 行程列表
│   ├── destination/[id]/layout.tsx           # 目的地 layout
│   ├── trip/[id]/page.tsx                    # 行程詳情 → 每日行程 + 諮詢
│   ├── flights/page.tsx                      # 機票頁
│   ├── flights/[id]/page.tsx                 # 機票詳情
│   ├── flights/layout.tsx                    # 機票 layout
│   ├── document-services/page.tsx            # 文件服務頁
│   ├── document-services/[id]/page.tsx       # 文件服務詳情
│   ├── mini-transit-tickets/page.tsx         # 迷你轉機票頁
│   ├── mini-transit-tickets/[id]/page.tsx    # 迷你轉機票詳情
│   ├── admin/page.tsx                        # 後台管理頁
│   └── api/                                  # API Routes
│       ├── regions/route.ts
│       ├── destinations/route.ts
│       ├── destinations/[id]/route.ts
│       ├── destinations/[id]/trips/route.ts
│       ├── trips/[id]/route.ts
│       ├── inquiries/route.ts
│       ├── track-click/route.ts
│       ├── upload-image/route.ts
│       ├── popular-trips/route.ts
│       └── og/route.tsx
├── components/
│   ├── StickyHeader.tsx                      # 頂部固定導航（含社群按鈕）
│   ├── SocialCta.tsx                         # 社群 CTA + 聯絡區塊
│   ├── FloatingContact.tsx                   # 浮動聯絡按鈕
│   ├── ContactFormModal.tsx                  # 聯絡表單 Modal
│   ├── ContactInquiries.tsx                  # 諮詢管理（Dev mode）
│   ├── InquiryButtons.tsx                    # 諮詢按鈕（floating / inline）
│   ├── InquiryForm.tsx                       # 線上諮詢表單
│   ├── TripCard.tsx                          # 行程卡片
│   ├── DayItinerary.tsx                      # 每日行程摺疊面板
│   ├── DepartureDates.tsx                    # 出發日期選擇
│   ├── FlightDepartureDates.tsx              # 機票出發日期
│   ├── SideMediaCarousel.tsx                 # 側邊媒體輪播
│   ├── TravelSearchBar.tsx                   # 旅遊搜尋列
│   ├── Skeleton.tsx                          # 骨架屏元件
│   ├── PdfViewer.tsx                         # PDF 檢視器
│   ├── FavoriteButton.tsx                    # 收藏按鈕
│   ├── ShareButton.tsx                       # 分享按鈕
│   ├── ScrollToTop.tsx                       # 回到頂部按鈕
│   ├── LegalNotice.tsx                       # 免責聲明
│   ├── MaintenanceGuard.tsx                  # 維護中守衛
│   ├── ImageEditor.tsx                       # 開發者模式圖片編輯器
│   ├── LogoUploader.tsx                      # Logo 上傳器
│   ├── DevModeToggle.tsx                     # 開發者模式切換
│   └── Toast.tsx                             # Toast 通知
└── lib/
    ├── supabase.ts                           # 型別定義 + fetch 輔助函式 + 社群連結常數
    └── external-link.ts                      # 外部連結安全開啟工具
```

---

## 4. 架構規則（不可違反）

| 規則 | 說明 |
|------|------|
| Client-side only | 所有頁面元件加 `"use client"`，不用 Server Components |
| 資料流 | 元件 → `src/lib/supabase.ts` 的 fetch 函式 → `/api/*` route → Supabase |
| 禁止直接呼叫 Supabase | 元件和 lib 裡**不能** import `createClient`，只透過 API route |
| API route 獨立 client | 每個 request handler 內 `createClient(...)`，不共用 instance |
| 社群連結統一管理 | `lineHref`、`fbHref`、`igHref` 從 `src/lib/supabase.ts` import，不在元件裡重新定義 |
| 環境變數 | 社群連結用 `NEXT_PUBLIC_LINE_ID`、`NEXT_PUBLIC_FB_URL`、`NEXT_PUBLIC_IG_URL`，不硬編碼 |
| 所有資料來自 Supabase | DB / Storage 為唯一真實來源，不用本地暫存當資料來源 |
| 圖片必須存 Supabase Storage | 從朋威或任何外部來源抓取的圖片，**必須下載後上傳 Supabase Storage**，`cover_image_url` 只能存 Supabase 的公開 URL，**禁止直接引用外部 CDN 連結**（如 `dcimg.travel.net.tw`）。apply API 已內建 `ensureSupabaseImage()` 自動處理。 |
| 前端只負責顯示 | 不持有核心資料邏輯 |
| **目的地頁雙狀態同步** | `destination/[id]/page.tsx` 同時維護 `trips`（當前 destination）和 `subRegionTrips`（合併的兄弟 destination 行程）兩個狀態源。**任何修改行程的 handler 都必須同時更新兩者**，否則中東亞非、港澳大陸、日本等合併顯示區域的 UI 不會反映變更。已提供 `updateTrip()` 共用函式處理欄位更新；新增/刪除/隱藏/恢復/複製等操作需分別對 `setTrips` 和 `setSubRegionTrips` 各做一次。**新增 handler 時必須搜尋 `setTrips` 確認是否也需要 `setSubRegionTrips`。** |
| **目的地頁 tabs 層級限制** | sub_region 下有 2+ 個 destination 時，**不顯示第三層 sub_area tabs**（第二排 destination tabs 已足夠篩選）。僅在 sub_region 下只有 1 個 destination 時才顯示 sub_area 細分篩選。 |

---

## 4.1 前端寫入操作規則（DevMode 功能持久化 — 不可違反）

> 此規則源自多次持久化 bug（資料存成功但重新整理消失）的教訓，不可省略任何一條。

### 規則 A：所有寫入 fetch 必須加 `credentials: 'include'`

任何 POST/PATCH/PUT/DELETE 的 fetch 呼叫，無論在 `supabase.ts` 的共用函式或元件內的直接呼叫，**都必須**加上 `credentials: 'include'`。

```typescript
// ✅ 正確
const res = await fetch(`/api/trips/${tripId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',  // ← 必須加
  body: JSON.stringify(payload),
});

// ❌ 錯誤 — 會導致 dev auth cookie 不傳送，API 返回 401
const res = await fetch(`/api/trips/${tripId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
```

**例外**：
- GET 請求不需要（公開讀取不需認證）
- 直傳 Supabase Storage 的 PUT（signed URL 自帶認證）
- 公開 API（如 `/api/inquiries` POST、`/api/track-click` POST）

### 規則 B：寫入成功後必須呼叫 `invalidateCache`

所有修改 DB 資料的操作完成後，**必須**呼叫 `invalidateCache` 清除**所有相關的** cache key prefix，否則重新整理頁面會顯示舊資料。

**Cache Key Prefix 對照表：**

| Prefix | 說明 | 何時需清除 |
|--------|------|-----------|
| `trip:` | 行程詳情（含 trip_banner） | 任何行程欄位修改 |
| `dest-trips:` | 目的地行程列表 | 行程新增/刪除/複製/隱藏/恢復/圖片修改 |
| `regions` | 區域 + 目的地列表 | 目的地修改 |
| `dest:` | 單一目的地資訊 | 目的地圖片/欄位修改 |
| `related:` | 相關行程 | 行程修改 |
| `site-logo` | 網站 Logo | Logo 修改 |

**常見操作的 invalidateCache 清單：**

```typescript
// 修改行程欄位（標題/價格/banner/標籤）
invalidateCache('trip:');
invalidateCache('dest-trips:');
invalidateCache('related:');
invalidateCache('regions');
invalidateCache('dest:');

// 新增/複製/刪除行程
invalidateCache('dest-trips:');
invalidateCache('regions');

// 上傳行程圖片/PDF
invalidateCache('trip:');
invalidateCache('dest-trips:');

// 上傳目的地圖片
invalidateCache('dest:');
invalidateCache('regions');

// 隱藏/恢復行程
invalidateCache('dest-trips:');
invalidateCache('trip:');
```

### 規則 C：API Route Cache-Control 設定

- **讀取 API（會被 DevMode 修改的資料）**：必須用 `Cache-Control: no-store, no-cache, must-revalidate`
- **讀取 API（純靜態/不常改的資料）**：可以用 `s-maxage`，但要確認 invalidateCache 有處理
- **寫入 API（POST/PATCH/PUT/DELETE）**：回傳加 `Cache-Control: no-store`

```typescript
// ✅ 會被 DevMode 修改的資料 — 必須 no-store
return NextResponse.json(trips, {
  headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
});

// ❌ 錯誤 — 造成 Vercel 邊緣快取舊資料
return NextResponse.json(trips, {
  headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
});
```

### 規則 D：新增寫入功能時的 Checklist

每次新增或修改任何 DevMode 功能（編輯、上傳、刪除等），必須檢查：

- [ ] fetch 有 `credentials: 'include'`
- [ ] 成功後呼叫了 `invalidateCache`（所有相關 prefix）
- [ ] 對應的 API route 有 `requireDevAuth()`
- [ ] API route 回傳有 `Cache-Control: no-store`
- [ ] 前端 state 更新了（setTrip / setTrips / setSubRegionTrips）
- [ ] 如果是目的地頁面操作，`setTrips` 和 `setSubRegionTrips` 都有更新
- [ ] 錯誤處理有 alert 或 Toast 告知用戶，不可靜默失敗

---

## 5. 樣式規則

### 亮色白底主題（照抄，不要自創）

```
全域背景漸層（globals.css）：
  linear-gradient(135deg, #f0f9ff 0%, #f0fdf4 30%, #fffbeb 60%, #fdf2f8 100%) fixed
  → 淡藍 → 淡綠 → 淡黃 → 淡粉，明亮柔和

搜尋區塊背景：
  bg-[linear-gradient(135deg,#e0f2fe_0%,#ecfdf5_35%,#fef9c3_65%,#fce7f3_100%)]

Header / Region Tabs：
  bg-white/95 backdrop-blur-[12px] border-b border-gray-200

白底卡片：
  rounded-xl border border-gray-200 bg-white shadow-sm

灰底卡片（目的地縮圖卡）：
  rounded-xl border border-gray-200 bg-gray-100

通用圓角：rounded-xl 或 rounded-2xl
CTA 區塊圓角：rounded-2xl border border-gray-200 bg-white shadow-sm
```

### 文字色彩

```
主要文字：text-gray-900
次要文字：text-gray-600
提示文字：text-gray-500
極細提示：text-gray-400
子標籤色：text-sky-600
錯誤文字：text-red-400
圖片疊加文字：text-white（搭配 text-shadow 或 bg-gradient-to-t from-black/70）
```

### 按鈕

```
主要按鈕：bg-sky-600 hover:bg-sky-500 text-white rounded-full
連結 hover：hover:text-[#0096c7] hover:border-[#00b4d8] hover:bg-sky-50
CTA 橘色按鈕：bg-[#ff6b35] hover:bg-[#e55a2b] text-white rounded-lg
重新載入 / 清除：bg-[#00b4d8] hover:bg-[#0096c7] text-white rounded-lg
```

### 品牌色

```
LINE：      #06C755（hover: #05b64d）
Facebook：  #1877F2（hover: #1565d8）
Instagram： #E4405F（hover: #d62d4a）
主要強調色：sky-600 / sky-500 / [#00b4d8] / [#0096c7]
CTA 橘色：  #ff6b35 / #e55a2b
```

### 響應式

- Mobile-first，用 `sm:` → `md:` → `lg:` → `xl:` 往上疊加
- 不要用 `@media` 手寫，用 Tailwind 前綴
- 必須同時支援 PC + 手機

---

## 6. 程式碼風格

### TypeScript

- 用 `interface` 定義元件 props
- 型別定義集中在 `src/lib/supabase.ts`
- 頁面內局部型別可用 `type` 定義在同檔案頂部
- 不要用 `any`，除非 Supabase 回傳的 nested join 無法推導

### React 元件

- 每個檔案 `export default` 一個元件
- 頁面級元件放 `src/app/`，可複用元件放 `src/components/`
- 載入中必須顯示 spinner +「載入中...」
- 錯誤必須 catch 並顯示繁體中文訊息
- 不要用第三方 UI 套件（純 Tailwind）

### API Route 標準模式

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    // ... query ...
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## 7. 資料庫規則

- 主鍵：UUID（`gen_random_uuid()`）
- 時間戳：`created_at` + `updated_at`（含時區，`updated_at` 有自動觸發器）
- 所有表啟用 RLS（Row Level Security）
- 公開讀取：`is_active = true` 的記錄
- 公開新增：`click_analytics`、`inquiries`
- 所有寫入需包含 user_id
- 避免 race condition / 重複寫入
- 禁止直接修改 DB 結構（未說明原因時）

---

## 8. 環境變數

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase 專案 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous key
- `NEXT_PUBLIC_LINE_ID` — LINE 官方帳號 ID
- `NEXT_PUBLIC_FB_URL` — Facebook 粉專連結
- `NEXT_PUBLIC_IG_URL` — Instagram 連結
- `NEXT_PUBLIC_DEV_PASSWORD` — 開發者模式密碼

---

## 9. 安全與風險控制

- 不可破壞現有邏輯
- 不可進行大規模重構（除非明確允許）
- 有風險時必須先提醒再執行
- 優先選擇最安全、最穩定方案
- 禁止隱藏 fallback 或不可靠 hack

---

## 10. 開發流程（執行任務前必須先判斷）

| 類型 | 說明 |
|------|------|
| A = Audit | 查問題，先了解現況 |
| B = Minimal Fix | 最小修改，只改必要的 |
| C = DB / Schema 準備 | 資料庫結構調整 |

- 若不確定 → 一律先做 Audit
- 只修改必要檔案（最小改動）
- 禁止掃描整個 repo
- 禁止不必要的重構

---

## 11. 回覆格式（每次回覆必須包含）

1. 本次要做什麼
2. 修改哪些檔案
3. 為什麼這樣做
4. 風險評估
5. 下一步建議

---

## 12. 禁止清單（嚴格）

- **不要**用 Server Components 做頁面
- **不要**在元件裡直接 import Supabase client
- **不要**硬編碼社群連結 URL
- **不要**跳過 loading / error 狀態處理
- **不要**用外部 UI 套件（Material UI、shadcn、Chakra 等）
- **不要**自己建新的 CSS 檔（用 Tailwind）
- **不要**改動目錄結構（新增頁面 / API route 按現有模式放）
- **不要**新增不必要的檔案（helpers、utils、constants 等拆檔）
- **不要**在回覆中使用簡體中文或英文
- **不要**加上你覺得「順便改比較好」的東西，只做被要求的事
- **不要**跳過 API 直接在前端處理資料
- **不要**hardcode 關鍵資料
- **不要**引入不必要依賴
- **不要**修改與任務無關的檔案

---

## 13. 新增功能 Checklist

### 新增頁面時確認：

- [ ] 檔案頂部有 `"use client"`
- [ ] 有 loading spinner 狀態
- [ ] 有 error 狀態（繁體中文訊息）
- [ ] 資料透過 `src/lib/supabase.ts` fetch 函式取得
- [ ] 若需要新 API route，每個 handler 內獨立建立 Supabase client
- [ ] 樣式使用現有的亮色白底主題 class（白底卡片、gray-200 邊框、sky-600 強調色）
- [ ] 社群連結從 `src/lib/supabase.ts` import
- [ ] 支援手機與桌面顯示

### 新增元件時確認：

- [ ] 檔案頂部有 `"use client"`
- [ ] Props 用 `interface` 定義
- [ ] 放在 `src/components/` 下
- [ ] 樣式跟現有元件一致（圓角 rounded-xl / rounded-2xl、border-gray-200、bg-white）

---

## 14. 語言與輸出規則

- 一律使用繁體中文回覆
- 必須提供可直接複製的完整指令（不可給片段）
- 不可只講概念，必須提供實作步驟
- 回覆需清楚分段，方便閱讀與複製
- Code、變數名、技術術語可保持英文

---

## 15. 行程資料抓取規範（從朋威旅行社）

### 資料來源

- **來源網站**：朋威旅行社 https://www.pwgotravel.com.tw
- **我們的網站**：https://gary-travel-site.vercel.app
- **原則**：朋威頁面上某個 tab 有幾個行程，我的對應目的地頁就放幾個，順序完全一致
- **排序規則**：依朋威網站顯示順序（上→下、左→右），第一列左起 1、2、3，第二列左起 4、5、6，依此類推，對應 `display_order` 值 1、2、3...
- **價格來源**：一律以朋威**行程詳情頁**為準（列表頁價格可能過時）

### 來源頁面 URL 對照

| 朋威頁面 | URL | 分頁 tab 結構（= 我們的 destination 名稱）|
|---------|-----|-------------|
| 日本 | `/japan/` | 北海道、東北、關東、中部、關西、四國、九州、沖繩 |
| 韓國 | `/south-korea/` | 首爾、釜山、濟州 |
| 泰國 | `/thailand/` | 泰國（曼谷、泰北、普吉合併） |
| 越南 | `/vietnam/` | 越南（富國島、芽莊、中越、北越合併） |
| 印尼 | `/indonesia/` | 印尼（峇里島、雅加達合併） |
| 馬新 | `/malaysia/` | 馬新 |
| 菲律賓 | `/philippines/` | 菲律賓（長灘島、宿霧合併） |
| 歐洲 | `/europe/` | 中西歐、東歐、南歐、北歐 |
| 港澳大陸 | `/china/` | 東北、華東、華中、華南、西南、西北 |
| 中東亞非 | `/asia/` | 中東、中亞、西伯利亞、高雄出發 |
| 南亞 | `/southasia/` | 不丹、馬爾地夫、斯里蘭卡 |
| 紐澳美加 | `/new/` | 紐澳、美加 |
| 金門 | `/kinmen/` | 金門 |
| 馬祖 | `/mazu/` | 馬祖 |
| 澎湖 | `/penghu/` | 澎湖 |
| 自由行 | `/freetour/` | （無 tab 分頁） |
| 高爾夫 | `/golf/` | （無 tab 分頁） |

> **重要**：我們的 destination 名稱必須與朋威的 tab 名稱一致（如「中東」非「杜拜」），這樣自動抓取器才能正確配對。

### 不抓取的區域

| 區域 | 原因 |
|------|------|
| 郵輪旅遊 | 朋威頁面是搜尋結果頁，非標準區域頁，手動管理 |
| 客製旅遊 | 無朋威對應頁，不需抓取 |

### 抓取欄位完整清單（按來源頁面位置）

每個行程必須點進**詳情頁**，依序抓取以下所有欄位。缺一不可。

#### ① 頁面頂部區塊

| 欄位 | 來源位置 | 寫入位置 | 範例 |
|------|---------|---------|------|
| 行程標題 | `<h1>` 大標題 | `trips.title` | `閃耀阿布達比、杜拜7日~季節限定地球村、奇蹟花園` |
| 封面圖片 | 標題旁的大圖 | `trips.cover_image_url`（下載後上傳 Storage） | ⚠️ 後補 |
| 團型編號 | 「團型編號」欄位 | `trip_banner.code_label` | `AUH4AG7D` |
| 旅遊天數 | 「旅遊天數」欄位 | `trips.duration` + `trip_banner.duration_label` | `7天6夜` |
| 成團人數 | 「成團人數」欄位 | `trip_banner.min_group_size` | `16` |
| 出發機場 | 「出發機場」欄位 | `trip_banner.airport` | `桃園國際機場` |
| 航空公司 | 「航空公司」欄位 | `trip_banner.airline` | `阿提哈德航空（EY）` |
| 標籤 | 金色 `#tag` 列表 | `trip_banner.tags` | `['特別推薦', '優質深度', '城市巡禮']` |

#### ② 售價明細表格（「更多售價說明」）

**這是最常漏抓的區塊，必須逐格填入，不可填「洽詢」除非來源確實顯示洽詢。**

| 欄位 | 寫入位置 | 範例 |
|------|---------|------|
| 大人價格 | `price_detail` 第 1 欄 | `NT$49,900元起` |
| 小孩佔床價格 | `price_detail` 第 2 欄 | `NT$49,900元起` |
| 小孩不佔床價格 | `price_detail` 第 3 欄 | `NT$46,900元起` |
| 加床價格 | `price_detail` 第 4 欄 | `NT$49,900元起` |
| 嬰兒價格 | `price_detail` 第 5 欄 | `NT$10,000元起` |

寫入格式：以 `\t`（tab）分隔 5 欄，存入 `trip_banner.price_detail`
```
NT$49,900元起\tNT$49,900元起\tNT$46,900元起\tNT$49,900元起\tNT$10,000元起
```

#### ③ 航班資訊（「航班資訊」彈窗）

每個航段一筆，存入 `flightSegments` 陣列，並用於建立出發日期。

| 欄位 | 來源位置 | 範例 |
|------|---------|------|
| 航空公司 | 航段左側 logo + 名稱 | `阿提哈德航空（EY）` |
| 航班號 | 航段編號 | `EY899` |
| 第幾天 | 「第X天」標示 | `第1天` |
| 起飛時間 | 出發時間 | `18:40` |
| 出發機場 | 出發機場名稱 | `桃園國際機場` |
| 抵達時間 | 抵達時間（注意 `+1天`） | `00:30` |
| 抵達機場 | 抵達機場名稱 | `阿布達比機場` |
| 是否跨日 | 是否顯示 `+1天` | `true` / `false` |

#### ④ 出發日期表格（「出發日期」區塊）

每個出發日期一筆，寫入 `trip_departure_dates` 表。

| 欄位 | 來源表格欄位 | 範例 |
|------|-----------|------|
| `departure_date` | 出發日期 | `2026-07-10` |
| `departure_city` | 依出發機場判斷 | `桃園` / `高雄` |
| `airline` | 航空公司 | `阿提哈德航空（EY）` |
| `price` | 售價（數字，去掉 NT$ 和逗號） | `49900` |
| `label` | 去回時段 | `晚去晚回` / `早去早回` / `午去午回` |
| `seats_total` | 機位數 | `20` |
| `seats_available` | 可售數 | `19` |
| 去程航班 | 從③的第一個航段取 | `EY899` / `18:40` / `桃園國際機場` → `阿布達比機場` |
| 回程航班 | 從③的最後一個航段取 | `EY898` / `21:25` / `阿布達比機場` → `桃園國際機場` |
| `flight_segments` | 完整航段陣列（從③組成） | JSON 陣列 |

#### ⑤ 行程基本資訊（組合欄位）

| 欄位 | 組合方式 | 寫入位置 |
|------|---------|---------|
| `subtitle` | 航空公司 + 主要景點摘要 | `trips.subtitle` |
| `price_range` | 大人售價文字 | `trips.price_range`（如 `NT$49,900起`） |
| `price_label` | 同 price_range | `trip_banner.price_label` |
| `departure_label` | 依出發機場 | `trip_banner.departure_label`（`桃園出發` / `高雄出發`） |
| `seats_total` | 從出發日期表格取 | `trip_banner.seats_total` |
| `display_order` | 朋威頁面排序位置 | `trips.display_order`（1 起算） |
| `destination_id` | 對應我們的目的地 UUID | `trips.destination_id` |
| `is_active` | 固定 | `true` |
| `highlights` | 固定空陣列 | `[]` |
| `custom_tour` | 無出發日的行程 | `trip_banner.custom_tour = true` |

#### ⑥ 不需要抓的資料

- ❌ 每日行程（`day_itineraries`）— 之後放 PDF 取代
- ❌ 行程特色（`highlights`）— 設為空陣列
- ❌ 飯店介紹詳情
- ❌ 訂購須知文字
- ❌ 費用說明文字（只抓價格數字）

### 抓取 Script 規範

#### 檔案命名與位置

```
scripts/
├── import-{region}-trips.mjs       # 首次匯入（新增行程到 DB）
├── update-{region}-trips.mjs       # 更新既有行程（價格/出發日期/排序）
├── scrape-and-replace-images.mjs   # 爬取圖片並上傳 Supabase Storage
└── verify-data.mjs                 # 驗證匯入結果
```

#### Script 標準模板

```javascript
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = readFileSync('.env.local', 'utf8');
const getEnv = (k) => {
  const m = env.match(new RegExp(`^${k}=(.+)$`, 'm'));
  return m ? m[1].trim() : null;
};

const sb = createClient(
  getEnv('NEXT_PUBLIC_SUPABASE_URL'),
  getEnv('SUPABASE_SERVICE_ROLE_KEY')
);

// 目的地 ID 對照表（從 Supabase destinations 表取得）
const DESTINATIONS = {
  dubai: '2b1e1dac-4b61-4113-8a64-8cfb3861dc03',
  uzbekistan: 'f1b28d9d-ecd7-4c68-97cb-cef84b417ecc',
  // ... 其他目的地
};
```

#### 注意事項

- **SUPABASE_SERVICE_ROLE_KEY**：從 `.env.local` 讀取，**禁止硬編碼在 script 中**
- **圖片處理**：先下載到本地 → 上傳 Supabase Storage → 取得公開 URL
- **價格以朋威詳情頁為準**：列表頁價格可能過時，一律以點進去的詳情頁為正確值
- **售價明細 5 欄全填**：大人、小孩佔床、小孩不佔床、加床、嬰兒 — 來源寫什麼就填什麼，不可自行填「洽詢」
- **出發日期全部重建**：更新時先 `DELETE` 舊日期，再 `INSERT` 新日期
- **保留既有圖片**：更新 `trip_banner` 時，必須保留 `side_image_url` 和 `departure_info_map`
- **客製行程**：無出發日期的行程，設 `trip_banner.custom_tour = true`，不插入出發日期

### 抓取步驟 Checklist

每次抓取新的區域行程時，依序執行：

1. **確認來源頁面** — 開啟朋威對應頁面，數清楚 tab 內行程數量
2. **確認目的地 ID** — 查 Supabase `destinations` 表，確認對應的 `destination_id`
3. **逐一點進詳情頁** — 每個行程都必須點進去，抓取 ①②③④⑤ 全部欄位
4. **特別檢查售價明細** — ② 的 5 欄價格是否全部填入（不可遺漏）
5. **寫入 Script** — 參照 `scripts/update-middle-east-siberia-trips.mjs` 的格式
6. **執行 Script** — `node scripts/import-{region}-trips.mjs`
7. **驗證結果** — 打 API 確認：行程數、價格、排序、售價明細是否正確
8. **抓取圖片** — 執行圖片爬蟲或手動上傳
9. **最終比對** — 開啟我們的頁面與朋威頁面並排，逐一比對（含售價彈窗）

---

### 手動抓取 / 貼內容產生行程的一致性規則（AI 直接寫 DB 時必守）

> **情境**：使用者不走後台/DevMode，而是**直接貼一段內容、或叫 AI 去抓朋威某區（例：「幫我抓九寨溝＋當地酒店」），由 AI 寫 script 直接寫進 DB**。
> 這條路徑**繞過** `auto-scrape.mjs` 與 `api/scrape/apply` 的自動清洗，所以 **AI 必須在 script 內自己套用下列同一套規則**，否則產出的卡片會與正常狀態不一致（髒標籤、排序錯、缺欄位）。

**產卡/更新時，以下每一項都必做（與自動管線輸出完全一致）：**

1. **標籤清洗（與 §16 `normalizeTag`／`api/scrape/apply` `cleanTag` 同一套）**：寫入 `trip_banner.tags` 前一律過濾，清空則用標題拆賣點補上。直接複製此函式：
   ```js
   function cleanTag(raw) {
     const t = String(raw ?? '').replace(/\s+/g, ' ').trim()
       .replace(/^#/, '').replace(/^\((國外|國內|首頁)\)/, '').trim();
     if (!t || t.length > 14) return null;
     if (t.includes('航空') || /航$/.test(t)) return null;
     if (/網卡|SIM|上網|分享器|插頭|束帶|收納|盥洗|傳輸線|礦泉水|翻譯機|WIFI|wifi|無限供應|價值[\d]|贈/.test(t)) return null;
     return t;
   }
   // 清空時 fallback：extractSellingPoints(title)（見 auto-scrape.mjs 同名函式，取 ~ 後賣點、限 5 個 2–12 字）
   ```
2. **排序旗標 `custom_tour`**：`departures.length === 0`（無出發日）→ `trip_banner.custom_tour = true`（洽詢加LINE，排最後）；有出發日 → 不設/為 false（排前面）。對齊 §20.5。
3. **`display_order`**：依朋威頁面顯示順序 1、2、3…（上→下、左→右）。
4. **`sub_area` 單一值**：不可含逗號（`張家界`，非「張家界,九寨溝」）；同目的地新行程**繼承既有行程的 `sub_area`**，避免子標籤分類散落。
5. **更新既有行程走白名單 merge**：`{ ...既有trip_banner, 只改必要欄位 }`，**保留** `side_image_url`／`departure_info_map`／`custom_tour`／`seats_*` 等手動欄位，不可整包覆蓋。
6. **圖片必上 Supabase Storage**：`cover_image_url` 一律下載後上傳 Storage，禁止外部 CDN（見 §4）。
7. **售價明細 5 欄**（大人/小孩佔床/小孩不佔床/加床/嬰兒）＋ 依出發日重建 `departure_info_map`（見 §15 欄位清單、§21.1）。
8. **出發日期**：寫 `trip_departure_dates`（含 `flight_segments` 與 `outbound_*`/`return_*`），日期只留今日以後。

**驗證（寫完必做）**：打線上 API（帶 cache-buster）確認 ① 標籤乾淨無雜訊 ② 排序正確（洽詢加LINE 在後、其餘在前）③ sub_area 正確歸類 ④ 售價明細 5 欄齊全。

**一句話**：手動路徑要「手工複刻」自動管線的清洗與欄位規則——**標籤清洗、custom_tour、display_order、sub_area、白名單 merge、圖片上傳、售價 5 欄** 一個都不能少。

---

## 16. 自動抓取系統（Auto-Scrape）

### 系統架構

```
Admin 頁面「🔄 更新抓取此頁」按鈕
  ↓
POST /api/scrape/trigger（觸發 GitHub Actions）
  ↓
GitHub Actions workflow: scrape-trips.yml
  ↓
scripts/auto-scrape.mjs（Puppeteer 爬蟲）
  ↓
比對現有 DB 資料 → 產生 pending_changes
  ↓
Admin 頁面「待確認變更」列表
  ↓
使用者手動勾選 → 按「更新已選」確認寫入 DB
```

### 核心規則

- **所有更新都是手動確認**：抓取器只產生 `pending_changes`，不自動寫入正式資料
- **每個 destination 必須有 `source_url`**：指向朋威對應的區域頁面 URL，沒有就無法抓取
- **destination 名稱必須跟朋威 tab 一致**：如「中東」非「杜拜」，這樣抓取器才能正確配對 section
- **抓取精準度**：指定 destination 時，用 `sub_region` 和 `title` 比對朋威頁面的 section label，只抓對應區塊
- **郵輪旅遊和客製旅遊不抓取**：郵輪是搜尋頁面結構不同，客製無朋威對應

### Destination 解析規則（防止跨區域混淆）

- **Region-aware 解析**：`buildDestinationResolver` 回傳的 resolver 接受 `(label, regionUrl)` 兩個參數
- 當多個 destination 有相同 `title` 或 `sub_region`（如日本「東北」和港澳大陸「東北」），用 `regionUrl` 篩選 `source_url` 匹配的 destination
- **已知混淆組**（同名 sub_region，不同區域）：
  - `東北`：日本東北 vs 港澳大陸東北（哈爾濱）
  - `沖繩`：日本沖繩 vs 郵輪旅遊沖繩
  - `大阪`/`關西`：日本關西 vs 自由行大阪
  - `東京`/`關東`：日本關東 vs 自由行東京
- **注意**：新增 destination 時，若 `title` 或 `sub_region` 與其他區域的 destination 重名，必須確保 `source_url` 已設定，否則 resolver 無法區分

### 下架保護機制

- **跨 destination 反查**：標記 `removed` 前，先對整個區域所有已抓取行程做 code_label + 標題相似度比對
- 若行程在其他 destination 有匹配（code_label 相同或標題相似度 ≥ 0.7），跳過不標記下架
- 這防止 destination 解析偶爾歸錯位置時，將仍在販售的行程誤判為下架

### 相關檔案

| 檔案 | 用途 |
|------|------|
| `scripts/auto-scrape.mjs` | 核心爬蟲（GitHub Actions 執行） |
| `.github/workflows/scrape-trips.yml` | GitHub Actions workflow |
| `src/app/api/scrape/trigger/route.ts` | 觸發抓取 API |
| `src/app/api/scrape/progress/route.ts` | 抓取進度 API |
| `src/app/api/scrape/changes/route.ts` | 待確認變更 CRUD |
| `src/app/api/scrape/apply/route.ts` | 確認變更寫入 DB |
| `src/app/api/scrape/settings/route.ts` | 抓取設定（自動頻率等） |
| `src/components/ScrapeChanges.tsx` | 待確認變更列表 UI |
| `src/components/ScrapeProgress.tsx` | 抓取進度 UI |
| `src/components/ScrapeCompareModal.tsx` | 變更比對 Modal |
| `src/components/ScrapeSettings.tsx` | 抓取設定 UI |

### 變更類型

| change_type | 說明 | 套用行為 |
|---|---|---|
| `new_trip` | 朋威有、我們沒有 | 新增行程 + 出發日期 + 重建 `departure_info_map` + 轉換 `promo_text` → `promo_content`/`promo_enabled` |
| `removed` | 我們有、朋威沒有 | 標記 `is_active=false` |
| `price` | 價格變更 | 更新 `price_range` + 重建 `departure_info_map` |
| `price_detail` | 售價明細 5 欄 | 更新 `trip_banner.price_detail` + 重建 `departure_info_map` |
| `flight` | 航班變更 | 更新航段資訊（trip_banner 合併） |
| `departure` | 出發日期/機位 | DELETE + INSERT `trip_departure_dates` + 重建 `departure_info_map` + 重新套用優惠標籤 |
| `info` | 標題/天數/標籤等 | 更新對應欄位（`display_order` 僅在 field_name 為 display_order 時寫入） |
| `promotion` | 優惠方案文字 | 更新 `trip_banner.promo_content`/`promo_enabled` + 對符合日期的出發梯次加上「限時優惠」標籤 |
| `new_tab` | 朋威新增的 tab/區域 | 僅通知（需手動新增 destination） |

### 套用邏輯注意事項

- **`departure_info_map` 重建**：`price`、`price_detail`、`departure`、`new_trip` 變更都會觸發重建，確保前端售價 Modal 顯示最新資料
- **`display_order` 保護**：套用 `price`/`flight`/`promotion` 等非排序變更時，不會覆寫手動調整的排序
- **`promo_text` 轉換**：新行程自動將 `promo_text` 轉為 `promo_content`/`promo_enabled`；既有行程走 `promotion` 變更類型處理
- **圖片自動上傳**：`cover_image_url` 若為外部 URL，套用時自動下載並上傳 Supabase Storage
- **`side_image_url` 保留**：合併 trip_banner 時，既有的 `side_image_url` 和 `departure_info_map` 不被覆蓋
- **PDF 自動清除**：套用 `price`/`price_detail`/`info`/`departure`/`flight`/`new_trip` 變更後，清除 `document_url` 讓下次自動重抓
- **標籤套用時再清洗**：`info`／`new_trip` 寫入 `trip_banner.tags` 前會用 `resolveBannerTags` 再清一次（去 `(首頁)` 前綴／航空名／贈品備品／促銷雜訊，>14 字剔除），清空則用標題 `extractSellingPoints` 補上——與 `auto-scrape.mjs` 的 `normalizeTag` 同一套規則。**確保不論 pending_changes 何時抓取、從後台或 DevMode 套用，寫進 DB 的標籤都乾淨一致。改清洗規則時三處要同步**（`auto-scrape.mjs` normalizeTag、`api/scrape/apply` cleanTag、此規則）。

### 抓取欄位 → 前端欄位對應表

| 抓取欄位 | 寫入位置 | 前端使用處 |
|---------|---------|-----------|
| title | `trips.title` | TripCard 標題、行程詳情頁標題 |
| subtitle | `trips.subtitle` | 行程詳情頁副標題 |
| duration | `trips.duration` | TripCard 天數標籤 |
| price_range | `trips.price_range` | TripCard 價格、Banner 價格 |
| cover_image_url | `trips.cover_image_url` | TripCard 封面、行程頁主圖 |
| code_label | `trip_banner.code_label` | 行程詳情頁 Banner（團型編號） |
| tags | `trip_banner.tags` | TripCard 標籤、行程頁標籤 |
| departure_label | `trip_banner.departure_label` | 行程頁 Banner（出發地） |
| duration_label | `trip_banner.duration_label` | 行程頁 Banner（天數標示） |
| min_group_size | `trip_banner.min_group_size` | 行程頁（成團人數） |
| price_detail (tab分隔) | `trip_banner.price_detail` → 經 `rebuildDepartureInfoMap` 轉為 `departure_info_map[depId].price_detail` (JSON) | 行程頁售價明細 Modal |
| promo_text | `trip_banner.promo_content` / `promo_enabled` | TripCard 限時優惠標籤、行程頁優惠區塊 |
| departures[] | `trip_departure_dates` | 出發日期卡片、日期選擇器 |
| flight_segments[] | `trip_departure_dates.flight_segments` + `outbound_*` / `return_*` | 行程頁航班資訊區塊 |
| airport | `trip_banner.airport`（額外欄位） | 僅 ScrapeCompareModal 比對用，前端頁面不直接顯示 |
| airline | `trip_banner.airline`（額外欄位） | 僅 ScrapeCompareModal 比對用，前端從 `departure_dates[].airline` 取 |

### 待確認變更 UI

- **勾選機制**：checkbox 多選 + 全選/取消全選
- **自動刷新開關**：打開後每 5 秒自動拉取最新 pending changes
- **按鈕**：清除已選、更新已選、全部清除、全部更新、清除已處理紀錄
- **分組**：按 `region_label` 分地區顯示
- **圖片**：從 `scraped_data.cover_image_url` 顯示縮圖

---

## 17. 首頁導航列

### 結構

- **半透明深色導航列**：`bg-[#354559]/85 backdrop-blur-md`，全寬延展
- **文字色**：`text-white/80`，hover 金色 `text-[#d4a853]`
- **Hover 下拉選單**：半透明深色 `bg-[#354559]/80 backdrop-blur-md`
  - 有 sub_region 的區域：分組顯示（北海道/東北/關東...）+ 金色分隔線
  - 無 sub_region 的區域：直接列出 destination 連結
- **Header**：`bg-white/50 backdrop-blur-[20px]` 半透明毛玻璃

### 導航列項目（與朋威一致）

台灣旅遊 → 日本 → 韓國 → 東南亞 → 歐洲 → 港澳大陸 → 中東亞非 → 南亞 → 紐澳美加 → 郵輪旅遊 → 自由行 → 高爾夫 → 客製旅遊

> 小三通套票、證件票券在搜尋列裡，不在導航列

---

## 18. 目的地頁快速分頁

- 在 Hero 圖片下方顯示同區域 destination 切換 tabs
- 按 `sub_region` 分組（如中東/中亞/西伯利亞），不是個別 destination
- 當前目的地深色填滿，其他淺色邊框
- 點擊切換到該 sub_region 的第一個 destination
- 只有一個目的地的區域不顯示 tabs
- 熱門推薦行程直接載入顯示（不用 lazy loading）

---

## 19. 區域與目的地對照表（DB 現狀）

| 區域 | destinations | 自動抓取 |
|---|---|---|
| 台灣旅遊 | 澎湖、花蓮台東、金門、馬祖 | ✅ |
| 日本 | 北海道、東北、關東、中部、關西、四國、九州、沖繩 | ✅ |
| 韓國 | 首爾、釜山、濟州 | ✅ |
| 東南亞 | 泰國、馬新、印尼、越南、菲律賓 | ✅ |
| 歐洲 | 中西歐、東歐、南歐、北歐 | ✅ |
| 港澳大陸 | 東北、華東、華中、華南、西南、西北 | ✅ |
| 中東亞非 | 中亞、中東、西伯利亞、高雄出發 | ✅ |
| 南亞 | 斯里蘭卡、不丹、馬爾地夫 | ✅ |
| 紐澳美加 | 紐約、雪梨、墨爾本等（待合併為紐澳/美加） | ✅ |
| 郵輪旅遊 | 沖繩、石垣島等 | ❌ 手動管理 |
| 自由行 | 東京、大阪、首爾等 | ✅ |
| 高爾夫 | 泰國高爾夫、日本高爾夫、越南高爾夫 | ✅ |
| 客製旅遊 | 家庭旅遊、蜜月旅遊、公司旅遊、小團包車 | ❌ 不需抓取 |

---

## 20. 選擇行程頁完整規則（`src/app/destination/[id]/page.tsx`）

> 這是全站最複雜的頁面（約 1814 行），維護「當前 destination 行程」與「合併兄弟行程」雙狀態源。**修改此頁前必讀本章全部。**

### 20.0 頁面職責

- 顯示某目的地（destination）底下的所有行程卡片
- 支援三層 tab 篩選、多目的地合併顯示（merged mode）、深層連結（URL 參數）
- DevMode 下可新增/刪除/複製/隱藏/恢復/排序/編輯行程、觸發自動抓取

### 20.1 雙狀態源（最高優先規則，違反 = 資料不同步）

此頁同時維護兩個行程狀態：

| State | 型別 | 意義 |
|---|---|---|
| `trips` | `Trip[]` | 當前 destination 的行程 |
| `subRegionTrips` | `Trip[] \| null` | 合併的兄弟 destination 行程（merged mode / 多-dest sub_region 顯示用；`null` 表示未啟用合併） |

**規則：**
- **任何修改行程的 handler 都必須同時更新 `setTrips` 和 `setSubRegionTrips`。** 漏更新 `subRegionTrips` → 港澳大陸 / 日本 / 中東亞非等合併區域的 UI 不會反映變更。
- **欄位更新**一律走共用函式 `updateTrip(tripId, updater)`（它已同時 map 兩個 state）。
- **新增 / 刪除 / 隱藏 / 恢復 / 複製**等增減操作，必須分別對 `setTrips` 和 `setSubRegionTrips` 各做一次（`subRegionTrips` 為 `null` 時要保留 `null`，寫成 `prev => prev ? ... : null`）。
- **新增任何 handler 時，必須搜尋 `setTrips` 確認是否也需要 `setSubRegionTrips`。**

### 20.2 三層 Tab 系統（層級規則）

| 層級 | 名稱 | 顯示條件 | 分組依據 |
|---|---|---|---|
| 第一層 | Sub_Region tabs | `subRegionGroups.length > 1` | 依 `sub_region`（中東 / 中亞 / 西伯利亞…） |
| 第二層 | Destination tabs | `activeSubRegion !== '全部'` 且該 group 有 **2+ 個** destination | 個別 destination |
| 第三層 | Sub_Area tabs | `regionTabs.length > 0` 且 `activeSubRegion !== '全部'` 且該 sub_region 下 **只有 1 個** destination | 依 `sub_area`（曼谷 / 清邁…） |

**層級限制規則（不可違反）：**
- sub_region 下有 **2+ 個** destination 時，**只顯示第二層 destination tabs，不顯示第三層 sub_area tabs**（避免重複篩選）。
- sub_region 下只有 **1 個** destination 時，才顯示第三層 sub_area 細分。

### 20.3 Merged Mode（合併顯示）

- **白名單**：`MERGED_REGIONS = ['港澳大陸', '日本']`。只有這兩區走 merged mode。
- **啟用條件**：`allSingleDest`（所有 sub_region 都只有 1 個 destination）且 region 在白名單內。
- **行為**：跳過第一層 sub_region tabs，直接用 sub_area tabs（張家界 / 九寨溝…），初始顯示全部合併行程。
- sub_area 排序依 `CHINA_SUB_AREA_ORDER` / `JAPAN_SUB_AREA_ORDER` 常數，**新增 sub_area 要同步更新這兩個常數陣列**，否則新區塊排序會落到最後。
- **中東亞非不是 merged mode**：它是多-destination sub_region，走第二層 destination tabs。

### 20.4 URL 參數與深層連結

| 參數 | 函式 | 意義 |
|---|---|---|
| `?tab=` | `setTabParam()` / `getTabParam()` | 當前 sub_region 或 sub_area tab |
| `?all=1` | `getAllParam()` | 顯示整個 region 全部行程 |

- 所有 tab 點擊都要透過 `setTabParam` 寫入 URL，支援深層連結與返回。
- **`all=1` 優先於 tab restore**（修復多-dest region 全部標籤）。
- **sub_region 與 sub_area 撞名處理**：非 merged mode 的 URL `?tab=` 視為 **sub_region 名**，不可當 sub_area filter（否則撞名時誤篩，例如中東）。只有 merged mode 才從 URL 恢復 sub_area tab。

### 20.5 行程排序（`compareTrips`）

- 判定：`isInquiryOnly(trip) = trip.trip_banner?.custom_tour === true`（**只看洽詢加LINE 旗標**，不看有無出發日期）
- 排序優先級：**只有「洽詢加LINE」(custom_tour) 的行程排最後 → 其餘（含目前無出發日期）一律排前面 → 同組依 `display_order` → 再依 `id` 穩定排序**。
- 注意：日期過期但未設 custom_tour 的真實產品仍排前面，不因無出發日被埋到後段。
- **前後端一致**：`compareTrips`（此頁）與 `/api/destinations/[id]/trips/route.ts` 的 server 端排序邏輯**必須完全一致**，改一邊要同步改另一邊。
- 所有合併行程的地方（Phase 1 初始、合併兄弟、合併 group、切換 destination）都要 `.sort(compareTrips)`。

### 20.6 資料載入（兩階段）

- **Phase 1（阻塞）**：並行 `getDestination` + `getDestinationTrips` + `/api/destinations`（全部目的地清單）。設好 `destination`/`trips`/`subRegionGroups`/`regionTabs`，從 URL 恢復 tab，排序後**立即 `setLoading(false)`**。
- **Phase 2（背景）**：載入推薦行程、隱藏行程（DevMode）、兄弟 destination 行程與資訊（快取到 `siblingTripsCache` / `siblingDestsDataRef`）。merged mode 或有深層連結時，合併補齊 `subRegionTrips`。
- 讀取會被 DevMode 改動的資料一律 `cache: 'no-store'`。

### 20.7 DevMode 寫入 Handler 規則（逐一遵守 §4.1）

| Handler | 寫入方式 | `credentials:'include'` | `invalidateCache` | 更新雙狀態 |
|---|---|---|---|---|
| `updateTrip`（欄位更新共用） | — | — | 由呼叫端負責 | ✅ 同時更新兩者 |
| `handleCustomTourToggle` | PATCH `/api/trips/{id}` | ✅ | `dest-trips:`（切換後排序會變，另清 `trip:`） | ✅ |
| `handleHideTrip` | PATCH `{is_active:false}` | ✅ | `dest-trips:` + `trip:` | ✅ 移除 |
| `handleRestoreTrip` | PATCH `{is_active:true}` | ✅ | `dest-trips:` + `trip:` | ✅ 加回 |
| `handleAddTrip` | `createTrip()`（lib） | lib 內處理 | 由 lib / API 處理 | ✅ 加入 |
| `handleDeleteTrip` | `deleteTrip()`（lib） | lib 內處理 | 由 lib / API 處理 | ✅ 移除 |
| `handleDuplicateTrip` | `cloneTrip()`（lib） | lib 內處理 | 由 lib / API 處理 | ✅ 加入 |
| `handleReorder` / `handleTripReorder` | POST `/api/reorder` | ✅ | 排序即時樂觀更新，失敗回滾 | ✅（setItems） |

> 透過 `src/lib/supabase.ts` 的 `createTrip`/`deleteTrip`/`cloneTrip` 寫入時，`credentials` 與 `invalidateCache` 由 lib 統一處理；**不要在 handler 內重複清快取或漏加**。直接 fetch 的 handler（Hide/Restore/CustomTour/Reorder）則必須自帶 `credentials:'include'`。

### 20.8 UI 區塊清單（由上到下）

1. Loading spinner（`loading`）→ Error 頁（`error || !destination`）
2. **Hero 圖區**：目的地大圖 + 標題 + subtitle（切 tab 時 `heroDest` 跟著換）
3. **第一層 Sub_Region tabs** → **第二層 Destination tabs** → **第三層 / Merged Sub_Area tabs**
4. **搜尋條件 Banner**（`dateFilter || cityFilter`）+ 無符合梯次提示
5. **客製洽詢區塊**（無行程且非 DevMode）
6. **相關行程（同地區 / 同類別）**
7. **主行程列表**（TripCard 網格；DevMode 有上下移 / 拖曳 / 多選 / 新增按鈕）
8. **已隱藏行程區塊**（DevMode，`#hidden-trips-section`）
9. **熱門推薦 / fallback**
10. `SocialCta` + `FloatingContact`
11. **DevMode 浮動按鈕組**：「🔄 抓取此頁行程」「✅ 更新此頁 (N 筆)」
12. `Toast` + **抓取變更預覽 Modal**（套用前顯示每筆新舊值對照，確認才更新）

### 20.9 自動抓取（DevMode）

- 「全部」tab → 用 region key 觸發整區；否則觸發單一 destination（可帶 `selectedTripIds` 多選）。
- 觸發前檢查 destination 的 `source_url` 是否設定，未設定不可抓。
- 流程：POST `/api/scrape/trigger`（帶 `credentials`）→ 5 秒輪詢 `/api/scrape/progress` → `/api/scrape/changes` 取待確認 → **預覽 Modal 顯示新舊值** → 確認後逐筆 POST `/api/scrape/apply` → 清 `dest-trips:` / `trip:` / `regions` → 重新整理。
- 詳見 §16 自動抓取系統。

### 20.10 修改此頁 Checklist（每次都跑）

- [ ] 若動到行程狀態：`setTrips` 與 `setSubRegionTrips` 都更新了（欄位改用 `updateTrip`）
- [ ] 直接 fetch 寫入有 `credentials:'include'`
- [ ] 寫入成功後清了對的 `invalidateCache` prefix（見 §4.1 對照表）
- [ ] 若動到排序邏輯，前端 `compareTrips` 與 API route 同步
- [ ] 若新增 sub_area，更新了 `CHINA_SUB_AREA_ORDER` / `JAPAN_SUB_AREA_ORDER`
- [ ] tab 點擊有寫入 URL（`setTabParam`）
- [ ] 跑 `lsp_diagnostics`（此檔）確認乾淨

---

## 21. 行程檔案頁完整規則（`src/app/trip/[id]/page.tsx`）

> 全站改動最多、狀態最多的頁面（約 3273 行、59 個 useState）。負責單一行程的完整展示與 DevMode 深度編輯。**修改此頁前必讀本章全部。**

### 21.0 頁面職責

- 展示單一行程：Banner 資訊、售價明細、出發日期、航班、每日行程 / PDF、優惠、諮詢 CTA、側邊媒體、推薦行程
- DevMode 下可編輯上述所有欄位、上傳 / 刪除 PDF、從 PDF 抓取、觸發自動抓取、編輯限時優惠

### 21.1 資料模型（欄位歸屬，改前務必分清）

| 欄位群 | 存放位置 | 說明 |
|---|---|---|
| 基本 | `trips.{title, subtitle, price_range, duration, cover_image_url, destination_id, document_url}` | 行程主體 |
| Banner | `trips.trip_banner.{code_label, duration_label, min_group_size, airport, airline, tags, departure_label, price_label, seats_total, seats_available, deposit_label, side_image_url, custom_tour, promo_enabled, promo_content}` | 團型資訊區塊 |
| 售價明細 | `trip_banner.departure_info_map[departureId].price_detail`（JSON 字串） | 5 欄價格 + 訂金 / 房差 / 簽證 / 說明 |
| 出發日期 | `trip_departure_dates` 表（每梯次一列） | 日期 / 團位 / 價格 / 標籤 / 航段 |
| 航班 | `trip_departure_dates.flight_segments` + `outbound_*` / `return_*`（舊格式） | 航段陣列 |

- **售價明細必經 `parsePriceDetail` / `stringifyPriceDetail` 轉換**，不要直接手拼 JSON。
- **`airport` 欄位不在前端顯示**，僅供 PDF 抓取 / 比對，不要新增顯示它的 UI。

### 21.2 出發日期選擇邏輯

- `selectedDepartureId` 決定當前顯示的價格、航班、售價明細。
- 初始選梯次時，**優先選「有航班資料」的梯次**（有 `flight_segments` 或舊格式航班），不要盲選第一筆。
- API 已過濾：只回傳 `is_active` 且 `departure_date >= today` 的梯次，並依日期升冪排序。

### 21.3 航班顯示優先序

1. `selectedDeparture.flight_segments`（新格式，含 `date/airline/flight_number/dep_time/dep_airport/arr_time/arr_airport/next_day/day`）
2. 其他有航班的梯次 fallback
3. 舊格式 `outbound_*` / `return_*`

- **跨日班機**用 `next_day` 顯示「+1天」，不可省略。
- 時段標籤（早去 / 午去 / 晚去 + 早回 / 午回 / 晚回）由 `getScheduleLabel` 依起飛 / 抵達時間推算，不要硬編。

### 21.4 每日行程 vs PDF（互斥顯示）

- `trip.trip_days.length > 0` → 顯示 `DayItinerary`（每日摺疊面板）。
- 否則且有 `document_url` → 延遲載入 `PdfViewer`（滾動進視窗 600px 才載 pdfjs）。
- 兩者皆無 → 顯示「無行程」提示。
- **本專案行程主要用 PDF 取代每日行程**（見 §15），`trip_days` 通常為空。

### 21.5 DevMode 寫入 Handler 規則（全部遵守 §4.1）

所有寫入 handler **必須** `credentials:'include'`，成功後清 `invalidateCache('trip:'+tripId)` **和** `invalidateCache('dest-trips:')`（列表頁價格 / 標籤跟著行程走）：

| Handler | 用途 | 端點 |
|---|---|---|
| `saveSelectedDepartureInfo` | 編輯現有梯次 + banner | PATCH `/api/trips/{id}` + PATCH `.../departure-dates?dateId=` |
| `saveDepartureInfoAsFirstDeparture` | 新增第一個梯次 | POST `.../departure-dates` + PATCH `/api/trips/{id}` |
| `saveTripBannerOnly` | 只存 banner | PATCH `/api/trips/{id}` |
| （售價明細 Modal 儲存） | 5 欄價格 + 說明 | PATCH `/api/trips/{id}` + `.../departure-dates?dateId=` |
| （編輯行程資訊 Modal） | title/subtitle/price_range/destination_id | PATCH `/api/trips/{id}` |
| （優惠編輯） | `promo_enabled` / `promo_content` | PATCH `/api/trips/{id}` |
| PDF 上傳 | `uploadTripDocument()` | POST `.../upload-document`（清 `trip:`） |
| PDF 刪除 | `deleteTripDocument()` | DELETE `.../document`（清 `trip:`） |
| `confirmPdfSave`（PDF 抓取套用） | 寫入解析出的欄位 | PATCH `/api/trips/{id}` + 所有梯次 `.../departure-dates` |
| `handleApplyChanges`（自動抓取套用） | 套用待確認變更 | POST `/api/scrape/apply` |
| 建立目的地 | 編輯資訊時新增 destination | POST `/api/destinations`（清 `regions`） |

### 21.6 售價明細 5 欄（不可遺漏）

- 大人、小孩佔床、小孩不佔床、加床、嬰兒 —— 五欄都要能編輯與顯示。
- 用戶端「售價說明」彈窗（`showPriceInfoModal`）與 DevMode 編輯 Modal（`showPriceDetailModal`）共用同一份 `price_detail` 資料。
- 抓取來源寫什麼就填什麼，**不可自行填「洽詢」**（見 §15）。

### 21.7 PDF 抓取（`handlePdfScrape` → 預覽 → `confirmPdfSave`）

- 「📄 從 PDF 抓取」→ 解析 PDF → **變更預覽 Modal（每欄位新舊值對照，確認才儲存）** → 寫入。
- 自動更新欄位：`title / duration_label / airline / airport / departure_label / min_group_size / highlights / tags / flight_segments`。
- 寫入航班時**保留使用者原本的出發日標籤**（保證出團等），航段 date 用實際日期（非「第X天」文字）。

### 21.8 UI 區塊清單（由上到下）

1. `StickyHeader`（含 DevMode 切換）+ `InquiryButtons`（floating）
2. **標題區**：麵包屑 + 標題 + subtitle（DevMode 有「編輯資訊」）
3. **主格線**：左欄 `SideMediaCarousel` + 產品資訊卡（標籤 / 團號 / 航空 / 時段 / 日期 / 出發地 / 目的地 / 團位 / 成團人數 / 售價說明）；右欄出發日期表格（月份篩選 + LINE 詢問）；手機版合併卡
4. `DepartureDates` 卡片
5. **航班資訊**（桌面表格 / 手機卡片，去回程 / 轉機分色）
6. `DayItinerary` **或** `PdfViewer`（互斥）→ 無則「無行程」提示
7. **推薦行程**（懶載入，最多 6 筆，只收有出發日、排除客製與當前行程）
8. 分享 / 下載按鈕 → `InquiryButtons`（inline）→ `SocialCta`
9. **底部固定 CTA**：價格文字 + LINE 詢問（客製行程顯示「歡迎詢問出團資訊」）
10. **Modal 群**：編輯資訊 / 出發日期編輯 / 售價明細編輯 / 售價說明 / 手機日期選擇 / 下載門檻 / 分享門檻 / 限時優惠編輯 / 限時優惠彈窗 / PDF 變更預覽 / 抓取變更預覽

### 21.9 下載 / 分享門檻

- 首次下載 PDF 或分享前，顯示社群追蹤門檻（LINE / FB / IG）。
- 追蹤後設 `localStorage.social_followed='true'`，之後直接放行。
- PDF 下載走 `/api/download-trip-pdf?url=...&name=...`。

### 21.10 側邊媒體輪播（`SideMediaCarousel`）

- 資料存 `trip_banner.side_image_url`；輪播連結由元件自身管理。
- 高度對齊右欄（`videoMatchHeight`，測量 `rightColumnRef` - `titleRef`）。
- DevMode 下停止自動輪播，方便設定連結（見 §16 相關 commit）。

### 21.11 CTA 價格 / 訊息組建

- `ctaPriceText`：客製 → 「歡迎詢問出團資訊」；有選梯次 → `NT$ {price}`；否則 → `price_range` 或「歡迎詢問最新價格」。
- LINE 訊息一律帶「行程標題 + 團號 + 出發日期（非客製才有）+ 價格」。

### 21.12 修改此頁 Checklist（每次都跑）

- [ ] 改對欄位群位置（trips / trip_banner / departure_info_map / trip_departure_dates，見 §21.1）
- [ ] 寫入 fetch 有 `credentials:'include'`
- [ ] 成功後清 `invalidateCache('trip:'+tripId)` **和** `invalidateCache('dest-trips:')`（PDF 操作至少清 `trip:`）
- [ ] 對應 API route 有 `requireDevAuth()` 與 `Cache-Control: no-store`
- [ ] 前端 state 同步（`setTrip` / `setDepartureDates`）
- [ ] 售價明細經 `parse/stringifyPriceDetail`，五欄齊全
- [ ] 錯誤有 alert / Toast，不靜默失敗
- [ ] 跑 `lsp_diagnostics`（此檔）確認乾淨

---

## 最終規則

不得忽略以上任何規則。所有回覆與修改都必須完全遵守。
