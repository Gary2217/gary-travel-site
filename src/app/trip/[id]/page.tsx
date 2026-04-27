"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createPortal } from "react-dom";
import { getTripWithDays, type Trip, lineHref, lineMessageHref, fbHref, igHref } from "@/lib/supabase";
import StickyHeader from "@/components/StickyHeader";
import DayItinerary from "@/components/DayItinerary";
import InquiryButtons from "@/components/InquiryButtons";
import InquiryForm from "@/components/InquiryForm";

export default function TripPage() {
  const params = useParams();
  const tripId = params.id as string;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDownloadGate, setShowDownloadGate] = useState(false);
  const [showShareGate, setShowShareGate] = useState(false);

  const triggerNativeShare = () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      navigator.share({
        title: trip?.title || "",
        text: `看看這個行程：${trip?.title || ""}`,
        url,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        alert("已複製行程連結！可以貼到 LINE、FB、IG 分享給好友");
      }).catch(() => {
        alert(`請複製此連結分享給好友：${url}`);
      });
    }
  };

  const handleFollowAndShare = (socialUrl: string) => {
    window.open(socialUrl, '_blank');
    setTimeout(() => {
      setShowShareGate(false);
      triggerNativeShare();
    }, 1500);
  };

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getTripWithDays(tripId);
        setTrip(data);
      } catch {
        setError("無法載入行程資料");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [tripId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[linear-gradient(135deg,#0b0f2a_0%,#0a0a0a_50%,#1a0d0d_100%)] text-white">
        <StickyHeader showBackButton />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-sky-400 border-r-transparent" />
            <p className="mt-4 text-white/70">載入中...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !trip) {
    return (
      <main className="min-h-screen bg-[linear-gradient(135deg,#0b0f2a_0%,#0a0a0a_50%,#1a0d0d_100%)] text-white">
        <StickyHeader showBackButton />
        <div className="flex min-h-[60vh] items-center justify-center px-4">
          <div className="text-center">
            <p className="text-lg text-red-400">{error || "找不到此行程"}</p>
            <button
              onClick={() => window.history.back()}
              className="mt-4 rounded-full bg-sky-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
            >
              返回上一頁
            </button>
          </div>
        </div>
      </main>
    );
  }

  const days = trip.trip_days || [];

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#0b0f2a_0%,#0a0a0a_50%,#1a0d0d_100%)] text-white">
      <StickyHeader showBackButton />

      {/* 浮動詢問按鈕 */}
      <InquiryButtons tripTitle={trip.title} variant="floating" />

      {/* Hero 區塊 */}
      <div className="relative h-44 overflow-hidden sm:h-56 md:h-72">
        {trip.cover_image_url ? (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${trip.cover_image_url})` }}
          />
        ) : (
          <div className="absolute inset-0 bg-[rgba(20,20,30,0.6)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-black/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 md:p-8">
          <div className="mx-auto max-w-[1000px]">
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5 sm:mb-2 sm:gap-2">
              <span className="rounded-full bg-sky-500/90 px-2.5 py-0.5 text-[11px] font-bold text-white sm:px-3 sm:py-1 sm:text-xs">
                {trip.duration}
              </span>
              {trip.price_range && (
                <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-white/90 backdrop-blur-sm sm:px-3 sm:py-1 sm:text-xs">
                  {trip.price_range}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl md:text-4xl">{trip.title}</h1>
            {trip.subtitle && (
              <p className="mt-0.5 text-sm text-white/80 sm:mt-1 sm:text-base md:text-lg">{trip.subtitle}</p>
            )}
          </div>
        </div>
      </div>

      {/* 內容區 */}
      <div className="mx-auto max-w-[1000px] px-3 py-4 sm:px-4 sm:py-6 md:px-8 md:py-10">
        {/* 亮點標籤 */}
        {trip.highlights && trip.highlights.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-white/50">行程亮點</h2>
            <div className="flex flex-wrap gap-2">
              {trip.highlights.map((highlight) => (
                <span
                  key={highlight}
                  className="rounded-full border border-sky-500/20 bg-sky-500/10 px-4 py-1.5 text-sm font-medium text-sky-300"
                >
                  {highlight}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 每日行程（有 trip_days 資料時） */}
        {days.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-4 text-xl font-bold text-white md:text-2xl">每日行程</h2>
            <div className="space-y-3">
              {days.map((day) => (
                <DayItinerary
                  key={day.id}
                  dayNumber={day.day_number}
                  title={day.title}
                  description={day.description}
                  meals={day.meals}
                  accommodation={day.accommodation}
                  activities={day.activities || []}
                />
              ))}
            </div>
          </div>
        )}

        {/* 沒有 trip_days 也沒有 document_url */}
        {days.length === 0 && !trip.document_url && (
          <div className="mb-8 rounded-2xl border border-white/10 bg-[rgba(20,20,30,0.38)] p-5 text-center backdrop-blur-[12px] sm:p-6">
            <h2 className="mb-2 text-xl font-bold text-white md:text-2xl">每日行程尚未建立</h2>
            <p className="text-sm leading-6 text-white/70 md:text-base">
              目前這個行程尚未建立詳細內容，請透過 LINE 聯繫蓋瑞取得完整行程資料。
            </p>
          </div>
        )}
      </div>

      {/* PDF 全版面嵌入（放在 max-w 容器外面） */}
      {days.length === 0 && trip.document_url && (
        <div className="w-full">
          <div className="mx-auto max-w-[1000px] px-3 sm:px-4 md:px-8">
            <h2 className="mb-4 text-xl font-bold text-white md:text-2xl">完整行程表</h2>
          </div>
          <iframe
            src={trip.document_url}
            className="h-[85vh] w-full min-h-[600px] bg-white"
            title={`${trip.title} 行程表`}
          />
        </div>
      )}

      {/* 按鈕區 */}
      <div className="mx-auto max-w-[1000px] px-3 py-6 sm:px-4 md:px-8">
        {/* LINE 私訊蓋瑞（帶行程名稱） */}
        <a
          href={lineMessageHref(`嗨！我想詢問「${trip.title}」這個行程`)}
          target="_blank"
          rel="noreferrer"
          className="mb-3 flex w-full items-center justify-center gap-2.5 rounded-full bg-[#06C755] py-3.5 text-base font-bold text-white shadow-lg transition hover:bg-[#05b54c] active:scale-[0.98]"
        >
          <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white">
            <span className="text-[7px] font-black leading-none text-[#06C755]">LINE</span>
            <span className="absolute -bottom-[2px] left-[5px] h-0 w-0 border-l-[4px] border-r-[4px] border-t-[5px] border-l-transparent border-r-transparent border-t-white" />
          </span>
          LINE 私訊蓋瑞
        </a>

        {/* 分享 & 下載 */}
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <button
            onClick={() => setShowShareGate(true)}
            className="flex flex-1 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white active:scale-[0.98] md:py-3"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            分享給好友
          </button>

          {trip.document_url && (
            <button
              onClick={() => setShowDownloadGate(true)}
              className="flex flex-1 items-center justify-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-600/20 px-4 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-600/30 active:scale-[0.98] md:py-3"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              下載 PDF 行程檔
            </button>
          )}
        </div>

        {/* 索取行程 / 詢問報價 CTA */}
        <div className="mb-8 mt-6">
          <InquiryButtons tripTitle={trip.title} variant="inline" />
        </div>

        {/* 線上諮詢表單 */}
        <InquiryForm tripId={trip.id} tripTitle={trip.title} />
      </div>

      {/* 下載門檻彈窗 */}
      {showDownloadGate && createPortal(
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDownloadGate(false);
          }}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-[rgba(20,20,30,0.98)] p-5 shadow-2xl backdrop-blur-xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-white sm:text-lg">下載行程檔</h3>
              <button
                onClick={() => setShowDownloadGate(false)}
                className="text-white/50 transition hover:text-white"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="mb-2 text-sm text-white/80">
              想下載「{trip.title}」的行程檔嗎？
            </p>
            <p className="mb-4 text-xs leading-5 text-white/60">
              請先加入我們的 LINE、Facebook 或 Instagram 任一帳號，即可立即下載完整行程檔！
            </p>

            <div className="space-y-2">
              <button
                onClick={() => {
                  window.open(lineHref, '_blank');
                  setTimeout(() => { if (trip.document_url) window.open(trip.document_url, '_blank'); setShowDownloadGate(false); }, 1500);
                }}
                className="flex w-full items-center gap-3 rounded-xl bg-[#06C755] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#05b64d] active:scale-[0.98]"
              >
                <svg className="h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" /></svg>
                <span className="flex-1 text-left">加入 LINE 好友並下載</span>
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </button>

              <button
                onClick={() => {
                  window.open(fbHref, '_blank');
                  setTimeout(() => { if (trip.document_url) window.open(trip.document_url, '_blank'); setShowDownloadGate(false); }, 1500);
                }}
                className="flex w-full items-center gap-3 rounded-xl bg-[#1877F2] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1565d8] active:scale-[0.98]"
              >
                <svg className="h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                <span className="flex-1 text-left">追蹤 FB 粉專並下載</span>
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </button>

              <button
                onClick={() => {
                  window.open(igHref, '_blank');
                  setTimeout(() => { if (trip.document_url) window.open(trip.document_url, '_blank'); setShowDownloadGate(false); }, 1500);
                }}
                className="flex w-full items-center gap-3 rounded-xl bg-[#E4405F] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#d62d4a] active:scale-[0.98]"
              >
                <svg className="h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                <span className="flex-1 text-left">追蹤 IG 並下載</span>
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </button>
            </div>

            <p className="mt-3 text-center text-[10px] text-white/40 sm:text-[11px]">
              加入後將自動開始下載行程檔
            </p>
          </div>
        </div>,
        document.body
      )}

      {/* 分享門檻彈窗 */}
      {showShareGate && createPortal(
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowShareGate(false);
          }}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-[rgba(20,20,30,0.98)] p-5 shadow-2xl backdrop-blur-xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-white sm:text-lg">分享行程給好友</h3>
              <button
                onClick={() => setShowShareGate(false)}
                className="text-white/50 transition hover:text-white"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="mb-2 text-sm text-white/80">
              想分享「{trip.title}」給好友嗎？
            </p>
            <p className="mb-4 text-xs leading-5 text-white/60">
              請先加入我們的 LINE、Facebook 或 Instagram 任一帳號，即可分享行程給好友！
            </p>

            <div className="space-y-2">
              <button
                onClick={() => handleFollowAndShare(lineHref)}
                className="flex w-full items-center gap-3 rounded-xl bg-[#06C755] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#05b64d] active:scale-[0.98]"
              >
                <svg className="h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" /></svg>
                <span className="flex-1 text-left">加入 LINE 好友並分享</span>
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
              </button>

              <button
                onClick={() => handleFollowAndShare(fbHref)}
                className="flex w-full items-center gap-3 rounded-xl bg-[#1877F2] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1565d8] active:scale-[0.98]"
              >
                <svg className="h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                <span className="flex-1 text-left">追蹤 FB 粉專並分享</span>
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
              </button>

              <button
                onClick={() => handleFollowAndShare(igHref)}
                className="flex w-full items-center gap-3 rounded-xl bg-[#E4405F] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#d62d4a] active:scale-[0.98]"
              >
                <svg className="h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                <span className="flex-1 text-left">追蹤 IG 並分享</span>
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
              </button>
            </div>

            <p className="mt-3 text-center text-[10px] text-white/40 sm:text-[11px]">
              加入後將開啟分享選單，可選擇 LINE、FB、IG 等好友分享
            </p>
          </div>
        </div>,
        document.body
      )}
    </main>
  );
}
