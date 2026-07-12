import { NextRequest, NextResponse } from "next/server";
import { requireDevAuth } from "@/lib/api-auth";
import { r2Delete, r2KeyFromUrl, r2PublicUrl, r2Upload } from "@/lib/r2";
import { createServiceClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const TICKET_IDS = ["mtl001", "mtl002", "mtl003", "mtl004", "mtl005"] as const;
const FILE_FOLDER = "mini-transit-tickets-files";
const FILE_MAX_SIZE = 15 * 1024 * 1024;
const FILE_EXTENSIONS = ["pdf", "doc", "docx", "jpg", "jpeg", "png", "webp"];

type TicketId = (typeof TICKET_IDS)[number];
type ContractKey = "template" | "self" | "other";

const CONTRACT_KEYS: ContractKey[] = ["template", "self", "other"];
const CONTRACT_LABELS: Record<ContractKey, string> = {
  template: "委託書填寫範本",
  self: "護照申請委任書(本人)",
  other: "護照申請委任書(非本人)",
};

type EditableContent = {
  title: string;
  summary: string;
  inquiryTitle: string;
  requirementsTitle: string;
  requirements: string[];
  optionSectionTitle: string;
  regularTitle: string;
  regularPrice: number;
  regularOptionLabel: string;
  urgentTitle: string;
  urgentPrice: number;
  urgentOptionLabel: string;
  contracts: Array<{ key: ContractKey; label: string; url: string }>;
};

function isTicketId(value: string): value is TicketId {
  return TICKET_IDS.includes(value as TicketId);
}

function isContractKey(value: string): value is ContractKey {
  return CONTRACT_KEYS.includes(value as ContractKey);
}

function settingsKey(ticketId: TicketId) {
  return `mini_transit_ticket_content_${ticketId}`;
}

function sanitizeContent(input: unknown): EditableContent | null {
  if (!input || typeof input !== "object") return null;
  const data = input as Partial<EditableContent>;

  const contractsRaw = Array.isArray(data.contracts) ? data.contracts : [];
  const contracts = contractsRaw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const key = String((item as { key?: string }).key || "").trim();
      if (!isContractKey(key)) return null;
      return {
        key,
        label: String((item as { label?: string }).label || "").trim() || CONTRACT_LABELS[key],
        url: String((item as { url?: string }).url || "").trim(),
      };
    })
    .filter((item): item is { key: ContractKey; label: string; url: string } => Boolean(item));

  const normalizedContracts = CONTRACT_KEYS.map((key) => {
    const found = contracts.find((item) => item.key === key);
    return {
      key,
      label: found?.label || CONTRACT_LABELS[key],
      url: found?.url || "",
    };
  });

  const requirements = Array.isArray(data.requirements)
    ? data.requirements.map((item) => String(item || "").trim()).filter(Boolean)
    : [];

  const regularPrice = Number(data.regularPrice);
  const urgentPrice = Number(data.urgentPrice);
  if (!Number.isFinite(regularPrice) || !Number.isFinite(urgentPrice)) return null;

  return {
    title: String(data.title || "").trim(),
    summary: String(data.summary || "").trim(),
    inquiryTitle: String(data.inquiryTitle || "購買詢問").trim(),
    requirementsTitle: String(data.requirementsTitle || "購買流程").trim(),
    requirements,
    optionSectionTitle: String(data.optionSectionTitle || "選擇票券方案").trim(),
    regularTitle: String(data.regularTitle || "").trim(),
    regularPrice,
    regularOptionLabel: String(data.regularOptionLabel || "每人").trim(),
    urgentTitle: String(data.urgentTitle || "").trim(),
    urgentPrice,
    urgentOptionLabel: String(data.urgentOptionLabel || "每人").trim(),
    contracts: normalizedContracts,
  };
}

// 結構化文字內容（標題/價格/條款等）走 DB（site_settings，同 home_banners 的模式）；
// 只有實際上傳的合約檔案本體走 R2。
async function readContent(ticketId: TicketId) {
  const supabase = createServiceClient();
  const { data } = await supabase.from("site_settings").select("value").eq("key", settingsKey(ticketId)).single();
  return sanitizeContent(data?.value);
}

async function writeContent(ticketId: TicketId, content: EditableContent) {
  const supabase = createServiceClient();
  const { error } = await supabase.from("site_settings").upsert({
    key: settingsKey(ticketId),
    value: content,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

export async function GET(_: NextRequest, context: { params: { id: string } }) {
  const ticketIdRaw = String(context.params.id || "").trim();
  if (!isTicketId(ticketIdRaw)) {
    return NextResponse.json({ error: "不支援的 ticket_id" }, { status: 404 });
  }
  try {
    const content = await readContent(ticketIdRaw);
    return NextResponse.json({ content }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ content: null }, { headers: { "Cache-Control": "no-store" } });
  }
}

export async function PUT(request: NextRequest, context: { params: { id: string } }) {
  const authError = requireDevAuth();
  if (authError) return authError;

  const ticketIdRaw = String(context.params.id || "").trim();
  if (!isTicketId(ticketIdRaw)) {
    return NextResponse.json({ error: "不支援的 ticket_id" }, { status: 404 });
  }

  try {
    const body = (await request.json()) as { content?: unknown };
    const content = sanitizeContent(body.content);
    if (!content) return NextResponse.json({ error: "內容格式不正確" }, { status: 400 });
    await writeContent(ticketIdRaw, content);
    return NextResponse.json({ content });
  } catch {
    return NextResponse.json({ error: "儲存失敗" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  const authError = requireDevAuth();
  if (authError) return authError;

  const ticketIdRaw = String(context.params.id || "").trim();
  if (!isTicketId(ticketIdRaw)) {
    return NextResponse.json({ error: "不支援的 ticket_id" }, { status: 404 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const contractKeyRaw = String(formData.get("contract_key") || "").trim();
    if (!file || !isContractKey(contractKeyRaw)) {
      return NextResponse.json({ error: "缺少檔案或 contract_key" }, { status: 400 });
    }
    if (file.size > FILE_MAX_SIZE) {
      return NextResponse.json({ error: "檔案不能超過 15MB" }, { status: 400 });
    }
    const ext = (file.name.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!FILE_EXTENSIONS.includes(ext)) {
      return NextResponse.json({ error: "僅支援 PDF / DOC / DOCX / JPG / JPEG / PNG / WEBP" }, { status: 400 });
    }

    const path = `${FILE_FOLDER}/${ticketIdRaw}/${contractKeyRaw}-${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    await r2Upload(path, buffer, file.type || "application/octet-stream");
    const newUrl = r2PublicUrl(path);

    const existing = (await readContent(ticketIdRaw)) || {
      title: "",
      summary: "",
      inquiryTitle: "購買詢問",
      requirementsTitle: "購買流程",
      requirements: [],
      optionSectionTitle: "選擇票券方案",
      regularTitle: "",
      regularPrice: 0,
      regularOptionLabel: "每人",
      urgentTitle: "",
      urgentPrice: 0,
      urgentOptionLabel: "每人",
      contracts: CONTRACT_KEYS.map((key) => ({ key, label: CONTRACT_LABELS[key], url: "" })),
    };

    const oldContract = existing.contracts.find((item) => item.key === contractKeyRaw);
    const oldPath = r2KeyFromUrl(oldContract?.url || "");
    const nextContracts = CONTRACT_KEYS.map((key) => {
      const prev = existing.contracts.find((item) => item.key === key);
      return {
        key,
        label: prev?.label || CONTRACT_LABELS[key],
        url: key === contractKeyRaw ? newUrl : prev?.url || "",
      };
    });

    const nextContent: EditableContent = { ...existing, contracts: nextContracts };
    await writeContent(ticketIdRaw, nextContent);
    if (oldPath && oldPath !== path) {
      await r2Delete([oldPath]);
    }

    return NextResponse.json({ content: nextContent, uploaded_url: newUrl });
  } catch {
    return NextResponse.json({ error: "上傳失敗" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
  const authError = requireDevAuth();
  if (authError) return authError;

  const ticketIdRaw = String(context.params.id || "").trim();
  if (!isTicketId(ticketIdRaw)) {
    return NextResponse.json({ error: "不支援的 ticket_id" }, { status: 404 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { contract_key?: string };
    const contractKeyRaw = String(body.contract_key || "").trim();
    if (!isContractKey(contractKeyRaw)) {
      return NextResponse.json({ error: "不支援的 contract_key" }, { status: 400 });
    }

    const existing = await readContent(ticketIdRaw);
    if (!existing) return NextResponse.json({ error: "尚無可刪除內容" }, { status: 404 });

    const target = existing.contracts.find((item) => item.key === contractKeyRaw);
    const targetPath = r2KeyFromUrl(target?.url || "");

    const nextContent: EditableContent = {
      ...existing,
      contracts: existing.contracts.map((item) => (item.key === contractKeyRaw ? { ...item, url: "" } : item)),
    };

    await writeContent(ticketIdRaw, nextContent);
    if (targetPath) {
      await r2Delete([targetPath]);
    }

    return NextResponse.json({ content: nextContent });
  } catch {
    return NextResponse.json({ error: "刪除失敗" }, { status: 500 });
  }
}
