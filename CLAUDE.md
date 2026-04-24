# CLAUDE.md - Gary Travel Site

## 專案概述
旅遊規劃師蓋瑞 GARY 的旅遊網站。用戶從 LINE 六宮格進入，瀏覽目的地 → 查看行程 → 索取 PDF / 諮詢報價。
技術棧：Next.js 14 App Router + TypeScript + Tailwind CSS + Supabase，部署於 Vercel。
所有 UI 文字使用繁體中文（zh-TW）。

## 模型分流規則（省點數優先）
預設用 Sonnet，只有真正需要時才升 Opus。

- **Opus（少用，僅限高複雜度）**：
  - 跨 5 檔以上的架構重構
  - 資料庫 schema 重新設計（非新增欄位）
  - 找不出原因的 bug，需要跨檔推理
  - 安全性審查
- **Sonnet（主力模型）**：
  - 新功能開發（頁面、元件、API route）
  - 單檔或 2-4 檔的重構
  - Code review、效能優化
  - 新增資料表欄位、寫 SQL migration
  - CLAUDE.md 更新
  - 中等複雜度除錯
- **Haiku（能用就用）**：
  - 文案修改、翻譯調整
  - Tailwind 樣式微調（顏色、間距、字體）
  - 新增 / 修改 env 變數
  - 格式修正、import 排序
  - 明確的單行 bug fix
  - 已知解法的套用（如加 "use client"）
  - git commit message 撰寫

## 程式碼慣例
- 所有頁面使用 `"use client"` + 透過 API route 取資料
- API route 內各自建立 `createClient`，不共用 instance
- 型別定義放在 `src/lib/supabase.ts`
- Fetch 輔助函式放在 `src/lib/supabase.ts`，呼叫 API route（不直接呼叫 Supabase）
- 錯誤處理：try/catch + 繁體中文錯誤訊息
- 載入狀態：spinner + 「載入中...」

## 樣式慣例
- 深色毛玻璃主題：`bg-[rgba(20,20,30,0.38)]` + `backdrop-blur-[12px]`
- 卡片邊框：`border border-white/10`
- 圓角：`rounded-[1.5rem]` 或 `rounded-[1.75rem]`
- 文字：主要 white、次要 `text-white/70`、副標 `text-white/85`
- 背景漸層：`bg-[linear-gradient(135deg,#0b0f2a_0%,#0a0a0a_50%,#1a0d0d_100%)]`
- Mobile-first，使用 Tailwind 響應式前綴（sm:, md:, lg:）

## 品牌色彩
- LINE：`#06C755`
- Facebook：`#1877F2`
- Instagram：`#E4405F`
- 強調色：`sky-400` / `sky-300` / `sky-600`

## API Route 模式
- 檔案：`src/app/api/{resource}/route.ts`
- 每個 request 建立獨立 Supabase client
- 回傳 `NextResponse.json()` + 適當 status code
- GET 端點加 `Cache-Control` header
- 非關鍵操作（analytics）靜默失敗

## 環境變數
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase 專案 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `NEXT_PUBLIC_LINE_ID` - LINE 官方帳號 ID
- `NEXT_PUBLIC_FB_URL` - Facebook 粉專連結
- `NEXT_PUBLIC_IG_URL` - Instagram 連結
- `NEXT_PUBLIC_DEV_PASSWORD` - 開發者模式密碼

## 資料庫
- 所有表使用 UUID 主鍵（`gen_random_uuid()`）
- 時間戳：`created_at` 和 `updated_at`（含時區）
- `updated_at` 有自動更新觸發器
- 所有表啟用 RLS
- 公開讀取 active 記錄、公開新增 analytics/inquiries

## 不要做的事
- 不要用 server components 做頁面（目前架構是 client-side）
- 不要在元件中直接 import Supabase client（用 API route）
- 不要硬編碼社群連結（用 env vars）
- 不要跳過 loading/error 狀態
- 不要用外部 UI 套件（用 Tailwind）
- 回覆一律使用繁體中文
