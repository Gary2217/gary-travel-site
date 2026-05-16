"use client";

import { useState } from "react";
import { lineDmHref, fbDmHref, igDmHref } from "@/lib/supabase";
import { openExternalLink } from "@/lib/external-link";
import ContactFormModal from "./ContactFormModal";
import LegalNotice from "./LegalNotice";

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
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 ${className}`.trim()}>
      {/* 1. 社群追蹤 */}
      <section id="social-community" className="scroll-mt-[120px]">
        <div className="mb-4 text-center">
          <h2 className="text-lg font-bold text-gray-900">追蹤我們的社群</h2>
          <p className="mt-1 text-sm text-gray-500">關注最新旅遊資訊、優惠行程、出團動態</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* LINE 官方帳號 */}
          <a
            href="https://lin.ee/t64tR31J"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-[#06C755]/40 hover:shadow-md"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#06C755] text-white shadow-sm">
              <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24"><path d="M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" /></svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-gray-900">LINE 官方帳號</p>
              <p className="mt-0.5 text-xs text-gray-500">旅行沒有終點｜即時諮詢</p>
            </div>
            <span className="shrink-0 rounded-full border border-[#06C755]/30 bg-[#06C755]/10 px-3 py-1 text-xs font-semibold text-[#06C755] transition group-hover:bg-[#06C755] group-hover:text-white">加入好友</span>
          </a>

          {/* FB 粉絲團 */}
          <a
            href="https://www.facebook.com/Travel.has.no.end"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-[#1877F2]/40 hover:shadow-md"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#1877F2] text-white shadow-sm">
              <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-gray-900">Facebook 粉絲團</p>
              <p className="mt-0.5 text-xs text-gray-500">旅行沒有終點｜旅遊資訊</p>
            </div>
            <span className="shrink-0 rounded-full border border-[#1877F2]/30 bg-[#1877F2]/10 px-3 py-1 text-xs font-semibold text-[#1877F2] transition group-hover:bg-[#1877F2] group-hover:text-white">追蹤</span>
          </a>

          {/* FB 社團 */}
          <a
            href="https://www.facebook.com/share/g/18TSaJMtzb/"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-[#1877F2]/40 hover:shadow-md"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#1877F2] text-white shadow-sm">
              <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm4 0h-2v-6h2v6zm-2-8c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" /><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-gray-900">Facebook 社團</p>
              <p className="mt-0.5 text-xs text-gray-500">旅行沒有終點｜優惠行程分享</p>
            </div>
            <span className="shrink-0 rounded-full border border-[#1877F2]/30 bg-[#1877F2]/10 px-3 py-1 text-xs font-semibold text-[#1877F2] transition group-hover:bg-[#1877F2] group-hover:text-white">加入</span>
          </a>

          {/* Instagram */}
          <a
            href="https://www.instagram.com/gary_____1207/"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-[#E4405F]/40 hover:shadow-md"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#E4405F] text-white shadow-sm">
              <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-gray-900">Instagram</p>
              <p className="mt-0.5 text-xs text-gray-500">@gary_____1207｜旅遊日常</p>
            </div>
            <span className="shrink-0 rounded-full border border-[#E4405F]/30 bg-[#E4405F]/10 px-3 py-1 text-xs font-semibold text-[#E4405F] transition group-hover:bg-[#E4405F] group-hover:text-white">追蹤</span>
          </a>
        </div>
      </section>

      {/* 2. 聯絡 CTA */}
      <div className="mt-5 border-t border-gray-100 pt-5 text-center">
        <div className="flex justify-center">
          <div className="w-full max-w-[620px]">
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

            <p className="mt-2 text-center text-[9px] text-gray-400 sm:text-[10px]">
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
