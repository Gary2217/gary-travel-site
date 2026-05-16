"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { lineHref, fbHref, igHref } from "@/lib/supabase";
import { openExternalLink } from "@/lib/external-link";
import ContactFormModal from "./ContactFormModal";

interface StickyHeaderProps {
  showBackButton?: boolean;
  backHref?: string;
  devModeSlot?: React.ReactNode;
  logoUrl?: string;
  logoEditorSlot?: React.ReactNode;
}

export default function StickyHeader({ showBackButton, backHref, devModeSlot, logoUrl = '/travel-logo.svg', logoEditorSlot }: StickyHeaderProps) {
  const router = useRouter();
  const [showContactForm, setShowContactForm] = useState(false);
  const [displayLogoUrl, setDisplayLogoUrl] = useState(logoUrl);
  const [logoReady, setLogoReady] = useState(false);


  useEffect(() => {
    if (typeof window === "undefined") return;

    let next = logoUrl;
    if (logoUrl === "/travel-logo.svg") {
      try {
        const cached = localStorage.getItem("site_logo_url");
        if (cached) {
          next = cached;
        }
      } catch {
        // ignore cache read errors
      }
    }

    setDisplayLogoUrl(next);
    setLogoReady(true);

    if (!next || next === "/travel-logo.svg") return;

    try {
      localStorage.setItem("site_logo_url", next);
    } catch {
      // ignore cache write errors
    }
  }, [logoUrl]);

  const handleBackClick = () => {
    if (backHref?.startsWith("#")) {
      const target = document.querySelector(backHref) as HTMLElement | null;
      if (target) {
        const top = target.getBoundingClientRect().top + window.scrollY - 56;
        window.scrollTo({ top, behavior: "smooth" });
      }
      return;
    }
    if (backHref) {
      router.push(backHref);
      return;
    }
    router.back();
  };

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-header h-header border-b border-gray-200 bg-white/95 backdrop-blur-[12px]">
        <div className="mx-auto flex h-full max-w-site items-center justify-between px-4 md:px-6">
          {/* 左側：返回 + Logo + 品牌 */}
          <div className="flex items-center gap-2">
            {showBackButton && (
              <button
                onClick={handleBackClick}
                className="mr-1 flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
                title="返回"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <Link href="/" className="flex min-h-10 shrink-0 items-center gap-2 transition hover:opacity-90" aria-label="回到首頁">
              {logoReady ? (
                <img src={displayLogoUrl} alt="旅行沒有終點" className="h-9 w-9 shrink-0 rounded-lg object-contain" />
              ) : (
                <div className="h-9 w-9 shrink-0 rounded-lg bg-gray-100" />
              )}
              <span className="text-sm font-bold text-gray-900">旅行沒有終點</span>
            </Link>
            {logoEditorSlot}
          </div>

          {/* 右側：導航 + 社群 */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => setShowContactForm(true)}
              className="text-[13px] font-medium text-gray-600 transition hover:text-sky-600"
            >
              聯絡我們
            </button>

            <div className="hidden items-center gap-1.5 sm:flex">
              <button
                type="button"
                onClick={() => openExternalLink(lineHref)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#06C755] text-white transition hover:opacity-85"
                title="LINE 諮詢"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" /></svg>
              </button>
              <button
                type="button"
                onClick={() => openExternalLink(fbHref)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#1877F2] text-white transition hover:opacity-85"
                title="Facebook"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
              </button>
              <button
                type="button"
                onClick={() => openExternalLink(igHref)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#E4405F] text-white transition hover:opacity-85"
                title="Instagram"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
              </button>
            </div>

            {devModeSlot}
          </div>
        </div>
      </header>

      <ContactFormModal isOpen={showContactForm} onClose={() => setShowContactForm(false)} />
    </>
  );
}
