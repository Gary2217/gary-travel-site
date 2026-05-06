-- ============================================
-- Storage 政策收緊 — 2026-05-06
-- 限制 INSERT/UPDATE/DELETE 到允許的資料夾
-- 請在 Supabase Dashboard SQL Editor 中執行
-- ============================================

-- 先移除舊的寬鬆政策
DROP POLICY IF EXISTS "Allow uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow deletes" ON storage.objects;

-- 公開讀取保留不動（已存在）
-- DROP POLICY IF EXISTS "Public Access" ON storage.objects;

-- ── INSERT：限制上傳到允許的資料夾 ──────────
CREATE POLICY "Allow uploads to allowed folders"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'images'
  AND (
    (storage.foldername(name))[1] IN ('destinations', 'trips', 'trip-banners', 'flights', 'site')
  )
);

-- ── UPDATE：限制更新到允許的資料夾 ──────────
CREATE POLICY "Allow updates in allowed folders"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'images'
  AND (
    (storage.foldername(name))[1] IN ('destinations', 'trips', 'trip-banners', 'flights', 'site')
  )
)
WITH CHECK (
  bucket_id = 'images'
  AND (
    (storage.foldername(name))[1] IN ('destinations', 'trips', 'trip-banners', 'flights', 'site')
  )
);

-- ── DELETE：限制刪除到允許的資料夾 ──────────
CREATE POLICY "Allow deletes in allowed folders"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'images'
  AND (
    (storage.foldername(name))[1] IN ('destinations', 'trips', 'trip-banners', 'flights', 'site')
  )
);
