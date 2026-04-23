# 環境變數設定指南

請在專案根目錄建立 `.env.local` 檔案，並填入以下內容：

```env
# Supabase 專案 URL（從 Supabase Dashboard > Settings > API 取得）
NEXT_PUBLIC_SUPABASE_URL=https://你的專案ID.supabase.co

# Supabase Anon Key（從 Supabase Dashboard > Settings > API > anon public 取得）
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的anon金鑰

# LINE 官方帳號 ID（選填）
NEXT_PUBLIC_LINE_ID=@你的LINE官方帳號ID
```

## 如何取得這些資訊

### 1. Supabase Project URL
1. 在 Supabase Dashboard 左上角可以看到專案 URL
2. 或者到 **Settings** > **API** 
3. 複製 **Project URL**

### 2. Supabase Anon Key
1. 到 **Settings** > **API**
2. 在 **Project API keys** 區域
3. 複製 **anon** **public** 金鑰（長字串）

### 3. LINE 官方帳號 ID
1. 登入 LINE Official Account Manager
2. 找到您的帳號 ID（通常是 @開頭）
3. 或者暫時使用測試連結

## 建立檔案步驟

1. 在專案根目錄建立新檔案 `.env.local`
2. 複製上方範本內容
3. 替換為您的實際資訊
4. 儲存檔案

**重要：** `.env.local` 檔案已經在 `.gitignore` 中，不會被提交到 Git，請放心填入真實資訊。
