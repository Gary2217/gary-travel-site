"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import StickyHeader from "@/components/StickyHeader";
import DevModeToggle from "@/components/DevModeToggle";
import FloatingContact from "@/components/FloatingContact";
import SocialCta from "@/components/SocialCta";
import { getSiteLogo, lineDmHref } from "@/lib/supabase";
import { getMiniTransitTicketById } from "@/lib/mini-transit-tickets";

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
  departureLabel: string;
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

type RequirementSectionKey = "steps" | "process" | "included" | "notes" | "orderInfo";

const REQUIREMENT_SECTION_ORDER: RequirementSectionKey[] = ["steps", "process", "included", "notes", "orderInfo"];

const REQUIREMENT_SECTION_TITLES: Record<RequirementSectionKey, string> = {
  steps: "購買流程",
  process: "小三通通關流程",
  included: "費用包含",
  notes: "注意事項",
  orderInfo: "訂購必填資訊",
};

const REQUIREMENT_SECTION_MARKERS: Record<Exclude<RequirementSectionKey, "steps">, string> = {
  process: "## 小三通通關流程",
  included: "## 費用包含",
  notes: "## 注意事項",
  orderInfo: "## 訂購時請於備註欄位確實提供下列資訊(必填)",
};

const DEFAULT_REQUIREMENTS_TITLE = "購買流程";

function normalizeRequirementsTitle(value: string) {
  const normalized = value.trim();
  if (!normalized || normalized === "需準備資料") return DEFAULT_REQUIREMENTS_TITLE;
  return normalized;
}

function normalizeRequirementLine(line: string) {
  const normalized = line.trim();
  if (!normalized) return "";

  if (/^##\s*小三通通關流程/.test(normalized)) return REQUIREMENT_SECTION_MARKERS.process;
  if (/^##\s*費用包含/.test(normalized)) return REQUIREMENT_SECTION_MARKERS.included;
  if (/^##\s*注意事項/.test(normalized)) return REQUIREMENT_SECTION_MARKERS.notes;
  if (/^##\s*訂購時請於備註欄位確實提供下列資訊/.test(normalized)) return REQUIREMENT_SECTION_MARKERS.orderInfo;

  if (normalized === "【流程說明】") return "## 小三通通關流程";
  if (normalized === "【票券包含】") return "## 費用包含";
  if (normalized === "【注意事項】") return "## 注意事項";
  if (normalized.startsWith("【訂購時請於備註欄位確實提供下列資訊")) return "## 訂購時請於備註欄位確實提供下列資訊(必填)";
  return normalized;
}

function detectRequirementSection(line: string): RequirementSectionKey | null {
  if (!line.startsWith("##")) return null;
  const heading = line.replace(/^##\s*/, "").replace(/\s+/g, "");

  if (heading.includes("小三通通關流程")) return "process";
  if (heading.includes("費用包含")) return "included";
  if (heading.includes("注意事項")) return "notes";
  if (heading.includes("訂購時請於備註欄位確實提供下列資訊")) return "orderInfo";
  return null;
}

function createEmptyRequirementSections(): Record<RequirementSectionKey, string[]> {
  return {
    steps: [],
    process: [],
    included: [],
    notes: [],
    orderInfo: [],
  };
}

function parseRequirementSections(requirements: string[]) {
  const sections = createEmptyRequirementSections();
  let currentSection: RequirementSectionKey = "steps";

  for (const raw of requirements) {
    const line = normalizeRequirementLine(raw);
    if (!line) continue;

    const detectedSection = detectRequirementSection(line);
    if (detectedSection) {
      currentSection = detectedSection;
      continue;
    }

    if (line === REQUIREMENT_SECTION_MARKERS.process) {
      currentSection = "process";
      continue;
    }
    if (line === REQUIREMENT_SECTION_MARKERS.included) {
      currentSection = "included";
      continue;
    }
    if (line === REQUIREMENT_SECTION_MARKERS.notes) {
      currentSection = "notes";
      continue;
    }
    if (line === REQUIREMENT_SECTION_MARKERS.orderInfo) {
      currentSection = "orderInfo";
      continue;
    }

    sections[currentSection].push(line);
  }

  return sections;
}

function serializeRequirementSections(sections: Record<RequirementSectionKey, string[]>) {
  const lines: string[] = [];

  lines.push(...sections.steps);
  lines.push(REQUIREMENT_SECTION_MARKERS.process, ...sections.process);
  lines.push(REQUIREMENT_SECTION_MARKERS.included, ...sections.included);
  lines.push(REQUIREMENT_SECTION_MARKERS.notes, ...sections.notes);
  lines.push(REQUIREMENT_SECTION_MARKERS.orderInfo, ...sections.orderInfo);

  return lines.map((line) => line.trim()).filter(Boolean);
}

function normalizeEditableContent(base: EditableContent, incoming: Partial<EditableContent> | null | undefined): EditableContent {
  if (!incoming) return base;

  const contracts = (Array.isArray(incoming.contracts) ? incoming.contracts : [])
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const key = CONTRACT_KEYS.includes(item.key as ContractKey) ? (item.key as ContractKey) : null;
      if (!key) return null;
      return {
        key,
        label: String(item.label || "").trim() || CONTRACT_LABELS[key],
        url: String(item.url || "").trim(),
      };
    })
    .filter((item): item is { key: ContractKey; label: string; url: string } => Boolean(item));

  const mergedContracts = CONTRACT_KEYS.map((key) => {
    const found = contracts.find((item) => item.key === key);
    const fallback = base.contracts.find((item) => item.key === key);
    return {
      key,
      label: found?.label || fallback?.label || CONTRACT_LABELS[key],
      url: found?.url || fallback?.url || "",
    };
  });

  const parsedRegularPrice = Number(incoming.regularPrice);
  const parsedUrgentPrice = Number(incoming.urgentPrice);
  const incomingRequirements = Array.isArray(incoming.requirements)
    ? incoming.requirements.map((item) => normalizeRequirementLine(String(item || ""))).filter(Boolean)
    : [];
  const hasEssentialSections =
    incomingRequirements.some((line) => line.startsWith("STEP 1")) &&
    incomingRequirements.some((line) => line.includes("【機票】")) &&
    incomingRequirements.some((line) => line.includes("1、機票開立完成後"));

  return {
    title: String(incoming.title || base.title).trim(),
    summary: String(incoming.summary || base.summary).trim(),
    departureLabel: String(incoming.departureLabel || base.departureLabel).trim(),
    inquiryTitle: String(incoming.inquiryTitle || base.inquiryTitle).trim(),
    requirementsTitle: normalizeRequirementsTitle(String(incoming.requirementsTitle || base.requirementsTitle)),
    requirements: hasEssentialSections ? incomingRequirements : base.requirements,
    optionSectionTitle: String(incoming.optionSectionTitle || base.optionSectionTitle).trim(),
    regularTitle: String(incoming.regularTitle || base.regularTitle).trim(),
    regularPrice: Number.isFinite(parsedRegularPrice) && parsedRegularPrice > 0 ? parsedRegularPrice : base.regularPrice,
    regularOptionLabel: String(incoming.regularOptionLabel || base.regularOptionLabel).trim(),
    urgentTitle: String(incoming.urgentTitle || base.urgentTitle).trim(),
    urgentPrice: Number.isFinite(parsedUrgentPrice) && parsedUrgentPrice > 0 ? parsedUrgentPrice : base.urgentPrice,
    urgentOptionLabel: String(incoming.urgentOptionLabel || base.urgentOptionLabel).trim(),
    contracts: mergedContracts,
  };
}

export default function MiniTransitTicketDetailPage() {
  const params = useParams<{ id: string }>();
  const [siteLogoUrl, setSiteLogoUrl] = useState("/travel-logo.svg");
  const [isDevMode, setIsDevMode] = useState(false);
  const [imageMap, setImageMap] = useState<Record<string, string>>({});
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [content, setContent] = useState<EditableContent | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [savingContent, setSavingContent] = useState(false);
  const [savingMessage, setSavingMessage] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [editingRequirementSection, setEditingRequirementSection] = useState<RequirementSectionKey | null>(null);
  const [editingInquirySection, setEditingInquirySection] = useState(false);

  const ticket = useMemo(() => getMiniTransitTicketById(params?.id || ""), [params?.id]);

  const defaultContent = useMemo<EditableContent | null>(() => {
    if (!ticket) return null;
    return {
      title: ticket.title,
      summary: ticket.summary,
      departureLabel: ticket.departureLabel,
      inquiryTitle: "購買詢問",
      requirementsTitle: DEFAULT_REQUIREMENTS_TITLE,
      requirements: ticket.requirements,
      optionSectionTitle: "票券方案",
      regularTitle: ticket.regularTitle,
      regularPrice: ticket.regularPrice,
      regularOptionLabel: "每人",
      urgentTitle: ticket.urgentTitle,
      urgentPrice: ticket.urgentPrice,
      urgentOptionLabel: "每人",
      contracts: CONTRACT_KEYS.map((key) => ({ key, label: CONTRACT_LABELS[key], url: "" })),
    };
  }, [ticket]);

  useEffect(() => {
    getSiteLogo().then(setSiteLogoUrl).catch(() => setSiteLogoUrl("/travel-logo.svg"));

    try {
      const cached = localStorage.getItem("mini_transit_detail_images");
      if (cached) {
        const parsed = JSON.parse(cached) as Record<string, string>;
        if (parsed && typeof parsed === "object") {
          setImageMap(parsed);
          setImagesLoaded(true);
        }
      }
    } catch {
      // ignore cache parse error
    }

    fetch("/api/mini-transit-ticket-images", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        const images = data?.detail_images;
        if (images && typeof images === "object") {
          const normalized = images as Record<string, string>;
          setImageMap(normalized);
          try {
            localStorage.setItem("mini_transit_detail_images", JSON.stringify(normalized));
          } catch {
            // ignore cache write error
          }
        }
        setImagesLoaded(true);
      })
      .catch(() => {
        setImagesLoaded(true);
      });
  }, []);

  useEffect(() => {
    if (!ticket || !defaultContent) return;

    setContent(defaultContent);
    setSavingMessage(null);
    setLoadingContent(true);
    fetch(`/api/mini-transit-tickets/${ticket.id}/content`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        setContent(normalizeEditableContent(defaultContent, data?.content || null));
      })
      .catch(() => {
        setContent(defaultContent);
      })
      .finally(() => {
        setLoadingContent(false);
      });
  }, [ticket, defaultContent]);

  const showSaveSuccess = (message = "儲存成功") => {
    setSaveSuccessMessage(message);
    window.setTimeout(() => {
      setSaveSuccessMessage(null);
    }, 1500);
  };

  const requirementSections = useMemo(
    () => parseRequirementSections(content?.requirements || []),
    [content?.requirements],
  );

  if (!ticket || !content || !defaultContent) {
    return (
      <main className="min-h-screen bg-transparent pt-14 text-gray-900">
        <StickyHeader logoUrl={siteLogoUrl} showBackButton backHref="/mini-transit-tickets" devModeSlot={<DevModeToggle onToggle={setIsDevMode} />} />
        <section className="mx-auto max-w-site px-4 py-10 md:px-5">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
            <p className="text-gray-600">找不到此小三通票卷項目</p>
          </div>
        </section>
      </main>
    );
  }

  const displayImage = imageMap[ticket.id] || ticket.image;

  const updateRequirementSection = (sectionKey: RequirementSectionKey, value: string) => {
    setContent((prev) => {
      if (!prev) return prev;
      const nextSections = parseRequirementSections(prev.requirements);
      nextSections[sectionKey] = value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      return {
        ...prev,
        requirements: serializeRequirementSections(nextSections),
      };
    });
  };

  const saveContent = async () => {
    setSavingContent(true);
    setSavingMessage(null);
    try {
      const normalized: EditableContent = {
        ...content,
        requirements: content.requirements.map((item) => item.trim()).filter(Boolean),
        regularPrice: Number(content.regularPrice) > 0 ? Number(content.regularPrice) : defaultContent.regularPrice,
        urgentPrice: Number(content.urgentPrice) > 0 ? Number(content.urgentPrice) : defaultContent.urgentPrice,
      };

      const res = await fetch(`/api/mini-transit-tickets/${ticket.id}/content`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: normalized }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "儲存失敗");

      setContent(normalizeEditableContent(normalized, data?.content || normalized));
      setSavingMessage("內容已儲存");
      showSaveSuccess("儲存成功");
    } catch (error) {
      const message = error instanceof Error ? error.message : "儲存失敗";
      setSavingMessage(`儲存失敗：${message}`);
    } finally {
      setSavingContent(false);
    }
  };

  const handleReplaceImage = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("請選擇圖片檔案");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("圖片檔案不能超過 5MB");
      return;
    }
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("ticket_id", ticket.id);
      formData.append("image_type", "detail");

      const res = await fetch("/api/mini-transit-ticket-images", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "上傳失敗");
      const url = String(data?.url || "");
      if (url) {
        setImageMap((prev) => {
          const next = { ...prev, [ticket.id]: url };
          try {
            localStorage.setItem("mini_transit_detail_images", JSON.stringify(next));
          } catch {
            // ignore
          }
          return next;
        });
      }
      showSaveSuccess("圖片已更新！");
    } catch (error) {
      const message = error instanceof Error ? error.message : "上傳失敗";
      alert(`上傳失敗：${message}`);
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <main className="min-h-screen bg-transparent pt-14 text-gray-900">
      <StickyHeader logoUrl={siteLogoUrl} showBackButton backHref="/mini-transit-tickets" devModeSlot={<DevModeToggle onToggle={setIsDevMode} />} />

      <section className="mx-auto max-w-site px-4 py-8 md:px-5">
        <Link href="/mini-transit-tickets" className="mb-4 inline-flex items-center gap-1 text-sm text-gray-600 transition hover:text-gray-900">
          ← 返回小三通票卷列表
        </Link>

        {isDevMode && savingMessage && (
          <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-sm text-sky-700">{savingMessage}</div>
        )}

        <article className="overflow-hidden rounded-[1.5rem] border border-gray-200 bg-white shadow-sm">
          <div className="relative overflow-hidden bg-gray-50">
            {imagesLoaded ? (
              <img src={displayImage} alt={content.title} className="h-auto w-full object-contain" />
            ) : (
              <div className="h-full min-h-[360px] w-full animate-pulse bg-gray-100" />
            )}
            {isDevMode && (
              <label className="absolute right-3 top-3 inline-flex cursor-pointer items-center rounded-full bg-sky-600/90 px-3 py-1 text-xs font-semibold text-white transition hover:bg-sky-500">
                {uploadingImage ? "上傳中..." : "上傳/更換圖片"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={uploadingImage}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleReplaceImage(file);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            )}
          </div>

          <div className="p-5 sm:p-6">
            <h1 className="text-xl font-black text-gray-900 sm:text-2xl">{content.title}</h1>

            <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <h2 className="mb-4 text-xl font-black text-sky-600 sm:text-2xl">{content.requirementsTitle}</h2>

              <div className="space-y-4">
                {REQUIREMENT_SECTION_ORDER.map((sectionKey) => {
                  const lines = requirementSections[sectionKey];
                  const isEditingThisSection = isDevMode && editingRequirementSection === sectionKey;

                  return (
                    <section key={sectionKey} className="rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h3 className="text-lg font-black text-sky-600 sm:text-xl">{REQUIREMENT_SECTION_TITLES[sectionKey]}</h3>
                        {isDevMode && (
                          <button
                            type="button"
                            onClick={() => setEditingRequirementSection((prev) => (prev === sectionKey ? null : sectionKey))}
                            className="rounded-md border border-sky-500 px-3 py-1 text-xs font-semibold text-sky-600 hover:bg-sky-50"
                          >
                            {editingRequirementSection === sectionKey ? "關閉編輯" : "編輯"}
                          </button>
                        )}
                      </div>

                      {isEditingThisSection && (
                        <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                          <textarea
                            rows={14}
                            className="min-h-[340px] w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900"
                            value={lines.join("\n")}
                            onChange={(e) => updateRequirementSection(sectionKey, e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={saveContent}
                            disabled={savingContent || loadingContent}
                            className="mt-3 rounded-lg bg-sky-500 px-4 py-2 text-sm font-bold text-white hover:bg-sky-400 disabled:opacity-60"
                          >
                            {savingContent ? "儲存中..." : "儲存此區塊"}
                          </button>
                        </div>
                      )}

                      <div className="space-y-2 text-base leading-7 text-gray-800">
                        {lines.length > 0 ? (
                          lines.map((row, idx) => <p key={`${sectionKey}-${idx}-${row}`}>{row}</p>)
                        ) : (
                          <p className="text-sm text-gray-500">（尚未填寫）</p>
                        )}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="mb-3 flex items-center justify-end">
                {isDevMode && (
                  <button
                    type="button"
                    onClick={() => setEditingInquirySection((prev) => !prev)}
                    className="rounded-md border border-sky-500 px-3 py-1 text-xs font-semibold text-sky-600 hover:bg-sky-50"
                  >
                    {editingInquirySection ? "關閉編輯" : "編輯"}
                  </button>
                )}
              </div>

              {isDevMode && editingInquirySection && (
                <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="space-y-3">
                    <div>
                      <p className="mb-1 text-xs font-semibold text-gray-600">區塊標題</p>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900"
                        value={content.inquiryTitle}
                        onChange={(e) => setContent((prev) => (prev ? { ...prev, inquiryTitle: e.target.value } : prev))}
                      />
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-semibold text-gray-600">出發地文字</p>
                      <input
                        type="text"
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900"
                        value={content.departureLabel}
                        onChange={(e) => setContent((prev) => (prev ? { ...prev, departureLabel: e.target.value } : prev))}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={saveContent}
                    disabled={savingContent || loadingContent}
                    className="mt-3 rounded-lg bg-sky-500 px-4 py-2 text-sm font-bold text-white hover:bg-sky-400 disabled:opacity-60"
                  >
                    {savingContent ? "儲存中..." : "儲存此區塊"}
                  </button>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#06C755]/30 bg-emerald-50 p-4">
                <div>
                  <p className="text-base font-bold text-gray-900 sm:text-lg">{content.inquiryTitle || "購買詢問"}</p>
                  <p className="mt-1 text-sm text-gray-600">出發地：{content.departureLabel || ticket.departureLabel}</p>
                </div>
                <a
                  href={lineDmHref}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-[#06C755] bg-[#06C755]/10 px-5 py-1.5 text-sm font-semibold text-[#06C755] transition hover:bg-[#06C755]/20"
                >
                  LINE 洽詢
                </a>
              </div>
            </div>
          </div>
        </article>

        <SocialCta
          className="mt-10"
          title="想確認你的小三通票券需求嗎？"
          description="聯繫旅遊規劃師 蓋瑞 GARY，先幫你確認班次、票券與時程"
        />
      </section>

      {isDevMode && <div className="mx-auto max-w-site px-4 pb-2 text-right text-xs text-gray-400 md:px-5">開發者模式已啟用</div>}

      <FloatingContact />

      {saveSuccessMessage && (
        <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center px-4">
          <div className="rounded-2xl border border-emerald-200 bg-white px-5 py-4 text-center shadow-2xl backdrop-blur-xl sm:px-6">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-base font-bold text-emerald-600">{saveSuccessMessage}</p>
          </div>
        </div>
      )}
    </main>
  );
}
