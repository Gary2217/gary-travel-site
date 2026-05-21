"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { isFavorite, toggleFavorite } from "@/lib/favorites";

interface FavoriteButtonProps {
  tripId: string;
}

export default function FavoriteButton({ tripId }: FavoriteButtonProps) {
  const [liked, setLiked] = useState(false);
  const [animate, setAnimate] = useState(false);
  const [showParticle, setShowParticle] = useState(false);
  const [toastKey, setToastKey] = useState(0);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastLiked, setToastLiked] = useState(true);

  useEffect(() => {
    setLiked(isFavorite(tripId));
  }, [tripId]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const next = toggleFavorite(tripId);
    setLiked(next);
    setToastLiked(next);
    setToastKey(k => k + 1);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2500);
    window.dispatchEvent(new Event("favoritesChanged"));
    if (next) {
      setAnimate(true);
      setTimeout(() => setAnimate(false), 300);
      setShowParticle(true);
      setTimeout(() => setShowParticle(false), 850);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`absolute bottom-2 right-2 z-10 flex h-10 w-10 items-center justify-center rounded-full transition active:scale-90 ${
          liked ? "bg-red-500/90 text-white" : "bg-black/40 text-white/60 hover:bg-black/60 hover:text-white"
        } ${animate ? "scale-125" : ""}`}
        title={liked ? "取消收藏" : "加入收藏"}
      >
        <svg className="h-5 w-5" fill={liked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>

        {/* 飛出愛心粒子 */}
        {showParticle && (
          <span className="pointer-events-none absolute inset-0 flex animate-float-up items-center justify-center">
            <svg className="h-6 w-6 text-red-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </span>
        )}
      </button>

      {/* Toast 通知（固定在畫面頂部正中央） */}
      {toastVisible && typeof document !== "undefined" && createPortal(
        <div
          key={toastKey}
          className={`pointer-events-none fixed left-1/2 top-[88px] z-[10001] min-w-[180px] animate-toast-in rounded-2xl px-5 py-3 text-center shadow-2xl ${
            toastLiked ? "bg-red-500" : "bg-gray-700"
          } text-white`}
        >
          {toastLiked ? (
            <>
              <p className="text-sm font-bold">❤️ 已加入收藏</p>
              <p className="mt-0.5 text-[11px] text-white/80">點右上角 ❤️ 可查看所有收藏</p>
            </>
          ) : (
            <p className="text-sm font-medium">💔 已取消收藏</p>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
