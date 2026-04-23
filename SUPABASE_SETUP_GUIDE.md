# 🚀 Supabase 設定指南

## 步驟 1：建立 Supabase 專案

1. 前往 [Supabase](https://supabase.com)
2. 點擊 "Start your project"
3. 使用 GitHub 帳號登入
4. 點擊 "New Project"
5. 填寫專案資訊：
   - **Name**: gary-travel-site
   - **Database Password**: 設定一個強密碼（請記住）
   - **Region**: 選擇 "Northeast Asia (Tokyo)" 或最近的區域
   - **Pricing Plan**: 選擇 "Free" 方案
6. 點擊 "Create new project"（需要等待 1-2 分鐘）

## 步驟 2：執行資料庫設定

1. 專案建立完成後，點擊左側選單的 **SQL Editor**
2. 點擊 "+ New query"
3. 打開專案根目錄的 `supabase-setup.sql` 檔案
4. 複製所有內容
5. 貼到 Supabase SQL Editor 中
6. 點擊右下角的 "Run" 按鈕
7. 等待執行完成，應該會看到 "Success. No rows returned"

## 步驟 3：驗證資料是否正確匯入

1. 點擊左側選單的 **Table Editor**
2. 應該會看到三個表格：
   - `regions` (13 筆資料)
   - `destinations` (約 60+ 筆資料)
   - `click_analytics` (0 筆資料)
3. 點擊 `regions` 表格，確認可以看到所有旅遊區域
4. 點擊 `destinations` 表格，確認可以看到所有目的地

## 步驟 4：取得 API 金鑰

1. 點擊左側選單的 **Project Settings**（齒輪圖示）
2. 點擊 **API**
3. 找到以下兩個資訊：
   - **Project URL**: 類似 `https://xxxxx.supabase.co`
   - **anon public**: 一串很長的金鑰

## 步驟 5：設定環境變數

1. 在專案根目錄建立 `.env.local` 檔案
2. 複製以下內容並填入您的資訊：

```env
NEXT_PUBLIC_SUPABASE_URL=https://你的專案ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的anon金鑰
NEXT_PUBLIC_LINE_ID=@你的LINE官方帳號ID
```

3. 儲存檔案

## 步驟 6：安裝 Supabase 客戶端

在終端機執行：

```bash
npm install @supabase/supabase-js
```

## 步驟 7：測試連線

執行開發伺服器：

```bash
npm run dev
```

打開瀏覽器訪問 `http://localhost:3000`，應該會看到所有資料從 Supabase 載入。

## 步驟 8：部署到 Vercel

1. 前往 [Vercel](https://vercel.com)
2. 匯入您的 GitHub 專案
3. 在 **Environment Variables** 中加入：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_LINE_ID`
4. 點擊 "Deploy"

## 🎯 後續管理

### 如何新增旅遊目的地

1. 登入 Supabase
2. 前往 **Table Editor**
3. 選擇 `destinations` 表格
4. 點擊 "+ Insert row"
5. 填寫資訊：
   - `region_id`: 選擇所屬區域
   - `title`: 目的地名稱
   - `subtitle`: 副標題
   - `image_url`: 圖片網址
   - `display_order`: 顯示順序
   - `is_active`: true
6. 點擊 "Save"

### 如何新增旅遊區域

1. 前往 `regions` 表格
2. 點擊 "+ Insert row"
3. 填寫資訊後儲存

### 如何查看點擊統計

1. 前往 **Table Editor**
2. 選擇 `click_analytics` 表格
3. 可以看到所有點擊記錄

### 進階查詢範例

在 SQL Editor 中執行：

```sql
-- 查看最受歡迎的目的地（前 10 名）
SELECT 
  d.title,
  d.subtitle,
  COUNT(c.id) as click_count
FROM destinations d
LEFT JOIN click_analytics c ON d.id = c.destination_id
GROUP BY d.id, d.title, d.subtitle
ORDER BY click_count DESC
LIMIT 10;

-- 查看每個區域的點擊數
SELECT 
  r.title as region,
  COUNT(c.id) as total_clicks
FROM regions r
LEFT JOIN destinations d ON r.id = d.region_id
LEFT JOIN click_analytics c ON d.id = c.destination_id
GROUP BY r.id, r.title
ORDER BY total_clicks DESC;
```

## 🔒 安全性注意事項

1. **永遠不要**將 `.env.local` 檔案提交到 Git
2. **永遠不要**公開您的 `service_role` 金鑰（只使用 `anon` 金鑰）
3. Row Level Security (RLS) 已啟用，確保資料安全
4. 定期檢查 Supabase 的使用量，避免超過免費額度

## 📊 免費方案限制

- 資料庫大小：500 MB
- 頻寬：5 GB/月
- 檔案儲存：1 GB
- 每月活躍用戶：50,000

對於您的使用情境，免費方案應該綽綽有餘。

## 🆘 常見問題

### Q: 資料沒有顯示？
A: 檢查瀏覽器 Console 是否有錯誤訊息，確認環境變數是否正確設定。

### Q: 圖片無法載入？
A: Unsplash 圖片可能需要時間載入，或者 URL 已失效。建議後續將圖片上傳到 Supabase Storage。

### Q: 如何備份資料？
A: 在 Supabase Dashboard > Database > Backups 可以下載備份。

## 📞 需要協助？

如有任何問題，請聯繫開發者或查看 [Supabase 官方文件](https://supabase.com/docs)。
