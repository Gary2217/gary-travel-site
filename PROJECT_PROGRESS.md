# 網站建構進度表

> 最後更新：2026-04-24

---

## 第一階段：核心架構 ✅

- [x] Next.js 14 + TypeScript + Tailwind 專案初始化
- [x] Supabase 資料庫連接 + 環境變數設定
- [x] Vercel 部署
- [x] 深色毛玻璃主題（globals.css + 統一色系）
- [x] Root Layout（`lang="zh-TW"`、OG metadata、viewport）
- [x] AI 協作規則建立（CLAUDE.md + AI_RULES.md）

---

## 第二階段：頁面與資料流 ✅

- [x] **首頁** — 區域分類按鈕 + 目的地輪播卡片 + 自動捲動
- [x] **目的地頁** — Hero 圖 + 行程卡片列表
- [x] **行程詳情頁** — Hero 圖 + 亮點標籤 + 每日行程摺疊面板
- [x] API Route：`/api/regions`（區域 + 目的地）
- [x] API Route：`/api/destinations/[id]`（單一目的地）
- [x] API Route：`/api/destinations/[id]/trips`（目的地行程列表）
- [x] API Route：`/api/trips/[id]`（行程 + 每日明細）
- [x] `src/lib/supabase.ts` 統一 fetch 函式 + 型別定義

---

## 第三階段：互動與轉換 ✅

- [x] **StickyHeader** — 固定導航列 + LINE / FB / IG 按鈕
- [x] **SocialCta** — 底部社群 CTA 區塊
- [x] **InquiryButtons** — 浮動 + 行內兩種樣式，自動複製行程名稱
- [x] **InquiryForm** — 線上諮詢表單 → 寫入 Supabase
- [x] API Route：`/api/inquiries`（諮詢提交）
- [x] **Toast** — 通知元件（createPortal）
- [x] 點擊追蹤（`/api/track-click` → `click_analytics` 表）

---

## 第四階段：開發者工具 ✅

- [x] **DevModeToggle** — 密碼驗證 + localStorage 記住授權
- [x] **ImageEditor** — 選檔預覽 + 上傳至 Supabase Storage + 更新資料庫
- [x] API Route：`/api/upload-image`（Service Role Key 上傳 + 舊圖清理）

---

## 第五階段：SEO 與基礎設施 🔲

- [x] favicon（SVG，深色底 + sky-400 飛機 icon）+ `public/` 目錄建立
- [ ] apple-touch-icon（需 180x180 PNG，等 logo 設計後補上）
- [ ] 各頁面獨立 SEO metadata（目的地名稱、行程名稱動態帶入）
- [ ] `sitemap.xml`（動態產生，列出所有目的地 + 行程）
- [ ] `robots.txt`
- [ ] Open Graph 圖片（各頁面動態 OG image）
- [x] 404 Not Found 頁面（`src/app/not-found.tsx`）
- [ ] 全域 Error Boundary（`src/app/error.tsx`）

---

## 第六階段：體驗優化 🔲

- [ ] 圖片載入優化（skeleton / blur placeholder）
- [ ] 行程頁 - PDF 行程檔下載功能（目前只有文字提到，尚未實作）
- [ ] 頁面轉場動畫（route transition）
- [ ] 回到頂部按鈕
- [ ] StickyHeader 捲動時收合/變化
- [ ] 目的地篩選 / 搜尋

---

## 第七階段：進階功能 🔲

- [ ] 管理後台（行程 CRUD、諮詢管理、圖片管理）
- [ ] LINE LIFF 整合（從 LINE 內開啟時自動帶入用戶資訊）
- [ ] 分享功能（產生帶 OG 的分享連結）
- [ ] 數據儀表板（點擊分析、諮詢統計、熱門行程）
- [ ] 多語系支援

---

## 已完成功能一覽

| 功能 | 檔案 | 說明 |
|------|------|------|
| 目的地輪播 | `page.tsx` | 3 倍複製無限捲動 + 手動左右切換 + hover 暫停 |
| 區域快速跳轉 | `page.tsx` | 橫向捲動按鈕列，點擊 scrollIntoView |
| 行程卡片 | `TripCard.tsx` | 封面圖 + 天數 + 價格 + 亮點標籤 |
| 每日行程 | `DayItinerary.tsx` | 摺疊面板，預設展開前 2 天 |
| 社群諮詢 | `InquiryButtons.tsx` | 自動複製行程名稱 → 開啟 LINE/FB/IG |
| 表單諮詢 | `InquiryForm.tsx` | 姓名（必填）+ 電話 + Email + 留言 |
| 點擊追蹤 | `track-click/route.ts` | 記錄 IP、UA、referrer，靜默失敗 |
| 圖片管理 | `ImageEditor.tsx` | 開發者模式限定，預覽 + 上傳 + 自動清舊圖 |
| Toast 通知 | `Toast.tsx` | 自動消失 + 滑出動畫 |
