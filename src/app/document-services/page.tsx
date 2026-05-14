"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StickyHeader from "@/components/StickyHeader";
import DevModeToggle from "@/components/DevModeToggle";
import FloatingContact from "@/components/FloatingContact";
import SocialCta from "@/components/SocialCta";
import { getSiteLogo } from "@/lib/supabase";
import { DOCUMENT_SERVICE_ITEMS } from "@/lib/document-services";

export default function DocumentServicesPage() {
  const [siteLogoUrl, setSiteLogoUrl] = useState("/travel-logo.svg");
  const [isDevMode, setIsDevMode] = useState(false);
  const [imageMap, setImageMap] = useState<Record<string, string>>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);

  useEffect(() => {
    getSiteLogo().then(setSiteLogoUrl).catch(() => setSiteLogoUrl("/travel-logo.svg"));

    try {
      const cached = localStorage.getItem("document_service_list_images");
      if (cached) {
        const parsed = JSON.parse(cached) as Record<string, string>;
        if (parsed && typeof parsed === "object") {
          setImageMap(parsed);
          setImagesLoaded(true);
        }
      }
    } catch {
      // 忽略快取解析錯誤，改走 API
    }

    fetch("/api/document-service-images", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        const images = data?.list_images || data?.images;
        if (images && typeof images === "object") {
          const normalized = images as Record<string, string>;
          setImageMap(normalized);
          try {
            localStorage.setItem("document_service_list_images", JSON.stringify(normalized));
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

  const handleReplaceImage = async (serviceId: string, file: File) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("請選擇圖片檔案");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("圖片檔案不能超過 5MB");
      return;
    }

    setUploadingId(serviceId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("service_id", serviceId);
      formData.append("image_type", "list");

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
          const next = { ...prev, [serviceId]: url };
          try {
            localStorage.setItem("document_service_list_images", JSON.stringify(next));
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
      setUploadingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#0f1923] pt-14 text-white">
      <StickyHeader
        logoUrl={siteLogoUrl}
        showBackButton
        backHref="/"
        devModeSlot={<DevModeToggle onToggle={setIsDevMode} />}
      />

      <section className="mx-auto max-w-[1520px] px-3 py-8 md:px-4">
        <div className="mb-5 rounded-[1.5rem] border border-white/10 bg-[rgba(20,20,30,0.38)] p-5 backdrop-blur-[12px]">
          <h1 className="text-2xl font-black text-white">證件代辦</h1>
          <p className="mt-2 text-sm text-white/70">
            以下服務項目為站內整理內容，實際申辦條件與所需文件請以顧問最新說明為準。
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DOCUMENT_SERVICE_ITEMS.map((item) => (
            <article
              key={item.id}
              className="group overflow-hidden rounded-[1.5rem] border border-white/10 bg-[rgba(20,20,30,0.38)] backdrop-blur-[12px]"
            >
              <div className="relative aspect-[4/2.7] overflow-hidden">
                <Link href={`/document-services/${item.id}`} className="block h-full w-full">
                  {imagesLoaded ? (
                    <img
                      src={imageMap[item.id] || item.image}
                      alt={item.title}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="h-full w-full animate-pulse bg-white/10" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/38 via-black/8 to-transparent" />
                </Link>
                {isDevMode && (
                  <label className="absolute right-2 top-2 inline-flex cursor-pointer items-center gap-1 rounded-full bg-sky-600/90 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-sky-500">
                    {uploadingId === item.id ? "上傳中..." : "更換圖片"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      disabled={uploadingId === item.id}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleReplaceImage(item.id, file);
                        }
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                )}
              </div>

              <div className="flex h-full flex-col p-4">
                <h2 className="text-xl font-bold leading-tight text-white sm:text-2xl">{item.title}</h2>
                <Link
                  href={`/document-services/${item.id}`}
                  className="mt-5 inline-flex self-end items-center gap-1 text-sm font-semibold text-sky-300 transition hover:text-sky-200"
                >
                  查看詳細內容
                  <span aria-hidden>→</span>
                </Link>
              </div>
            </article>
          ))}
        </div>

        <SocialCta
          className="mt-10"
          title="想確認你的證件條件嗎？"
          description="聯繫旅遊規劃師 蓋瑞 GARY，先幫你確認可辦理項目與時程"
          logoUrl={siteLogoUrl}
        />
      </section>

      {isDevMode && (
        <div className="mx-auto max-w-[1520px] px-3 pb-2 text-right text-xs text-white/40 md:px-4">
          開發者模式已啟用
        </div>
      )}

      <FloatingContact />
    </main>
  );
}
