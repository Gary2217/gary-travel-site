# CLAUDE.md - Gary Travel Site

> 任何 AI（Claude / GPT / 其他）在協助此專案時，都必須遵守以下所有規則。
> 回覆一律使用**繁體中文**。不可使用簡體中文或英文回覆。

---

## 1. 專案概述

- **專案**：旅遊規劃師蓋瑞 GARY 的旅遊網站
- **技術棧**：Next.js 14 App Router + TypeScript + Tailwind CSS + Supabase
- **部署**：Vercel（唯一正式環境，禁止依賴 localhost）
- **用戶流程**：LINE 六宮格入口 → 瀏覽目的地 → 查看行程 → 索取 PDF / 諮詢報價
- **UI 語言**：繁體中文（zh-TW）
- **媒體存儲**：Cloudflare R2（`gary-travel-media` bucket，公開 URL：`https://pub-3881231e994f4158b5d05c0ec109b3ef.r2.dev`）— 2025/07 從 Supabase Storage 完整遷移，Supabase Storage `images` bucket 已清空

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

### Claude 模型對照

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
| 圖片更換 | 換 `cover_image_url`、上傳 Cloudflare R2 |
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
│   ├── page.tsx                              # 首頁（目的地總覽 + 熱門行程）
│   ├── layout.tsx                            # Root layout
│   ├── loading.tsx                           # 全域 loading 頁
│   ├── not-found.tsx                         # 404 頁
│   ├── error.tsx                             # 全域 error 頁
│   ├── globals.css                           # 全域樣式（亮色主題）
│   ├── manifest.ts                           # PWA manifest
│   ├── robots.ts                             # SEO robots.txt
│   ├── sitemap.ts                            # SEO sitemap
│   ├── destination/[id]/page.tsx             # 目的地詳情 → 行程列表
│   ├── destination/[id]/layout.tsx           # 目的地 layout
│   ├── trip/[id]/page.tsx                    # 行程詳情 → 每日行程 + 諮詢
│   ├── search/page.tsx                       # 搜尋頁
│   ├── privacy/page.tsx                      # 隱私政策頁
│   ├── document-services/page.tsx            # 文件服務頁
│   ├── document-services/[id]/page.tsx       # 文件服務詳情
│   ├── mini-transit-tickets/page.tsx         # 迷你轉機票頁
│   ├── mini-transit-tickets/[id]/page.tsx    # 迷你轉機票詳情
│   ├── admin/page.tsx                        # 後台管理頁
│   └── api/                                  # API Routes
│       ├── regions/route.ts
│       ├── regions/[id]/related-trips/route.ts
│       ├── destinations/route.ts
│       ├── destinations/[id]/route.ts
│       ├── destinations/[id]/trips/route.ts
│       ├── trips/route.ts
│       ├── trips/[id]/route.ts
│       ├── trips/[id]/departure-dates/route.ts
│       ├── trips/[id]/clone/route.ts
│       ├── trips/[id]/scrape-pdf/route.ts
│       ├── trips/[id]/extract-text/route.ts
│       ├── inquiries/route.ts
│       ├── contact-forms/route.ts
│       ├── track-click/route.ts
│       ├── analytics/route.ts
│       ├── search/route.ts
│       ├── search-trips/route.ts
│       ├── popular-trips/route.ts
│       ├── popular-order/route.ts
│       ├── home-banners/route.ts
│       ├── reorder/route.ts
│       ├── upload-image/route.ts
│       ├── upload-trip-image/route.ts
│       ├── upload-trip-banner-image/route.ts
│       ├── upload-trip-document/route.ts
│       ├── download-trip-pdf/route.ts
│       ├── document-services/[id]/content/route.ts
│       ├── document-service-images/route.ts
│       ├── mini-transit-tickets/[id]/content/route.ts
│       ├── mini-transit-ticket-images/route.ts
│       ├── site-logo/route.ts
│       ├── site-logo/image/route.ts
│       ├── trip-side-media/route.ts
│       ├── maintenance/route.ts
│       ├── health/route.ts
│       ├── admin/stats/route.ts
│       ├── admin/optimize/route.ts
│       ├── admin/cleanup/route.ts
│       ├── admin/cleanup-orphan-images/route.ts
│       ├── dev-auth/start/route.ts
│       ├── dev-auth/line/route.ts
│       ├── dev-auth/logout/route.ts
│       ├── dev-auth/status/route.ts
│       ├── scrape/trigger/route.ts
│       ├── scrape/progress/route.ts
│       ├── scrape/changes/route.ts
│       ├── scrape/apply/route.ts
│       ├── scrape/settings/route.ts
│       └── og/route.tsx
├── components/
│   ├── StickyHeader.tsx                      # 頂部固定導航（含社群按鈕）
│   ├── SocialCta.tsx                         # 社群 CTA + 聯絡區塊
│   ├── FloatingContact.tsx                   # 浮動聯絡按鈕
│   ├── ContactFormModal.tsx                  # 聯絡表單 Modal
│   ├── ContactInquiries.tsx                  # 諮詢管理（Dev mode）
│   ├── InquiryButtons.tsx                    # 諮詢按鈕（floating / inline）
│   ├── TripCard.tsx                          # 行程卡片
│   ├── DayItinerary.tsx                      # 每日行程摺疊面板
│   ├── DepartureDates.tsx                    # 出發日期選擇
│   ├── HomeBannerCarousel.tsx                # 首頁 Banner 輪播
│   ├── SideMediaCarousel.tsx                 # 側邊媒體輪播
│   ├── TravelSearchBar.tsx                   # 旅遊搜尋列
│   ├── Skeleton.tsx                          # 骨架屏元件
│   ├── PdfViewer.tsx                         # PDF 檢視器
│   ├── FavoriteButton.tsx                    # 收藏按鈕
│   ├── ShareButton.tsx                       # 分享按鈕
│   ├── LegalNotice.tsx                       # 免責聲明
│   ├── MaintenanceGuard.tsx                  # 維護中守衛
│   ├── ImageEditor.tsx                       # 開發者模式圖片編輯器
│   ├── LogoUploader.tsx                      # Logo 上傳器
│   ├── DevModeToggle.tsx                     # 開發者模式切換
│   ├── Toast.tsx                             # Toast 通知
│   ├── ScrapeChanges.tsx                     # 待確認變更列表（Admin）
│   ├── ScrapeProgress.tsx                    # 抓取進度（Admin）
│   ├── ScrapeCompareModal.tsx                # 變更比對 Modal（Admin）
│   ├── ScrapeSettings.tsx                    # 抓取設定（Admin）
│   └── trip/                                 # 行程詳情頁子元件
│       ├── PriceInfoModal.tsx                # 售價說明 Modal（使用者端）
│       ├── DownloadGateModal.tsx             # 下載行程檔前的社群追蹤門檻
│       ├── ShareGateModal.tsx                # 分享前的社群追蹤門檻
│       ├── SourceUrlModal.tsx                # 設定朋威來源網址（Dev）
│       └── MobileDatePickerModal.tsx         # 手機版全螢幕出發日期選擇
└── lib/
    ├── supabase.ts                           # 型別定義 + fetch 輔助函式 + 社群連結常數
    ├── trip-format.ts                        # 行程頁共用純函式（售價/日期格式化）+ 售價明細型別
    ├── trip-format.test.ts                   # ↑ 的測試（含 86 筆真實資料快照）
    ├── __fixtures__/price-detail-real.json   # 正式 DB 的真實 price_detail（測試用）
    ├── __snapshots__/                        # vitest 快照 — 內容變動代表顯示輸出被改變
    ├── r2.ts                                 # Cloudflare R2 上傳/刪除/列表 + URL↔key 轉換
    ├── r2.test.ts                            # ↑ 的測試（r2KeyFromUrl 決定刪哪個檔，必須鎖死）
    ├── storage.ts                            # Supabase Storage path 解析（僅 cleanup-orphan-images 使用）
    └── external-link.ts                      # 外部連結安全開啟工具

scripts/                                      # 一次性工具，不會被 app 引用
├── auto-scrape.mjs                           # 核心爬蟲（GitHub Actions 執行）— 見 §16
├── check-secrets.mjs                         # 硬編碼金鑰掃描（CI 第一步）— 見 §9
├── dump-price-detail-fixture.mjs             # 重產測試 fixture（連正式 DB）
└── （其餘為歷史性的一次性修補／匯入腳本，多數已無用途）
```

> **`scripts/` 的金鑰規則跟 `src/` 完全一樣** —— 一律 `getEnv()` 從 `.env.local` 讀。
> 「這只是一次性腳本」不是硬編碼的理由：2026-07 的 R2 金鑰外洩就是這樣發生的（§9）。

---

## 3.5 測試（vitest）

```bash
npm test          # 執行全部測試（CI 會在 type-check 之後、build 之前跑）
npx vitest        # watch 模式（本機開發用）
```

> ### ⚠️ 動到 package.json 時必讀：lockfile 一律用 npm 10 產生
>
> CI 的 `.nvmrc` 是 Node 20，內建 **npm 10**。若你的本機是 npm 11（Node 22+ 內建），
> 直接跑 `npm install` 會產生 **npm 10 讀不懂的 lockfile**，CI 會在
> `Install dependencies` 這一步就掛掉，連測試都跑不到：
>
> ```
> npm error `npm ci` can only install packages when your package.json and
> npm error package-lock.json are in sync.
> npm error Missing: @emnapi/core@1.11.1 from lock file
> ```
>
> 原因：npm 11 會把巢狀相依去重，npm 10 卻要求那些條目必須存在。
> lockfile 必須由**會消費它的最舊 npm** 產生（npm 10 產的 npm 11 讀得懂，反之不行）。
>
> **正確做法**（先確認 `npm -v`，是 11 才需要這樣做）：
> ```bash
> npx -y npm@10 install              # 用 npm 10 產生 lockfile
> npx -y npm@10 ci --dry-run         # 用 CI 的版本驗證，exit 0 才算過
> ```
>
> **不要用 `npm install` 成功當作 CI 會過的證據** —— 兩者用的是不同的 npm，
> 而 `npm install` 容忍不一致、`npm ci` 不容忍。

> **這是「不要引入不必要依賴」的唯一例外**，經使用者明確同意後導入。
> 不要因為看到該規則就移除 vitest。

### 現有測試（34 個，2 檔）

| 檔案 | 測什麼 |
|------|--------|
| `src/lib/trip-format.test.ts` | 售價解析／顯示、寫入 DB 的 payload、過期梯次過濾。含 **86 筆正式資料的顯示快照** |
| `src/lib/r2.test.ts` | `r2KeyFromUrl` —— 它決定「刪除時要刪哪個 R2 檔」，解析錯就是刪錯且不可復原 |

### 為什麼有測試

`src/lib/trip-format.ts` 的售價解析曾有 bug：用 `||` 導致空字串被預設值蓋掉，
售價欄位永遠清不掉。修這個 bug 的前提是能證明「客人看到的畫面沒變」——
這就是 `__fixtures__/price-detail-real.json`（正式 DB 的 86 筆真實 price_detail）
與 `__snapshots__/` 的用途。

### 規則

| 規則 | 說明 |
|------|------|
| 只測純函式 | 目前僅測 `src/lib/*.ts` 的純函式。不裝 jsdom / testing-library，不測元件渲染 |
| 測試必須 import 本體 | **絕不可另抄一份邏輯來測**。副本必然與本體漂移，等同 `a280bb7` 的覆轍（複製 762 行卻從未接上），毫無價值 |
| 測試必須封閉 | 不讀 `.env`、不連 DB、不打網路。CI 沒有這些 |
| 需要「現在幾點」的函式，時間要用參數傳入 | 否則相依系統時鐘而無法測試（`filterUpcomingDepartures` 的 `today` 參數即為此） |
| 改 `trip-format.ts` 前先跑 `npm test` | 若 `__snapshots__/` 有變動，代表**客人看到的顯示輸出被你改變了**。除非那正是你的意圖，否則回退 |
| 改動高風險邏輯的順序 | **先寫測試固化現況 → 再改 → 快照不動才算過**。順序顛倒的話，測試固化的是壞掉的結果 |
| 重產 fixture | `node scripts/dump-price-detail-fixture.mjs`（會連正式 DB，需 `.env.local`） |

### ⚠️ 綠燈不等於有效 —— 測試本身也要被測

寫完檢查工具後，**必須拿一個「應該被抓到」的真實案例去試，確認它真的會紅**。

實例：`scripts/check-secrets.mjs` 初版跑「現況掃描」是綠的，看起來能用。
但拿 git 歷史還原真正的外洩檔去測 —— **它完全沒抓到**。原因是變數名的字元類
寫成 `[A-Za-z_]*` 不含數字，而外洩的變數正好叫 `R2_ACCESS_KEY_ID`，
那個「2」讓整條比對失敗。修好後它立刻抓到另一個先前用 grep 漏掉的檔案。

**「現況通過」只證明現在沒東西可抓，不證明它有能力抓。**

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
| 所有資料來自 Supabase | DB 為唯一真實來源，不用本地暫存當資料來源 |
| 圖片必須存 Cloudflare R2 | 從朋威或任何外部來源抓取的圖片，**必須下載後上傳 Cloudflare R2**（bucket：`gary-travel-media`），`cover_image_url` 只能存 R2 公開 URL（`https://pub-3881231e994f4158b5d05c0ec109b3ef.r2.dev/images/...`），**禁止直接引用外部 CDN 連結**（如 `dcimg.travel.net.tw`）。所有上傳／爬取路由（含 `scrape/apply`）皆透過 `src/lib/r2.ts` 上傳至 R2，物件 key 一律含 `images/` 前綴。 |
| next.config.mjs 白名單 | `remotePatterns` 與 CSP `img-src` 已含 `*.r2.dev`，新增其他圖片來源時需同步更新這兩處 |
| 前端只負責顯示 | 不持有核心資料邏輯 |
| 過期梯次只在顯示層過濾 | 見 §4.1 |
| 刪 R2 檔前必須反查引用 | 見 §4.2 |

### 4.1 過期出團梯次：只過濾顯示，不刪資料

客人不該看到已經出發的團（否則會對著上個月的日期詢價），但**過期梯次是歷史紀錄，
不可從 DB 刪除** —— 查帳與參考都還需要，刪了拿不回來。

- 統一用 `filterUpcomingDepartures(dates, isDevMode, todayLocalISO())`（`src/lib/trip-format.ts`）
- **開發者模式傳 `isDevMode` 保留全部**，否則你會看不到、也改不了過期梯次
- 當天出發視為未過期（用 `>=`）；`departure_date` 為空的一律保留
- 新增任何顯示梯次的地方（清單、月份分頁、日期選擇器、航班區塊）都要用過濾後的清單，
  **只漏一處就會讓過期日期從那裡漏出來**

> 2026-07-17 修復前實測：178 個上架行程中有 74 筆已出發的梯次仍顯示給客人，
> 影響 27 個行程，最舊的是一個月前。不只是「完全沒有未來梯次」的行程 ——
> 有 26 筆可報名梯次的卡片同時混著 8 筆過期的。

### 4.2 🔴 R2 檔案刪除：兩個必須反查的前提

**寫任何刪除 R2 檔案的程式前，這兩點沒搞懂就會刪掉正在用的檔案。**

**(1) 有三個資料夾是「R2 即資料來源」，DB 完全不會引用它們**

| 前綴 | 誰在用 |
|---|---|
| `images/site/` | `api/site-logo` — 用 `r2List()` 直接列 R2 |
| `images/document-services*` | `api/document-service-images` — 同上 |
| `images/mini-transit-tickets` | `api/mini-transit-ticket-images` — 同上 |

這些功能**檔案本身就是資料**。任何「DB 沒引用就刪」的邏輯都會把它們全部刪光。

**(2) 檔案可能被多個行程／目的地共用**

早期「複製卡片」會讓副本與原卡共用同一份 R2 檔（已於 `503ab86` 改為複製新檔，
但在那之前產生的卡片仍共用）。刪除前必須反查其他行程／目的地／side_media
是否仍在引用，**只刪無人引用的 key**。

`api/trips/[id]` 與 `api/destinations/[id]` 的 DELETE 都已實作此反查，可作為範本。
兩者也示範了「反查必須在任何刪除動作之前算完」—— 資料刪掉了就查不到了。

> `api/admin/cleanup-orphan-images` 目前掃的是已清空的 Supabase Storage bucket，
> 對 R2 完全瞎眼，是個無害但也無用的空殼。要讓它真的能用，必須先處理上面兩點。
> **修法已於 2026-07-18 評估設計完成，見 §21.1** —— 實作時照那份設計做，不要重新發明。

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

> 正式環境設在 **Vercel → Settings → Environment Variables**；本機設在 `.env.local`
> （已被 `.gitignore` 排除且從未被提交過）。**任何一個都不可寫進程式碼** — 見 §9。

### 公開（`NEXT_PUBLIC_*`，會被打包進前端，非機密）

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase 專案 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous key（受 RLS 保護）
- `NEXT_PUBLIC_LINE_ID` — LINE 官方帳號 ID
- `NEXT_PUBLIC_FB_URL` — Facebook 粉專連結
- `NEXT_PUBLIC_IG_URL` — Instagram 連結
- `NEXT_PUBLIC_DEV_PASSWORD` — 開發者模式密碼

### 機密（只在 server 端讀取，外洩即須撤銷重發）

- `SUPABASE_SERVICE_ROLE_KEY` — 繞過 RLS 的完全存取權
- `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` — Cloudflare R2 憑證
  （由 `src/lib/r2.ts` 以 `process.env` 讀取；scripts 用 `getEnv()` 從 `.env.local` 讀）
- `DEV_AUTH_SECRET` — 開發者模式 cookie 的 HMAC 簽章金鑰
- `LINE_LOGIN_CHANNEL_ID` / `LINE_LOGIN_CHANNEL_SECRET` — LINE 登入
- `DEV_LINE_USER_ID` — 允許進入開發者模式的 LINE user id
- `GH_PAT` — GitHub token（觸發 Actions 抓取用）

---

## 9. 安全與風險控制

- 不可破壞現有邏輯
- 不可進行大規模重構（除非明確允許）
- 有風險時必須先提醒再執行
- 優先選擇最安全、最穩定方案
- 禁止隱藏 fallback 或不可靠 hack

### 🔴 金鑰處理鐵則

> **這個 repo 是 public。任何寫進程式碼的東西 = 公開發佈給全世界。**

| 規則 | 說明 |
|------|------|
| 金鑰只能放 `.env.local` | 該檔已被 `.gitignore` 排除且從未被提交過，是唯一安全的位置 |
| 正式環境金鑰放 Vercel | Settings → Environment Variables，程式用 `process.env.X` 讀取 |
| **絕不寫進任何 `.ts` / `.mjs` / `.md`** | 包含「暫時的」「一次性的」腳本 —— 事故就是這樣發生的 |
| 權限給最小 | R2 token 用 Object Read & Write（不是 Admin），且只綁 `gary-travel-media` |
| 不要把金鑰貼進聊天視窗 | 包含**截圖**。對話紀錄無法事後刪除 |

#### 事故紀錄：2026-07-10 ~ 07-17，R2 金鑰外洩 7 天

`scripts/migrate-to-r2.mjs`（commit `61c34fe`）把 R2 的 Access Key ID 與
Secret Access Key **明文硬編碼**在程式碼裡，推上 public repo，**公開 7 天**才被發現。
該金鑰可對 `gary-travel-media` 的所有物件讀寫刪除 —— 亦即可刪光全站圖片與 PDF。

- **發現經過**：想稽核 R2 孤兒檔時，發現 `.env.local` 根本沒有 R2 憑證，
  追查文件為何說「應該有」時翻到那個檔。**是意外撞見的，不是任何機制擋下來的。**
- **處置**：Cloudflare 撤銷舊 token → 建立新 token（權限收斂）→ 更新 Vercel →
  實測上傳確認 → 撤銷舊 token → **實際用外洩金鑰打 R2 確認回傳 Unauthorized**
- **止血**：`scripts/migrate-to-r2.mjs` 已刪除
- **未造成損害**：帳單 $0.00、2,040 個物件完好，無異常存取跡象
- **僥倖之處**：該 token 權限本就收斂（非 Admin、僅綁單一 bucket），
  否則攻擊者可刪除整個 bucket 或觸及其他 Cloudflare 服務

**教訓**：刪掉檔案沒有用 —— commit 永遠留在歷史裡，且早已被公開索引。
**唯一有效的補救是讓金鑰失效。** 所以一開始就不要寫進去。

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

### Git Push 格式（強制）

每次 `git push` 完成後，回覆最後**必須**附上：

```
✅ 已推送：{短 hash} — {中文說明（8-15字）}
```

範例：`✅ 已推送：53f4498 — 允許 Cloudflare R2 圖片（Next.js + CSP）`

目的：讓用戶在 Vercel Dashboard 的 Source 欄位快速比對 commit，確認部署同步。

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
- **不要**引入不必要依賴（唯一例外：vitest，見 §3.5。不要移除它）
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

- 🔴 **所有金鑰一律從 `.env.local` 讀取，禁止硬編碼在 script 中** —— 適用於
  `SUPABASE_SERVICE_ROLE_KEY`、`R2_ACCESS_KEY_ID`、`R2_SECRET_ACCESS_KEY`、
  `DEV_AUTH_SECRET`、`GH_PAT`，以及任何未來新增的憑證。**沒有例外**。
  詳見 §9 的實際事故紀錄。
- **圖片處理**：先下載到本地 → 上傳 **Cloudflare R2**（`gary-travel-media` bucket，key 格式：`images/trips/<filename>`）→ 公開 URL 格式：`https://pub-3881231e994f4158b5d05c0ec109b3ef.r2.dev/images/trips/<filename>`
- **R2 上傳需 AWS SDK**：`import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'`，R2 endpoint：`https://a85c4f2e46761d22faa6ad37731d6d92.r2.cloudflarestorage.com`
  （Access Key 從 `.env.local` 的 `R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY` 讀取。
  可參考 `src/lib/r2.ts` 的寫法 —— 它示範了正確的 `process.env` 讀取方式。）
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
- **圖片自動上傳**：`cover_image_url` 若為外部 URL，套用時 `ensureR2Image()` 自動下載並上傳至 R2（透過 `src/lib/r2.ts`）
- **`side_image_url` 保留**：合併 trip_banner 時，既有的 `side_image_url` 和 `departure_info_map` 不被覆蓋
- **PDF 自動清除**：套用 `price`/`price_detail`/`info`/`departure`/`flight`/`new_trip` 變更後，清除 `document_url` 讓下次自動重抓

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

## 20. MCP 工具（已安裝）

Claude Code 已安裝以下 MCP，可直接呼叫：

| 工具 | 用途 | 何時用 |
|------|------|--------|
| **Context7** | 即時抓取第三方套件官方文件 | 查 Next.js / Supabase / Tailwind API、版本特定行為、deprecated 替換方案 |
| **Playwright** | 控制瀏覽器自動化 | 爬蟲測試、截圖驗證、UI 自動化（不可用於繞過 CAPTCHA） |
| **GitHub** | 操作 GitHub API | 查 issue / PR、建立 PR、查 Actions 執行狀態 |

> Context7 使用規則：遇到任何第三方 library API 問題，**優先呼叫 Context7 取得新文件**，不靠訓練資料記憶，避免版本過時的錯誤。

---

## 21. 已知待處理事項

> 最後更新：2026-07-17

### 需要程式處理

| 項目 | 說明 | 優先度 |
|------|------|--------|
| R2 bucket CORS（PDF 直傳） | `upload-trip-document` 用 R2 presigned PUT 讓瀏覽器直傳，需在 Cloudflare 為 `gary-travel-media` 設定 CORS（允許 production/localhost 的 PUT），否則 PDF 上傳被瀏覽器擋 | 高 |
| 訂金欄位清不掉 | `buildDepartureInfoPayload` 的 deposit 走 `草稿 \|\| banner.deposit_label \|\| 預設值`，空字串會穿透。**客人看不到此欄位**（售價彈窗不渲染 deposit，客人看到的訂金來自 `trip_banner.deposit_label`），故僅為開發者困擾。行為已由測試釘住 | 低 |
| R2 孤兒檔清理（含 `cleanup-orphan-images` 空殼） | **2026-07-18 已完成評估與修法設計，見 §21.1**。刻意不執行：帳單 $0.00（免費額度 10 GB，現用 1.58 GB），且不會再累積。逼近 10 GB 時照 §21.1 的設計實作 | 低 |
| 4 組跨卡共用的 R2 檔 | 早期複製卡片所致。刪除路徑已有反查保護，不會出事。根本解是讓每張卡各持一份 | 低 |
| `destination/[id]/page.tsx` 1,861 行 | 結構比 trip 頁單純（33 個 useState、僅 1 個彈窗）。可比照 trip 頁手法拆分 | 低 |
| Node 20 deprecation | GitHub 警告 `actions/checkout@v4`、`actions/setup-node@v4` 的 Node 20 執行環境將淘汰。**注意 `.nvmrc` 同時影響 Vercel 建置**，升版前需確認 | 低 |

### 需要使用者決定／操作

| 項目 | 說明 |
|------|------|
| 12 個上架行程無未來出團日 | 7 個梯次全過期、5 個從未設過（含 2 張高球卡）。使用者已決定（2026-07-18）：不下架，之後自行補日期。客人目前看到「尚未設定出團日期」 |
| ~~6 個目的地無封面圖~~ ✅ 2026-07-18 已補 | 6 個空封面用旗下行程封面補齊；另 21 個原本用外部 Unsplash 連結（違反 §4）的目的地一併轉存至 R2。全 66 個上架目的地現皆為 R2 封面、HTTP 實測 0 破圖 |
| ~~13 筆待確認的抓取變更~~ ✅ 已清空 | 2026-07-18 實查 `pending_changes` 的 pending = 0 |
| 「童趣阿聯酋」封面是 LINE 廣告圖 | 2026-07-17 測試上傳時覆蓋，原圖已被自動清除。用卡片上的「抓取此行程」可從朋威還原 |
| ~~Google Ads ↔ GA4 CSP 錯誤~~ ✅ 2026-07-18 分兩階段修好 | **第一階段**：GA4 Consent Mode 回報端點 `www.google.com/ccm/collect` 被 CSP 擋，已加入 `next.config.mjs` 的 `connect-src`/`img-src`。**第二階段**：使用者截圖顯示仍有 `ad.doubleclick.net/ccm/s/...` 被擋 —— 根因是 `layout.tsx` 只關了 `allow_google_signals`/`allow_ad_personalization_signals`，這兩者不控制 Conversion Linker（獨立機制，預設開啟，會 ping doubleclick 同步 `_gcl_*` cookie）。已加 `conversion_linker:false`（官方文件證實的正確關閉方式）。⚠️ **意外發現**：GA4 collect 請求中帶有真實的 `AW-11027271481`（Google Ads 帳戶 ID），代表 GA4 後台**確實連結了 Google Ads 帳戶**，並非單純殘留設定 —— 與程式註解「未投放 Google 廣告」的假設矛盾，此為帳戶層級設定，需使用者自行到 GA4 後台的「Google Ads 連結」確認是否要保留 |

### 21.1 R2 孤兒檔清理 — 已評估的修法設計（2026-07-18，尚未實作）

> 使用者要求「先評估查清楚、確認不會修壞」。評估已完成（全程唯讀），
> 結論：**設計可行且已驗證安全，但現在不值得執行** —— 帳單 $0.00、
> 清 1 GB 省不到錢，而孤兒的成因（刪行程／目的地不清 R2）已於 2026-07-17 修好，
> 不會再累積。逼近 10 GB 免費額度時再照此設計實作。

#### 現況數字（2026-07-18 全 DB 徹底稽核）

| 分類 | 數量 | 大小 |
|---|---|---|
| R2 物件總數 | 2,072 | 1,576 MB |
| 被 DB 引用（在用） | 628 | — |
| R2 即資料來源（受保護，見 §4.2） | 20 | 22.8 MB |
| **孤兒（可刪候選）** | **1,424** | **1,008 MB（64%）** |
| DB 引用但 R2 不存在（破圖） | 0 | ✅ |

孤兒分佈：`images/trips` 1,088、`images/trips/banner` 178、
`images/trip-documents/*` 98（372 MB，舊版 PDF 路徑）、`images/flights` 45
（廢棄航班圖，flight_routes 引用 0 次）、`images/documents` 13、`images/destinations` 2。

#### 為什麼現有的 `cleanup-orphan-images` 不能用

整支 route 操作的是 **Supabase Storage**（已清空的舊 bucket）：列檔用
`supabase.storage.list()`（列到 0 個）、認引用用 `getStoragePathFromPublicUrl()`
（對 R2 網址一律回 null）。跑起來永遠「0 孤兒、什麼都沒刪」。
它的「site／document-services／mini-transit-tickets 只留最新」骨架方向正確，
但用寫死的 ID 清單（roc0001…），新增服務就會漏 → 誤刪。

#### 修法設計（實作時照此做）

1. **列 R2**：`r2List` 分頁列出全部物件
2. **收集引用**：掃**每一張 DB 表的完整列 JSON**，正則抓所有 `r2.dev/<key>` ——
   不靠列舉欄位，新增表／欄位也不會漏
3. **保護 §4.2 的三個前綴**：`images/site/`、`images/document-services`、
   `images/mini-transit-tickets` 整個不碰（R2 即資料來源，DB 必然不引用）
4. **時間過濾**：只考慮 LastModified 在 **7 天前**的檔 —— 防「剛上傳、引用還沒寫進 DB」的 race
5. **永遠先 dry-run** 輸出完整清單，人工確認後才刪
6. **刪除前重新收集一次引用**（double-check）＋ 數量上限 ＋ 分批刪

#### 安全性驗證紀錄（為什麼確信不會刪錯）

- 結構化欄位收集 vs 全 JSON 掃描，孤兒數**完全一致（1,424）** → 引用收集無遺漏
- 全 DB 每張表都掃過：trips／destinations／site_settings 有引用；
  trip_departure_dates、flight_routes、regions、pending_changes、analytics_events、
  click_analytics、contact_forms、scrape_logs 全部 **0 個 R2 網址**
- DB 引用的 628 個 key **全部存在於 R2**（0 破圖）→ 引用集正確性的反向證明
- 殘留風險（誠實記錄）：理論上仍可能有「想不到的地方存了網址」，
  由時間過濾＋dry-run 人工審查＋數量上限三層兜底

---

## 最終規則

不得忽略以上任何規則。所有回覆與修改都必須完全遵守。
