# AI 協作規則（Claude / GPT 通用）

> 任何 AI 在協助此專案時，都必須遵守以下規則。  
> 回覆一律使用**繁體中文**。

---

## 1. 專案基本資訊

- **專案**：旅遊規劃師蓋瑞 GARY 的旅遊網站
- **技術棧**：Next.js 14 App Router + TypeScript + Tailwind CSS + Supabase
- **部署**：Vercel
- **用戶流程**：LINE 六宮格入口 → 瀏覽目的地 → 查看行程 → 索取 PDF / 諮詢報價

---

## 2. 目錄結構（不要自己發明新的）

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

## 3. 架構規則（不可違反）

| 規則 | 說明 |
|------|------|
| Client-side only | 所有頁面元件加 `"use client"`，不用 Server Components |
| 資料流 | 元件 → `src/lib/supabase.ts` 的 fetch 函式 → `/api/*` route → Supabase |
| 禁止直接呼叫 Supabase | 元件和 lib 裡**不能** import `createClient`，只透過 API route |
| API route 獨立 client | 每個 request handler 內 `createClient(...)`，不共用 |
| 社群連結統一管理 | `lineHref`、`fbHref`、`igHref` 從 `src/lib/supabase.ts` import，不要在元件裡重新定義 |
| 環境變數 | 社群連結用 `NEXT_PUBLIC_LINE_ID`、`NEXT_PUBLIC_FB_URL`、`NEXT_PUBLIC_IG_URL`，不要硬編碼 |

---

## 4. 樣式規則

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

---

## 5. 程式碼風格

### TypeScript
- 用 `interface` 定義元件 props
- 型別定義集中在 `src/lib/supabase.ts`
- 頁面內的局部型別可用 `type` 定義在同檔案頂部
- 不要用 `any`，除非是 Supabase 回傳的 nested join 無法推導

### React 元件
- 每個檔案 `export default` 一個元件
- 頁面級元件放 `src/app/`，可複用元件放 `src/components/`
- 載入中必須顯示 spinner + 「載入中...」
- 錯誤必須 catch 並顯示繁體中文訊息
- 不要用第三方 UI 套件（純 Tailwind）

### API Route
```typescript
// 標準模式：
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

## 6. 資料庫規則

- 主鍵：UUID（`gen_random_uuid()`）
- 時間戳：`created_at` + `updated_at`（含時區，`updated_at` 有自動觸發器）
- 所有表啟用 RLS
- 公開讀取：`is_active = true` 的記錄
- 公開新增：`click_analytics`、`inquiries`

---

## 7. 禁止清單

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

---

## 8. 新增功能的 checklist

新增一個頁面時，確認：
- [ ] 檔案頂部有 `"use client"`
- [ ] 有 loading spinner 狀態
- [ ] 有 error 狀態（繁體中文訊息）
- [ ] 資料透過 `src/lib/supabase.ts` fetch 函式取得
- [ ] 若需要新 API route，每個 handler 內獨立建立 Supabase client
- [ ] 樣式使用現有的深色毛玻璃主題 class
- [ ] 社群連結從 `src/lib/supabase.ts` import

新增一個元件時，確認：
- [ ] 檔案頂部有 `"use client"`
- [ ] Props 用 `interface` 定義
- [ ] 放在 `src/components/` 下
- [ ] 樣式跟現有元件一致（圓角、邊框、毛玻璃）
