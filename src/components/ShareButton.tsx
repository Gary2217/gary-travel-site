"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface ShareButtonProps {
  title: string;
  url: string;
  small?: boolean;
}

export default function ShareButton({ title, url, small = false }: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const baseUrl = `https://gary-travel-site.vercel.app${url}`;
  const shareText = `${title} - 旅行沒有終點`;

  function withUtm(source: string) {
    const u = new URL(baseUrl);
    u.searchParams.set("utm_source", source);
    u.searchParams.set("utm_medium", "social");
    u.searchParams.set("utm_campaign", "share");
    return u.toString();
  }

  const shareLine = () => {
    window.open(
      `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(withUtm("line"))}&text=${encodeURIComponent(shareText)}`,
      "_blank",
    );
    setOpen(false);
  };

  const shareFb = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(withUtm("facebook"))}`,
      "_blank",
    );
    setOpen(false);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(withUtm("copy"));
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 1200);
    } catch {
      setOpen(false);
    }
  };

  const buttonClassName = small
    ? "inline-flex h-10 items-center justify-center rounded-xl border border-sky-200 bg-gradient-to-br from-sky-50 via-cyan-50 to-indigo-50 px-3 text-sm font-semibold text-sky-600 shadow-sm transition hover:scale-[1.03] hover:border-sky-300 hover:from-sky-100 hover:to-indigo-100 hover:text-sky-700 active:scale-95"
    : "flex h-9 w-9 items-center justify-center rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 via-cyan-50 to-indigo-50 text-sky-600 shadow-sm transition hover:scale-[1.03] hover:border-sky-300 hover:from-sky-100 hover:to-indigo-100 hover:text-sky-700 active:scale-95";

  const iconClassName = small ? "h-4 w-4" : "h-[18px] w-[18px]";

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen(!open);
        }}
        className={buttonClassName}
        title="分享"
        aria-label="分享"
      >
        {small ? (
          <span>分享</span>
        ) : (
          <svg className={iconClassName} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16V4m0 0l-4 4m4-4l4 4" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10H7a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2h-1" />
          </svg>
        )}
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-modal-top" onClick={() => setOpen(false)}>
          <div
            className="absolute w-36 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
            style={{ top: (menuRef.current?.getBoundingClientRect().bottom ?? 0) + 4, left: Math.max(8, (menuRef.current?.getBoundingClientRect().right ?? 144) - 144) }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); shareLine(); }}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-xs text-gray-900 transition hover:bg-gray-100"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#06C755]">
                <svg className="h-3 w-3" fill="white" viewBox="0 0 24 24"><path d="M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" /></svg>
              </span>
              分享到 LINE
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); shareFb(); }}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-xs text-gray-900 transition hover:bg-gray-100"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1877F2]">
                <svg className="h-3 w-3" fill="white" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
              </span>
              分享到 FB
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); copyLink(); }}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-xs text-gray-900 transition hover:bg-gray-100"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200">
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {copied ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  )}
                </svg>
              </span>
              {copied ? "已複製！" : "複製連結"}
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
