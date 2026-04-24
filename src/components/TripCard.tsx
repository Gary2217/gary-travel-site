"use client";

import Link from "next/link";

interface TripCardProps {
  id: string;
  title: string;
  subtitle?: string;
  duration: string;
  price_range?: string;
  cover_image_url?: string;
  highlights: string[];
}

export default function TripCard({
  id,
  title,
  subtitle,
  duration,
  price_range,
  cover_image_url,
  highlights,
}: TripCardProps) {
  return (
    <Link href={`/trip/${id}`}>
      <div className="group overflow-hidden rounded-[1.5rem] border border-white/10 bg-[rgba(20,20,30,0.45)] shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:shadow-xl">
        {/* 封面圖 */}
        <div className="relative h-40 overflow-hidden md:h-48">
          {cover_image_url ? (
            <div
              className="h-full w-full bg-cover bg-center transition duration-500 group-hover:scale-105"
              style={{ backgroundImage: `url(${cover_image_url})` }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[rgba(20,20,30,0.6)]">
              <svg className="h-12 w-12 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

          {/* 天數標籤 */}
          <div className="absolute right-3 top-3 rounded-full bg-sky-500/90 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
            {duration}
          </div>
        </div>

        {/* 資訊區 */}
        <div className="p-4">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          {subtitle && (
            <p className="mt-1 text-sm text-white/70">{subtitle}</p>
          )}

          {/* 價格 */}
          {price_range && (
            <p className="mt-2 text-base font-semibold text-sky-400">
              {price_range}
            </p>
          )}

          {/* 亮點標籤 */}
          {highlights.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {highlights.slice(0, 4).map((highlight) => (
                <span
                  key={highlight}
                  className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-white/80"
                >
                  {highlight}
                </span>
              ))}
              {highlights.length > 4 && (
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-white/50">
                  +{highlights.length - 4}
                </span>
              )}
            </div>
          )}

          {/* 查看行程按鈕 */}
          <div className="mt-4 flex items-center text-sm font-medium text-sky-400 transition group-hover:text-sky-300">
            查看行程詳情
            <svg className="ml-1 h-4 w-4 transition group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}
