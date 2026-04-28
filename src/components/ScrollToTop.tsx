"use client";

import { useEffect, useState } from "react";

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 400);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="回到頂部"
      className="fixed bottom-20 left-3 z-[9998] flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[rgba(20,20,30,0.9)] text-white/70 shadow-lg backdrop-blur-xl transition hover:bg-[rgba(35,35,50,0.95)] hover:text-white active:scale-95 sm:bottom-8 sm:left-4 sm:h-11 sm:w-11"
    >
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    </button>
  );
}
