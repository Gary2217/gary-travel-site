/**
 * 從 Supabase storage 公開 URL 提取 storage path
 * 例如: https://xxx.supabase.co/storage/v1/object/public/images/trips/abc.jpg → trips/abc.jpg
 */
export function getStoragePathFromPublicUrl(publicUrl: string): string | null {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return null;

    const currentProjectUrl = new URL(supabaseUrl);
    const url = new URL(publicUrl);

    if (url.origin !== currentProjectUrl.origin) return null;

    const prefix = '/storage/v1/object/public/images/';
    if (!url.pathname.startsWith(prefix)) return null;

    return url.pathname.slice(prefix.length) || null;
  } catch {
    return null;
  }
}
