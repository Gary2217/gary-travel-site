# 開發者模式設定指南

## 功能說明

開發者模式允許您直接在網站上編輯每個目的地的圖片，無需手動更新資料庫。

### 主要功能

1. **身份驗證**：只有輸入正確密碼的用戶才能啟用開發者模式
2. **圖片編輯**：每個輪播卡片右上角會顯示編輯按鈕
3. **多種上傳方式**：
   - 輸入圖片 URL（例如 Unsplash 連結）
   - 上傳本地圖片檔案（自動儲存到 Supabase Storage）
4. **即時更新**：圖片更新後立即顯示，並自動儲存到資料庫

## 設定步驟

### 步驟 1：設定開發者密碼

在 `.env.local` 檔案中添加：

```env
NEXT_PUBLIC_DEV_PASSWORD=your_secure_password_here
```

**重要**：請設定一個強密碼，不要使用簡單的密碼如 "123456"。

### 步驟 2：在 Supabase 建立 Storage Bucket

1. 前往 Supabase Dashboard
2. 點擊左側的 **Storage**
3. 點擊 **Create a new bucket**
4. 設定如下：
   - **Name**: `images`
   - **Public bucket**: ✅ 勾選（允許公開訪問）
   - **File size limit**: 5MB
   - **Allowed MIME types**: `image/*`
5. 點擊 **Create bucket**

### 步驟 3：設定 Storage 權限

在 Supabase Storage > **Policies** 中，為 `images` bucket 添加以下政策：

#### 允許公開讀取
```sql
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'images' );
```

#### 允許上傳（可選：限制檔案大小）
```sql
CREATE POLICY "Allow uploads"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'images' 
  AND (storage.foldername(name))[1] = 'destinations'
);
```

### 步驟 4：部署到 Vercel

在 Vercel 的環境變數中添加：

1. 前往 Vercel Dashboard > 您的專案 > **Settings** > **Environment Variables**
2. 添加新變數：
   - **Key**: `NEXT_PUBLIC_DEV_PASSWORD`
   - **Value**: 您的密碼
3. 點擊 **Save**
4. 重新部署網站

## 使用方式

### 啟用開發者模式

1. 訪問網站
2. 點擊右上角的齒輪圖示
3. 輸入開發者密碼
4. 按鈕會變成綠色並顯示「已啟用」

### 編輯圖片

1. 啟用開發者模式後，每個輪播卡片右上角會出現藍色的編輯按鈕
2. 點擊編輯按鈕
3. 選擇以下任一方式：
   - **使用 URL**：貼上圖片連結（例如 Unsplash）
   - **上傳檔案**：選擇本地圖片檔案（支援 JPG、PNG、WebP 等）
4. 點擊「使用此 URL」或選擇檔案後自動上傳
5. 圖片會立即更新並儲存到資料庫

### 推薦的圖片來源

1. **Unsplash**（免費高品質圖片）
   - 訪問 https://unsplash.com
   - 搜尋景點名稱
   - 右鍵點擊圖片 > 複製圖片地址
   - 貼到編輯器的 URL 欄位

2. **本地圖片**
   - 確保圖片清晰（建議至少 1200x800 像素）
   - 檔案大小不超過 5MB
   - 支援格式：JPG、PNG、WebP

## 安全性說明

- 開發者密碼儲存在環境變數中，不會暴露在前端代碼
- 密碼驗證後會儲存在 localStorage，重新整理頁面後仍保持登入
- 只有通過驗證的用戶才能看到編輯按鈕
- 所有圖片上傳都會記錄到 Supabase Storage

## 故障排除

### 問題：無法上傳圖片

**解決方案**：
1. 確認 Supabase Storage 的 `images` bucket 已建立
2. 檢查 Storage 權限政策是否正確設定
3. 確認圖片檔案大小不超過 5MB

### 問題：圖片上傳後不顯示

**解決方案**：
1. 清除瀏覽器快取（Ctrl+Shift+R）
2. 檢查 Supabase Storage 中是否有該圖片
3. 確認圖片 URL 是否正確儲存到資料庫

### 問題：忘記開發者密碼

**解決方案**：
1. 檢查 `.env.local` 檔案中的 `NEXT_PUBLIC_DEV_PASSWORD`
2. 或在瀏覽器 Console 執行：`localStorage.removeItem('dev_password')`
3. 重新輸入密碼

## 注意事項

- 開發者模式只在客戶端運作，不影響其他用戶
- 圖片更新會立即反映在資料庫中，所有用戶都會看到新圖片
- 建議在非高峰時段進行大量圖片更新
- 定期備份 Supabase 資料庫
