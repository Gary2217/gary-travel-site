"use client";

import { useState, memo } from "react";

interface DayItineraryProps {
  dayNumber: number;
  title: string;
  description?: string;
  meals?: string;
  accommodation?: string;
  activities: string[];
}

function DayItinerary({
  dayNumber,
  title,
  description,
  meals,
  accommodation,
  activities,
}: DayItineraryProps) {
  const [isOpen, setIsOpen] = useState(dayNumber <= 2);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-4 text-left transition hover:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-600">
            {dayNumber}
          </span>
          <div>
            <p className="text-sm text-sky-600">Day {dayNumber}</p>
            <h3 className="font-semibold text-gray-900">{title}</h3>
          </div>
        </div>
        <svg
          className={`h-5 w-5 shrink-0 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-3">
          {description && (
            <p className="text-sm leading-relaxed text-gray-600">{description}</p>
          )}

          {activities.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-gray-500">景點活動</p>
              <div className="flex flex-wrap gap-1.5">
                {activities.map((activity, i) => (
                  <span key={`${i}-${activity}`} className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs text-sky-600">
                    {activity}
                  </span>
                ))}
              </div>
            </div>
          )}

          {meals && (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">餐食</p>
              <p className="text-sm text-gray-600">{meals}</p>
            </div>
          )}

          {accommodation && (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">住宿</p>
              <p className="text-sm text-gray-600">{accommodation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default memo(DayItinerary);
