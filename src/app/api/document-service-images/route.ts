import { NextRequest, NextResponse } from "next/server";
import { requireDevAuth } from "@/lib/api-auth";
import { validateFileSignature } from "@/lib/file-validation";
import { r2Delete, r2List, r2PublicUrl, r2Upload, type R2Object } from "@/lib/r2";
import { hasServiceRoleConfig, hasSupabaseConfig } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;
const FOLDER = "images/document-services";
const SERVICE_IDS = ["roc0001", "roc0002", "tcc0001"] as const;
const IMAGE_TYPES = ["list", "detail"] as const;

type ServiceId = (typeof SERVICE_IDS)[number];
type ImageType = (typeof IMAGE_TYPES)[number];

function isServiceId(value: string): value is ServiceId {
  return SERVICE_IDS.includes(value as ServiceId);
}

function isImageType(value: string): value is ImageType {
  return IMAGE_TYPES.includes(value as ImageType);
}

function filePrefix(serviceId: ServiceId, imageType: ImageType) {
  return `${FOLDER}/${serviceId}-${imageType}-`;
}

// 版本號用檔案 lastModified（穩定），檔案沒換就不變 → CDN/瀏覽器能快取，
// 換圖時 lastModified 改變自然 cache-bust。不可用 Date.now()（每次 GET 都變會讓圖永遠無法快取）。
function buildPublicUrl(key: string, version: string) {
  return `${r2PublicUrl(key)}?v=${version}`;
}

function latestByPrefix(files: R2Object[], prefix: string): R2Object | null {
  const matched = files
    .filter((f) => f.key.startsWith(prefix))
    .sort((a, b) => (b.lastModified?.getTime() ?? 0) - (a.lastModified?.getTime() ?? 0));
  return matched[0] ?? null;
}

export async function GET() {
  try {
    if (!hasSupabaseConfig()) {
      return NextResponse.json({ images: {} });
    }

    const files = await r2List(`${FOLDER}/`);

    const listImages: Record<string, string> = {};
    const detailImages: Record<string, string> = {};

    for (const serviceId of SERVICE_IDS) {
      const listFile = latestByPrefix(files, filePrefix(serviceId, "list"));
      if (listFile) listImages[serviceId] = buildPublicUrl(listFile.key, String(listFile.lastModified?.getTime() ?? 0));

      const detailFile = latestByPrefix(files, filePrefix(serviceId, "detail"));
      if (detailFile) detailImages[serviceId] = buildPublicUrl(detailFile.key, String(detailFile.lastModified?.getTime() ?? 0));
    }

    return NextResponse.json(
      {
        list_images: listImages,
        detail_images: detailImages,
        images: listImages,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ list_images: {}, detail_images: {}, images: {} }, { headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(request: NextRequest) {
  const authError = requireDevAuth();
  if (authError) return authError;

  try {
    if (!hasServiceRoleConfig()) {
      return NextResponse.json({ error: "伺服器上傳設定遺失" }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const serviceIdRaw = String(formData.get("service_id") || "").trim();
    const imageTypeRaw = String(formData.get("image_type") || "detail").trim();

    if (!file || !serviceIdRaw) {
      return NextResponse.json({ error: "缺少 file 或 service_id" }, { status: 400 });
    }

    if (!isServiceId(serviceIdRaw)) {
      return NextResponse.json({ error: "不支援的 service_id" }, { status: 400 });
    }

    if (!isImageType(imageTypeRaw)) {
      return NextResponse.json({ error: "不支援的 image_type" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "不支援的檔案類型，僅支援 JPG、PNG、WebP" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "檔案過大，最大 5MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!validateFileSignature(buffer, file.type)) {
      return NextResponse.json({ error: "檔案內容與類型不符" }, { status: 400 });
    }

    const files = await r2List(`${FOLDER}/`);

    const oldKeys = files
      .filter((f) => f.key.startsWith(filePrefix(serviceIdRaw, imageTypeRaw)))
      .map((f) => f.key);

    // 先刪除舊圖，再上傳新圖
    if (oldKeys.length > 0) {
      try {
        await r2Delete(oldKeys);
      } catch (removeErr) {
        return NextResponse.json({ error: `刪除舊圖失敗：${removeErr}` }, { status: 500 });
      }
    }

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${FOLDER}/${serviceIdRaw}-${imageTypeRaw}-${Date.now()}.${ext}`;

    await r2Upload(path, buffer, file.type);

    return NextResponse.json({ service_id: serviceIdRaw, image_type: imageTypeRaw, url: buildPublicUrl(path, String(Date.now())) });
  } catch {
    return NextResponse.json({ error: "伺服器內部錯誤" }, { status: 500 });
  }
}
