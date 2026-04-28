"use client";

import { useState, useRef, useEffect } from "react";

interface ShareButtonProps {
  title: string;
  url: string;
}

export default function ShareButton({ title, url }: ShareButtonProps) {
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

  const fullUrl = `https://gary-travel-site.vercel.app${url}`;
  const shareText = `${title} - 旅行沒有終點`;

  const shareLine = () => {
    window.open(
      `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(fullUrl)}&text=${encodeURIComponent(shareText)}`,
      "_blank",
    );
    setOpen(false);
  };

  const shareFb = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}`,
      "_blank",
    );
    setOpen(false);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 1200);
    } catch {
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen(!open);
        }}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/60 transition hover:bg-white/20 hover:text-white active:scale-95"
        title="分享"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-50 w-36 overflow-hidden rounded-xl border border-white/10 bg-[rgba(20,20,30,0.95)] shadow-xl backdrop-blur-xl">
          <button
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); shareLine(); }}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-xs text-white transition hover:bg-white/10"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#06C755]">
              <svg className="h-3 w-3" fill="white" viewBox="0 0 24 24"><path d="M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" /></svg>
            </span>
            分享到 LINE
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); shareFb(); }}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-xs text-white transition hover:bg-white/10"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1877F2]">
              <svg className="h-3 w-3" fill="white" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
            </span>
            分享到 FB
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); copyLink(); }}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-xs text-white transition hover:bg-white/10"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
              <svg className="h-3 w-3" fill="none" stroke="white" viewBox="0 0 24 24">
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
      )}
    </div>
  );
}
