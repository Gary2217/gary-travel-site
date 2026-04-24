"use client";

import Link from "next/link";
import ImageEditor from "@/components/ImageEditor";
import { uploadTripImage } from "@/lib/supabase";

interface TripCardProps {
  id: string;
  title: string;
  duration: string;
  cover_image_url?: string;
  isDevMode?: boolean;
  onImageUpdate?: (tripId: string, newImageUrl: string) => void;
}

export default function TripCard({
  id,
  title,
  duration,
  cover_image_url,
  isDevMode = false,
  onImageUpdate,
}: TripCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-[rgba(20,20,30,0.45)] shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      {/* 封面圖 */}
      <div className="relative h-36 overflow-hidden sm:h-40 md:h-44">
        {cover_image_url ? (
          <div
            className="h-full w-full bg-cover bg-center transition duration-500 group-hover:scale-105"
            style={{ backgroundImage: `url(${cover_image_url})` }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[rgba(20,20,30,0.6)]">
            <svg className="h-10 w-10 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

        {/* 天數標籤 */}
        <div className="absolute right-2 top-2 rounded-full bg-sky-500/90 px-2.5 py-0.5 text-xs font-bold text-white backdrop-blur-sm">
          {duration}
        </div>

        {/* Dev mode 圖片編輯 */}
        {isDevMode && onImageUpdate && (
          <ImageEditor
            entityId={id}
            currentImageUrl={cover_image_url || ""}
            title={title}
            onUpdate={(newUrl) => onImageUpdate(id, newUrl)}
            uploadFn={uploadTripImage}
          />
        )}
      </div>

      {/* 行程名稱 + 按鈕 */}
      <div className="p-3 sm:p-4">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-tight text-white sm:text-base">
          {title}
        </h3>
        <Link
          href={`/trip/${id}`}
          className="mt-3 flex w-full items-center justify-center gap-1 rounded-full bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow transition hover:bg-sky-500 sm:text-sm"
        >
          點我看行程
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
