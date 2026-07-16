import { NextRequest, NextResponse } from "next/server";
import { requireDevAuth } from "@/lib/api-auth";
import { validateFileSignature } from "@/lib/file-validation";
import { r2Delete, r2List, r2PublicUrl, r2Upload, type R2Object } from "@/lib/r2";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;
const FOLDER = "images/mini-transit-tickets";
const TICKET_IDS = ["mtl001", "mtl002", "mtl003", "mtl004", "mtl005"] as const;
const IMAGE_TYPES = ["list", "detail"] as const;

type TicketId = (typeof TICKET_IDS)[number];
type ImageType = (typeof IMAGE_TYPES)[number];

function isTicketId(value: string): value is TicketId {
  return TICKET_IDS.includes(value as TicketId);
}

function isImageType(value: string): value is ImageType {
  return IMAGE_TYPES.includes(value as ImageType);
}

function filePrefix(ticketId: TicketId, imageType: ImageType) {
  return `${FOLDER}/${ticketId}-${imageType}-`;
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
    const files = await r2List(`${FOLDER}/`);

    const listImages: Record<string, string> = {};
    const detailImages: Record<string, string> = {};

    for (const ticketId of TICKET_IDS) {
      const listFile = latestByPrefix(files, filePrefix(ticketId, "list"));
      if (listFile) listImages[ticketId] = buildPublicUrl(listFile.key, String(listFile.lastModified?.getTime() ?? 0));

      const detailFile = latestByPrefix(files, filePrefix(ticketId, "detail"));
      if (detailFile) detailImages[ticketId] = buildPublicUrl(detailFile.key, String(detailFile.lastModified?.getTime() ?? 0));
    }

    return NextResponse.json({ list_images: listImages, detail_images: detailImages }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ list_images: {}, detail_images: {} }, { headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(request: NextRequest) {
  const authError = requireDevAuth();
  if (authError) return authError;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const ticketIdRaw = String(formData.get("ticket_id") || "").trim();
    const imageTypeRaw = String(formData.get("image_type") || "detail").trim();

    if (!file || !ticketIdRaw) {
      return NextResponse.json({ error: "缺少 file 或 ticket_id" }, { status: 400 });
    }
    if (!isTicketId(ticketIdRaw)) {
      return NextResponse.json({ error: "不支援的 ticket_id" }, { status: 400 });
    }
    if (!isImageType(imageTypeRaw)) {
      return NextResponse.json({ error: "不支援的 image_type" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "僅支援 JPG / PNG / WEBP" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "圖片檔案不能超過 5MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!validateFileSignature(buffer, file.type)) {
      return NextResponse.json({ error: "檔案內容與類型不符" }, { status: 400 });
    }

    const files = await r2List(`${FOLDER}/`);

    const oldKeys = files
      .filter((f) => f.key.startsWith(filePrefix(ticketIdRaw, imageTypeRaw)))
      .map((f) => f.key);
    if (oldKeys.length > 0) {
      try {
        await r2Delete(oldKeys);
      } catch (removeErr) {
        return NextResponse.json({ error: `刪除舊圖失敗：${removeErr}` }, { status: 500 });
      }
    }

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${FOLDER}/${ticketIdRaw}-${imageTypeRaw}-${Date.now()}.${ext}`;
    await r2Upload(path, buffer, file.type);

    return NextResponse.json({ ticket_id: ticketIdRaw, image_type: imageTypeRaw, url: buildPublicUrl(path, String(Date.now())) });
  } catch {
    return NextResponse.json({ error: "伺服器內部錯誤" }, { status: 500 });
  }
}
