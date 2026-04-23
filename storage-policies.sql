-- ============================================
-- Supabase Storage 權限設定
-- 為 images bucket 設定公開讀取和上傳權限
-- ============================================

-- 1. 允許公開讀取圖片
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'images' );

-- 2. 允許上傳圖片到 destinations 資料夾
CREATE POLICY "Allow uploads"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'images' 
  AND (storage.foldername(name))[1] = 'destinations'
);

-- 3. 允許更新圖片
CREATE POLICY "Allow updates"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'images' )
WITH CHECK ( bucket_id = 'images' );

-- 4. 允許刪除圖片
CREATE POLICY "Allow deletes"
ON storage.objects FOR DELETE
USING ( bucket_id = 'images' );
