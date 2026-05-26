"use client";

import { useState, useEffect } from "react";
import { lineDmHref, fbDmHref, igDmHref } from "@/lib/supabase";
import { openExternalLink } from "@/lib/external-link";
import ContactFormModal from "./ContactFormModal";
import LegalNotice from "./LegalNotice";

const SOCIAL_LINKS = {
  line: "https://lin.ee/t64tR31J",
  fbPage: "https://www.facebook.com/Travel.has.no.end",
  fbGroup: "https://www.facebook.com/share/g/18TSaJMtzb/",
  ig: "https://www.instagram.com/gary_____1207/",
};

interface SocialCtaProps {
  title: string;
  description: string;
  lineLabel?: string;
  facebookLabel?: string;
  instagramLabel?: string;
  className?: string;
}

export default function SocialCta({
  title,
  description,
  lineLabel = "LINE 諮詢",
  facebookLabel = "FB 私訊",
  instagramLabel = "IG 私訊",
  className = "",
}: SocialCtaProps) {
  const [showContactForm, setShowContactForm] = useState(false);
  const [logoUrl, setLogoUrl] = useState('/travel-logo.svg');
  useEffect(() => {
    try {
      const cached = localStorage.getItem('site_logo_url');
      if (cached) setLogoUrl(cached);
    } catch { /* ignore */ }
  }, []);
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 ${className}`.trim()}>
      {/* 1. 社群追蹤 */}
      <section id="social-community" className="scroll-mt-[120px]">
        <div className="mb-4 text-center">
          <h2 className="text-lg font-bold text-gray-900">追蹤我們的社群</h2>
          <p className="mt-1 text-sm text-gray-500">關注最新旅遊資訊、優惠行程、出團動態</p>
        </div>
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          <button type="button" onClick={() => openExternalLink(SOCIAL_LINKS.line)}
            className="flex flex-col items-center gap-2 rounded-xl bg-sky-50 px-2 py-4 transition hover:bg-sky-100 hover:shadow-md">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#06C755] text-white">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" /></svg>
            </div>
            <p className="text-xs font-bold text-[#06C755]">LINE</p>
            <span className="rounded-full bg-[#06C755] px-2.5 py-0.5 text-[9px] font-bold text-white">加入好友</span>
          </button>
          <button type="button" onClick={() => openExternalLink(SOCIAL_LINKS.fbPage)}
            className="flex flex-col items-center gap-2 rounded-xl bg-sky-50 px-2 py-4 transition hover:bg-sky-100 hover:shadow-md">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1877F2] text-white">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
            </div>
            <p className="text-xs font-bold text-[#1877F2]">FB 粉專</p>
            <span className="rounded-full bg-[#1877F2] px-2.5 py-0.5 text-[9px] font-bold text-white">追蹤</span>
          </button>
          <button type="button" onClick={() => openExternalLink(SOCIAL_LINKS.fbGroup)}
            className="flex flex-col items-center gap-2 rounded-xl bg-sky-50 px-2 py-4 transition hover:bg-sky-100 hover:shadow-md">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1877F2] text-white">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
            </div>
            <p className="text-xs font-bold text-[#1877F2]">FB 社團</p>
            <span className="rounded-full bg-[#1877F2] px-2.5 py-0.5 text-[9px] font-bold text-white">加入</span>
          </button>
          <button type="button" onClick={() => openExternalLink(SOCIAL_LINKS.ig)}
            className="flex flex-col items-center gap-2 rounded-xl bg-sky-50 px-2 py-4 transition hover:bg-sky-100 hover:shadow-md">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E4405F] text-white">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
            </div>
            <p className="text-xs font-bold text-[#E4405F]">IG</p>
            <span className="rounded-full bg-[#E4405F] px-2.5 py-0.5 text-[9px] font-bold text-white">追蹤</span>
          </button>
        </div>
      </section>

      {/* 2. 聯絡 CTA */}
      <div className="mt-5 border-t border-gray-100 pt-5">
        <div className="mx-auto flex max-w-[960px] items-center gap-4 px-4 sm:gap-10">
          <img src={logoUrl} alt="旅行沒有終點" className="h-16 w-auto max-w-[100px] shrink-0 object-contain sm:h-32 sm:max-w-none" />
          <div className="flex-1 text-center">
            <h3 className="text-base font-bold text-gray-900">{title}</h3>
            <p className="mt-1 hidden text-xs text-gray-500 sm:block">{description}</p>
            <p className="mt-2 hidden text-[11px] leading-5 text-gray-500 sm:block">
              免費諮詢 · 不收服務費 · 即時回覆
            </p>
            <div className="mt-3 flex items-center justify-center gap-1 sm:gap-2">
              <button type="button" onClick={() => openExternalLink(lineDmHref)}
                className="whitespace-nowrap rounded-lg bg-[#06C755] px-2 py-1.5 text-[10px] font-semibold text-white transition hover:opacity-85 sm:px-4 sm:py-2 sm:text-[13px]">
                LINE 諮詢
              </button>
              <button type="button" onClick={() => openExternalLink(fbDmHref)}
                className="whitespace-nowrap rounded-lg bg-[#1877F2] px-2 py-1.5 text-[10px] font-semibold text-white transition hover:opacity-85 sm:px-4 sm:py-2 sm:text-[13px]">
                FB 私訊
              </button>
              <button type="button" onClick={() => openExternalLink(igDmHref)}
                className="whitespace-nowrap rounded-lg bg-[#E4405F] px-2 py-1.5 text-[10px] font-semibold text-white transition hover:opacity-85 sm:px-4 sm:py-2 sm:text-[13px]">
                IG 私訊
              </button>
              <button onClick={() => setShowContactForm(true)}
                className="whitespace-nowrap rounded-lg bg-[#ff6b35] px-2 py-1.5 text-[10px] font-semibold text-white transition hover:bg-[#e55a2b] sm:px-4 sm:py-2 sm:text-[13px]">
                聯絡我們
              </button>
            </div>
            <p className="mt-2 text-[9px] text-gray-400 sm:text-[10px]">
              © {new Date().getFullYear()} 旅行沒有終點 All Rights Reserved.
            </p>
          </div>
        </div>
      </div>

      {/* 3. 免責聲明 */}
      <LegalNotice className="mt-6" />

      <ContactFormModal isOpen={showContactForm} onClose={() => setShowContactForm(false)} />
    </div>
  );
}
