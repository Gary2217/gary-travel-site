"use client";

import { lineDmHref, fbDmHref, igDmHref } from "@/lib/supabase";

interface SocialCtaProps {
  title: string;
  description: string;
  logoUrl?: string;
  lineLabel?: string;
  facebookLabel?: string;
  instagramLabel?: string;
  className?: string;
}

export default function SocialCta({
  title,
  description,
  logoUrl,
  lineLabel = "LINE 諮詢",
  facebookLabel = "FB 私訊",
  instagramLabel = "IG 私訊",
  className = "",
}: SocialCtaProps) {
  return (
    <div className={`rounded-2xl border border-white/[0.08] bg-[#1a3347] p-6 text-center ${className}`.trim()}>
      <h3 className="text-base font-bold text-white">{title}</h3>
      <p className="mt-1 text-xs text-white/50">{description}</p>
      <p className="mt-3 text-[11px] leading-5 text-white/60">
        免費諮詢 · 不收服務費 · 即時回覆
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2.5">
        <a
          href={lineDmHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#06C755] px-5 py-2.5 text-[13px] font-semibold text-white transition hover:opacity-85"
        >
          {lineLabel}
        </a>
        <a
          href={fbDmHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#1877F2] px-5 py-2.5 text-[13px] font-semibold text-white transition hover:opacity-85"
        >
          {facebookLabel}
        </a>
        <a
          href={igDmHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#E4405F] px-5 py-2.5 text-[13px] font-semibold text-white transition hover:opacity-85"
        >
          {instagramLabel}
        </a>
      </div>
    </div>
  );
}
