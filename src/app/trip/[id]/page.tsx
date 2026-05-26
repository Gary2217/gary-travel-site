"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createPortal } from "react-dom";
import { getTripWithDays, getDestination, getRelatedTrips, getSiteLogo, uploadTripBannerImage, uploadTripDocument, deleteTripDocument, type Trip, type TripBanner, type DepartureDate, type DepartureBannerInfo, lineHref, lineMessageHref, fbHref, igHref } from "@/lib/supabase";
import TripCard from "@/components/TripCard";
import dynamic from "next/dynamic";
import StickyHeader from "@/components/StickyHeader";
import DayItinerary from "@/components/DayItinerary";
import DepartureDates from "@/components/DepartureDates";
import InquiryButtons from "@/components/InquiryButtons";
import DevModeToggle from "@/components/DevModeToggle";
import SocialCta from "@/components/SocialCta";

const PdfViewer = dynamic(() => import("@/components/PdfViewer"), { ssr: false });
const ImageEditor = dynamic(() => import("@/components/ImageEditor"), { ssr: false });
const SideMediaCarousel = dynamic(() => import("@/components/SideMediaCarousel"), { ssr: false });
import { track } from "@/lib/analytics";
import { openExternalLink } from "@/lib/external-link";

const EMPTY_TRIP_BANNER: TripBanner = {
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

const EMPTY_DEPARTURE_INFO: DepartureBannerInfo = {
  group_code: "",
  price_detail: "",
  waitlist_count: null,
};

type PriceDetailContent = {
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

const EMPTY_PRICE_DETAIL: PriceDetailContent = {
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

const DEFAULT_PRICE_DETAIL: PriceDetailContent = {
  title: '團費與售價說明',
  subtitle: '依航空與房型不同，價格略有調整',
  adultPrice: '洽詢',
  childWithBedPrice: '洽詢',
  childNoBedPrice: '洽詢',
  childExtraBedPrice: '洽詢',
  infantPrice: '洽詢',
  pricingNote: '＊ 年齡以「團體回國日」計算',
  deposit: '洽詢',
  singleRoom: '洽詢',
  visaFee: '免簽證',
  surcharge: '售價已內含',
  groupNote: '特惠團因為此行程為季節性促銷商品，恕無法包團及變更任何規格，敬請見諒(欲包團或增減需求煩請另洽業務單位)',
  quoteNote: '《無特殊說明》',
  visaNote: '免簽證(持台灣簽發之中華民國護照且護照內須有身分證統一編號及護照效期從預訂回國日算起尚有6個月以上效期)',
};

export default function TripPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tripId = params.id as string;
  const from = searchParams.get("from");
  const requestedDepartureId = searchParams.get("departureId");

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDownloadGate, setShowDownloadGate] = useState(false);
  const [downloadReady, setDownloadReady] = useState(false);
  const [showShareGate, setShowShareGate] = useState(false);
  const [siteLogoUrl, setSiteLogoUrl] = useState('/travel-logo.svg');
  const [isDevMode, setIsDevMode] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const docInputRef = useRef<HTMLInputElement>(null);
  const rightColumnRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const [videoMatchHeight, setVideoMatchHeight] = useState<number | undefined>(undefined);
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editPriceRange, setEditPriceRange] = useState('');
  const [editHighlights, setEditHighlights] = useState('');
  const [editTripBanner, setEditTripBanner] = useState<TripBanner>(EMPTY_TRIP_BANNER);
  const [editDayCount, setEditDayCount] = useState('');
  const [editNightCount, setEditNightCount] = useState('');
  const [editBannerTagInput, setEditBannerTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [departureDates, setDepartureDates] = useState<DepartureDate[]>([]);
  const [selectedDepartureId, setSelectedDepartureId] = useState<string | null>(null);
  const [departureEditorDate, setDepartureEditorDate] = useState('');
  const [departureEditorPrice, setDepartureEditorPrice] = useState('');
  const [departureEditorGroupCode, setDepartureEditorGroupCode] = useState('');
  const [departureEditorWaitlist, setDepartureEditorWaitlist] = useState('');
  const [detailTitle, setDetailTitle] = useState('');
  const [detailSubtitle, setDetailSubtitle] = useState('');
  const [detailAdultPrice, setDetailAdultPrice] = useState('');
  const [detailChildWithBedPrice, setDetailChildWithBedPrice] = useState('');
  const [detailChildNoBedPrice, setDetailChildNoBedPrice] = useState('');
  const [detailChildExtraBedPrice, setDetailChildExtraBedPrice] = useState('');
  const [detailInfantPrice, setDetailInfantPrice] = useState('');
  const [detailPricingNote, setDetailPricingNote] = useState('');
  const [detailDeposit, setDetailDeposit] = useState('');
  const [detailSingleRoom, setDetailSingleRoom] = useState('');
  const [detailVisaFee, setDetailVisaFee] = useState('');
  const [detailSurcharge, setDetailSurcharge] = useState('');
  const [detailGroupNote, setDetailGroupNote] = useState('');
  const [detailQuoteNote, setDetailQuoteNote] = useState('');
  const [detailVisaNote, setDetailVisaNote] = useState('');
  const [showPriceDetailModal, setShowPriceDetailModal] = useState(false);
  const [showPriceInfoModal, setShowPriceInfoModal] = useState(false);
  const [showBannerEditor, setShowBannerEditor] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [isCreatingNewDeparture, setIsCreatingNewDeparture] = useState(false);
  const [tableActiveMonth, setTableActiveMonth] = useState<string>("all");
  const [showMobileDatePicker, setShowMobileDatePicker] = useState(false);
  const [departureEditorLabel, setDepartureEditorLabel] = useState('');
  const [recommendedTrips, setRecommendedTrips] = useState<Trip[]>([]);
  const [recommendedLoading, setRecommendedLoading] = useState(false);
  const recommendRef = useRef<HTMLDivElement>(null);
  const recommendFetched = useRef(false);

  const banner = trip?.trip_banner ?? EMPTY_TRIP_BANNER;
  const selectedDeparture = departureDates.find((date) => date.id === selectedDepartureId) ?? null;
  const selectedDepartureInfo = selectedDepartureId
    ? banner.departure_info_map?.[selectedDepartureId] ?? EMPTY_DEPARTURE_INFO
    : EMPTY_DEPARTURE_INFO;

  // 偵測瀏覽器/裝置，產生對應的「返回」提示文字
  const getBackHint = () => {
    if (typeof navigator === 'undefined') return '點左上「返回」按鈕';
    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/.test(ua);
    const isAndroid = /Android/.test(ua);
    if (isIOS) {
      if (/CriOS/.test(ua)) return '點左上角「◀ Chrome」';
      if (/FxiOS/.test(ua)) return '點左上角「◀ Firefox」';
      if (/EdgiOS/.test(ua)) return '點左上角「◀ Edge」';
      return '點左上角「◀ Safari」';
    }
    if (isAndroid) return '按手機「返回鍵」或點左上「←」';
    return '點瀏覽器的「上一頁」按鈕';
  };

  const triggerNativeShare = () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      navigator.share({
        title: trip?.title || "",
        text: `看看這個行程：${trip?.title || ""}`,
        url,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        alert("已複製行程連結！可以貼到 LINE、FB、IG 分享給好友");
      }).catch(() => {
        alert(`請複製此連結分享給好友：${url}`);
      });
    }
  };

  const handleFollowAndShare = async (socialUrl: string) => {
    setShowShareGate(false);
    const pageUrl = typeof window !== "undefined" ? window.location.href : "";

    // 先觸發原生分享（必須在用戶手勢的同步 context 內呼叫，iOS 才允許）
    if (navigator.share) {
      try {
        await navigator.share({
          title: trip?.title || "",
          text: `看看這個行程：${trip?.title || ""}`,
          url: pageUrl,
        });
      } catch {
        // 用戶取消或不支援，繼續執行
      }
    } else {
      navigator.clipboard?.writeText(pageUrl)
        .then(() => alert("已複製行程連結！可以貼到 LINE、FB、IG 分享給好友"))
        .catch(() => alert(`請複製此連結分享給好友：${pageUrl}`));
    }

  };

  // 用 ref 讀取 deposit_label，避免其加入 useEffect 依賴而觸發欄位重置
  const depositLabelRef = useRef(editTripBanner.deposit_label);
  depositLabelRef.current = editTripBanner.deposit_label;

  const showSaveSuccess = (message = '儲存成功') => {
    setSaveSuccessMessage(message);
    window.setTimeout(() => {
      setSaveSuccessMessage(null);
    }, 1500);
  };

  const openBannerEditor = () => {
    setEditTripBanner({
      ...EMPTY_TRIP_BANNER,
      ...(trip?.trip_banner || {}),
      departure_info_map: trip?.trip_banner?.departure_info_map || {},
    });
    const rawDays = (trip?.trip_banner?.code_label || '').replace(/\D/g, '');
    const rawNights = (trip?.trip_banner?.duration_label || '').replace(/\D/g, '');
    setEditDayCount(rawDays.slice(0, 2));
    setEditNightCount(rawNights.slice(0, 2));
    setEditBannerTagInput('');
  };

  const openTripInfoEditor = () => {
    if (!trip) return;
    setEditTitle(trip.title);
    setEditSubtitle(trip.subtitle || '');
    setEditPriceRange(trip.price_range || '');
    setEditHighlights((trip.highlights || []).join('、'));
    openBannerEditor();
    setShowEditPanel(true);
  };

  const formatDateInput = (value: string) => {
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

  const formatMoney = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';
    return Number(digits).toLocaleString('zh-TW');
  };

  const parseDeparturePrice = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) return null;
    const parsed = Number(digits);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const toBannerDaysNights = (days: string, nights: string) => {
    const d = days.replace(/\D/g, '');
    const n = nights.replace(/\D/g, '');
    return { dayText: d ? `${d}天` : '', nightText: n ? `${n}夜` : '' };
  };

  const renderDaysNights = (dayText: string, nightText: string) => {
    const day = dayText.replace(/\D/g, '');
    const night = nightText.replace(/\D/g, '');
    if (!day && !night) return '';
    return `${day ? `${day}天` : ''}${night ? `${night}夜` : ''}`;
  };

  const renderBannerItems = (items: string[], baseClassName: string) =>
    items.map((item, index) => (
      <div key={`${item}-${index}`} className="flex items-center gap-2">
        {index > 0 && <span className="text-gray-300">|</span>}
        <span className={baseClassName}>{item}</span>
      </div>
    ));

  const getDepartureBannerInfoMap = (source?: TripBanner | null) => source?.departure_info_map || {};

  const formatDisplayPrice = (price: number | null) => (price ? `NT$ ${price.toLocaleString('zh-TW')}` : '尚未設定');
  const formatPriceText = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return '';
    if (/^\$/.test(trimmed) || /^NT\$/.test(trimmed)) return trimmed;
    return trimmed.replace(/^([0-9,]+)/, '$$$1');
  };

  const formatDepositText = (text: string) => {
    const normalized = formatPriceText(text).replace(/^\+/, '').replace(/^訂金\s*/,'').trim();
    if (!normalized) return '洽詢';
    const amount = normalized.replace(/^NT\$\s*/i, '').replace(/^\$\s*/, '').replace(/元\/?人$/i, '').replace(/元$/i, '').trim();
    if (!/^[0-9,]+$/.test(amount)) return amount;
    return `$ ${amount} 元/人`;
  };

  const formatSingleRoomText = (text: string) => {
    const normalized = text.trim();
    if (!normalized) return '洽詢';
    const stripped = normalized.replace(/^\+/, '').replace(/^NT\$\s*/i, '').replace(/^\$\s*/, '').replace(/元\/?人$/i, '').replace(/元$/i, '').trim();
    if (!/^[0-9,]+$/.test(stripped)) return stripped;
    return `+ ${stripped} 元/人`;
  };

  const formatPerPersonPrice = (text: string, fallback = '洽詢') => {
    const normalized = text.trim().replace(/^NT\$\s*/i, '').replace(/元\/?人$/i, '').replace(/元$/i, '').trim();
    if (!normalized) return fallback;
    if (!/^[0-9,]+$/.test(normalized)) return normalized;
    return `$ ${normalized} 元/人`;
  };

  const displayAdultUnit = (text: string) => formatPerPersonPrice(text);
  const displayChildPrice = (text: string) => formatPerPersonPrice(text, '洽詢');
  const displayInfantUnit = (text: string) => formatPerPersonPrice(text);
  const displaySurchargeText = (text: string) => text.trim() || '售價已內含';
  const displayVisaFeeText = (text: string) => text.trim() || '簽證費';

  const formatFullDate = (dateStr: string) => {
    const d = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(d.getTime())) return formatDateInput(dateStr);
    const weekday = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}（${weekday}）`;
  };

  const parsePriceDetail = (detail: string): PriceDetailContent => {
    if (!detail.trim()) return DEFAULT_PRICE_DETAIL;

    try {
      const parsed = JSON.parse(detail) as Partial<PriceDetailContent> & {
        included?: string;
        excluded?: string;
        notes?: string;
      };
      if (typeof parsed === 'object' && parsed !== null) {
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

  const stringifyPriceDetail = (detail: PriceDetailContent) => JSON.stringify(detail);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const data = await getTripWithDays(tripId);
        if (!isMounted) return;
        setTrip(data);
        setDepartureDates(data.departure_dates || []);
        track({ event_type: "trip_view", trip_id: tripId, trip_title: data.title });
      } catch {
        if (isMounted) setError("無法載入行程資料");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, [tripId]);

  // 測量右欄高度，讓 IG 影片底部對齊行程概要底部
  useEffect(() => {
    function measure() {
      if (!rightColumnRef.current || !titleRef.current) return;
      const rightH = rightColumnRef.current.offsetHeight;
      const titleH = titleRef.current.offsetHeight;
      // carousel 的 mt-4 = 16px
      const available = rightH - titleH - 16;
      if (available > 200) setVideoMatchHeight(available);
    }
    // 延遲一幀確保 DOM 已更新
    const raf = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, [trip, selectedDepartureId]);

  useEffect(() => {
    if (!trip) return;

    const nextBanner = {
      ...EMPTY_TRIP_BANNER,
      ...(trip.trip_banner || {}),
      departure_info_map: getDepartureBannerInfoMap(trip.trip_banner),
    };

    setEditTripBanner(nextBanner);
    setEditDayCount((trip.trip_banner?.code_label || '').replace(/\D/g, '').slice(0, 2));
    setEditNightCount((trip.trip_banner?.duration_label || '').replace(/\D/g, '').slice(0, 2));
  }, [trip]);

  useEffect(() => {
    if (departureDates.length === 0) {
      setSelectedDepartureId(null);
      return;
    }

    setSelectedDepartureId((current) => {
      if (requestedDepartureId && departureDates.some((date) => date.id === requestedDepartureId)) {
        return requestedDepartureId;
      }

      if (current && departureDates.some((date) => date.id === current)) {
        return current;
      }

      // 優先選有航班資料的梯次
      const withFlight = departureDates.find(d =>
        (d.flight_segments && d.flight_segments.length > 0) || d.outbound_flight || d.airline
      );
      return (withFlight || departureDates[0]).id;
    });
  }, [departureDates, requestedDepartureId]);

  useEffect(() => {
    if (!selectedDeparture) {
      setDepartureEditorDate('');
      setDepartureEditorPrice('');
      setDepartureEditorGroupCode('');
      setDepartureEditorWaitlist('');
      setDepartureEditorLabel('');
      setDetailTitle(DEFAULT_PRICE_DETAIL.title);
      setDetailSubtitle(DEFAULT_PRICE_DETAIL.subtitle);
      setDetailAdultPrice(DEFAULT_PRICE_DETAIL.adultPrice);
      setDetailChildWithBedPrice(DEFAULT_PRICE_DETAIL.childWithBedPrice);
      setDetailChildNoBedPrice(DEFAULT_PRICE_DETAIL.childNoBedPrice);
      setDetailChildExtraBedPrice(DEFAULT_PRICE_DETAIL.childExtraBedPrice);
      setDetailInfantPrice(DEFAULT_PRICE_DETAIL.infantPrice);
      setDetailPricingNote(DEFAULT_PRICE_DETAIL.pricingNote);
      setDetailDeposit(DEFAULT_PRICE_DETAIL.deposit);
      setDetailSingleRoom(DEFAULT_PRICE_DETAIL.singleRoom);
      setDetailVisaFee(DEFAULT_PRICE_DETAIL.visaFee);
      setDetailSurcharge(DEFAULT_PRICE_DETAIL.surcharge);
      setDetailGroupNote(DEFAULT_PRICE_DETAIL.groupNote);
      setDetailQuoteNote(DEFAULT_PRICE_DETAIL.quoteNote);
      setDetailVisaNote(DEFAULT_PRICE_DETAIL.visaNote);
      return;
    }

    setDepartureEditorDate(selectedDeparture.departure_date);
    setDepartureEditorPrice(selectedDeparture.price ? String(selectedDeparture.price) : '');
    setDepartureEditorLabel(selectedDeparture.label || '');

    const infoSource = selectedDepartureInfo;

    setDepartureEditorGroupCode(selectedDepartureInfo.group_code || '');
    setDepartureEditorWaitlist(typeof selectedDepartureInfo.waitlist_count === 'number' ? String(selectedDepartureInfo.waitlist_count) : '');
    const parsedDetail = parsePriceDetail(infoSource.price_detail || '');
    setDetailTitle(parsedDetail.title);
    setDetailSubtitle(parsedDetail.subtitle);
    setDetailAdultPrice(parsedDetail.adultPrice);
    setDetailChildWithBedPrice(parsedDetail.childWithBedPrice);
    setDetailChildNoBedPrice(parsedDetail.childNoBedPrice);
    setDetailChildExtraBedPrice(parsedDetail.childExtraBedPrice);
    setDetailInfantPrice(parsedDetail.infantPrice);
    setDetailPricingNote(parsedDetail.pricingNote);
    setDetailDeposit(parsedDetail.deposit || String(depositLabelRef.current || '').trim() || DEFAULT_PRICE_DETAIL.deposit);
    setDetailSingleRoom(parsedDetail.singleRoom);
    setDetailVisaFee(parsedDetail.visaFee || '免簽證');
    setDetailSurcharge(parsedDetail.surcharge || '售價已內含');
    setDetailGroupNote(parsedDetail.groupNote);
    setDetailQuoteNote(parsedDetail.quoteNote);
    setDetailVisaNote(parsedDetail.visaNote);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDepartureId, selectedDeparture]);

  useEffect(() => {
    getSiteLogo().then(setSiteLogoUrl).catch(() => {});
  }, []);

  // 懶載入推薦行程（滾動到底部附近才觸發）
  useEffect(() => {
    if (!trip || recommendFetched.current || recommendedTrips.length > 0) return;
    const el = recommendRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !recommendFetched.current) {
          recommendFetched.current = true;
          setRecommendedLoading(true);
          (async () => {
            try {
              const dest = await getDestination(trip.destination_id);
              if (!dest.region_id || !dest.regions?.category_label) return;
              const related = await getRelatedTrips(dest.region_id, dest.regions.category_label, trip.destination_id);
              const regionFiltered = (related.regionTrips || []).filter((t: Trip) => t.id !== tripId);
              const categoryFiltered = (related.categoryTrips || []).filter((t: Trip) => t.id !== tripId && !regionFiltered.some((r: Trip) => r.id === t.id));
              const combined = [...regionFiltered, ...categoryFiltered].slice(0, 4);
              setRecommendedTrips(combined);
            } catch { /* 靜默 */ }
            finally { setRecommendedLoading(false); }
          })();
          observer.disconnect();
        }
      },
      { rootMargin: '400px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [trip, tripId, recommendedTrips.length]);

  const buildDepartureInfoPayload = (): DepartureBannerInfo => ({
    group_code: departureEditorGroupCode.trim(),
    waitlist_count: departureEditorWaitlist ? Number(departureEditorWaitlist) : 0,
    price_detail: stringifyPriceDetail({
      title: detailTitle.trim(),
      subtitle: detailSubtitle.trim(),
      adultPrice: detailAdultPrice.trim(),
      childWithBedPrice: detailChildWithBedPrice.trim(),
      childNoBedPrice: detailChildNoBedPrice.trim(),
      childExtraBedPrice: detailChildExtraBedPrice.trim(),
      infantPrice: detailInfantPrice.trim(),
      pricingNote: detailPricingNote.trim(),
      deposit: (detailDeposit.trim() || String(editTripBanner.deposit_label || '').trim() || DEFAULT_PRICE_DETAIL.deposit),
      singleRoom: detailSingleRoom.trim(),
      visaFee: detailVisaFee.trim(),
      surcharge: detailSurcharge.trim(),
      groupNote: detailGroupNote.trim(),
      quoteNote: detailQuoteNote.trim(),
      visaNote: detailVisaNote.trim(),
    }),
  });

  const saveSelectedDepartureInfo = async (): Promise<boolean> => {
    if (!selectedDepartureId || !selectedDeparture) {
      alert('請先選擇一個出團日期');
      return false;
    }

    setSaving(true);

    const bannerPayload: TripBanner = {
      ...EMPTY_TRIP_BANNER,
      ...editTripBanner,
      code_label: previewDayText,
      duration_label: previewNightText,
      departure_info_map: {
        ...getDepartureBannerInfoMap(editTripBanner),
        [selectedDepartureId]: buildDepartureInfoPayload(),
      },
    };

    const departurePayload = {
      departure_date: departureEditorDate,
      price: parseDeparturePrice(departureEditorPrice),
      seats_total: editTripBanner.seats_total,
      seats_available: editTripBanner.seats_available,
      label: departureEditorLabel || null,
    };

    try {
      const [tripRes, departureRes] = await Promise.all([
        fetch(`/api/trips/${tripId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trip_banner: bannerPayload }),
        }),
        fetch(`/api/trips/${tripId}/departure-dates?dateId=${selectedDepartureId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(departurePayload),
        }),
      ]);

      if (!tripRes.ok || !departureRes.ok) {
        alert('儲存失敗，請再試一次');
        return false;
      }

      const [updatedTrip, updatedDeparture] = await Promise.all([tripRes.json(), departureRes.json()]);
      const fallbackPrice = parseDeparturePrice(departureEditorPrice);
      const normalizedDeparture = {
        ...selectedDeparture,
        ...updatedDeparture,
        departure_date: updatedDeparture?.departure_date || departureEditorDate || selectedDeparture.departure_date,
        price: typeof updatedDeparture?.price === 'number' ? updatedDeparture.price : fallbackPrice,
      };

      setTrip((prev) => {
        if (!prev) return prev;
        const remoteBanner = updatedTrip?.trip_banner;
        return {
          ...prev,
          ...updatedTrip,
          trip_banner: remoteBanner
            ? {
                ...bannerPayload,
                ...remoteBanner,
                departure_info_map: {
                  ...bannerPayload.departure_info_map,
                  ...(remoteBanner.departure_info_map || {}),
                },
              }
            : bannerPayload,
        };
      });
      setDepartureDates((prev) =>
        prev
          .map((date) => (date.id === selectedDepartureId ? { ...date, ...normalizedDeparture } : date))
          .sort((a, b) => a.departure_date.localeCompare(b.departure_date))
      );
      setDepartureEditorPrice(typeof normalizedDeparture.price === 'number' ? String(normalizedDeparture.price) : '');
      setShowBannerEditor(false);
      setIsCreatingNewDeparture(false);
      showSaveSuccess('儲存成功');
      return true;
    } catch {
      alert('儲存失敗，請再試一次');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveTripBannerOnly = async (): Promise<boolean> => {
    setSaving(true);
    const bannerPayload: TripBanner = {
      ...EMPTY_TRIP_BANNER,
      ...editTripBanner,
      code_label: previewDayText,
      duration_label: previewNightText,
    };

    try {
      const res = await fetch(`/api/trips/${tripId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip_banner: bannerPayload }),
      });
      if (!res.ok) {
        alert('儲存失敗，請再試一次');
        return false;
      }
      const updatedTrip = await res.json();
      setTrip((prev) => (prev ? { ...prev, ...updatedTrip, trip_banner: updatedTrip?.trip_banner || bannerPayload } : prev));
      showSaveSuccess('儲存成功');
      return true;
    } catch {
      alert('儲存失敗，請再試一次');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveDepartureInfoAsFirstDeparture = async (): Promise<boolean> => {
    setSaving(true);

    const departureCreatePayload = {
      departure_date: departureEditorDate || null,
      price: parseDeparturePrice(departureEditorPrice),
      seats_total: editTripBanner.seats_total,
      seats_available: editTripBanner.seats_available,
      label: departureEditorLabel || null,
    };

    try {
      const createRes = await fetch(`/api/trips/${tripId}/departure-dates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(departureCreatePayload),
      });

      if (!createRes.ok) {
        alert('建立出團梯次失敗，請再試一次');
        return false;
      }

      const createdDeparture = await createRes.json();

      const bannerPayload: TripBanner = {
        ...EMPTY_TRIP_BANNER,
        ...editTripBanner,
        code_label: previewDayText,
        duration_label: previewNightText,
        departure_info_map: {
          ...getDepartureBannerInfoMap(editTripBanner),
          [createdDeparture.id]: buildDepartureInfoPayload(),
        },
      };

      const tripRes = await fetch(`/api/trips/${tripId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip_banner: bannerPayload }),
      });

      if (!tripRes.ok) {
        alert('儲存出團資訊失敗，請再試一次');
        return false;
      }

      const updatedTrip = await tripRes.json();
      setTrip((prev) => {
        if (!prev) return prev;
        const remoteBanner = updatedTrip?.trip_banner;
        return {
          ...prev,
          ...updatedTrip,
          trip_banner: remoteBanner
            ? {
                ...bannerPayload,
                ...remoteBanner,
                departure_info_map: {
                  ...bannerPayload.departure_info_map,
                  ...(remoteBanner.departure_info_map || {}),
                },
              }
            : bannerPayload,
        };
      });
      setDepartureDates((prev) => [...prev, createdDeparture].sort((a, b) => a.departure_date.localeCompare(b.departure_date)));
      setSelectedDepartureId(createdDeparture.id);
      setDepartureEditorPrice(typeof createdDeparture.price === 'number' ? String(createdDeparture.price) : '');
      setIsCreatingNewDeparture(false);
      setShowBannerEditor(false);
      showSaveSuccess('儲存成功');
      return true;
    } catch {
      alert('儲存失敗，請再試一次');
      return false;
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-transparent text-gray-900">
        <StickyHeader showBackButton backHref={from || "/"} logoUrl={siteLogoUrl} />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-sky-400 border-r-transparent" />
            <p className="mt-4 text-gray-500">載入中...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !trip) {
    return (
      <main className="min-h-screen bg-transparent text-gray-900">
        <StickyHeader showBackButton backHref={from || "/"} logoUrl={siteLogoUrl} />
        <div className="flex min-h-[60vh] items-center justify-center px-4">
          <div className="text-center">
            <p className="text-lg text-red-400">{error || "找不到此行程"}</p>
            <button
              onClick={() => window.history.back()}
              className="mt-4 rounded-full bg-sky-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
            >
              返回上一頁
            </button>
          </div>
        </div>
      </main>
    );
  }

  const days = trip.trip_days || [];
  const { dayText: previewDayText, nightText: previewNightText } = toBannerDaysNights(editDayCount, editNightCount);
  const priceDetailPreview = parsePriceDetail(selectedDepartureInfo.price_detail || '');

  // 出發日期表格：月份分組 & 篩選
  const departureMonthKeys = (() => {
    const map = new Map<string, boolean>();
    departureDates.forEach(d => {
      const dt = new Date(d.departure_date + 'T00:00:00');
      map.set(`${dt.getFullYear()}-${dt.getMonth() + 1}`, true);
    });
    return Array.from(map.keys()).sort();
  })();
  const filteredDepartures = tableActiveMonth === 'all'
    ? departureDates
    : departureDates.filter(d => {
        const dt = new Date(d.departure_date + 'T00:00:00');
        return `${dt.getFullYear()}-${dt.getMonth() + 1}` === tableActiveMonth;
      });

  // 航班資訊 helper — 固定顯示，切換梯次時跟著切換；沒有航班資料時 fallback 到有資料的梯次
  const hasFlight = (d: DepartureDate) =>
    (d.flight_segments && d.flight_segments.length > 0) ||
    d.outbound_flight || d.outbound_time ||
    d.outbound_from || d.outbound_to ||
    d.return_flight || d.return_time ||
    d.return_from || d.return_to ||
    d.airline;
  const flightFallback = departureDates.find(hasFlight) || null;
  const flightSource = (selectedDeparture && hasFlight(selectedDeparture)) ? selectedDeparture : flightFallback;
  const selectedFlightSegments = flightSource?.flight_segments;
  const hasFlightData = !!flightSource;

  return (
    <main className="min-h-screen bg-transparent text-gray-900">
      <StickyHeader showBackButton backHref={from || "/"} logoUrl={siteLogoUrl} devModeSlot={<DevModeToggle onToggle={setIsDevMode} />} />

      {/* 浮動詢問按鈕 */}
      <InquiryButtons tripTitle={trip.title} tripId={tripId} variant="floating" selectedDate={selectedDeparture?.departure_date} />

      <div id="trip-content" />

      {/* 標題區塊 */}
      <div className="mx-auto max-w-site px-3 pt-[88px] sm:px-4 md:px-6 lg:px-6">
        {/* 麵包屑導覽 */}
        {trip.destinations && (
          <div className="mb-3 flex items-center gap-1 text-xs text-gray-400">
            <Link href="/" className="transition hover:text-gray-600">首頁</Link>
            <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            <Link href={`/destination/${trip.destination_id}`} className="transition hover:text-gray-600">
              {trip.destinations.title}
            </Link>
            <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            <span className="line-clamp-1 text-gray-600">{trip.title}</span>
          </div>
        )}

        {/* 標題（移到格線上方） */}
        <div ref={titleRef} className="mb-4 hidden lg:block">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-[1.75rem] md:text-[2rem]">{trip.title}</h1>
          {trip.subtitle && (
            <p className="mt-0.5 text-sm text-gray-600 sm:mt-1 sm:text-[15px] md:text-base">{trip.subtitle}</p>
          )}
          {isDevMode && (
            <div className="mt-2 flex flex-wrap gap-2">
              <button onClick={openTripInfoEditor} className="rounded-full bg-sky-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-sky-500">編輯資訊</button>
            </div>
          )}
        </div>

        <div className="flex flex-col lg:grid lg:grid-cols-[1fr_1.15fr] lg:items-start lg:gap-6">
          {/* 主圖 */}
          <div className="order-1 min-w-0 lg:order-none lg:col-start-1 lg:row-start-1">
            <SideMediaCarousel
              tripId={tripId}
              fallbackImageUrl={trip.cover_image_url || editTripBanner.side_image_url || ""}
              tripTitle={trip.title}
              isDevMode={isDevMode}
              videoMatchHeight={videoMatchHeight}
            />
          </div>

          {/* 手機版合併資訊卡（標題+資訊+折扣+價格+按鈕） */}
          <div className="order-2 mt-3 lg:hidden">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
              {/* 標題 */}
              <div className="border-l-[3px] border-l-sky-500 px-4 py-3">
                <h2 className="text-base font-bold leading-snug text-gray-900">{trip.title}</h2>
                {trip.subtitle && <p className="mt-0.5 text-[13px] text-gray-600">{trip.subtitle}</p>}
                {isDevMode && (
                  <button onClick={openTripInfoEditor} className="mt-2 rounded-full bg-sky-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-sky-500">編輯資訊</button>
                )}
              </div>

              {/* 標籤 */}
              {editTripBanner.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 px-4 py-2">
                  {editTripBanner.tags.map((tag, i) => (
                    <span key={`m-tag-${i}`} className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600">{tag}</span>
                  ))}
                </div>
              )}

              {/* 資訊列 */}
              <div className="space-y-2 border-t border-gray-100 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="min-w-[36px] text-[11px] text-sky-600">日期</span>
                  <span className="whitespace-nowrap text-xs font-medium text-gray-900 sm:text-sm">
                    {selectedDeparture ? (() => {
                      const start = formatFullDate(selectedDeparture.departure_date);
                      const daysNum = parseInt(previewDayText.replace(/\D/g, ''), 10) || 0;
                      let end = '';
                      if (selectedDeparture.return_date) {
                        end = formatFullDate(selectedDeparture.return_date);
                      } else if (daysNum > 1) {
                        const dt = new Date(selectedDeparture.departure_date + 'T00:00:00');
                        dt.setDate(dt.getDate() + daysNum - 1);
                        end = formatFullDate(dt.toLocaleDateString('sv-SE'));
                      }
                      const dur = renderDaysNights(previewDayText, previewNightText);
                      return end ? <>{start} <span className="mx-1 text-sm font-black text-sky-500 sm:text-base">→</span> {end}　{dur}</> : `${start} ${dur}`;
                    })() : '—'}
                  </span>
                </div>
                {trip.destinations && (
                  <div className="flex items-center gap-2.5">
                    <span className="min-w-[36px] text-[11px] text-sky-600">目的地</span>
                    <span className="text-sm font-medium text-gray-900">{trip.destinations.title}</span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2">
                  {(selectedDeparture?.seats_total ?? 0) > 0 ? (
                    <div className="flex items-center gap-2.5">
                      <span className="min-w-[36px] text-[11px] text-sky-600">團位</span>
                      <span className="text-sm font-medium text-gray-900">團位 <strong>{selectedDeparture?.seats_total}</strong>　可售 <strong>{selectedDeparture?.seats_available}</strong></span>
                    </div>
                  ) : <div />}
                  <button type="button" onClick={() => setShowPriceInfoModal(true)} className="shrink-0 inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-[11px] font-medium text-orange-600 transition hover:bg-orange-100">
                    <span className="font-bold">$</span> 售價說明 / 加床 / 小孩 ..
                  </button>
                </div>
              </div>

              {/* 折扣 + 價格 + 按鈕 */}
              <div className="border-t border-gray-100 px-4 py-3">
                <span className="relative inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-amber-500 to-orange-500 py-1 pl-3 pr-4 text-xs font-bold text-white shadow-sm before:absolute before:-left-1 before:top-1/2 before:h-2.5 before:w-2.5 before:-translate-y-1/2 before:rounded-full before:bg-white after:absolute after:-right-1 after:top-1/2 after:h-2.5 after:w-2.5 after:-translate-y-1/2 after:rounded-full after:bg-white">
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.94s4.18 1.36 4.18 3.85c0 1.89-1.44 2.96-3.12 3.19z" /></svg>
                  限時折500
                </span>
                <div className="mt-2 flex items-baseline justify-between gap-2">
                  {(() => {
                    const currentPrice = selectedDeparture
                      ? (departureEditorPrice ? Number(departureEditorPrice) : selectedDeparture.price)
                      : null;
                    const originalPrice = currentPrice ? currentPrice + 500 : null;
                    return (
                      <>
                        {originalPrice && (
                          <span className="relative text-2xl font-bold text-gray-600">NT$ {originalPrice.toLocaleString('zh-TW')}<span className="absolute inset-0 flex items-center" aria-hidden="true"><span className="w-full border-t-[2px] border-red-600 -rotate-6"></span></span></span>
                        )}
                        <div className="text-right">
                          <span className="text-3xl font-black tracking-tight text-amber-600">
                            {currentPrice ? `NT$ ${currentPrice.toLocaleString('zh-TW')}` : (trip.price_range || '洽詢')}
                          </span>
                          <span className="ml-1 text-xs text-gray-500">起/人</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
                <div className="mt-3 flex gap-2">
                  {departureDates.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setShowMobileDatePicker(true)}
                      className="flex-1 rounded-lg border-2 border-sky-500 bg-white py-2.5 text-center text-sm font-bold text-sky-600 transition hover:bg-sky-50 active:scale-[0.98]"
                    >
                      選擇其他日期
                    </button>
                  )}
                  <a
                    href={lineHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => track({ event_type: 'line_inquiry', trip_id: tripId, trip_title: trip.title })}
                    className="flex flex-1 items-center justify-center rounded-lg border-2 border-[#06C755] bg-[#06C755] py-2.5 text-sm font-bold text-white transition hover:bg-[#05b64d] active:scale-[0.98]"
                  >
                    LINE 詢問
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* 產品資訊 — 桌面左欄第2行（手機隱藏） */}
          <div className="hidden min-w-0 lg:block lg:order-none lg:col-start-1 lg:row-start-2">
            <div className="mt-3 space-y-2 rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <span className="min-w-[36px] text-[11px] text-sky-600">團號</span>
                  <span className="text-sm font-medium text-gray-900">{selectedDepartureInfo.group_code || '—'}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="min-w-[36px] text-[11px] text-sky-600">
                    <svg className="inline h-3.5 w-3.5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {selectedDeparture ? (() => {
                      const start = formatFullDate(selectedDeparture.departure_date);
                      const daysNum = parseInt(previewDayText.replace(/\D/g, ''), 10) || 0;
                      let end = '';
                      if (selectedDeparture.return_date) {
                        end = formatFullDate(selectedDeparture.return_date);
                      } else if (daysNum > 1) {
                        const dt = new Date(selectedDeparture.departure_date + 'T00:00:00');
                        dt.setDate(dt.getDate() + daysNum - 1);
                        end = formatFullDate(dt.toLocaleDateString('sv-SE'));
                      }
                      const dur = renderDaysNights(previewDayText, previewNightText);
                      return end ? <>{start} <span className="mx-1.5 text-base font-black text-sky-500">→</span> {end}　{dur}</> : `${start} ${dur}`;
                    })() : '—'}
                  </span>
                </div>
                {trip.destinations && (
                  <div className="flex items-center gap-2.5">
                    <span className="min-w-[36px] text-[11px] text-sky-600">目的地</span>
                    <span className="text-sm font-medium text-gray-900">{trip.destinations.title}</span>
                  </div>
                )}
              {/* ── 團位 + 售價說明（同一列） ── */}
              <div className="flex items-center justify-between gap-2">
                {(selectedDeparture?.seats_total ?? 0) > 0 ? (
                  <div className="flex items-center gap-2.5">
                    <span className="min-w-[36px] text-[11px] text-sky-600">
                      <svg className="inline h-3.5 w-3.5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </span>
                    <span className="text-sm font-medium text-gray-900">團位 <strong>{selectedDeparture?.seats_total}</strong>　可售 <strong>{selectedDeparture?.seats_available}</strong></span>
                  </div>
                ) : <div />}
                <div className="flex shrink-0 gap-1.5">
                  <button type="button" onClick={() => setShowPriceInfoModal(true)} className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-[11px] font-medium text-orange-600 transition hover:bg-orange-100">
                    <span className="font-bold">$</span> 售價說明 / 加床 / 小孩 ..
                  </button>
                  {isDevMode && (
                    <button type="button" onClick={() => setShowPriceDetailModal((v) => !v)} className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition ${showPriceDetailModal ? 'bg-sky-100 text-sky-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                      {showPriceDetailModal ? '收起編輯' : '編輯售價'}
                    </button>
                  )}
                </div>
              </div>

              {/* Dev mode 售價編輯（展開在卡片內） */}
              {isDevMode && showPriceDetailModal && (
                <div className="mt-3 space-y-3 rounded-xl border border-sky-200 bg-sky-50/50 p-3">
                  <p className="text-[10px] font-semibold tracking-[0.2em] text-sky-600">售價明細編輯</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div><label className="mb-0.5 block text-[10px] text-gray-500">大人</label><input value={detailAdultPrice} onChange={(e) => setDetailAdultPrice(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-sky-400" /></div>
                    <div><label className="mb-0.5 block text-[10px] text-gray-500">小孩佔床</label><input value={detailChildWithBedPrice} onChange={(e) => setDetailChildWithBedPrice(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-sky-400" /></div>
                    <div><label className="mb-0.5 block text-[10px] text-gray-500">小孩不佔床</label><input value={detailChildNoBedPrice} onChange={(e) => setDetailChildNoBedPrice(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-sky-400" /></div>
                    <div><label className="mb-0.5 block text-[10px] text-gray-500">加床</label><input value={detailChildExtraBedPrice} onChange={(e) => setDetailChildExtraBedPrice(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-sky-400" /></div>
                    <div><label className="mb-0.5 block text-[10px] text-gray-500">嬰兒</label><input value={detailInfantPrice} onChange={(e) => setDetailInfantPrice(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-sky-400" /></div>
                    <div><label className="mb-0.5 block text-[10px] text-gray-500">團費</label><input value={departureEditorPrice} onChange={(e) => setDepartureEditorPrice(e.target.value.replace(/\D/g, ''))} className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-sky-400" /></div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div><label className="mb-0.5 block text-[10px] text-gray-500">訂金</label><input value={detailDeposit} onChange={(e) => setDetailDeposit(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-sky-400" /></div>
                    <div><label className="mb-0.5 block text-[10px] text-gray-500">單人房差</label><input value={detailSingleRoom} onChange={(e) => setDetailSingleRoom(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-sky-400" /></div>
                    <div><label className="mb-0.5 block text-[10px] text-gray-500">簽證費</label><input value={detailVisaFee} onChange={(e) => setDetailVisaFee(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-sky-400" /></div>
                    <div><label className="mb-0.5 block text-[10px] text-gray-500">附加費</label><input value={detailSurcharge} onChange={(e) => setDetailSurcharge(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-sky-400" /></div>
                  </div>
                  <div className="space-y-2">
                    <div><label className="mb-0.5 block text-[10px] text-gray-500">團體說明</label><textarea value={detailGroupNote} onChange={(e) => setDetailGroupNote(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs leading-5 outline-none focus:border-sky-400" /></div>
                    <div><label className="mb-0.5 block text-[10px] text-gray-500">報價說明</label><textarea value={detailQuoteNote} onChange={(e) => setDetailQuoteNote(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs leading-5 outline-none focus:border-sky-400" /></div>
                    <div><label className="mb-0.5 block text-[10px] text-gray-500">簽證說明</label><textarea value={detailVisaNote} onChange={(e) => setDetailVisaNote(e.target.value)} rows={2} className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs leading-5 outline-none focus:border-sky-400" /></div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setShowPriceDetailModal(false)} className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] text-gray-600 hover:bg-gray-50">收起</button>
                    <button type="button" disabled={saving} onClick={async () => { const ok = selectedDeparture ? await saveSelectedDepartureInfo() : await saveDepartureInfoAsFirstDeparture(); if (ok) setShowPriceDetailModal(false); }} className="rounded-full bg-sky-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-sky-500 disabled:opacity-60">{saving ? '儲存中...' : '儲存售價'}</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 出發日期 — 手機排第2、桌面右欄跨列 */}
          <div ref={rightColumnRef} className="hidden mt-3 lg:block lg:order-none lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:mt-0">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
              {/* Dev mode 按鈕 */}
              {isDevMode && (
                <div className="flex justify-end gap-1.5 px-4 pt-2.5 pb-1">
                  <button type="button" onClick={() => { setShowBannerEditor(true); setIsCreatingNewDeparture(true); setDepartureEditorDate(''); setDepartureEditorGroupCode(''); setDepartureEditorPrice(''); setDepartureEditorWaitlist(''); setDepartureEditorLabel(''); }} className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-600 transition hover:bg-emerald-100">新增</button>
                  <button type="button" onClick={() => { if (showBannerEditor) setIsCreatingNewDeparture(false); setShowBannerEditor((v) => !v); }} className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition ${showBannerEditor ? "bg-sky-100 text-sky-600 hover:bg-sky-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"}`}>{showBannerEditor ? "關閉編輯" : "編輯"}</button>
                </div>
              )}

              {/* 月份篩選 */}
              {departureMonthKeys.length > 1 && (
                <div className="hidden flex-wrap gap-1.5 border-b border-gray-100 px-4 py-2 sm:flex">
                  <button type="button" onClick={() => setTableActiveMonth("all")} className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${tableActiveMonth === "all" ? "bg-sky-500 text-white" : "text-gray-500 hover:text-sky-600"}`}>全部</button>
                  {departureMonthKeys.map((m) => {
                    const mo = m.split("-")[1];
                    return <button key={m} type="button" onClick={() => setTableActiveMonth(m)} className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${tableActiveMonth === m ? "bg-sky-500 text-white" : "text-gray-500 hover:text-sky-600"}`}>{mo}月</button>;
                  })}
                </div>
              )}

              {/* 桌面版表頭 — 出團資訊在表頭列 */}
              <table className="hidden w-full sm:table">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-sm text-gray-900">
                    <th className="py-2.5 pl-5 pr-2 text-left font-bold">出團日期</th>
                    <th className="px-2 py-2.5 text-center font-bold" style={{width:56}}>團位</th>
                    <th className="px-2 py-2.5 text-center font-bold" style={{width:56}}>可售</th>
                    <th className="px-2 py-2.5 text-center font-bold" style={{width:64}}>狀態</th>
                    <th className="py-2.5 pl-2 pr-4 text-right font-bold" style={{width:100}}>售價</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredDepartures.map((d) => {
                    const isSelected = selectedDepartureId === d.id;
                    const soldOut = d.seats_available === 0 && d.seats_total > 0;
                    return (
                      <tr
                        key={d.id}
                        onClick={() => setSelectedDepartureId(d.id)}
                        className={`cursor-pointer transition ${isSelected ? "bg-sky-50 border-l-[3px] border-l-sky-500" : "border-l-[3px] border-l-transparent hover:bg-gray-50"}`}
                      >
                        <td className="py-2.5 pl-5 pr-2 text-sm font-medium text-gray-900">
                          {formatFullDate(d.departure_date)}
                          {d.label === '保證出團' && <span className="ml-8 inline-flex items-center rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">保證出團</span>}
                          {d.label === '即將成團' && <span className="ml-8 inline-flex items-center rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-600">即將成團</span>}
                          {d.label && d.label !== '保證出團' && d.label !== '即將成團' && <span className="ml-8 inline-flex items-center rounded bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-600">{d.label}</span>}
                        </td>
                        <td className="px-2 py-2.5 text-center text-sm text-gray-700">{d.seats_total || '—'}</td>
                        <td className="px-2 py-2.5 text-center text-sm text-gray-700">{d.seats_available ?? '—'}</td>
                        <td className="px-2 py-2.5 text-center">{soldOut ? <span className="text-[11px] text-gray-400">已售罄</span> : <span className="rounded bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-600">報名</span>}</td>
                        <td className="py-2.5 pl-2 pr-4 text-right text-sm font-bold text-[#0077b6]">{d.price ? `NT$${d.price.toLocaleString()}` : '洽詢'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* 手機版：選擇其他日期 + LINE 詢問 按鈕 */}
              {departureDates.length > 1 && (
                <div className="flex gap-2 px-4 py-2.5 sm:hidden">
                  <button
                    type="button"
                    onClick={() => setShowMobileDatePicker(true)}
                    className="flex-1 rounded-lg border-2 border-sky-500 bg-white py-2.5 text-center text-sm font-bold text-sky-600 transition hover:bg-sky-50 active:scale-[0.98]"
                  >
                    選擇其他日期
                  </button>
                  <a
                    href={lineHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => track({ event_type: 'line_inquiry', trip_id: tripId, trip_title: trip.title })}
                    className="flex flex-1 items-center justify-center rounded-lg border-2 border-[#06C755] bg-[#06C755] py-2.5 text-sm font-bold text-white transition hover:bg-[#05b64d] active:scale-[0.98]"
                  >
                    LINE 詢問
                  </a>
                </div>
              )}

              {/* 折扣券 + 底部價格 */}
              <div className="border-t border-gray-100 px-4 pt-2.5 pb-0">
                <span className="relative inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-amber-500 to-orange-500 py-1 pl-3 pr-4 text-xs font-bold text-white shadow-sm before:absolute before:-left-1 before:top-1/2 before:h-2.5 before:w-2.5 before:-translate-y-1/2 before:rounded-full before:bg-white after:absolute after:-right-1 after:top-1/2 after:h-2.5 after:w-2.5 after:-translate-y-1/2 after:rounded-full after:bg-white">
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.94s4.18 1.36 4.18 3.85c0 1.89-1.44 2.96-3.12 3.19z" /></svg>
                  限時折500
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-gray-200 px-4 py-3 mt-2">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-gray-700">團費</div>
                  <div className="flex items-baseline gap-1.5">
                    {(() => {
                      const currentPrice = selectedDeparture
                        ? (departureEditorPrice ? Number(departureEditorPrice) : selectedDeparture.price)
                        : null;
                      const originalPrice = currentPrice ? currentPrice + 500 : null;
                      return (
                        <>
                          {originalPrice && (
                            <span className="relative text-sm text-gray-400 line-through decoration-red-500 decoration-2">NT$ {originalPrice.toLocaleString('zh-TW')}</span>
                          )}
                          <span className="text-2xl font-black tracking-tight text-gray-900">
                            {currentPrice ? `NT$ ${currentPrice.toLocaleString('zh-TW')}` : (trip.price_range || '洽詢')}
                          </span>
                        </>
                      );
                    })()}
                    <span className="text-xs text-gray-500">起/人</span>
                  </div>
                </div>
                {editTripBanner.deposit_label && (
                  <div className="hidden shrink-0 sm:block">
                    <div className="text-xs font-semibold text-gray-700">訂金</div>
                    <div>
                      <span className="text-lg font-bold text-sky-600">{formatDepositText(String(editTripBanner.deposit_label))}</span>
                    </div>
                  </div>
                )}
                <a
                  href={lineHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track({ event_type: 'line_inquiry', trip_id: tripId, trip_title: trip.title })}
                  className="hidden shrink-0 rounded-full bg-[#06C755] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#05b64d] sm:inline-flex"
                >
                  LINE 詢問
                </a>
              </div>
            </div>

            {/* Dev mode 出團資訊編輯器 */}
            {isDevMode && showBannerEditor && (
              <div className={`mt-3 space-y-3 rounded-[1.25rem] border p-4 ${isCreatingNewDeparture ? 'border-emerald-200 bg-emerald-50' : 'border-sky-200 bg-sky-50'}`}>
                <div>
                  <p className={`text-[10px] font-semibold tracking-[0.2em] ${isCreatingNewDeparture ? 'text-emerald-600' : 'text-sky-600'}`}>
                    {isCreatingNewDeparture ? '新增梯次' : '目前編輯梯次'}
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    {isCreatingNewDeparture
                      ? '填入新梯次日期與資訊，按「建立新梯次」儲存'
                      : `點上方表格列可切換${!selectedDeparture ? '（尚未選擇梯次，先新增或點選梯次）' : ''}`}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
                    <div className="text-xs font-semibold text-gray-600">團號</div>
                    <input value={departureEditorGroupCode} onChange={(e) => setDepartureEditorGroupCode(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-sky-400" />
                  </div>
                  <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
                    <div className="text-xs font-semibold text-gray-600">日期</div>
                    <input type="date" value={departureEditorDate} onChange={(e) => setDepartureEditorDate(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-sky-400 [color-scheme:light]" />
                  </div>
                  <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
                    <div className="text-xs font-semibold text-gray-600">團費</div>
                    <input value={departureEditorPrice} onChange={(e) => setDepartureEditorPrice(e.target.value.replace(/\D/g, ''))} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-sky-400" />
                  </div>
                  <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
                    <div className="text-xs font-semibold text-gray-600">天數</div>
                    <input value={editDayCount} onChange={e => setEditDayCount(e.target.value.replace(/\D/g, '').slice(0, 2))} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-sky-400" />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
                    <div className="text-xs font-semibold text-gray-600">夜數</div>
                    <input id="night-count-input" value={editNightCount} onChange={e => setEditNightCount(e.target.value.replace(/\D/g, '').slice(0, 2))} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-sky-400" />
                  </div>
                  <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
                    <div className="text-xs font-semibold text-gray-600">團位</div>
                    <input type="number" value={editTripBanner.seats_total ?? ''} onChange={e => setEditTripBanner(prev => ({ ...prev, seats_total: e.target.value ? Number(e.target.value) : null }))} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-sky-400" />
                  </div>
                  <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
                    <div className="text-xs font-semibold text-gray-600">可售</div>
                    <input type="number" value={editTripBanner.seats_available ?? ''} onChange={e => setEditTripBanner(prev => ({ ...prev, seats_available: e.target.value ? Number(e.target.value) : null }))} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-sky-400" />
                  </div>
                  <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
                    <div className="text-xs font-semibold text-gray-600">候補</div>
                    <input type="number" min="0" value={departureEditorWaitlist} onChange={(e) => setDepartureEditorWaitlist(e.target.value.replace(/\D/g, ''))} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-sky-400" />
                  </div>
                  <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
                    <div className="text-xs font-semibold text-gray-600">標籤</div>
                    <div className="flex flex-wrap gap-1.5">
                      {['保證出團', '即將成團'].map((lbl) => (
                        <button key={lbl} type="button" onClick={() => setDepartureEditorLabel(departureEditorLabel === lbl ? '' : lbl)} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${departureEditorLabel === lbl ? (lbl === '保證出團' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white') : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>{lbl}</button>
                      ))}
                      {departureEditorLabel && departureEditorLabel !== '保證出團' && departureEditorLabel !== '即將成團' && (
                        <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold text-sky-600">{departureEditorLabel}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
                    <div className="text-xs font-semibold text-gray-600">訂金</div>
                    <input value={editTripBanner.deposit_label} onChange={e => setEditTripBanner(prev => ({ ...prev, deposit_label: e.target.value.replace(/\D/g, '') }))} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-sky-400" />
                  </div>
                </div>

                <div>
                  <div className="mb-1 text-xs text-gray-500">標籤（Enter 新增）</div>
                  <div className="flex flex-wrap gap-1.5 rounded-xl border border-gray-200 bg-white px-2.5 py-2">
                    {editTripBanner.tags.map((tag, i) => (
                      <span key={`${tag}-${i}`} className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-600">
                        {tag}
                        <button type="button" onClick={() => setEditTripBanner(prev => ({ ...prev, tags: prev.tags.filter((_, idx) => idx !== i) }))} className="ml-0.5 text-gray-400 hover:text-red-500">×</button>
                      </span>
                    ))}
                    <input value={editBannerTagInput} onChange={e => setEditBannerTagInput(e.target.value)} placeholder="輸入標籤..." className="min-w-[80px] flex-1 bg-transparent px-1 py-0.5 text-sm text-gray-900 outline-none" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const val = editBannerTagInput.trim(); if (!val) return; setEditTripBanner(prev => ({ ...prev, tags: [...prev.tags, val] })); setEditBannerTagInput(''); } }} />
                  </div>
                </div>

                <div className="flex flex-wrap justify-center gap-2">
                  <button onClick={isCreatingNewDeparture ? saveDepartureInfoAsFirstDeparture : (selectedDeparture ? saveSelectedDepartureInfo : saveDepartureInfoAsFirstDeparture)} disabled={saving} className="rounded-full bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-500 disabled:opacity-60">
                    {saving ? '儲存中...' : isCreatingNewDeparture ? '建立新梯次' : selectedDeparture ? '儲存目前梯次' : '建立首梯並儲存'}
                  </button>
                  {selectedDeparture && !isCreatingNewDeparture && (
                    <button type="button" disabled={saving} onClick={() => { setIsCreatingNewDeparture(true); setDepartureEditorDate(''); setDepartureEditorGroupCode(''); setDepartureEditorPrice(''); setDepartureEditorWaitlist(''); }} className="rounded-full border border-sky-200 bg-sky-50 px-4 py-1.5 text-xs font-semibold text-sky-600 transition hover:bg-sky-100 disabled:opacity-60">+ 新增梯次</button>
                  )}
                  {isCreatingNewDeparture && (
                    <button type="button" onClick={() => setIsCreatingNewDeparture(false)} className="rounded-full border border-gray-200 bg-gray-50 px-4 py-1.5 text-xs font-semibold text-gray-500 transition hover:bg-gray-100">取消新增</button>
                  )}
                  <button type="button" onClick={() => { setEditTripBanner(EMPTY_TRIP_BANNER); setEditDayCount(''); setEditNightCount(''); setDepartureEditorGroupCode(''); setDepartureEditorWaitlist(''); setDepartureEditorPrice(''); setDetailTitle(''); setDetailSubtitle(''); setDetailAdultPrice(''); setDetailChildWithBedPrice(''); setDetailChildNoBedPrice(''); setDetailChildExtraBedPrice(''); setDetailInfantPrice(''); setDetailPricingNote(''); setDetailDeposit(''); setDetailSingleRoom(''); setDetailVisaFee(''); setDetailSurcharge(''); setDetailGroupNote(''); setDetailQuoteNote(''); setDetailVisaNote(''); }} className="rounded-full border border-red-200 bg-red-50 px-4 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100">清空目前內容</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>



      {/* DevMode 編輯面板 */}
      {/* 編輯彈窗 */}
      {showEditPanel && createPortal(
        <div className="fixed inset-0 z-modal-top flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setShowEditPanel(false); }}>
            <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">編輯行程資訊</h3>
              <button onClick={() => setShowEditPanel(false)} className="text-gray-400 hover:text-gray-700">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-gray-500">標題</label>
                <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-sky-400" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">副標題</label>
                <input value={editSubtitle} onChange={e => setEditSubtitle(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-sky-400" />
              </div>

            </div>
            <button
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                const res = await fetch(`/api/trips/${tripId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    title: editTitle.trim(),
                    subtitle: editSubtitle.trim(),
                  }),
                });
                if (res.ok) {
                  const updated = await res.json();
                  setTrip(prev => prev ? { ...prev, ...updated } : prev);
                  setShowEditPanel(false);
                  showSaveSuccess('儲存成功');
                } else {
                  alert('儲存失敗，請再試一次');
                }
                setSaving(false);
              }}
              className="mt-3 w-full rounded-full bg-sky-600 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:opacity-60"
            >
              {saving ? '儲存中...' : '儲存'}
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* 內容區 */}
      <div className="mx-auto max-w-[1000px] px-3 py-4 sm:px-4 sm:py-6 md:px-8 md:py-10">

        {/* ═══ 出團日期卡片（所有用戶可見） ═══ */}
        <DepartureDates
          tripId={tripId}
          tripTitle={trip.title}
          dates={departureDates}
          isDevMode={isDevMode}
          onDatesChange={setDepartureDates}
          selectedDateId={selectedDepartureId}
          onSelectedDateChange={setSelectedDepartureId}
          onSaveSuccess={() => showSaveSuccess('出團梯次已儲存')}
        />

        {/* ═══ 航班資訊 ═══ */}
        {hasFlightData && flightSource && (
          <section className="mb-8 flex flex-col gap-0 sm:flex-row">
            {/* 左側直排標籤 */}
            <div className="hidden shrink-0 sm:flex sm:flex-col sm:items-center sm:justify-center sm:rounded-l-xl sm:border sm:border-r-0 sm:border-sky-200 sm:bg-sky-50 sm:px-3 sm:py-4">
              <span className="text-base font-bold tracking-[0.3em] text-sky-600" style={{writingMode:'vertical-rl'}}>參考航班</span>
            </div>
            {/* 手機版標題（已整合到下方卡片） */}
            <div className="min-w-0 flex-1">
            <div className="hidden flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-t-xl border border-b-0 border-gray-200 bg-white px-4 py-2 sm:flex sm:rounded-tl-none">
              <div className="flex items-center gap-2">
                <svg className="h-3.5 w-3.5 shrink-0 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <span className="text-xs font-bold text-gray-900">出團日期：{formatFullDate(flightSource.departure_date)}</span>
                {flightSource.label && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${flightSource.label === '保證出團' ? 'bg-red-100 text-red-600' : flightSource.label === '即將成團' ? 'bg-amber-100 text-amber-600' : 'bg-sky-100 text-sky-600'}`}>
                    {flightSource.label}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-amber-600">實際航班以團體確認為準</span>
            </div>

            {flightSource.flight_segments && flightSource.flight_segments.length > 0 ? (
              <>
                {/* 桌面版航班表格 */}
                <div className="hidden overflow-hidden rounded-r-lg rounded-bl-lg border border-gray-200 sm:block">
                  <div className="grid grid-cols-[84px_1.4fr_1fr_1fr] bg-gray-50">
                    <div className="border-b border-r border-gray-200 px-3 py-2 text-center text-xs font-semibold text-gray-500">航段</div>
                    <div className="border-b border-r border-gray-200 px-3 py-2 text-center text-xs font-semibold text-gray-500">班機日期・航空公司及航班</div>
                    <div className="border-b border-r border-gray-200 px-3 py-2 text-center text-xs font-semibold text-gray-500">起飛時間及機場</div>
                    <div className="border-b border-gray-200 px-3 py-2 text-center text-xs font-semibold text-gray-500">抵達時間及機場</div>
                  </div>
                  {flightSource.flight_segments.map((seg, i) => {
                    const total = flightSource.flight_segments!.length;
                    const isFirst = i === 0;
                    const isLast = i === total - 1 && total > 1;
                    const iconColor = isFirst ? "text-sky-500" : isLast ? "text-amber-500" : "text-violet-500";
                    const segmentLabel = isFirst ? "去程" : isLast ? "回程" : "轉機";
                    const segDate = seg.date ? (() => { const sd = new Date(seg.date + 'T00:00:00'); const w = ['日','一','二','三','四','五','六'][sd.getDay()]; return `${sd.getFullYear()}/${String(sd.getMonth()+1).padStart(2,'0')}/${String(sd.getDate()).padStart(2,'0')}（${w}）`; })() : null;
                    return (
                      <div key={i} className="grid grid-cols-[84px_1.4fr_1fr_1fr] items-stretch border-b border-gray-200">
                        <div className="flex items-center justify-center gap-2 border-r border-gray-200 px-3 py-3">
                          <svg className={`h-3.5 w-3.5 shrink-0 ${iconColor} ${isLast ? "rotate-180" : ""}`} fill="currentColor" viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" /></svg>
                          <span className={`text-sm font-bold ${isFirst ? "text-sky-600" : isLast ? "text-amber-600" : "text-violet-600"}`}>{segmentLabel}</span>
                        </div>
                        <div className="flex flex-col items-center justify-center border-r border-gray-200 px-3 py-3 text-center leading-tight">
                          {segDate && <div className="text-xs text-gray-500">{segDate}</div>}
                          <div className="text-base font-bold text-gray-900">{seg.airline}{seg.flight_number && <span className="ml-1.5 text-gray-600">{seg.flight_number}</span>}</div>
                        </div>
                        <div className="flex flex-col justify-center border-r border-gray-200 px-3 py-3">
                          <div className="flex items-baseline gap-2">
                            {seg.dep_time && <span className="text-base font-bold text-gray-900">{seg.dep_time}</span>}
                            {seg.dep_airport && <span className="text-xs text-gray-600">{seg.dep_airport}</span>}
                          </div>
                        </div>
                        <div className="flex flex-col justify-center px-3 py-3">
                          <div className="flex items-baseline gap-2">
                            {seg.arr_time && <span className="text-base font-bold text-gray-900">{seg.arr_time}</span>}
                            {seg.arr_airport && <span className="text-xs text-gray-600">{seg.arr_airport}</span>}
                            {seg.next_day && <span className="ml-1 text-[10px] text-amber-600">+1</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* 手機版航班（仿易飛網） */}
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white sm:hidden">
                  <div className="border-b border-gray-200 py-2.5 text-center text-sm font-bold text-gray-900">
                    參考航班
                  </div>
                  {flightSource.flight_segments.map((seg, i) => {
                    const total = flightSource.flight_segments!.length;
                    const isFirst = i === 0;
                    const isLast = i === total - 1 && total > 1;
                    const segmentLabel = isFirst ? "去程" : isLast ? "回程" : "轉機";
                    const labelColor = isFirst ? "text-sky-600" : isLast ? "text-amber-600" : "text-violet-600";
                    const segDate = seg.date ? (() => { const sd = new Date(seg.date + 'T00:00:00'); const w = ['日','一','二','三','四','五','六'][sd.getDay()]; return `${sd.getFullYear()}/${String(sd.getMonth()+1).padStart(2,'0')}/${String(sd.getDate()).padStart(2,'0')}（${w}）`; })() : null;
                    return (
                      <div key={`m-${i}`} className={`px-4 py-3 ${i < total - 1 ? 'border-b border-gray-200' : ''}`}>
                        <div className="flex items-center gap-2 text-xs text-gray-700">
                          <span className={`font-bold ${labelColor}`}>{segmentLabel}</span>
                          <span className="text-gray-300">|</span>
                          {segDate && <span>{segDate}</span>}
                          <span className="ml-1">{seg.airline}{seg.flight_number && ` ${seg.flight_number}`}</span>
                        </div>
                        <div className="mt-2.5 grid grid-cols-[1fr_auto_1fr] items-start">
                          <div>
                            <div className="text-xl font-bold text-gray-900">{seg.dep_time || '—'}</div>
                            <div className="mt-0.5 text-xs text-gray-500">{seg.dep_airport || ''}</div>
                          </div>
                          <div className="flex items-center justify-center px-1 pt-2">
                            {isLast ? (
                              <div className="flex w-24 items-center">
                                <svg className="h-5 w-5 -ml-1 shrink-0 -rotate-90 text-sky-400" fill="currentColor" viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" /></svg>
                                <div className="h-px flex-1 border-t-2 border-dashed border-sky-400" />
                                <svg className="h-3 w-3 -mr-0.5 shrink-0 text-sky-400" fill="currentColor" viewBox="0 0 24 24"><path d="M10 17l5-5-5-5v10z" /></svg>
                              </div>
                            ) : (
                              <div className="flex w-24 items-center">
                                <svg className="h-3 w-3 -ml-0.5 shrink-0 text-sky-400" fill="currentColor" viewBox="0 0 24 24"><path d="M14 7l-5 5 5 5V7z" /></svg>
                                <div className="h-px flex-1 border-t-2 border-dashed border-sky-400" />
                                <svg className="h-5 w-5 -mr-1 shrink-0 rotate-90 text-sky-400" fill="currentColor" viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" /></svg>
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-gray-900">
                              {seg.arr_time || '—'}
                              {seg.next_day && <span className="ml-1 text-sm font-medium text-amber-600">(跨日)</span>}
                            </div>
                            <div className="mt-0.5 text-xs text-gray-500">{seg.arr_airport || ''}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="border-t border-gray-100 px-4 py-2">
                    <p className="text-center text-[10px] text-amber-600">*航班時間僅供參考，最終確定的航班，以說明會資料為準！</p>
                  </div>
                </div>
              </>
            ) : (
              /* 舊格式：去程 / 回程 */
              <div className="overflow-hidden rounded-lg border border-gray-200">
                {(flightSource.outbound_flight || flightSource.outbound_time) && (
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-gray-100 px-4 py-3">
                    <span className="text-xs font-bold text-sky-600">去程</span>
                    <span className="text-xs text-gray-700">{formatFullDate(flightSource.departure_date)}</span>
                    <span className="text-xs text-gray-700">{flightSource.airline} {flightSource.outbound_flight}</span>
                    <span className="text-xs"><span className="font-semibold text-gray-900">{flightSource.outbound_time}</span> {flightSource.outbound_from}</span>
                    <span className="text-xs">→ <span className="font-semibold text-gray-900">{flightSource.outbound_arrival_time}</span> {flightSource.outbound_to}{flightSource.outbound_next_day && <span className="ml-1 text-amber-600">+1</span>}</span>
                  </div>
                )}
                {(flightSource.return_flight || flightSource.return_time) && (
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-3">
                    <span className="text-xs font-bold text-amber-600">回程</span>
                    <span className="text-xs text-gray-700">{flightSource.return_date ? formatFullDate(flightSource.return_date) : '—'}</span>
                    <span className="text-xs text-gray-700">{flightSource.airline} {flightSource.return_flight}</span>
                    <span className="text-xs"><span className="font-semibold text-gray-900">{flightSource.return_time}</span> {flightSource.return_from}</span>
                    <span className="text-xs">→ <span className="font-semibold text-gray-900">{flightSource.return_arrival_time}</span> {flightSource.return_to}{flightSource.return_next_day && <span className="ml-1 text-amber-600">+1</span>}</span>
                  </div>
                )}
              </div>
            )}
            </div>
          </section>
        )}

        {/* DepartureDates 已移至航班資訊上方，所有用戶可見 */}
      </div>

      {/* 開發者模式：PDF / 刪除行程 按鈕列 */}
      {isDevMode && (
        <div className="mx-auto max-w-[1000px] px-3 pb-2 sm:px-4 md:px-8">
          <div className="flex flex-col items-center gap-2">
            <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              disabled={uploadingDoc}
              onClick={() => docInputRef.current?.click()}
              className="rounded-full bg-emerald-600/90 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
            >
              {uploadingDoc ? "上傳中..." : trip.document_url ? "更換 PDF 行程檔" : "上傳 PDF 行程檔"}
            </button>
            <input
              ref={docInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                if (file.name.split('.').pop()?.toLowerCase() !== 'pdf') {
                  alert("僅支援 PDF 檔案格式");
                  return;
                }
                if (file.size > 50 * 1024 * 1024) {
                  alert("檔案不能超過 50MB");
                  return;
                }
                setUploadingDoc(true);
                try {
                  const result = await uploadTripDocument(tripId, file);
                  setTrip((prev) => prev ? { ...prev, document_url: result.url, document_is_available: result.document_is_available } : prev);
                  showSaveSuccess("PDF 行程檔已上傳！");
                } catch (err) {
                  alert(err instanceof Error ? err.message : "上傳失敗，請再試");
                } finally {
                  setUploadingDoc(false);
                }
              }}
            />
            {trip.document_url && (
              <button
                type="button"
                onClick={async () => {
                  if (!confirm("確定要刪除此 PDF 行程檔嗎？")) return;
                  try {
                    await deleteTripDocument(tripId);
                    setTrip((prev) => prev ? { ...prev, document_url: undefined, document_is_available: false } : prev);
                    showSaveSuccess("PDF 已刪除");
                  } catch (err) {
                    alert(err instanceof Error ? err.message : "刪除失敗");
                  }
                }}
                className="rounded-full border border-red-500/40 bg-red-600/20 px-3 py-1 text-xs font-semibold text-red-400 transition hover:bg-red-600/30"
              >
                刪除 PDF
              </button>
            )}
            <button
              onClick={async () => {
                if (!confirm(`確定要刪除「${trip.title}」嗎？此操作無法復原。`)) return;
                const res = await fetch(`/api/trips/${tripId}`, { method: 'DELETE' });
                if (res.ok) window.location.href = from || '/';
                else alert('刪除失敗，請再試一次');
              }}
              className="rounded-full bg-red-600/80 px-3 py-1 text-xs font-semibold text-white transition hover:bg-red-600"
            >
              刪除行程
            </button>
            </div>
            <p className="text-[10px] text-gray-400">刪除行程 = 永久刪除整個行程及所有資料，無法復原</p>
          </div>
        </div>
      )}

      {/* 每日行程（全寬顯示） */}
      {days.length > 0 && (
        <div className="w-full px-3 sm:px-4 md:px-8">
          <div className="mx-auto mb-6 w-full max-w-none pb-4">
            <h2 className="mb-4 text-xl font-bold text-gray-900 md:text-2xl">每日行程</h2>
            <div className="space-y-3 pb-2">
              {days.map((day) => (
                <DayItinerary
                  key={day.id}
                  dayNumber={day.day_number}
                  title={day.title}
                  description={day.description}
                  meals={day.meals}
                  accommodation={day.accommodation}
                  activities={day.activities || []}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 沒有 trip_days 也沒有 document_url */}
      {days.length === 0 && !trip.document_url && (
        <div className="mx-auto max-w-[1000px] px-3 pb-8 sm:px-4 md:px-8">
          <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-5 text-center shadow-sm sm:p-6">
            <h2 className="mb-2 text-xl font-bold text-gray-900 md:text-2xl">每日行程尚未建立</h2>
            <p className="text-sm leading-6 text-gray-600 md:text-base">
              目前這個行程尚未建立詳細內容，請透過 LINE 聯繫蓋瑞取得完整行程資料。
            </p>
          </div>
        </div>
      )}

      {/* PDF 全版面嵌入（canvas 渲染，防止直接下載） */}
      {days.length === 0 && trip.document_url && (
        <div id="trip-document" className="mx-auto w-full max-w-[800px] px-3 sm:px-4">
          <PdfViewer url={trip.document_url} title={`${trip.title} 行程表`} isDevMode={isDevMode} />
        </div>
      )}

      {/* 按鈕區 */}
      <div className="mx-auto max-w-[1000px] px-3 py-6 sm:px-4 md:px-8">

        {/* 懶載入偵測哨兵 */}
        <div ref={recommendRef} />

        {/* 更多推薦行程 */}
        {recommendedTrips.length > 0 && (
          <section className="mt-8">
            <div className="mb-3 flex items-center gap-2 sm:mb-4">
              <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-400 to-orange-500 px-3 py-1 text-sm font-bold text-white shadow-sm">
                <span>👍</span>
                <span>推薦</span>
              </div>
              <h2 className="text-base font-bold text-gray-900 sm:text-lg">更多推薦行程</h2>
            </div>
            <div className="flex flex-col gap-3">
              {recommendedTrips.map((rt) => (
                <div key={rt.id} className="relative">
                  <div className="absolute -top-1.5 left-2 z-10 flex items-center gap-1 rounded-md bg-gradient-to-r from-orange-400 to-orange-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-md sm:text-xs">
                    <span>👍</span>
                    <span>推薦</span>
                  </div>
                  <TripCard
                    id={rt.id}
                    title={rt.title}
                    duration={rt.duration}
                    price_range={rt.price_range}
                    cover_image_url={rt.cover_image_url}
                    document_url={rt.document_url}
                    document_is_available={rt.document_is_available}
                    departure_dates={rt.departure_dates}
                    isDevMode={false}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {recommendedLoading && (
          <div className="mt-10 flex items-center justify-center py-6">
            <div className="inline-block h-5 w-5 animate-spin rounded-full border-4 border-solid border-sky-400 border-r-transparent" />
            <span className="ml-2 text-sm text-gray-500">載入推薦行程...</span>
          </div>
        )}

        {/* 分享 & 下載 */}
        <div className="mt-8 flex flex-row gap-2 sm:gap-3">
          <button
            onClick={() => setShowShareGate(true)}
            className="flex flex-1 items-center justify-center gap-2 rounded-full border border-sky-300 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-700 transition hover:bg-sky-100 active:scale-[0.98] md:py-3"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            分享給好友
          </button>

          {trip.document_url && (
            <button
              onClick={() => setShowDownloadGate(true)}
              className="flex flex-1 items-center justify-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 active:scale-[0.98] md:py-3"
            >
              <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              下載行程檔
            </button>
          )}
        </div>

        {/* 索取行程 / 詢問報價 CTA */}
        <div className="mb-8 mt-6">
          <InquiryButtons tripTitle={trip.title} tripId={tripId} variant="inline" selectedDate={selectedDeparture?.departure_date} />
        </div>

        <SocialCta className="mt-10" title="喜歡這個行程嗎？" description="聯繫旅遊規劃師蓋瑞 GARY，為您量身打造專屬行程" />

      </div>

      {/* 下載門檻彈窗 */}
      {showDownloadGate && createPortal(
        <div
          className="fixed inset-0 z-modal-top flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) { setShowDownloadGate(false); setDownloadReady(false); }
          }}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 sm:text-lg">下載行程檔</h3>
              <button
                onClick={() => { setShowDownloadGate(false); setDownloadReady(false); }}
                className="text-gray-400 transition hover:text-gray-700"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {!downloadReady ? (
              <>
                <p className="mb-2 text-sm text-gray-700">
                  想下載「{trip.title}」的行程檔嗎？
                </p>
                <p className="mb-4 text-xs leading-5 text-gray-500">
                  請先加入我們任一社群帳號，追蹤後切回瀏覽器即可下載！
                </p>

                <div className="space-y-2">
                  <a
                    href={lineHref}
                    onClick={(e) => {
                      e.preventDefault();
                      track({ event_type: "trip_download", platform: "LINE", trip_id: tripId, trip_title: trip.title });
                      setDownloadReady(true);
                      openExternalLink(lineHref);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl bg-[#06C755] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#05b64d] active:scale-[0.98]"
                  >
                    <svg className="h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" /></svg>
                    <span className="flex-1 text-left">加入 LINE 好友</span>
                    <svg className="h-4 w-4 shrink-0 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>

                  <a
                    href={fbHref}
                    onClick={(e) => {
                      e.preventDefault();
                      track({ event_type: "trip_download", platform: "FB", trip_id: tripId, trip_title: trip.title });
                      setDownloadReady(true);
                      openExternalLink(fbHref);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl bg-[#1877F2] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1565d8] active:scale-[0.98]"
                  >
                    <svg className="h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                    <span className="flex-1 text-left">追蹤 FB 粉專</span>
                    <svg className="h-4 w-4 shrink-0 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>

                  <a
                    href={igHref}
                    onClick={(e) => {
                      e.preventDefault();
                      track({ event_type: "trip_download", platform: "IG", trip_id: tripId, trip_title: trip.title });
                      setDownloadReady(true);
                      openExternalLink(igHref);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl bg-[#E4405F] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#d62d4a] active:scale-[0.98]"
                  >
                    <svg className="h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                    <span className="flex-1 text-left">追蹤 IG</span>
                    <svg className="h-4 w-4 shrink-0 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>
                </div>

                <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-center">
                  <p className="text-sm font-bold text-amber-700">
                    追蹤完成後，請{getBackHint()}
                  </p>
                  <p className="mt-1 text-xs text-amber-600">
                    回到網站即可下載行程檔
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
                  <svg className="mx-auto mb-2 h-10 w-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-base font-bold text-emerald-600">感謝追蹤！</p>
                  <p className="mt-1 text-sm text-gray-600">點擊下方按鈕下載行程檔</p>
                </div>

                <a
                  href={`/api/download-trip-pdf?url=${encodeURIComponent(trip.document_url || "")}&name=${encodeURIComponent(trip.title)}`}
                  onClick={() => { setShowDownloadGate(false); setDownloadReady(false); }}
                  className="flex w-full flex-col items-center gap-1 rounded-xl bg-sky-600 px-4 py-4 text-white shadow-lg transition hover:bg-sky-500 active:scale-[0.98]"
                >
                  <div className="flex items-center gap-2 text-base font-bold">
                    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    點此下載行程檔
                  </div>
                  <div className="text-center text-xs font-medium text-sky-100 opacity-90">
                    「{trip.title}」
                  </div>
                </a>
              </>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* 分享門檻彈窗 */}
      {showShareGate && createPortal(
        <div
          className="fixed inset-0 z-modal-top flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowShareGate(false);
          }}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 sm:text-lg">分享行程給好友</h3>
              <button
                onClick={() => setShowShareGate(false)}
                className="text-gray-400 transition hover:text-gray-700"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="mb-2 text-sm text-gray-700">
              想分享「{trip.title}」給好友嗎？
            </p>
            <p className="mb-4 text-xs leading-5 text-gray-500">
              請先加入我們的 LINE、Facebook 或 Instagram 任一帳號，即可分享行程給好友！
            </p>

            <div className="space-y-2">
              <button
                onClick={() => { track({ event_type: "trip_share", platform: "LINE", trip_id: tripId, trip_title: trip.title }); handleFollowAndShare(lineHref); }}
                className="flex w-full items-center gap-3 rounded-xl bg-[#06C755] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#05b64d] active:scale-[0.98]"
              >
                <svg className="h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" /></svg>
                <span className="flex-1 text-left">加入 LINE 好友並分享</span>
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
              </button>

              <button
                onClick={() => { track({ event_type: "trip_share", platform: "FB", trip_id: tripId, trip_title: trip.title }); handleFollowAndShare(fbHref); }}
                className="flex w-full items-center gap-3 rounded-xl bg-[#1877F2] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1565d8] active:scale-[0.98]"
              >
                <svg className="h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                <span className="flex-1 text-left">追蹤 FB 粉專並分享</span>
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
              </button>

              <button
                onClick={() => { track({ event_type: "trip_share", platform: "IG", trip_id: tripId, trip_title: trip.title }); handleFollowAndShare(igHref); }}
                className="flex w-full items-center gap-3 rounded-xl bg-[#E4405F] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#d62d4a] active:scale-[0.98]"
              >
                <svg className="h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                <span className="flex-1 text-left">追蹤 IG 並分享</span>
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
              </button>
            </div>

            <p className="mt-3 text-center text-[10px] text-gray-400 sm:text-[11px]">
              加入後將開啟分享選單，可選擇 LINE、FB、IG 等好友分享
            </p>
          </div>
        </div>,
        document.body
      )}

      {/* 售價說明彈窗（用戶端） */}
      {showPriceInfoModal && createPortal(
        <div
          className="fixed inset-0 z-modal-top flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowPriceInfoModal(false); }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold text-sky-600">$</span>
                <h3 className="text-base font-bold text-gray-900">售價說明</h3>
              </div>
              <button onClick={() => setShowPriceInfoModal(false)} className="text-gray-400 transition hover:text-gray-700">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* 價格表 */}
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="whitespace-nowrap px-2 py-2 font-medium text-gray-600">大人</th>
                    <th className="whitespace-nowrap px-2 py-2 font-medium text-gray-600">小孩佔床</th>
                    <th className="whitespace-nowrap px-2 py-2 font-medium text-gray-600">小孩不佔床</th>
                    <th className="whitespace-nowrap px-2 py-2 font-medium text-gray-600">加床</th>
                    <th className="whitespace-nowrap px-2 py-2 font-medium text-gray-600">嬰兒</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="whitespace-nowrap px-2 py-2 font-bold text-sky-600">{displayAdultUnit(priceDetailPreview.adultPrice)}</td>
                    <td className="whitespace-nowrap px-2 py-2 font-bold text-gray-900">{displayChildPrice(priceDetailPreview.childWithBedPrice)}</td>
                    <td className="whitespace-nowrap px-2 py-2 font-bold text-sky-600">{displayChildPrice(priceDetailPreview.childNoBedPrice)}</td>
                    <td className="whitespace-nowrap px-2 py-2 font-bold text-gray-900">{displayChildPrice(priceDetailPreview.childExtraBedPrice)}</td>
                    <td className="whitespace-nowrap px-2 py-2 font-bold text-sky-600">{displayInfantUnit(priceDetailPreview.infantPrice)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-3 space-y-2 text-sm">
              <div className="flex gap-2">
                <span className="shrink-0 font-medium text-sky-600">○ 包含項目</span>
                <span className="text-gray-600">{[displaySurchargeText(priceDetailPreview.surcharge) !== '售價已內含' ? displaySurchargeText(priceDetailPreview.surcharge) : '含機場稅燃油附加費', displayVisaFeeText(priceDetailPreview.visaFee)].filter(Boolean).join('，')}</span>
              </div>
              <div className="flex gap-2">
                <span className="shrink-0 font-medium text-red-400">× 不包含項目</span>
                <span className="text-gray-600">{priceDetailPreview.quoteNote && priceDetailPreview.quoteNote !== '《無特殊說明》' ? priceDetailPreview.quoteNote : '不含導遊領隊小費'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500">單人房差</span>
                <span className="font-semibold text-sky-600">{formatSingleRoomText(priceDetailPreview.singleRoom)}</span>
              </div>
            </div>

            <button
              onClick={() => setShowPriceInfoModal(false)}
              className="mt-5 w-full rounded-full bg-sky-600 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500"
            >
              關閉
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* 手機版出發日期選擇 Modal（仿易飛網全螢幕樣式） */}
      {showMobileDatePicker && createPortal(
        <div className="fixed inset-0 z-modal-top flex flex-col bg-white">
          {/* Header */}
          <div className="flex items-center border-b border-gray-200 bg-[#0077b6] px-4 py-3">
            <button
              type="button"
              onClick={() => setShowMobileDatePicker(false)}
              className="mr-3 text-white"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h3 className="flex-1 text-center text-base font-bold text-white">出發日期</h3>
            <div className="w-8" />
          </div>

          {/* 排序提示 */}
          <div className="flex items-center justify-end border-b border-gray-100 px-4 py-2">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <span className="font-medium text-gray-700">排序</span>
              <span className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px]">日期近到遠</span>
            </div>
          </div>

          {/* 表頭 */}
          <div className="grid grid-cols-[1fr_44px_44px_44px_76px] items-center border-b border-gray-200 bg-gray-50 px-4 py-2 text-[11px] font-semibold text-gray-500">
            <span>出發日</span>
            <span className="text-center">團位</span>
            <span className="text-center">可售</span>
            <span className="text-center">狀態</span>
            <span className="text-right">價格</span>
          </div>

          {/* 日期列表 */}
          <div className="flex-1 overflow-y-auto">
            {departureDates.map((d) => {
              const isSelected = selectedDepartureId === d.id;
              const soldOut = d.seats_available === 0 && d.seats_total > 0;
              const dt = new Date(d.departure_date + 'T00:00:00');
              const shortDate = `${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getDate()).padStart(2, '0')}`;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    setSelectedDepartureId(d.id);
                    setShowMobileDatePicker(false);
                  }}
                  className={`grid w-full grid-cols-[1fr_44px_44px_44px_76px] items-center border-b border-gray-100 px-4 py-3.5 text-left transition ${
                    isSelected ? "bg-sky-50 border-l-[3px] border-l-sky-500" : "border-l-[3px] border-l-transparent"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm font-medium ${isSelected ? 'text-sky-600' : 'text-gray-900'}`}>{shortDate}</span>
                    {d.label === '保證出團' && <span className="rounded bg-red-100 px-1 py-0.5 text-[9px] font-bold text-red-600">保證出團</span>}
                    {d.label === '即將成團' && <span className="rounded bg-amber-100 px-1 py-0.5 text-[9px] font-bold text-amber-600">即將成團</span>}
                  </div>
                  <span className="text-center text-sm text-gray-700">{d.seats_total || '—'}</span>
                  <span className="text-center text-sm text-gray-700">{d.seats_available ?? '—'}</span>
                  <span className="text-center">
                    {soldOut
                      ? <span className="text-[11px] text-gray-400">已售罄</span>
                      : <span className="text-[11px] font-semibold text-sky-600">報名</span>
                    }
                  </span>
                  <span className="text-right text-sm font-bold text-[#0077b6]">
                    {d.price ? `NT$${d.price.toLocaleString()}` : '洽詢'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}

      {saveSuccessMessage && (
        <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center px-4">
          <div className="rounded-2xl border border-emerald-300 bg-white px-5 py-4 text-center shadow-2xl sm:px-6">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-base font-bold text-emerald-600">{saveSuccessMessage}</p>
          </div>
        </div>
      )}
    </main>
  );
}
