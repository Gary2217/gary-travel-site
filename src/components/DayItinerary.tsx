"use client";

import { useState } from "react";

interface DayItineraryProps {
  dayNumber: number;
  title: string;
  description?: string;
  meals?: string;
  accommodation?: string;
  activities: string[];
}

export default function DayItinerary({
  dayNumber,
  title,
  description,
  meals,
  accommodation,
  activities,
}: DayItineraryProps) {
  const [isOpen, setIsOpen] = useState(dayNumber <= 2);

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[rgba(20,20,30,0.38)] backdrop-blur-[12px]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-4 text-left transition hover:bg-white/5"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-sm font-bold text-sky-400">
            {dayNumber}
          </span>
          <div>
            <p className="text-sm text-sky-400">Day {dayNumber}</p>
            <h3 className="font-semibold text-white">{title}</h3>
          </div>
        </div>
        <svg
          className={`h-5 w-5 shrink-0 text-white/50 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="border-t border-white/5 px-4 pb-4 pt-3 space-y-3">
          {description && (
            <p className="text-sm leading-relaxed text-white/80">{description}</p>
          )}

          {activities.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-white/50">景點活動</p>
              <div className="flex flex-wrap gap-1.5">
                {activities.map((activity) => (
                  <span key={activity} className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs text-sky-300">
                    {activity}
                  </span>
                ))}
              </div>
            </div>
          )}

          {meals && (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-white/50">餐食</p>
              <p className="text-sm text-white/70">{meals}</p>
            </div>
          )}

          {accommodation && (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-white/50">住宿</p>
              <p className="text-sm text-white/70">{accommodation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
