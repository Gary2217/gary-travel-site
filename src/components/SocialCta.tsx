"use client";

import { useState, useEffect } from "react";
import { lineHref, fbHref, igHref, lineGroupHref, tiktokHref, lineDmHref, fbDmHref, igDmHref } from "@/lib/supabase";
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
        <div className="mb-5 text-center">
          <h2 className="text-lg font-bold text-gray-900">追蹤我們的社群</h2>
          <div className="mx-auto mt-2 mb-2.5 h-[3px] w-14 rounded-full bg-gradient-to-r from-[#06C755] via-sky-500 to-[#E4405F]" />
          <p className="text-sm text-gray-500">關注最新旅遊資訊、優惠行程、出團動態</p>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
          <a href={lineHref} target="_blank" rel="noopener noreferrer"
            className="group relative flex flex-col items-center gap-2.5 overflow-hidden rounded-2xl border border-gray-200/80 bg-white px-3 py-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#06C755]/30 hover:shadow-lg hover:shadow-[#06C755]/10">
            <div className="absolute inset-0 bg-gradient-to-br from-[#06C755]/[0.04] via-transparent to-[#06C755]/[0.02] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="relative">
              <div className="absolute -inset-2 rounded-full bg-[#06C755]/10 transition-all duration-300 group-hover:scale-110 group-hover:bg-[#06C755]/15" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#06C755] to-[#05a348] text-white shadow-md shadow-[#06C755]/30 transition-transform duration-300 group-hover:scale-105">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" /></svg>
              </div>
            </div>
            <div className="relative text-center">
              <p className="text-sm font-bold text-[#06C755]">LINE</p>
              <span className="mt-1 inline-block rounded-full border border-[#06C755]/20 bg-[#06C755]/10 px-3 py-0.5 text-[10px] font-bold text-[#06C755] transition-all duration-300 group-hover:border-transparent group-hover:bg-[#06C755] group-hover:text-white">加入好友</span>
            </div>
            <div className="absolute bottom-0 left-1/2 h-[2px] w-0 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#06C755]/60 via-[#06C755] to-[#06C755]/60 transition-all duration-300 group-hover:w-3/4" />
          </a>
          <a href={fbHref} target="_blank" rel="noopener noreferrer"
            className="group relative flex flex-col items-center gap-2.5 overflow-hidden rounded-2xl border border-gray-200/80 bg-white px-3 py-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#1877F2]/30 hover:shadow-lg hover:shadow-[#1877F2]/10">
            <div className="absolute inset-0 bg-gradient-to-br from-[#1877F2]/[0.04] via-transparent to-[#1877F2]/[0.02] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="relative">
              <div className="absolute -inset-2 rounded-full bg-[#1877F2]/10 transition-all duration-300 group-hover:scale-110 group-hover:bg-[#1877F2]/15" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#1877F2] to-[#1565d8] text-white shadow-md shadow-[#1877F2]/30 transition-transform duration-300 group-hover:scale-105">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
              </div>
            </div>
            <div className="relative text-center">
              <p className="text-sm font-bold text-[#1877F2]">FB 粉專</p>
              <span className="mt-1 inline-block rounded-full border border-[#1877F2]/20 bg-[#1877F2]/10 px-3 py-0.5 text-[10px] font-bold text-[#1877F2] transition-all duration-300 group-hover:border-transparent group-hover:bg-[#1877F2] group-hover:text-white">追蹤</span>
            </div>
            <div className="absolute bottom-0 left-1/2 h-[2px] w-0 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#1877F2]/60 via-[#1877F2] to-[#1877F2]/60 transition-all duration-300 group-hover:w-3/4" />
          </a>
          <a href={lineGroupHref} target="_blank" rel="noopener noreferrer"
            className="group relative flex flex-col items-center gap-2.5 overflow-hidden rounded-2xl border border-gray-200/80 bg-white px-3 py-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#06C755]/30 hover:shadow-lg hover:shadow-[#06C755]/10">
            <div className="absolute inset-0 bg-gradient-to-br from-[#06C755]/[0.04] via-transparent to-[#06C755]/[0.02] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="relative">
              <div className="absolute -inset-2 rounded-full bg-[#06C755]/10 transition-all duration-300 group-hover:scale-110 group-hover:bg-[#06C755]/15" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#06C755] to-[#05a348] text-white shadow-md shadow-[#06C755]/30 transition-transform duration-300 group-hover:scale-105">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" /></svg>
              </div>
            </div>
            <div className="relative text-center">
              <p className="text-sm font-bold text-[#06C755]">優惠LINE社群</p>
              <span className="mt-1 inline-block rounded-full border border-[#06C755]/20 bg-[#06C755]/10 px-3 py-0.5 text-[10px] font-bold text-[#06C755] transition-all duration-300 group-hover:border-transparent group-hover:bg-[#06C755] group-hover:text-white">加入</span>
            </div>
            <div className="absolute bottom-0 left-1/2 h-[2px] w-0 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#06C755]/60 via-[#06C755] to-[#06C755]/60 transition-all duration-300 group-hover:w-3/4" />
          </a>
          <a href={igHref} target="_blank" rel="noopener noreferrer"
            className="group relative flex flex-col items-center gap-2.5 overflow-hidden rounded-2xl border border-gray-200/80 bg-white px-3 py-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#E4405F]/30 hover:shadow-lg hover:shadow-[#E4405F]/10">
            <div className="absolute inset-0 bg-gradient-to-br from-[#E4405F]/[0.04] via-transparent to-[#E4405F]/[0.02] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="relative">
              <div className="absolute -inset-2 rounded-full bg-[#E4405F]/10 transition-all duration-300 group-hover:scale-110 group-hover:bg-[#E4405F]/15" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#E4405F] to-[#d62d4a] text-white shadow-md shadow-[#E4405F]/30 transition-transform duration-300 group-hover:scale-105">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
              </div>
            </div>
            <div className="relative text-center">
              <p className="text-sm font-bold text-[#E4405F]">IG</p>
              <span className="mt-1 inline-block rounded-full border border-[#E4405F]/20 bg-[#E4405F]/10 px-3 py-0.5 text-[10px] font-bold text-[#E4405F] transition-all duration-300 group-hover:border-transparent group-hover:bg-[#E4405F] group-hover:text-white">追蹤</span>
            </div>
            <div className="absolute bottom-0 left-1/2 h-[2px] w-0 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#E4405F]/60 via-[#E4405F] to-[#E4405F]/60 transition-all duration-300 group-hover:w-3/4" />
          </a>
          <a href={tiktokHref} target="_blank" rel="noopener noreferrer"
            className="group relative flex flex-col items-center gap-2.5 overflow-hidden rounded-2xl border border-gray-200/80 bg-white px-3 py-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-black/20 hover:shadow-lg hover:shadow-black/10">
            <div className="absolute inset-0 bg-gradient-to-br from-black/[0.04] via-transparent to-[#25F4EE]/[0.03] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="relative">
              <div className="absolute -inset-2 rounded-full bg-black/10 transition-all duration-300 group-hover:scale-110 group-hover:bg-black/15" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-black to-[#1a1a1a] text-white shadow-md shadow-black/30 transition-transform duration-300 group-hover:scale-105">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 448 512"><path d="M448,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,185,188.31V278.2a74.62,74.62,0,1,0,52.23,71.18V0l88,0a121.18,121.18,0,0,0,1.86,22.17h0A122.18,122.18,0,0,0,381,102.39a121.43,121.43,0,0,0,67,20.14Z" /></svg>
              </div>
            </div>
            <div className="relative text-center">
              <p className="text-sm font-bold text-black">TikTok</p>
              <span className="mt-1 inline-block rounded-full border border-black/20 bg-black/5 px-3 py-0.5 text-[10px] font-bold text-black transition-all duration-300 group-hover:border-transparent group-hover:bg-black group-hover:text-white">追蹤</span>
            </div>
            <div className="absolute bottom-0 left-1/2 h-[2px] w-0 -translate-x-1/2 rounded-full bg-gradient-to-r from-black/60 via-black to-black/60 transition-all duration-300 group-hover:w-3/4" />
          </a>
        </div>
      </section>

      {/* 2. 聯絡 CTA + 免責聲明 + 公司資訊 */}
      <div className="-mx-5 -mb-5 mt-6 rounded-b-2xl bg-[linear-gradient(135deg,#e0f2fe_0%,#ecfdf5_35%,#fef9c3_65%,#fce7f3_100%)] px-5 pb-4 pt-6 sm:-mx-6 sm:-mb-6 sm:px-6">
        <div className="mx-auto flex max-w-[640px] items-center gap-3 sm:gap-5">
          <img
            src={logoUrl}
            alt="旅行沒有終點"
            className="h-16 w-auto shrink-0 object-contain sm:h-24"
            onError={() => {
              try { localStorage.removeItem('site_logo_url'); } catch { /* ignore */ }
              setLogoUrl('/travel-logo.svg');
            }}
          />
          <div className="flex-1 text-center">
          <h3 className="text-sm font-bold text-gray-900 sm:text-lg">{title}</h3>
          <p className="mt-1 hidden text-xs text-gray-500 sm:block">{description}</p>
          <p className="mt-1 hidden text-[11px] text-gray-500 sm:block">免費諮詢 · 不收服務費 · 即時回覆</p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:mt-3">
            <button type="button" onClick={() => openExternalLink(lineDmHref)}
              className="whitespace-nowrap rounded-lg bg-[#06C755] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:opacity-85 sm:px-4 sm:py-2 sm:text-[13px]">
              LINE 諮詢
            </button>
            <button type="button" onClick={() => openExternalLink(fbDmHref)}
              className="whitespace-nowrap rounded-lg bg-[#1877F2] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:opacity-85 sm:px-4 sm:py-2 sm:text-[13px]">
              FB 私訊
            </button>
            <button type="button" onClick={() => openExternalLink(igDmHref)}
              className="whitespace-nowrap rounded-lg bg-[#E4405F] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:opacity-85 sm:px-4 sm:py-2 sm:text-[13px]">
              IG 私訊
            </button>
            <button onClick={() => setShowContactForm(true)}
              className="whitespace-nowrap rounded-lg bg-[#ff6b35] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#e55a2b] sm:px-4 sm:py-2 sm:text-[13px]">
              聯絡我們
            </button>
          </div>
          </div>
        </div>

        {/* 免責聲明 */}
        <div className="mt-6 border-t border-gray-200/60 pt-5">
          <LegalNotice variant="light" />
        </div>

        {/* 公司資訊 */}
        <div className="mt-5 border-t border-gray-200/60 pt-3">
          <div className="flex flex-col justify-between gap-1 text-center text-[10px] text-gray-500 sm:flex-row sm:text-left">
            <p>
              <span className="font-semibold text-gray-600">朋威旅行社 / 點點旅遊（通用旅行社）</span>
              ．交觀綜2219號．品保編號：北2175．統一編號：42629833
            </p>
            <p>
              旅遊蓋瑞哥：0966163777．LINE ID：@sc666555．信箱：sc666555@gmail.com
            </p>
          </div>
          <div className="mt-1 flex flex-col justify-between gap-1 text-center text-[10px] text-gray-500 sm:flex-row sm:text-left">
            <p>TEL (02)2581-3373．FAX (02)2581-2883．台北市松山區復興北路181號10樓之1</p>
            <p className="text-[9px] text-gray-400">© {new Date().getFullYear()} 旅行沒有終點 All Rights Reserved.</p>
          </div>
        </div>
      </div>

      <ContactFormModal isOpen={showContactForm} onClose={() => setShowContactForm(false)} />
    </div>
  );
}
