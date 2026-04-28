"use client";

import { useState, useEffect } from "react";
import { isFavorite, toggleFavorite } from "@/lib/favorites";

interface FavoriteButtonProps {
  tripId: string;
}

export default function FavoriteButton({ tripId }: FavoriteButtonProps) {
  const [liked, setLiked] = useState(false);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setLiked(isFavorite(tripId));
  }, [tripId]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const next = toggleFavorite(tripId);
    setLiked(next);
    if (next) {
      setAnimate(true);
      setTimeout(() => setAnimate(false), 300);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`absolute right-2 bottom-2 z-10 flex h-7 w-7 items-center justify-center rounded-full transition active:scale-90 ${
        liked
          ? "bg-red-500/90 text-white"
          : "bg-black/40 text-white/60 hover:bg-black/60 hover:text-white"
      } ${animate ? "scale-125" : ""}`}
      title={liked ? "取消收藏" : "加入收藏"}
    >
      <svg
        className="h-3.5 w-3.5"
        fill={liked ? "currentColor" : "none"}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
    </button>
  );
}
