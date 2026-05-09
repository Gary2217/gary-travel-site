import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireDevAuth } from "@/lib/api-auth";
import { getStoragePathFromPublicUrl } from "@/lib/storage";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const SERVICE_IDS = ["roc0001", "roc0002", "tcc0001"] as const;
const CONTENT_FOLDER = "document-services-content";
const FILE_FOLDER = "document-services-files";
const FILE_MAX_SIZE = 15 * 1024 * 1024;
const FILE_EXTENSIONS = ["pdf", "doc", "docx", "jpg", "jpeg", "png", "webp"];

type ServiceId = (typeof SERVICE_IDS)[number];
type ContractKey = "template" | "self" | "other";
const CONTRACT_KEYS: ContractKey[] = ["template", "self", "other"];
const CONTRACT_LABELS: Record<ContractKey, string> = {
  template: "委託書填寫範本",
  self: "護照申請委任書(本人)",
  other: "護照申請委任書(非本人)",
};

type DocumentServiceEditableContent = {
  title: string;
  summary: string;
  requirementsTitle: string;
  requirements: string[];
  optionSectionTitle: string;
  regularTitle: string;
  regularPrice: number;
  regularOptionLabel: string;
  urgentTitle: string;
  urgentPrice: number;
  urgentOptionLabel: string;
  contracts: Array<{
    key: ContractKey;
    label: string;
    url: string;
  }>;
};

function isServiceId(value: string): value is ServiceId {
  return SERVICE_IDS.includes(value as ServiceId);
}

function isContractKey(value: string): value is ContractKey {
  return CONTRACT_KEYS.includes(value as ContractKey);
}

function createAdminClient() {
  return createClient(supabaseUrl, supabaseServiceRoleKey);
}

function getContentPath(serviceId: ServiceId) {
  return `${CONTENT_FOLDER}/${serviceId}.json`;
}

function sanitizeContent(input: unknown): DocumentServiceEditableContent | null {
  if (!input || typeof input !== "object") return null;
  const data = input as Partial<DocumentServiceEditableContent>;

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

  const requirements = Array.isArray(data.requirements)
    ? data.requirements.map((item) => String(item || "").trim()).filter(Boolean)
    : [];

  const regularPrice = Number(data.regularPrice);
  const urgentPrice = Number(data.urgentPrice);

  if (!Number.isFinite(regularPrice) || !Number.isFinite(urgentPrice)) {
    return null;
  }

  return {
    title: String(data.title || "").trim(),
    summary: String(data.summary || "").trim(),
    requirementsTitle: String(data.requirementsTitle || "需準備資料").trim(),
    requirements,
    optionSectionTitle: String(data.optionSectionTitle || "選擇中華民國護照").trim(),
    regularTitle: String(data.regularTitle || "").trim(),
    regularPrice,
    regularOptionLabel: String(data.regularOptionLabel || "每人").trim(),
    urgentTitle: String(data.urgentTitle || "").trim(),
    urgentPrice,
    urgentOptionLabel: String(data.urgentOptionLabel || "每人").trim(),
    contracts,
  };
}

async function readContent(serviceId: ServiceId) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from("images").download(getContentPath(serviceId));

  if (error || !data) {
    return null;
  }

  const raw = await data.text();
  try {
    const parsed = JSON.parse(raw) as unknown;
    return sanitizeContent(parsed);
  } catch {
    return null;
  }
}

async function writeContent(serviceId: ServiceId, content: DocumentServiceEditableContent) {
  const supabase = createAdminClient();
  const bytes = Buffer.from(JSON.stringify(content, null, 2), "utf-8");
  const { error } = await supabase.storage.from("images").upload(getContentPath(serviceId), bytes, {
    contentType: "application/json; charset=utf-8",
    cacheControl: "0",
    upsert: true,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function GET(_: NextRequest, context: { params: { id: string } }) {
  const serviceIdRaw = String(context.params.id || "").trim();
  if (!isServiceId(serviceIdRaw)) {
    return NextResponse.json({ error: "不支援的 service_id" }, { status: 404 });
  }

  try {
    const content = await readContent(serviceIdRaw);
    return NextResponse.json({ content }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ content: null }, { headers: { "Cache-Control": "no-store" } });
  }
}

export async function PUT(request: NextRequest, context: { params: { id: string } }) {
  const authError = requireDevAuth();
  if (authError) return authError;

  const serviceIdRaw = String(context.params.id || "").trim();
  if (!isServiceId(serviceIdRaw)) {
    return NextResponse.json({ error: "不支援的 service_id" }, { status: 404 });
  }

  try {
    const body = (await request.json()) as { content?: unknown };
    const content = sanitizeContent(body.content);
    if (!content) {
      return NextResponse.json({ error: "內容格式不正確" }, { status: 400 });
    }

    await writeContent(serviceIdRaw, content);
    return NextResponse.json({ content });
  } catch {
    return NextResponse.json({ error: "儲存失敗" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  const authError = requireDevAuth();
  if (authError) return authError;

  const serviceIdRaw = String(context.params.id || "").trim();
  if (!isServiceId(serviceIdRaw)) {
    return NextResponse.json({ error: "不支援的 service_id" }, { status: 404 });
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

    const supabase = createAdminClient();
    const path = `${FILE_FOLDER}/${serviceIdRaw}/${contractKeyRaw}-${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage.from("images").upload(path, buffer, {
      contentType: file.type || "application/octet-stream",
      cacheControl: "0",
      upsert: false,
    });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data } = supabase.storage.from("images").getPublicUrl(path);
    const newUrl = data.publicUrl;

    const existing = (await readContent(serviceIdRaw)) || {
      title: "",
      summary: "",
      requirementsTitle: "需準備資料",
      requirements: [],
      optionSectionTitle: "選擇中華民國護照",
      regularTitle: "",
      regularPrice: 0,
      regularOptionLabel: "每人",
      urgentTitle: "",
      urgentPrice: 0,
      urgentOptionLabel: "每人",
      contracts: [
        { key: "template" as const, label: CONTRACT_LABELS.template, url: "" },
        { key: "self" as const, label: CONTRACT_LABELS.self, url: "" },
        { key: "other" as const, label: CONTRACT_LABELS.other, url: "" },
      ],
    };

    const oldContract = existing.contracts.find((item) => item.key === contractKeyRaw);
    const oldPath = getStoragePathFromPublicUrl(oldContract?.url || "");

    const nextContracts = CONTRACT_KEYS.map((key) => {
      const prev = existing.contracts.find((item) => item.key === key);
      return {
        key: key as ContractKey,
        label: prev?.label || CONTRACT_LABELS[key],
        url: key === contractKeyRaw ? newUrl : prev?.url || "",
      };
    });

    const nextContent: DocumentServiceEditableContent = {
      ...existing,
      contracts: nextContracts,
    };

    await writeContent(serviceIdRaw, nextContent);

    if (oldPath && oldPath !== path) {
      await supabase.storage.from("images").remove([oldPath]);
    }

    return NextResponse.json({ content: nextContent, uploaded_url: newUrl });
  } catch {
    return NextResponse.json({ error: "上傳失敗" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
  const authError = requireDevAuth();
  if (authError) return authError;

  const serviceIdRaw = String(context.params.id || "").trim();
  if (!isServiceId(serviceIdRaw)) {
    return NextResponse.json({ error: "不支援的 service_id" }, { status: 404 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { contract_key?: string };
    const contractKeyRaw = String(body.contract_key || "").trim();
    if (!isContractKey(contractKeyRaw)) {
      return NextResponse.json({ error: "不支援的 contract_key" }, { status: 400 });
    }

    const existing = await readContent(serviceIdRaw);
    if (!existing) {
      return NextResponse.json({ error: "尚無可刪除內容" }, { status: 404 });
    }

    const supabase = createAdminClient();
    const target = existing.contracts.find((item) => item.key === contractKeyRaw);
    const targetPath = getStoragePathFromPublicUrl(target?.url || "");

    const nextContent: DocumentServiceEditableContent = {
      ...existing,
      contracts: existing.contracts.map((item) =>
        item.key === contractKeyRaw
          ? {
              ...item,
              url: "",
            }
          : item,
      ),
    };

    await writeContent(serviceIdRaw, nextContent);

    if (targetPath) {
      await supabase.storage.from("images").remove([targetPath]);
    }

    return NextResponse.json({ content: nextContent });
  } catch {
    return NextResponse.json({ error: "刪除失敗" }, { status: 500 });
  }
}
