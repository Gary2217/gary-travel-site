import { NextRequest, NextResponse } from 'next/server';
import { requireDevAuth } from '@/lib/api-auth';
import { getStoragePathFromPublicUrl } from '@/lib/storage';
import { createServiceClient, hasServiceRoleConfig } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const IMAGE_BUCKET = 'images';
const CLEANUP_FOLDERS = [
  'destinations',
  'trips',
  'trip-banners',
  'flights',
  'document-services',
  'mini-transit-tickets',
  'site',
] as const;

const DOCUMENT_SERVICE_IDS = ['roc0001', 'roc0002', 'tcc0001'] as const;
const MINI_TRANSIT_IDS = ['mtl001', 'mtl002', 'mtl003', 'mtl004', 'mtl005'] as const;
const IMAGE_TYPES = ['list', 'detail'] as const;

interface StorageListFile {
  name: string;
  updated_at: string | null;
}

interface CleanupRequestBody {
  dry_run?: boolean;
  max_delete?: number;
}

function filePrefix(id: string, imageType: string) {
  return `${id}-${imageType}-`;
}

function compareByUpdatedThenNameDesc(a: StorageListFile, b: StorageListFile) {
  const updatedA = a.updated_at || '';
  const updatedB = b.updated_at || '';
  const updatedCompare = updatedB.localeCompare(updatedA);
  if (updatedCompare !== 0) return updatedCompare;
  return b.name.localeCompare(a.name);
}

function chunkArray<T>(arr: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export async function POST(request: NextRequest) {
  const authError = requireDevAuth();
  if (authError) return authError;

  if (!hasServiceRoleConfig()) {
    return NextResponse.json({ error: '伺服器設定錯誤' }, { status: 500 });
  }

  let body: CleanupRequestBody = {};
  try {
    body = (await request.json()) as CleanupRequestBody;
  } catch {
    body = {};
  }

  const dryRun = body.dry_run !== false;
  const maxDelete = Number.isFinite(Number(body.max_delete))
    ? Math.max(1, Number(body.max_delete))
    : 200;

  try {
    const supabase = createServiceClient();

    const referencedPaths = new Set<string>();

    const [
      destinationsRes,
      tripsRes,
      flightRoutesRes,
      sideMediaRes,
    ] = await Promise.all([
      supabase.from('destinations').select('image_url').not('image_url', 'is', null),
      supabase.from('trips').select('cover_image_url,trip_banner').or('cover_image_url.not.is.null,trip_banner.not.is.null'),
      supabase.from('flight_routes').select('image_url').not('image_url', 'is', null),
      supabase.from('trip_side_media').select('url,media_type').eq('media_type', 'image').not('url', 'is', null),
    ]);

    if (destinationsRes.error || tripsRes.error || flightRoutesRes.error || sideMediaRes.error) {
      return NextResponse.json(
        {
          error: '讀取資料庫參照失敗',
          details: {
            destinations: destinationsRes.error?.message,
            trips: tripsRes.error?.message,
            flight_routes: flightRoutesRes.error?.message,
            trip_side_media: sideMediaRes.error?.message,
          },
        },
        { status: 500 },
      );
    }

    for (const row of destinationsRes.data || []) {
      const path = getStoragePathFromPublicUrl(String(row.image_url || ''));
      if (path) referencedPaths.add(path);
    }

    for (const row of tripsRes.data || []) {
      const coverPath = getStoragePathFromPublicUrl(String(row.cover_image_url || ''));
      if (coverPath) referencedPaths.add(coverPath);

      const banner = row.trip_banner as Record<string, unknown> | null;
      const sideImagePath = getStoragePathFromPublicUrl(String(banner?.side_image_url || ''));
      if (sideImagePath) referencedPaths.add(sideImagePath);
    }

    for (const row of flightRoutesRes.data || []) {
      const path = getStoragePathFromPublicUrl(String(row.image_url || ''));
      if (path) referencedPaths.add(path);
    }

    for (const row of sideMediaRes.data || []) {
      const path = getStoragePathFromPublicUrl(String(row.url || ''));
      if (path) referencedPaths.add(path);
    }

    const folderFilesMap = new Map<string, StorageListFile[]>();
    for (const folder of CLEANUP_FOLDERS) {
      const { data: files, error } = await supabase.storage
        .from(IMAGE_BUCKET)
        .list(folder, { limit: 1000, sortBy: { column: 'updated_at', order: 'desc' } });

      if (error) {
        return NextResponse.json(
          { error: `讀取 Storage 目錄失敗：${folder}`, details: error.message },
          { status: 500 },
        );
      }

      const mappedFiles: StorageListFile[] = (files || [])
        .filter((item) => typeof item.name === 'string' && item.name.length > 0)
        .map((item) => ({
          name: item.name,
          updated_at: item.updated_at || null,
        }));

      folderFilesMap.set(folder, mappedFiles);
    }

    const logoFiles = [...(folderFilesMap.get('site') || [])].sort(compareByUpdatedThenNameDesc);
    if (logoFiles[0]?.name) {
      referencedPaths.add(`site/${logoFiles[0].name}`);
    }

    const documentFiles = folderFilesMap.get('document-services') || [];
    for (const serviceId of DOCUMENT_SERVICE_IDS) {
      for (const imageType of IMAGE_TYPES) {
        const prefix = filePrefix(serviceId, imageType);
        const latest = [...documentFiles]
          .filter((item) => item.name.startsWith(prefix))
          .sort(compareByUpdatedThenNameDesc)[0];

        if (latest?.name) {
          referencedPaths.add(`document-services/${latest.name}`);
        }
      }
    }

    const miniFiles = folderFilesMap.get('mini-transit-tickets') || [];
    for (const ticketId of MINI_TRANSIT_IDS) {
      for (const imageType of IMAGE_TYPES) {
        const prefix = filePrefix(ticketId, imageType);
        const latest = [...miniFiles]
          .filter((item) => item.name.startsWith(prefix))
          .sort(compareByUpdatedThenNameDesc)[0];

        if (latest?.name) {
          referencedPaths.add(`mini-transit-tickets/${latest.name}`);
        }
      }
    }

    const allStoragePaths: string[] = [];
    for (const folder of CLEANUP_FOLDERS) {
      const files = folderFilesMap.get(folder) || [];
      for (const file of files) {
        allStoragePaths.push(`${folder}/${file.name}`);
      }
    }

    const orphanPaths = allStoragePaths.filter((path) => !referencedPaths.has(path));

    if (!dryRun && orphanPaths.length > maxDelete) {
      return NextResponse.json(
        {
          error: `待刪除檔案數 ${orphanPaths.length} 超過安全上限 ${maxDelete}`,
          hint: '可改用 dry_run 先檢查，或提高 max_delete 後再執行。',
        },
        { status: 400 },
      );
    }

    const deletedPaths: string[] = [];
    if (!dryRun && orphanPaths.length > 0) {
      const chunks = chunkArray(orphanPaths, 100);
      for (const chunk of chunks) {
        const { error } = await supabase.storage.from(IMAGE_BUCKET).remove(chunk);
        if (error) {
          return NextResponse.json(
            { error: '刪除 orphan 檔案失敗', details: error.message, deleted_so_far: deletedPaths.length },
            { status: 500 },
          );
        }
        deletedPaths.push(...chunk);
      }
    }

    return NextResponse.json({
      success: true,
      dry_run: dryRun,
      max_delete: maxDelete,
      summary: {
        scanned_files: allStoragePaths.length,
        referenced_files: referencedPaths.size,
        orphan_files: orphanPaths.length,
        deleted_files: deletedPaths.length,
      },
      orphan_paths: orphanPaths,
      deleted_paths: deletedPaths,
    });
  } catch {
    return NextResponse.json({ error: '清理失敗' }, { status: 500 });
  }
}
