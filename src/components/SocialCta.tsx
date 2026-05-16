"use client";

import { useState } from "react";
import { lineDmHref, fbDmHref, igDmHref, fbHref, igHref } from "@/lib/supabase";
import { openExternalLink } from "@/lib/external-link";
import ContactFormModal from "./ContactFormModal";

interface SocialCtaProps {
  title: string;
  description: string;
  logoUrl?: string;
  lineLabel?: string;
  facebookLabel?: string;
  instagramLabel?: string;
  className?: string;
}

export default function SocialCta({
  title,
  description,
  logoUrl,
  lineLabel = "LINE 諮詢",
  facebookLabel = "FB 私訊",
  instagramLabel = "IG 私訊",
  className = "",
}: SocialCtaProps) {
  const [showContactForm, setShowContactForm] = useState(false);
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 ${className}`.trim()}>
      <div className="flex justify-center">
          <div className="w-full max-w-[620px] text-center">
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
          <p className="mt-1 text-xs text-gray-500">{description}</p>
          <p className="mt-2 text-[11px] leading-5 text-gray-500">
            免費諮詢 · 不收服務費 · 即時回覆
          </p>

          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => openExternalLink(lineDmHref)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#06C755] px-4 py-2 text-[13px] font-semibold text-white transition hover:opacity-85"
            >
              {lineLabel}
            </button>
            <button
              type="button"
              onClick={() => openExternalLink(fbDmHref)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1877F2] px-4 py-2 text-[13px] font-semibold text-white transition hover:opacity-85"
            >
              {facebookLabel}
            </button>
            <button
              type="button"
              onClick={() => openExternalLink(igDmHref)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#E4405F] px-4 py-2 text-[13px] font-semibold text-white transition hover:opacity-85"
            >
              {instagramLabel}
            </button>
            <button
              onClick={() => setShowContactForm(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#ff6b35] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#e55a2b]"
            >
              聯絡我們
            </button>
          </div>

          <div className="mt-2 space-y-1.5">
            <div className="flex flex-col items-center gap-1 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[9px] text-gray-400 sm:text-[10px] sm:whitespace-nowrap sm:text-left">
                © {new Date().getFullYear()} 旅行沒有終點 All Rights Reserved.
              </p>
              <p className="text-[10px] text-gray-500 sm:text-[11px]">追蹤社群獲得更多資訊</p>
            </div>

            <div className="flex items-center justify-center gap-2 sm:justify-end">
                <button type="button" onClick={() => openExternalLink(fbHref)} aria-label="Facebook"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-[linear-gradient(135deg,#4286d4_0%,#1877F2_100%)] text-white transition hover:brightness-105">
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </button>
                <button type="button" onClick={() => openExternalLink(igHref)} aria-label="Instagram"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-[linear-gradient(135deg,#E4405F_0%,#c13584_100%)] text-white transition hover:brightness-105">
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                  </svg>
                </button>
                <button type="button" onClick={() => openExternalLink(lineDmHref)} aria-label="LINE"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-[linear-gradient(135deg,#06C755_0%,#05a648_100%)] text-white transition hover:brightness-105">
                  <span className="text-[9px] font-bold leading-none">LINE</span>
                </button>
            </div>
          </div>

          </div>
      </div>
      <ContactFormModal isOpen={showContactForm} onClose={() => setShowContactForm(false)} />
    </div>
  );
}
