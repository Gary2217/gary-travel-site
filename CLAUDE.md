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

## 2. 模型分流規則（省 Token 優先）

預設用最低層級模型，只有確實需要才往上升。

### Claude 模型

| 層級 | 模型 | 適用場景 |
|------|------|----------|
| 🔴 重度（少用） | **Opus** | 跨 5 檔以上架構重構、DB schema 重新設計（非新增欄位）、找不出原因的跨檔 bug、安全性審查 |
| 🟡 主力 | **Sonnet** | 新功能開發（頁面、元件、API route）、2-4 檔重構、Code review、效能優化、SQL migration、CLAUDE.md 更新、中等複雜度除錯 |
| 🟢 輕量（優先用） | **Haiku** | 文案修改/翻譯、Tailwind 樣式微調（顏色、間距、字體）、新增/修改 env 變數、格式修正/import 排序、明確的單行 bug fix、已知解法套用（如加 `"use client"`）、git commit message |

### GPT 模型

| 層級 | 模型 | 適用場景 |
|------|------|----------|
| 🔴 重度（少用） | **GPT-4o** | 同 Opus 適用場景 |
| 🟡 主力 | **GPT-4o-mini** | 同 Sonnet 適用場景 |
| 🟢 輕量（優先用） | **GPT-4.1-nano** | 同 Haiku 適用場景 |

### Token 節省策略

- 預設用最低層級，確實不夠才升級
- 不跑不必要的背景探索任務，用直接讀取檔案方式
- 一次只修必要檔案，不做「順便改善」
- 回覆精簡，不加多餘解釋或寒暄
- 不掃描整個 repo，只看相關檔案

---

## 3. 目錄結構（不要自己發明新的）

```
src/
├── app/
│   ├── page.tsx                         # 首頁（目的地總覽）
│   ├── layout.tsx                       # Root layout
│   ├── globals.css                      # 全域樣式（深色主題）
│   ├── destination/[id]/page.tsx        # 目的地詳情 → 行程列表
│   ├── trip/[id]/page.tsx               # 行程詳情 → 每日行程 + 諮詢
│   └── api/                             # API Routes
│       ├── regions/route.ts
│       ├── destinations/[id]/route.ts
│       ├── destinations/[id]/trips/route.ts
│       ├── trips/[id]/route.ts
│       ├── inquiries/route.ts
│       ├── track-click/route.ts
│       └── upload-image/route.ts
├── components/
│   ├── StickyHeader.tsx                 # 頂部固定導航（含社群按鈕）
│   ├── SocialCta.tsx                    # 社群 CTA 區塊
│   ├── InquiryButtons.tsx               # 諮詢按鈕（floating / inline）
│   ├── InquiryForm.tsx                  # 線上諮詢表單
│   ├── TripCard.tsx                     # 行程卡片
│   ├── DayItinerary.tsx                 # 每日行程摺疊面板
│   ├── ImageEditor.tsx                  # 開發者模式圖片編輯器
│   ├── DevModeToggle.tsx                # 開發者模式切換
│   └── Toast.tsx                        # Toast 通知
└── lib/
    └── supabase.ts                      # 型別定義 + fetch 輔助函式 + 社群連結常數
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
| 前端只負責顯示 | 不持有核心資料邏輯 |

---

## 5. 樣式規則

### 深色毛玻璃主題（照抄，不要自創）

```
背景漸層：bg-[linear-gradient(135deg,#0b0f2a_0%,#0a0a0a_50%,#1a0d0d_100%)]
毛玻璃底：bg-[rgba(20,20,30,0.38)] backdrop-blur-[12px]
卡片邊框：border border-white/10
圓角：    rounded-[1.5rem] 或 rounded-[1.75rem]
```

### 文字色彩

```
主要文字：text-white
次要文字：text-white/70
副標文字：text-white/85
提示文字：text-white/50
錯誤文字：text-red-400
```

### 品牌色

```
LINE：      #06C755（hover: #05b64d）
Facebook：  #1877F2（hover: #1565d8）
Instagram： #E4405F（hover: #d62d4a）
強調色：    sky-400 / sky-300 / sky-600
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
- [ ] 樣式使用現有的深色毛玻璃主題 class
- [ ] 社群連結從 `src/lib/supabase.ts` import
- [ ] 支援手機與桌面顯示

### 新增元件時確認：

- [ ] 檔案頂部有 `"use client"`
- [ ] Props 用 `interface` 定義
- [ ] 放在 `src/components/` 下
- [ ] 樣式跟現有元件一致（圓角、邊框、毛玻璃）

---

## 14. 語言與輸出規則

- 一律使用繁體中文回覆
- 必須提供可直接複製的完整指令（不可給片段）
- 不可只講概念，必須提供實作步驟
- 回覆需清楚分段，方便閱讀與複製
- Code、變數名、技術術語可保持英文

---

## 最終規則

不得忽略以上任何規則。所有回覆與修改都必須完全遵守。
