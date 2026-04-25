-- 為 trips 表新增行程檔案欄位
ALTER TABLE trips ADD COLUMN IF NOT EXISTS document_url TEXT;
