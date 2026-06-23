"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import StickyHeader from "@/components/StickyHeader";
import DevModeToggle from "@/components/DevModeToggle";
import FloatingContact from "@/components/FloatingContact";
import SocialCta from "@/components/SocialCta";
import { getSiteLogo, lineDmHref } from "@/lib/supabase";
import { getDocumentServiceById } from "@/lib/document-services";

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

const DEFAULT_REGULAR_PRICE = 1700;
const DEFAULT_URGENT_PRICE = 2600;

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

  const mergedContracts: EditableContent["contracts"] = CONTRACT_KEYS.map((key) => {
    const found = contracts.find((item) => item.key === key);
    const fallback = base.contracts.find((item) => item.key === key);
    return {
      key,
      label: found?.label || fallback?.label || CONTRACT_LABELS[key],
      url: found?.url || fallback?.url || "",
    };
  });

  const optionSectionTitleRaw = String(incoming.optionSectionTitle || base.optionSectionTitle).trim();
  const optionSectionTitle =
    optionSectionTitleRaw === "選擇中華民國護照" ? "選擇普通送件 or 急件送審" : optionSectionTitleRaw;
  const parsedRegularPrice = Number(incoming.regularPrice);
  const parsedUrgentPrice = Number(incoming.urgentPrice);

  return {
    title: String(incoming.title || base.title).trim(),
    summary: String(incoming.summary || base.summary).trim(),
    requirementsTitle: String(incoming.requirementsTitle || base.requirementsTitle).trim(),
    requirements: Array.isArray(incoming.requirements)
      ? incoming.requirements.map((item) => String(item || "").trim()).filter(Boolean)
      : base.requirements,
    optionSectionTitle,
    regularTitle: String(incoming.regularTitle || base.regularTitle).trim(),
    regularPrice: Number.isFinite(parsedRegularPrice) && parsedRegularPrice > 0 ? parsedRegularPrice : base.regularPrice,
    regularOptionLabel: String(incoming.regularOptionLabel || base.regularOptionLabel).trim(),
    urgentTitle: String(incoming.urgentTitle || base.urgentTitle).trim(),
    urgentPrice: Number.isFinite(parsedUrgentPrice) && parsedUrgentPrice > 0 ? parsedUrgentPrice : base.urgentPrice,
    urgentOptionLabel: String(incoming.urgentOptionLabel || base.urgentOptionLabel).trim(),
    contracts: mergedContracts,
  };
}

export default function DocumentServiceDetailPage() {
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
  const [editingSections, setEditingSections] = useState<{
    requirements: boolean;
    contracts: boolean;
    options: boolean;
  }>({
    requirements: false,
    contracts: false,
    options: false,
  });
  const [uploadingContractKey, setUploadingContractKey] = useState<ContractKey | null>(null);
  const [deletingContractKey, setDeletingContractKey] = useState<ContractKey | null>(null);

  const service = useMemo(() => getDocumentServiceById(params?.id || ""), [params?.id]);
  const isEnhancedDocumentPage = service ? ["roc0001", "roc0002", "tcc0001"].includes(service.id) : false;

  const defaultContent = useMemo<EditableContent | null>(() => {
    if (!service) return null;

    const serviceDefaults: Record<
      string,
      {
        optionSectionTitle: string;
        regularTitle: string;
        regularPrice: number;
        urgentTitle: string;
        urgentPrice: number;
      }
    > = {
      roc0001: {
        optionSectionTitle: "選擇普通送件 or 急件送審",
        regularTitle: "（一般普件）約 10-15天",
        regularPrice: 1700,
        urgentTitle: "加急送件 約 3-5天",
        urgentPrice: 2600,
      },
      roc0002: {
        optionSectionTitle: "選擇中華民國護照",
        regularTitle: "（孩童一般普件）五年效期 10-15天",
        regularPrice: 1400,
        urgentTitle: "（孩童急件）五年效期 5-7天",
        urgentPrice: 2400,
      },
      tcc0001: {
        optionSectionTitle: "選擇【台胞證】中國-台胞卡",
        regularTitle: "(普通件) 7 天",
        regularPrice: 1550,
        urgentTitle: "(急件)3-5天",
        urgentPrice: 2550,
      },
    };

    const selectedDefaults = serviceDefaults[service.id] || serviceDefaults.roc0001;

    return {
      title: service.title,
      summary: service.summary,
      requirementsTitle: "需準備資料",
      requirements: service.requirements,
      optionSectionTitle: selectedDefaults.optionSectionTitle,
      regularTitle: selectedDefaults.regularTitle,
      regularPrice: selectedDefaults.regularPrice,
      regularOptionLabel: "每人",
      urgentTitle: selectedDefaults.urgentTitle,
      urgentPrice: selectedDefaults.urgentPrice,
      urgentOptionLabel: "每人",
      contracts: [
        { key: "template", label: CONTRACT_LABELS.template, url: "" },
        { key: "self", label: CONTRACT_LABELS.self, url: "" },
        { key: "other", label: CONTRACT_LABELS.other, url: "" },
      ],
    };
  }, [service]);

  useEffect(() => {
    getSiteLogo().then(setSiteLogoUrl).catch(() => setSiteLogoUrl("/travel-logo.svg"));

    try {
      const cached = localStorage.getItem("document_service_detail_images");
      if (cached) {
        const parsed = JSON.parse(cached) as Record<string, string>;
        if (parsed && typeof parsed === "object") {
          setImageMap(parsed);
          setImagesLoaded(true);
        }
      }
    } catch {
      // 忽略快取解析錯誤
    }

    fetch("/api/document-service-images", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        const images = data?.detail_images || data?.images;
        if (images && typeof images === "object") {
          const normalized = images as Record<string, string>;
          setImageMap(normalized);
          try {
            localStorage.setItem("document_service_detail_images", JSON.stringify(normalized));
          } catch {
            // 忽略快取寫入錯誤
          }
        }
        setImagesLoaded(true);
      })
      .catch(() => {
        setImagesLoaded(true);
      });
  }, []);

  useEffect(() => {
    if (!service || !defaultContent) return;

    setContent(defaultContent);
    setSavingMessage(null);

    setLoadingContent(true);
    fetch(`/api/document-services/${service.id}/content`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        const next = normalizeEditableContent(defaultContent, data?.content || null);
        setContent(next);
      })
      .catch(() => {
        setContent(defaultContent);
      })
      .finally(() => {
        setLoadingContent(false);
      });
  }, [service, defaultContent]);

  const showSaveSuccess = (message = "儲存成功") => {
    setSaveSuccessMessage(message);
    window.setTimeout(() => {
      setSaveSuccessMessage(null);
    }, 1500);
  };

  if (!service || !content) {
    return (
      <main className="min-h-screen bg-transparent pt-header text-gray-900">
        <StickyHeader
          logoUrl={siteLogoUrl}
          showBackButton
          backHref="/document-services"
          devModeSlot={<DevModeToggle onToggle={setIsDevMode} />}
        />
        <section className="mx-auto max-w-site px-4 py-10 md:px-5">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
            <p className="text-gray-600">找不到此證件服務項目</p>
            <Link
              href="/document-services"
              className="mt-4 inline-flex items-center gap-1 text-sm text-sky-600 transition hover:text-sky-500"
            >
              返回證件代辦列表
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const displayImage = imageMap[service.id] || service.image;
  const fallbackRegularPrice = defaultContent?.regularPrice ?? DEFAULT_REGULAR_PRICE;
  const fallbackUrgentPrice = defaultContent?.urgentPrice ?? DEFAULT_URGENT_PRICE;
  const regularPrice = Number(content.regularPrice) > 0 ? Number(content.regularPrice) : fallbackRegularPrice;
  const urgentPrice = Number(content.urgentPrice) > 0 ? Number(content.urgentPrice) : fallbackUrgentPrice;

  const setContractField = (key: ContractKey, field: "label" | "url", value: string) => {
    setContent((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        contracts: prev.contracts.map((item) =>
          item.key === key
            ? {
                ...item,
                [field]: value,
              }
            : item,
        ),
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
        regularPrice: Number(content.regularPrice) > 0 ? Number(content.regularPrice) : fallbackRegularPrice,
        urgentPrice: Number(content.urgentPrice) > 0 ? Number(content.urgentPrice) : fallbackUrgentPrice,
      };

      const res = await fetch(`/api/document-services/${service.id}/content`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: normalized }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "儲存失敗");
      }

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
      formData.append("service_id", service.id);
      formData.append("image_type", "detail");

      const res = await fetch("/api/document-service-images", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "上傳失敗");
      }

      const url = String(data?.url || "");
      if (url) {
        setImageMap((prev) => {
          const next = { ...prev, [service.id]: url };
          try {
            localStorage.setItem("document_service_detail_images", JSON.stringify(next));
          } catch {
            // 忽略快取寫入錯誤
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

  const uploadContractFile = async (contractKey: ContractKey, file: File) => {
    setUploadingContractKey(contractKey);
    try {
      const formData = new FormData();
      formData.append("contract_key", contractKey);
      formData.append("file", file);

      const res = await fetch(`/api/document-services/${service.id}/content`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "上傳失敗");
      }

      setContent((prev) => normalizeEditableContent(prev || content, data?.content || null));
      setSavingMessage("合約檔已上傳");
      showSaveSuccess("儲存成功");
    } catch (error) {
      const message = error instanceof Error ? error.message : "上傳失敗";
      setSavingMessage(`上傳失敗：${message}`);
    } finally {
      setUploadingContractKey(null);
    }
  };

  const deleteContractFile = async (contractKey: ContractKey) => {
    if (!confirm("確定要刪除此下載檔案嗎？")) return;

    setDeletingContractKey(contractKey);
    try {
      const res = await fetch(`/api/document-services/${service.id}/content`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contract_key: contractKey }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "刪除失敗");
      }

      setContent((prev) => normalizeEditableContent(prev || content, data?.content || null));
      setSavingMessage("下載檔已刪除");
      showSaveSuccess("儲存成功");
    } catch (error) {
      const message = error instanceof Error ? error.message : "刪除失敗";
      setSavingMessage(`刪除失敗：${message}`);
    } finally {
      setDeletingContractKey(null);
    }
  };

  const toggleSectionEdit = (section: "requirements" | "contracts" | "options") => {
    setEditingSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <main className="min-h-screen bg-transparent pt-header text-gray-900">
      <StickyHeader
        logoUrl={siteLogoUrl}
        showBackButton
        backHref="/document-services"
        devModeSlot={<DevModeToggle onToggle={setIsDevMode} />}
      />

      <section className="mx-auto max-w-site px-4 py-8 md:px-5">
        <Link
          href="/document-services"
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-600 transition hover:text-gray-900"
        >
          ← 返回證件代辦列表
        </Link>

        {isDevMode && savingMessage && (
          <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-sm text-sky-700">
            {savingMessage}
          </div>
        )}

        <article className="overflow-hidden rounded-[1.5rem] border border-gray-200 bg-white shadow-sm">
          <div className={`relative overflow-hidden ${isEnhancedDocumentPage ? "bg-gray-50" : "aspect-[16/8]"}`}>
            {imagesLoaded ? (
              <img
                src={displayImage}
                alt={content.title}
                className={isEnhancedDocumentPage ? "h-auto w-full object-contain" : "h-full w-full object-cover"}
              />
            ) : (
              <div className={`h-full w-full animate-pulse bg-gray-100 ${isEnhancedDocumentPage ? "min-h-[360px]" : ""}`} />
            )}

            {!isEnhancedDocumentPage && <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />}

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
                    if (file) {
                      handleReplaceImage(file);
                    }
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            )}
          </div>

          <div className="p-5 sm:p-6">
            <h1 className="text-xl font-black text-gray-900 sm:text-2xl">{content.title}</h1>
            {!isEnhancedDocumentPage && <p className="mt-2 text-sm leading-6 text-gray-600">{content.summary}</p>}

            <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-sky-600">{content.requirementsTitle}</h2>
                {isDevMode && (
                  <button
                    type="button"
                    onClick={() => toggleSectionEdit("requirements")}
                    className="rounded-md border border-sky-500 px-3 py-1 text-xs font-semibold text-sky-600 hover:bg-sky-50"
                  >
                    {editingSections.requirements ? "關閉編輯" : "編輯"}
                  </button>
                )}
              </div>

              {isDevMode && editingSections.requirements && (
                <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <label className="mb-2 block text-sm">
                    <span className="mb-1 block text-gray-600">區塊標題</span>
                    <input
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900"
                      value={content.requirementsTitle}
                      onChange={(e) => setContent((prev) => (prev ? { ...prev, requirementsTitle: e.target.value } : prev))}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-gray-600">清單內容（每行一條）</span>
                    <textarea
                      rows={8}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900"
                      value={content.requirements.join("\n")}
                      onChange={(e) =>
                        setContent((prev) =>
                          prev
                            ? {
                                ...prev,
                                requirements: e.target.value
                                  .split("\n")
                                  .map((line) => line.trim())
                                  .filter(Boolean),
                              }
                            : prev,
                        )
                      }
                    />
                  </label>
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

              <ul className="space-y-2 text-base leading-7 text-gray-800">
                {content.requirements.map((row) => (
                  <li key={row} className="flex items-start gap-2">
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
                    <span>{row}</span>
                  </li>
                ))}
              </ul>
            </div>

            {isEnhancedDocumentPage && (
              <>
                <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-base text-gray-800">
                  <div className="mb-3 flex items-center justify-end">
                    {isDevMode && (
                      <button
                        type="button"
                        onClick={() => toggleSectionEdit("contracts")}
                        className="rounded-md border border-sky-500 px-3 py-1 text-xs font-semibold text-sky-600 hover:bg-sky-50"
                      >
                        {editingSections.contracts ? "關閉編輯" : "編輯"}
                      </button>
                    )}
                  </div>

                  {isDevMode && editingSections.contracts && (
                    <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <p className="mb-2 text-sm font-bold text-gray-900">下載合約檔案設定</p>
                      <div className="space-y-3">
                        {content.contracts.map((contract) => (
                          <div key={contract.key} className="rounded-lg border border-gray-200 p-3">
                            <label className="mb-2 block text-sm">
                              <span className="mb-1 block text-gray-600">顯示文字</span>
                              <input
                                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900"
                                value={contract.label}
                                onChange={(e) => setContractField(contract.key, "label", e.target.value)}
                              />
                            </label>

                            <label className="mb-2 block text-sm">
                              <span className="mb-1 block text-gray-600">下載連結（可手動貼 URL）</span>
                              <input
                                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900"
                                value={contract.url}
                                onChange={(e) => setContractField(contract.key, "url", e.target.value)}
                              />
                            </label>

                            <div className="flex flex-wrap items-center gap-2">
                              <label className="inline-flex cursor-pointer items-center rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500">
                                {uploadingContractKey === contract.key ? "上傳中..." : "上傳檔案或圖片"}
                                <input
                                  type="file"
                                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp"
                                  className="hidden"
                                  disabled={uploadingContractKey === contract.key}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      uploadContractFile(contract.key, file);
                                    }
                                    e.currentTarget.value = "";
                                  }}
                                />
                              </label>

                              <button
                                type="button"
                                disabled={deletingContractKey === contract.key || !contract.url}
                                onClick={() => deleteContractFile(contract.key)}
                                className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {deletingContractKey === contract.key ? "刪除中..." : "刪除檔案"}
                              </button>

                              {contract.url && (
                                <a href={contract.url} target="_blank" rel="noreferrer" className="text-xs text-sky-600 underline">
                                  測試下載
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
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

                  <div className="flex flex-col gap-2">
                    {content.contracts.map((contract) => (
                      <p key={contract.key} className="font-semibold">
                        {contract.label}
                        {contract.url ? (
                          <a href={contract.url} target="_blank" rel="noreferrer" className="ml-2 text-sky-600 hover:text-sky-500">
                            (按此下載)
                          </a>
                        ) : (
                          <span className="ml-2 text-gray-500">(尚未上傳檔案)</span>
                        )}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-xl font-black text-sky-600">{content.optionSectionTitle}</h2>
                    {isDevMode && (
                      <button
                        type="button"
                        onClick={() => toggleSectionEdit("options")}
                        className="rounded-md border border-sky-500 px-3 py-1 text-xs font-semibold text-sky-600 hover:bg-sky-50"
                      >
                        {editingSections.options ? "關閉編輯" : "編輯"}
                      </button>
                    )}
                  </div>

                  {isDevMode && editingSections.options && (
                    <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <label className="mb-2 block text-sm">
                        <span className="mb-1 block text-gray-600">方案區塊標題</span>
                        <input
                          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900"
                          value={content.optionSectionTitle}
                          onChange={(e) => setContent((prev) => (prev ? { ...prev, optionSectionTitle: e.target.value } : prev))}
                        />
                      </label>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-lg border border-gray-200 p-3">
                          <p className="mb-2 text-sm font-bold text-gray-900">一般普件</p>
                          <label className="mb-2 block text-sm">
                            <span className="mb-1 block text-gray-600">標題文字</span>
                            <input
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900"
                              value={content.regularTitle}
                              onChange={(e) => setContent((prev) => (prev ? { ...prev, regularTitle: e.target.value } : prev))}
                            />
                          </label>
                          <label className="mb-2 block text-sm">
                            <span className="mb-1 block text-gray-600">價格（數字）</span>
                            <input
                              type="number"
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900"
                              value={content.regularPrice}
                              onChange={(e) =>
                                setContent((prev) => (prev ? { ...prev, regularPrice: Number(e.target.value || 0) } : prev))
                              }
                            />
                          </label>
                          <label className="block text-sm">
                            <span className="mb-1 block text-gray-600">選項文字</span>
                            <input
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900"
                              value={content.regularOptionLabel}
                              onChange={(e) =>
                                setContent((prev) => (prev ? { ...prev, regularOptionLabel: e.target.value } : prev))
                              }
                            />
                          </label>
                        </div>

                        <div className="rounded-lg border border-gray-200 p-3">
                          <p className="mb-2 text-sm font-bold text-gray-900">加急送件</p>
                          <label className="mb-2 block text-sm">
                            <span className="mb-1 block text-gray-600">標題文字</span>
                            <input
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900"
                              value={content.urgentTitle}
                              onChange={(e) => setContent((prev) => (prev ? { ...prev, urgentTitle: e.target.value } : prev))}
                            />
                          </label>
                          <label className="mb-2 block text-sm">
                            <span className="mb-1 block text-gray-600">價格（數字）</span>
                            <input
                              type="number"
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900"
                              value={content.urgentPrice}
                              onChange={(e) =>
                                setContent((prev) => (prev ? { ...prev, urgentPrice: Number(e.target.value || 0) } : prev))
                              }
                            />
                          </label>
                          <label className="block text-sm">
                            <span className="mb-1 block text-gray-600">選項文字</span>
                            <input
                              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900"
                              value={content.urgentOptionLabel}
                              onChange={(e) =>
                                setContent((prev) => (prev ? { ...prev, urgentOptionLabel: e.target.value } : prev))
                              }
                            />
                          </label>
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

                  <div className="space-y-4">
                    <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xl font-bold text-gray-900">{content.regularTitle}</p>
                        <div className="flex items-center gap-3">
                          <span className="text-xl font-black text-gray-900">NT${regularPrice.toLocaleString()} /人</span>
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

                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xl font-bold text-gray-900">{content.urgentTitle}</p>
                        <div className="flex items-center gap-3">
                          <span className="text-xl font-black text-gray-900">NT${urgentPrice.toLocaleString()} /人</span>
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
                  </div>
                </div>
              </>
            )}
          </div>
        </article>

        <SocialCta
          className="mt-10"
          title="想確認你的證件條件嗎？"
          description="聯繫旅遊規劃師 蓋瑞 GARY，先幫你確認可辦理項目與時程"
        />
      </section>

      {isDevMode && (
        <div className="mx-auto max-w-site px-4 pb-2 text-right text-xs text-gray-400 md:px-5">
          開發者模式已啟用
        </div>
      )}

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
