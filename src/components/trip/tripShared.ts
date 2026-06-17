"use client";

import type { DepartureBannerInfo, DepartureDate, TripBanner } from "@/lib/supabase";

export type PriceDetailContent = {
  title: string;
  subtitle: string;
  adultPrice: string;
  childWithBedPrice: string;
  childNoBedPrice: string;
  childExtraBedPrice: string;
  infantPrice: string;
  pricingNote: string;
  deposit: string;
  singleRoom: string;
  visaFee: string;
  surcharge: string;
  groupNote: string;
  quoteNote: string;
  visaNote: string;
};

export const EMPTY_TRIP_BANNER: TripBanner = {
  code_label: "",
  price_label: "",
  tags: [],
  departure_label: "",
  duration_label: "",
  seats_total: null,
  seats_available: null,
  deposit_label: "",
  side_image_url: "",
  departure_info_map: {},
};

export const EMPTY_DEPARTURE_INFO: DepartureBannerInfo = {
  group_code: "",
  price_detail: "",
  waitlist_count: null,
};

export const EMPTY_PRICE_DETAIL: PriceDetailContent = {
  title: "",
  subtitle: "",
  adultPrice: "",
  childWithBedPrice: "",
  childNoBedPrice: "",
  childExtraBedPrice: "",
  infantPrice: "",
  pricingNote: "",
  deposit: "",
  singleRoom: "",
  visaFee: "",
  surcharge: "",
  groupNote: "",
  quoteNote: "",
  visaNote: "",
};

export const DEFAULT_PRICE_DETAIL: PriceDetailContent = {
  title: "團費與售價說明",
  subtitle: "依航空與房型不同，價格略有調整",
  adultPrice: "洽詢",
  childWithBedPrice: "洽詢",
  childNoBedPrice: "洽詢",
  childExtraBedPrice: "洽詢",
  infantPrice: "洽詢",
  pricingNote: "＊ 年齡以「團體回國日」計算",
  deposit: "洽詢",
  singleRoom: "洽詢",
  visaFee: "免簽證",
  surcharge: "售價已內含",
  groupNote: "特惠團因為此行程為季節性促銷商品，恕無法包團及變更任何規格，敬請見諒(欲包團或增減需求煩請另洽業務單位)",
  quoteNote: "《無特殊說明》",
  visaNote: "免簽證(持台灣簽發之中華民國護照且護照內須有身分證統一編號及護照效期從預訂回國日算起尚有6個月以上效期)",
};

export const formatDateInput = (value: string) => {
  const cleaned = value.replace(/[^\d/]/g, "");

  if (cleaned.includes("/")) {
    const trailingSlash = cleaned.endsWith("/");
    const parts = cleaned.split("/").slice(0, 3);
    const [year = "", month = "", day = ""] = parts;
    const normalizedParts = [year.slice(0, 4)];

    if (parts.length > 1) normalizedParts.push(month.slice(0, 2));
    if (parts.length > 2) normalizedParts.push(day.slice(0, 2));

    const result = normalizedParts.filter((part, index) => index === 0 || part !== "").join("/");
    return trailingSlash && normalizedParts.length < 3 ? `${result}/` : result;
  }

  const digits = cleaned.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits;

  const year = digits.slice(0, 4);
  const monthDay = digits.slice(4);

  if (monthDay.length <= 2) {
    return `${year}/${monthDay}`;
  }

  const candidates = [1, 2]
    .map((monthLength) => {
      const monthPart = monthDay.slice(0, monthLength);
      const dayPart = monthDay.slice(monthLength);

      if (!monthPart || !dayPart || dayPart.length > 2) return null;

      const month = Number(monthPart);
      const day = Number(dayPart);

      if (month < 1 || month > 12 || day < 1 || day > 31) return null;

      return `${year}/${month}/${day}`;
    })
    .filter((candidate): candidate is string => Boolean(candidate));

  return candidates[0] ?? `${year}/${monthDay}`;
};

export const formatMoney = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("zh-TW");
};

export const parseDeparturePrice = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : null;
};

export const toBannerDaysNights = (days: string, nights: string) => {
  const d = days.replace(/\D/g, "");
  const n = nights.replace(/\D/g, "");
  return { dayText: d ? `${d}天` : "", nightText: n ? `${n}夜` : "" };
};

export const renderDaysNights = (dayText: string, nightText: string) => {
  const day = dayText.replace(/\D/g, "");
  const night = nightText.replace(/\D/g, "");
  if (!day && !night) return "";
  return `${day ? `${day}天` : ""}${night ? `${night}夜` : ""}`;
};

export const getDepartureBannerInfoMap = (source?: TripBanner | null) => source?.departure_info_map || {};

export const formatDisplayPrice = (price: number | null) => (price ? `NT$ ${price.toLocaleString("zh-TW")}` : "尚未設定");

export const formatPriceText = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (/^\$/.test(trimmed) || /^NT\$/.test(trimmed)) return trimmed;
  return trimmed.replace(/^([0-9,]+)/, "$$$1");
};

export const formatDepositText = (text: string) => {
  const normalized = formatPriceText(text).replace(/^\+/, "").replace(/^訂金\s*/, "").trim();
  if (!normalized) return "洽詢";
  const amount = normalized.replace(/^NT\$\s*/i, "").replace(/^\$\s*/, "").replace(/元\/?人$/i, "").replace(/元$/i, "").trim();
  if (!/^[0-9,]+$/.test(amount)) return amount;
  return `$ ${amount} 元/人`;
};

export const formatSingleRoomText = (text: string) => {
  const normalized = text.trim();
  if (!normalized) return "洽詢";
  const stripped = normalized.replace(/^\+/, "").replace(/^NT\$\s*/i, "").replace(/^\$\s*/, "").replace(/元\/?人$/i, "").replace(/元$/i, "").trim();
  if (!/^[0-9,]+$/.test(stripped)) return stripped;
  return `+ ${stripped} 元/人`;
};

export const formatPerPersonPrice = (text: string, fallback = "洽詢") => {
  const normalized = text.trim().replace(/^NT\$\s*/i, "").replace(/元\/?人$/i, "").replace(/元$/i, "").trim();
  if (!normalized) return fallback;
  if (!/^[0-9,]+$/.test(normalized)) return normalized;
  return `$ ${normalized} 元/人`;
};

export const displayAdultUnit = (text: string) => formatPerPersonPrice(text);
export const displayChildPrice = (text: string) => formatPerPersonPrice(text, "洽詢");
export const displayInfantUnit = (text: string) => formatPerPersonPrice(text);
export const displaySurchargeText = (text: string) => text.trim() || "售價已內含";
export const displayVisaFeeText = (text: string) => text.trim() || "簽證費";

export const formatFullDate = (dateStr: string) => {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return formatDateInput(dateStr);
  const weekday = ["日", "一", "二", "三", "四", "五", "六"][d.getDay()];
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}（${weekday}）`;
};

export const getScheduleLabel = (dep?: DepartureDate | null): string => {
  if (!dep) return "";
  if (dep.label && dep.label.includes("去")) return dep.label;
  const segs = dep.flight_segments;
  if (!segs || segs.length === 0) return "";
  const first = segs[0];
  const last = segs[segs.length - 1];
  if (!first?.dep_time || !last?.arr_time) return "";
  const hour = (t: string) => parseInt(t.split(":")[0], 10);
  const slot = (h: number) => (h < 12 ? "早" : h < 17 ? "午" : "晚");
  return `${slot(hour(first.dep_time))}去${slot(hour(last.arr_time))}回`;
};

export const parsePriceDetail = (detail: string): PriceDetailContent => {
  if (!detail.trim()) return DEFAULT_PRICE_DETAIL;

  try {
    const parsed = JSON.parse(detail) as Partial<PriceDetailContent> & {
      included?: string;
      excluded?: string;
      notes?: string;
    };
    if (typeof parsed === "object" && parsed !== null) {
      return {
        title: parsed.title || DEFAULT_PRICE_DETAIL.title,
        subtitle: parsed.subtitle || DEFAULT_PRICE_DETAIL.subtitle,
        adultPrice: parsed.adultPrice || DEFAULT_PRICE_DETAIL.adultPrice,
        childWithBedPrice: parsed.childWithBedPrice || DEFAULT_PRICE_DETAIL.childWithBedPrice,
        childNoBedPrice: parsed.childNoBedPrice || DEFAULT_PRICE_DETAIL.childNoBedPrice,
        childExtraBedPrice: parsed.childExtraBedPrice || DEFAULT_PRICE_DETAIL.childExtraBedPrice,
        infantPrice: parsed.infantPrice || DEFAULT_PRICE_DETAIL.infantPrice,
        pricingNote: parsed.pricingNote || DEFAULT_PRICE_DETAIL.pricingNote,
        deposit: parsed.deposit || DEFAULT_PRICE_DETAIL.deposit,
        singleRoom: parsed.singleRoom || DEFAULT_PRICE_DETAIL.singleRoom,
        visaFee: parsed.visaFee || DEFAULT_PRICE_DETAIL.visaFee,
        surcharge: parsed.surcharge || DEFAULT_PRICE_DETAIL.surcharge,
        groupNote: parsed.groupNote || parsed.included || DEFAULT_PRICE_DETAIL.groupNote,
        quoteNote: parsed.quoteNote || parsed.excluded || DEFAULT_PRICE_DETAIL.quoteNote,
        visaNote: parsed.visaNote || parsed.notes || DEFAULT_PRICE_DETAIL.visaNote,
      };
    }
  } catch {
    // fallback to legacy text mode
  }

  return {
    ...DEFAULT_PRICE_DETAIL,
    groupNote: detail,
  };
};

export const stringifyPriceDetail = (detail: PriceDetailContent) => JSON.stringify(detail);

export const splitHighlights = (value: string) =>
  value
    .split(/[、,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);

export const getBackHint = () => {
  if (typeof navigator === "undefined") return "點左上「返回」按鈕";
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  if (isIOS) {
    if (/CriOS/.test(ua)) return "點左上角「◀ Chrome」";
    if (/FxiOS/.test(ua)) return "點左上角「◀ Firefox」";
    if (/EdgiOS/.test(ua)) return "點左上角「◀ Edge」";
    return "點左上角「◀ Safari」";
  }
  if (isAndroid) return "按手機「返回鍵」或點左上「←」";
  return "點瀏覽器的「上一頁」按鈕";
};
