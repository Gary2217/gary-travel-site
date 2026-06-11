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

---

## 2. 模型分流規則（省 Token 最優先）

**原則：預設 Haiku，確實不夠才升 Sonnet，極少用 Opus。**

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

## 最終規則

不得忽略以上任何規則。所有回覆與修改都必須完全遵守。
