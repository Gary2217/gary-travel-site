"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import StickyHeader from "@/components/StickyHeader";
import DevModeToggle from "@/components/DevModeToggle";
import FloatingContact from "@/components/FloatingContact";
import ScrollToTop from "@/components/ScrollToTop";
import SocialCta from "@/components/SocialCta";
import { getSiteLogo } from "@/lib/supabase";
import { getDocumentServiceById } from "@/lib/document-services";

export default function DocumentServiceDetailPage() {
  const params = useParams<{ id: string }>();
  const [siteLogoUrl, setSiteLogoUrl] = useState("/travel-logo.svg");
  const [isDevMode, setIsDevMode] = useState(false);
  const [imageMap, setImageMap] = useState<Record<string, string>>({});
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const service = useMemo(() => getDocumentServiceById(params?.id || ""), [params?.id]);

  useEffect(() => {
    getSiteLogo().then(setSiteLogoUrl).catch(() => setSiteLogoUrl("/travel-logo.svg"));

    try {
      const cached = localStorage.getItem("document_service_images");
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
        const images = data?.images;
        if (images && typeof images === "object") {
          const normalized = images as Record<string, string>;
          setImageMap(normalized);
          try {
            localStorage.setItem("document_service_images", JSON.stringify(normalized));
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

  if (!service) {
    return (
      <main className="min-h-screen bg-[#0f1923] pt-14 text-white">
        <StickyHeader
          logoUrl={siteLogoUrl}
          showBackButton
          backHref="/document-services"
          devModeSlot={<DevModeToggle onToggle={setIsDevMode} />}
        />
        <section className="mx-auto max-w-site px-4 py-10 md:px-5">
          <div className="rounded-2xl border border-white/10 bg-[rgba(20,20,30,0.38)] p-6 text-center">
            <p className="text-white/75">找不到此證件服務項目</p>
            <Link
              href="/document-services"
              className="mt-4 inline-flex items-center gap-1 text-sm text-sky-300 transition hover:text-sky-200"
            >
              返回證件代辦列表
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const isRoc0001 = service.id === "roc0001";

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
            localStorage.setItem("document_service_images", JSON.stringify(next));
          } catch {
            // 忽略快取寫入錯誤
          }
          return next;
        });
      }

      alert("圖片已更新");
    } catch (error) {
      const message = error instanceof Error ? error.message : "上傳失敗";
      alert(`上傳失敗：${message}`);
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0f1923] pt-14 text-white">
      <StickyHeader
        logoUrl={siteLogoUrl}
        showBackButton
        backHref="/document-services"
        devModeSlot={<DevModeToggle onToggle={setIsDevMode} />}
      />

      <section className="mx-auto max-w-site px-4 py-8 md:px-5">
        <Link
          href="/document-services"
          className="mb-4 inline-flex items-center gap-1 text-sm text-white/70 transition hover:text-white"
        >
          ← 返回證件代辦列表
        </Link>

        <article className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[rgba(20,20,30,0.38)] backdrop-blur-[12px]">
          <div className={`relative overflow-hidden ${isRoc0001 ? "bg-[#0b1020]" : "aspect-[16/8]"}`}>
            {imagesLoaded ? (
              <img
                src={imageMap[service.id] || service.image}
                alt={service.title}
                className={isRoc0001 ? "h-auto w-full object-contain" : "h-full w-full object-cover"}
              />
            ) : (
              <div className={`h-full w-full animate-pulse bg-white/10 ${isRoc0001 ? "min-h-[360px]" : ""}`} />
            )}

            {!isRoc0001 && <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />}

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
            <h1 className="text-xl font-black text-white sm:text-2xl">{service.title}</h1>
            {!isRoc0001 && <p className="mt-2 text-sm leading-6 text-white/75">{service.summary}</p>}

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <h2 className="mb-3 text-sm font-bold text-sky-300">需準備資料</h2>
              <ul className="space-y-2 text-sm text-white/80">
                {service.requirements.map((row) => (
                  <li key={row} className="flex items-start gap-2">
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-sky-300" />
                    <span>{row}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </article>

        <SocialCta
          className="mt-10"
          title="想確認你的證件條件嗎？"
          description="聯繫旅遊規劃師 蓋瑞 GARY，先幫你確認可辦理項目與時程"
          logoUrl={siteLogoUrl}
        />
      </section>

      {isDevMode && (
        <div className="mx-auto max-w-site px-4 pb-2 text-right text-xs text-white/40 md:px-5">
          開發者模式已啟用
        </div>
      )}

      <FloatingContact />
      <ScrollToTop />
    </main>
  );
}
