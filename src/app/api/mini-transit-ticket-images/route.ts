import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireDevAuth } from "@/lib/api-auth";
import { validateFileSignature } from "@/lib/file-validation";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;
const FOLDER = "mini-transit-tickets";
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
  return `${ticketId}-${imageType}-`;
}

function createReadClient() {
  return createClient(supabaseUrl, supabaseAnonKey);
}

function createAdminClient() {
  return createClient(supabaseUrl, supabaseServiceRoleKey);
}

function buildPublicUrl(path: string) {
  const { data } = createReadClient().storage.from("images").getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

export async function GET() {
  try {
    const supabase = createReadClient();
    const { data: files, error } = await supabase.storage.from("images").list(FOLDER, { limit: 500 });
    if (error || !files) {
      return NextResponse.json({ list_images: {}, detail_images: {} }, { headers: { "Cache-Control": "no-store" } });
    }

    const listImages: Record<string, string> = {};
    const detailImages: Record<string, string> = {};

    for (const ticketId of TICKET_IDS) {
      const listMatched = files
        .filter((f) => f.name && f.name.startsWith(filePrefix(ticketId, "list")))
        .sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));
      if (listMatched[0]?.name) {
        listImages[ticketId] = buildPublicUrl(`${FOLDER}/${listMatched[0].name}`);
      }

      const detailMatched = files
        .filter((f) => f.name && f.name.startsWith(filePrefix(ticketId, "detail")))
        .sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));
      if (detailMatched[0]?.name) {
        detailImages[ticketId] = buildPublicUrl(`${FOLDER}/${detailMatched[0].name}`);
      }
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

    const supabase = createAdminClient();
    const { data: files, error: listError } = await supabase.storage.from("images").list(FOLDER, { limit: 500 });
    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    const oldPaths = (files || [])
      .filter((f) => f.name && f.name.startsWith(filePrefix(ticketIdRaw, imageTypeRaw)))
      .map((f) => `${FOLDER}/${f.name}`);
    if (oldPaths.length > 0) {
      const { error: removeError } = await supabase.storage.from("images").remove(oldPaths);
      if (removeError) {
        return NextResponse.json({ error: `刪除舊圖失敗：${removeError.message}` }, { status: 500 });
      }
    }

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${FOLDER}/${ticketIdRaw}-${imageTypeRaw}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("images").upload(path, buffer, {
      contentType: file.type,
      cacheControl: "0",
      upsert: false,
    });
    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    return NextResponse.json({ ticket_id: ticketIdRaw, image_type: imageTypeRaw, url: buildPublicUrl(path) });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
