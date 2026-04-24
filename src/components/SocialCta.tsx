interface SocialCtaProps {
  title: string;
  description: string;
  helperText?: string;
  lineLabel?: string;
  facebookLabel?: string;
  instagramLabel?: string;
  className?: string;
}

const lineId = process.env.NEXT_PUBLIC_LINE_ID || "@YOUR_LINE_ID";
const lineHref = `https://line.me/ti/p/${lineId.replace("@", "")}`;
const fbHref = process.env.NEXT_PUBLIC_FB_URL || "#";
const igHref = process.env.NEXT_PUBLIC_IG_URL || "#";

export default function SocialCta({
  title,
  description,
  lineLabel = "LINE立即洽詢",
  facebookLabel = "FB粉專看優惠",
  instagramLabel = "IG私訊",
  className = "",
}: SocialCtaProps) {
  return (
    <div className={`rounded-xl border border-white/10 bg-[rgba(20,20,30,0.38)] p-6 text-center backdrop-blur-[12px] md:p-8 ${className}`.trim()}>
      <div className="mx-auto max-w-4xl">
        <h3 className="mb-2 text-xl font-bold text-white md:text-2xl">{title}</h3>
        <p className="mb-4 text-sm text-white/70 md:text-base">{description}</p>
        <div className="flex flex-col items-center gap-3 md:flex-row md:justify-center">
          <p className="w-full text-center text-sm font-medium leading-6 text-white md:text-base md:leading-7">
            <span className="block">詢問行程｜拿行程檔案｜客製｜機票｜機+酒｜員工旅遊</span>
            <span className="block">旅遊規劃師 蓋瑞 GARY</span>
          </p>
          <a
            href={lineHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-[#06C755] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#05b64d] hover:shadow-xl md:text-base"
          >
            <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white">
              <span className="text-[8px] font-black leading-none text-[#06C755]">LINE</span>
              <span className="absolute -bottom-[2px] left-[5px] h-0 w-0 border-l-[4px] border-r-[4px] border-t-[5px] border-l-transparent border-r-transparent border-t-white" />
            </span>
            {lineLabel}
          </a>
          <a
            href={fbHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-[#1877F2] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#1565d8] hover:shadow-xl md:text-base"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            {facebookLabel}
          </a>
          <a
            href={igHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-[#E4405F] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#d62d4a] hover:shadow-xl md:text-base"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
            </svg>
            {instagramLabel}
          </a>
        </div>
      </div>
    </div>
  );
}
