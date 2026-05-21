"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createPortal } from "react-dom";
import { getTripWithDays, getSiteLogo, uploadTripBannerImage, uploadTripDocument, deleteTripDocument, type Trip, type TripBanner, type DepartureDate, type DepartureBannerInfo, lineHref, lineMessageHref, fbHref, igHref } from "@/lib/supabase";
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
  const [showBannerEditor, setShowBannerEditor] = useState(false);
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [editDaySections, setEditDaySections] = useState<{ num: number; text: string }[]>([]);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [isCreatingNewDeparture, setIsCreatingNewDeparture] = useState(false);

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
      if (current && departureDates.some((date) => date.id === current)) {
        return current;
      }

      return departureDates[0].id;
    });
  }, [departureDates]);

  useEffect(() => {
    if (!selectedDeparture) {
      setDepartureEditorDate('');
      setDepartureEditorPrice('');
      setDepartureEditorGroupCode('');
      setDepartureEditorWaitlist('');
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
    if (!departureEditorDate) {
      alert('請先填寫出團日期');
      return false;
    }

    setSaving(true);

    const departureCreatePayload = {
      departure_date: departureEditorDate,
      price: parseDeparturePrice(departureEditorPrice),
      seats_total: editTripBanner.seats_total,
      seats_available: editTripBanner.seats_available,
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
        <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-4">
          <div className="min-w-0 lg:col-span-1">
            <div ref={titleRef}>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-[1.75rem] md:text-[2rem]">{trip.title}</h1>
            {trip.subtitle && (
              <p className="mt-0.5 text-sm text-gray-600 sm:mt-1 sm:text-[15px] md:text-base">{trip.subtitle}</p>
            )}
            {isDevMode && (
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={openTripInfoEditor}
                  className="rounded-full bg-sky-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-sky-500"
                >
                  編輯資訊
                </button>
                {/* PDF 上傳按鈕 */}
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
                      alert("PDF 行程檔已上傳成功！");
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
                        alert("PDF 已刪除");
                      } catch (err) {
                        alert(err instanceof Error ? err.message : "刪除失敗");
                      }
                    }}
                    className="rounded-full border border-red-500/40 bg-red-600/20 px-3 py-1 text-xs font-semibold text-red-300 transition hover:bg-red-600/30"
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
            )}

            </div>
            <div className="mt-4 hidden lg:block">
              <SideMediaCarousel
                tripId={tripId}
                fallbackImageUrl={editTripBanner.side_image_url || ""}
                tripTitle={trip.title}
                isDevMode={isDevMode}
                videoMatchHeight={videoMatchHeight}
              />
            </div>
          </div>
          <div ref={rightColumnRef} className="mt-4 lg:mt-0 lg:col-span-1">
            <div className="relative rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500">出團資訊</h3>
                  <p className="mt-0.5 text-[11px] text-gray-900">團號：{departureEditorGroupCode || selectedDepartureInfo.group_code || (selectedDeparture ? '未設定' : '—')}</p>
                </div>
                {isDevMode && (
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setShowBannerEditor(true);
                        setIsCreatingNewDeparture(true);
                        setDepartureEditorDate('');
                        setDepartureEditorGroupCode('');
                        setDepartureEditorPrice('');
                        setDepartureEditorWaitlist('');
                      }}
                      className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-600 transition hover:bg-emerald-100"
                    >
                      新增
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (showBannerEditor) setIsCreatingNewDeparture(false);
                        setShowBannerEditor((v) => !v);
                      }}
                      className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                        showBannerEditor
                          ? "bg-sky-100 text-sky-600 hover:bg-sky-200"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                      }`}
                    >
                      {showBannerEditor ? "關閉編輯" : "編輯"}
                    </button>
                  </div>
                )}
              </div>

                <div className="space-y-3">
                  {editTripBanner.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {editTripBanner.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex w-fit rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-center text-[11px] font-medium text-emerald-600"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-gray-800 sm:text-sm">
                    {renderBannerItems(
                        [
                          selectedDeparture ? formatFullDate(selectedDeparture.departure_date) : '',
                          renderDaysNights(previewDayText, previewNightText),
                        ].filter(Boolean),
                      'font-medium'
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-gray-800 sm:text-sm">
                    {renderBannerItems(
                      [
                        (selectedDeparture?.seats_total ?? editTripBanner.seats_total ?? 0) > 0 ? `團位 ${selectedDeparture?.seats_total ?? editTripBanner.seats_total}` : '',
                        (selectedDeparture?.seats_available ?? editTripBanner.seats_available ?? 0) > 0 ? `可售 ${selectedDeparture?.seats_available ?? editTripBanner.seats_available}` : '',
                        selectedDeparture ? `候補 ${selectedDepartureInfo.waitlist_count ?? 0}` : '',
                        editTripBanner.deposit_label
                          ? `訂金 ${Number(String(editTripBanner.deposit_label).replace(/\D/g, '')).toLocaleString('zh-TW')}/人`
                          : '',
                      ].filter(Boolean),
                      'font-medium'
                    )}
                  </div>

                  <div className="border-t border-gray-200 pt-2 text-left">
                    <p className="text-[11px] font-semibold tracking-[0.2em] text-amber-600">團費價格</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="text-base font-bold text-amber-600">
                        {selectedDeparture
                          ? formatDisplayPrice(departureEditorPrice ? Number(departureEditorPrice) : selectedDeparture.price)
                          : (trip.price_range || '尚未設定')}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowPriceDetailModal(true)}
                        className="inline-flex min-h-9 items-center px-1 text-sm font-medium text-sky-600 underline underline-offset-4 transition hover:text-sky-500"
                      >
                        看詳細內容
                      </button>
                    </div>
                  </div>

                  {isDevMode && showBannerEditor && (
                    <div className={`space-y-3 rounded-[1.25rem] border p-4 ${isCreatingNewDeparture ? 'border-emerald-200 bg-emerald-50' : 'border-sky-200 bg-sky-50'}`}>
                      <div>
                        <p className={`text-[10px] font-semibold tracking-[0.2em] ${isCreatingNewDeparture ? 'text-emerald-600' : 'text-sky-600'}`}>
                          {isCreatingNewDeparture ? '新增梯次' : '目前編輯梯次'}
                        </p>
                        <p className="mt-1 text-xs text-gray-600">
                          {isCreatingNewDeparture
                            ? '填入新梯次日期與資訊，按「建立新梯次」儲存'
                            : `點下方出團日期卡片可切換這裡的內容${!selectedDeparture ? '（尚未選擇梯次，先新增或點選梯次）' : ''}`}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
                          <div className="text-xs font-semibold text-gray-600">團號</div>
                          <input
                            value={departureEditorGroupCode}
                            onChange={(e) => setDepartureEditorGroupCode(e.target.value)}
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-sky-400"
                          />
                        </div>
                        <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
                          <div className="text-xs font-semibold text-gray-600">日期</div>
                          <input
                            type="date"
                            value={departureEditorDate}
                            onChange={(e) => setDepartureEditorDate(e.target.value)}
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-sky-400 [color-scheme:light]"
                          />
                        </div>
                        <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
                          <div className="text-xs font-semibold text-gray-600">團費</div>
                          <input
                            value={departureEditorPrice}
                            onChange={(e) => setDepartureEditorPrice(e.target.value.replace(/\D/g, ''))}
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-sky-400"
                          />
                        </div>
                        <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
                          <div className="text-xs font-semibold text-gray-600">明細</div>
                          <button
                            type="button"
                            onClick={() => setShowPriceDetailModal(true)}
                            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-left text-xs text-gray-600 transition hover:border-sky-400 hover:text-gray-900"
                          >
                            編輯售價明細
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
                          <div className="text-xs font-semibold text-gray-600">天數</div>
                          <input
                            value={editDayCount}
                            onChange={e => setEditDayCount(e.target.value.replace(/\D/g, '').slice(0, 2))}
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-sky-400"
                          />
                        </div>
                        <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
                          <div className="text-xs font-semibold text-gray-600">夜數</div>
                          <input
                            id="night-count-input"
                            value={editNightCount}
                            onChange={e => setEditNightCount(e.target.value.replace(/\D/g, '').slice(0, 2))}
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-sky-400"
                          />
                        </div>
                        <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
                          <div className="text-xs font-semibold text-gray-600">團位</div>
                          <input
                            type="number"
                            value={editTripBanner.seats_total ?? ''}
                            onChange={e => setEditTripBanner(prev => ({ ...prev, seats_total: e.target.value ? Number(e.target.value) : null }))}
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-sky-400"
                          />
                        </div>
                        <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
                          <div className="text-xs font-semibold text-gray-600">可售</div>
                          <input
                            type="number"
                            value={editTripBanner.seats_available ?? ''}
                            onChange={e => setEditTripBanner(prev => ({ ...prev, seats_available: e.target.value ? Number(e.target.value) : null }))}
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-sky-400"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
                          <div className="text-xs font-semibold text-gray-600">候補</div>
                          <input
                            type="number"
                            min="0"
                            value={departureEditorWaitlist}
                            onChange={(e) => setDepartureEditorWaitlist(e.target.value.replace(/\D/g, ''))}
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-sky-400"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
                          <div className="text-xs font-semibold text-gray-600">訂金</div>
                          <input
                            value={editTripBanner.deposit_label}
                            onChange={e => setEditTripBanner(prev => ({ ...prev, deposit_label: e.target.value.replace(/\D/g, '') }))}
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-sky-400"
                          />
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
                          <input
                            value={editBannerTagInput}
                            onChange={e => setEditBannerTagInput(e.target.value)}
                            placeholder="輸入標籤..."
                            className="min-w-[80px] flex-1 bg-transparent px-1 py-0.5 text-sm text-gray-900 outline-none"
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const val = editBannerTagInput.trim();
                                if (!val) return;
                                setEditTripBanner(prev => ({ ...prev, tags: [...prev.tags, val] }));
                                setEditBannerTagInput('');
                              }
                            }}
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={isCreatingNewDeparture ? saveDepartureInfoAsFirstDeparture : (selectedDeparture ? saveSelectedDepartureInfo : saveDepartureInfoAsFirstDeparture)}
                          disabled={saving}
                          className="rounded-full bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-500 disabled:opacity-60"
                        >
                          {saving ? '儲存中...' : isCreatingNewDeparture ? '建立新梯次' : selectedDeparture ? '儲存目前梯次' : '建立首梯並儲存'}
                        </button>
                        {selectedDeparture && !isCreatingNewDeparture && (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => {
                              setIsCreatingNewDeparture(true);
                              setDepartureEditorDate('');
                              setDepartureEditorGroupCode('');
                              setDepartureEditorPrice('');
                              setDepartureEditorWaitlist('');
                            }}
                            className="rounded-full border border-sky-200 bg-sky-50 px-4 py-1.5 text-xs font-semibold text-sky-600 transition hover:bg-sky-100 disabled:opacity-60"
                          >
                            + 新增梯次
                          </button>
                        )}
                        {isCreatingNewDeparture && (
                          <button
                            type="button"
                            onClick={() => setIsCreatingNewDeparture(false)}
                            className="rounded-full border border-gray-200 bg-gray-50 px-4 py-1.5 text-xs font-semibold text-gray-500 transition hover:bg-gray-100"
                          >
                            取消新增
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditTripBanner(EMPTY_TRIP_BANNER);
                            setEditDayCount('');
                            setEditNightCount('');
                            setDepartureEditorGroupCode('');
                            setDepartureEditorWaitlist('');
                            setDepartureEditorPrice('');
                            setDetailTitle('');
                            setDetailSubtitle('');
                            setDetailAdultPrice('');
                            setDetailChildWithBedPrice('');
                            setDetailChildNoBedPrice('');
                            setDetailChildExtraBedPrice('');
                            setDetailInfantPrice('');
                            setDetailPricingNote('');
                            setDetailDeposit('');
                            setDetailSingleRoom('');
                            setDetailVisaFee('');
                            setDetailSurcharge('');
                            setDetailGroupNote('');
                            setDetailQuoteNote('');
                            setDetailVisaNote('');
                          }}
                          className="rounded-full border border-red-200 bg-red-50 px-4 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                        >
                          清空目前內容
                        </button>
                      </div>
                    </div>
                  )}
                </div>
            </div>

            {(
              <div className="mt-2 min-h-[240px] rounded-xl border border-gray-200 bg-white p-2.5 shadow-sm">
                <div className="mb-1.5 flex items-start justify-between gap-3">
                  <h3 className="text-sm font-bold text-sky-600">行程概要</h3>
                  {isDevMode && (
                    <button
                      onClick={() => {
                        const fullText = trip.document_text || '';
                        const dayPattern = /第\s*(\d+)\s*天/g;
                        const positions: { num: number; index: number }[] = [];
                        let m;
                        while ((m = dayPattern.exec(fullText)) !== null) {
                          const dayNum = parseInt(m[1]);
                          if (!positions.find(p => p.num === dayNum)) positions.push({ num: dayNum, index: m.index });
                        }
                        if (positions.length > 0) {
                          const sections = positions.map((pos, i) => {
                            const end = i + 1 < positions.length ? positions[i + 1].index : fullText.length;
                            return { num: pos.num, text: fullText.slice(pos.index, end).trim() };
                          });
                          setEditDaySections(sections);
                        } else {
                          const durationMatch = trip.duration?.match(/(\d+)/);
                          const dayCount = durationMatch ? parseInt(durationMatch[1]) : 5;
                          setEditDaySections(Array.from({ length: dayCount }, (_, i) => ({ num: i + 1, text: '' })));
                        }
                        setShowTextEditor(true);
                      }}
                      className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-semibold text-white transition hover:bg-emerald-500"
                    >
                      編輯行程概要
                    </button>
                  )}
                </div>
                {!trip.document_text && (() => {
                  const durationMatch = trip.duration?.match(/(\d+)/);
                  const dayCount = durationMatch ? Math.min(parseInt(durationMatch[1], 10), 15) : 5;

                  return (
                    <div className="space-y-1">
                      <p className="py-1.5 text-center text-[11px] text-gray-400">尚未填寫行程概要，先顯示預設天數</p>
                      {Array.from({ length: dayCount }, (_, i) => (
                        <div key={`placeholder-day-${i + 1}`} className="flex items-start gap-2 rounded-xl bg-gray-50 px-2.5 py-1">
                          <span className="shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-600">第{i + 1}天</span>
                          <span className="text-[13.5px] leading-[1.35] text-gray-500">行程內容待更新</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                {trip.document_text && (() => {
                  const fullText = trip.document_text!;
                  const dayPattern = /第\s*(\d+)\s*天/g;
                  const dayPositions: { num: string; index: number }[] = [];
                  let match;
                  while ((match = dayPattern.exec(fullText)) !== null) {
                    const dayNum = match[1];
                    if (!dayPositions.find(d => d.num === dayNum)) {
                      dayPositions.push({ num: dayNum, index: match.index });
                    }
                  }
                  const days: { num: string; title: string }[] = [];
                  for (let i = 0; i < dayPositions.length; i++) {
                    const start = dayPositions[i].index;
                    const end = i + 1 < dayPositions.length ? dayPositions[i + 1].index : fullText.length;
                    const section = fullText.slice(start, end);
                    const brackets: string[] = [];
                    const bracketPattern = /【([^】]+)】/g;
                    let bMatch;
                    while ((bMatch = bracketPattern.exec(section)) !== null) {
                      brackets.push(bMatch[1].trim());
                    }
                    if (brackets.length > 0) {
                      days.push({ num: dayPositions[i].num, title: brackets.join(' - ') });
                    }
                  }

                  return (
                    <div className="space-y-1">
                      {days.map((d) => (
                        <div key={d.num} className="flex items-start gap-2 rounded-xl bg-gray-50 px-2.5 py-1">
                          <span className="shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-600">第{d.num}天</span>
                          <span className="text-[13.5px] leading-[1.35] text-gray-700">{d.title}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>


      {showPriceDetailModal && createPortal(
        <div
          className="fixed inset-0 z-modal-top flex items-start justify-center overflow-y-auto bg-black/70 p-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-[calc(env(safe-area-inset-top)+10px)] backdrop-blur-sm sm:items-center sm:p-4"
          onClick={() => setShowPriceDetailModal(false)}
        >
          <div
            className="flex w-full max-w-5xl flex-col overflow-hidden rounded-[1.25rem] border border-gray-200 bg-white shadow-2xl sm:rounded-[1.9rem]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-br from-sky-50 via-white to-amber-50 px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.22em] text-sky-500">TOUR PRICE DETAIL</p>
                  <h3 className="mt-1.5 text-xl font-bold text-gray-900 sm:text-2xl">{detailTitle || '團費與售價說明'}</h3>
                  <p className="mt-1.5 text-sm font-semibold text-amber-600 sm:text-base">{selectedDeparture ? formatDisplayPrice(departureEditorPrice ? Number(departureEditorPrice) : selectedDeparture.price) : (trip.price_range || '尚未設定')}</p>
                  <p className="mt-1.5 text-xs text-gray-500 sm:text-sm">
                    {selectedDeparture ? `${formatFullDate(selectedDeparture.departure_date)}${selectedDepartureInfo.group_code ? `｜團號 ${selectedDepartureInfo.group_code}` : ''}` : '尚未選擇出團日期'}
                  </p>
                  {(isDevMode ? detailSubtitle : priceDetailPreview.subtitle) && (
                    <p className="mt-2 max-w-2xl text-xs leading-6 text-gray-600 sm:text-sm">{isDevMode ? detailSubtitle : priceDetailPreview.subtitle}</p>
                  )}
                </div>
                <button onClick={() => setShowPriceDetailModal(false)} className="text-gray-400 transition hover:text-gray-700">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="max-h-[calc(100dvh-170px)] space-y-4 overflow-y-auto p-4 sm:max-h-[calc(100dvh-220px)] sm:p-6">
              {isDevMode ? (
                <div className="space-y-4">
                  <div className="grid gap-4 xl:grid-cols-[0.82fr_1.38fr]">
                    <div className="space-y-4">
                      <div className="rounded-[1.25rem] border border-gray-200 bg-gray-50 p-4">
                        <div className="mb-3 flex items-center gap-2 border-b border-dashed border-gray-200 pb-3">
                          <span className="rounded-sm bg-gray-200 px-2.5 py-0.5 text-xs font-semibold text-slate-900">團費</span>
                          <p className="text-xs text-gray-500">設定大人、小孩、嬰兒的價格與補充說明</p>
                        </div>
                        <div className="space-y-3">
                          <div className="grid gap-2.5 lg:grid-cols-[104px_minmax(0,1fr)] lg:items-center">
                            <div className="text-xs font-semibold text-gray-700">團費</div>
                            <input
                              value={departureEditorPrice}
                              onChange={(e) => setDepartureEditorPrice(e.target.value.replace(/\D/g, ''))}
                              placeholder="例如：100000"
                              className="w-full max-w-[135px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-sky-400"
                            />
                          </div>
                        <div className="grid gap-2.5 lg:grid-cols-[104px_minmax(0,1fr)] lg:items-center">
                            <div className="text-xs font-semibold text-gray-700">大人</div>
                                <input value={detailAdultPrice} onChange={(e) => setDetailAdultPrice(e.target.value)} placeholder="例如：100,000元起" className="w-full max-w-[135px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-sky-400" />
                          </div>
                          <div className="grid gap-2.5 lg:grid-cols-[104px_minmax(0,1fr)] lg:items-center">
                            <div className="text-xs font-semibold text-gray-700">嬰兒</div>
                            <div>
                                <input value={detailInfantPrice} onChange={(e) => setDetailInfantPrice(e.target.value)} placeholder="例如：洽詢" className="w-full max-w-[135px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-sky-400" />
                            </div>
                          </div>
                          <div className="grid gap-2.5 lg:grid-cols-[72px_minmax(0,1fr)] lg:items-start">
                            <div className="pt-2 text-xs font-semibold text-gray-700">小孩</div>
                            <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                              <div className="space-y-1">
                                <div className="text-xs font-semibold text-gray-600">佔床</div>
                                <input value={detailChildWithBedPrice} onChange={(e) => setDetailChildWithBedPrice(e.target.value)} className="w-full max-w-[135px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-sky-400" />
                              </div>
                              <div className="space-y-1">
                                <div className="text-xs font-semibold text-gray-600">不佔床</div>
                                <input value={detailChildNoBedPrice} onChange={(e) => setDetailChildNoBedPrice(e.target.value)} className="w-full max-w-[135px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-sky-400" />
                              </div>
                              <div className="space-y-1 sm:col-span-2 xl:col-span-1">
                                <div className="text-xs font-semibold text-gray-600">加床</div>
                                <input value={detailChildExtraBedPrice} onChange={(e) => setDetailChildExtraBedPrice(e.target.value)} className="w-full max-w-[135px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-sky-400" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[1.25rem] border border-gray-200 bg-gray-50 p-4">
                        <div className="mb-3 flex items-center gap-2 border-b border-dashed border-gray-200 pb-3">
                          <span className="rounded-sm bg-gray-200 px-2.5 py-0.5 text-xs font-semibold text-slate-900">每席</span>
                          <p className="text-xs text-gray-500">設定每席相關附加費用與說明</p>
                        </div>
                        <div className="space-y-2.5">
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
                              <div className="text-xs font-semibold text-gray-600">訂金</div>
                              <input value={detailDeposit} onChange={(e) => setDetailDeposit(e.target.value)} placeholder="例如：洽詢" className="w-full max-w-[180px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-sky-400" />
                            </div>
                            <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
                              <div className="text-xs font-semibold text-gray-600">單人房</div>
                              <input value={detailSingleRoom} onChange={(e) => setDetailSingleRoom(e.target.value)} placeholder="例如：洽詢" className="w-full max-w-[180px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-sky-400" />
                            </div>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
                              <div className="text-xs font-semibold text-gray-600">簽證費</div>
                              <input value={detailVisaFee} onChange={(e) => setDetailVisaFee(e.target.value)} placeholder="免簽證" className="w-full max-w-[180px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-sky-400" />
                            </div>
                            <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
                              <div className="text-xs font-semibold text-gray-600">附加費</div>
                              <input value={detailSurcharge} onChange={(e) => setDetailSurcharge(e.target.value)} placeholder="售價已內含" className="w-full max-w-[180px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-sky-400" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[1.25rem] border border-gray-200 bg-gray-50 p-4">
                    <div className="mb-3 flex items-center gap-2 border-b border-dashed border-gray-200 pb-3">
                      <span className="rounded-sm bg-gray-200 px-2.5 py-0.5 text-xs font-semibold text-slate-900">說明</span>
                      <p className="text-xs text-gray-500">設定團體、報價與簽證說明</p>
                    </div>
                    <div className="space-y-2.5">
                      <div className="grid gap-2.5 md:grid-cols-[92px_1fr] md:items-start">
                        <div className="pt-2 text-xs font-semibold text-gray-700">團體說明</div>
                        <textarea value={detailGroupNote} onChange={(e) => setDetailGroupNote(e.target.value)} rows={3} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs leading-6 text-gray-900 outline-none focus:border-sky-400" placeholder="例如：10人成團，16人滿團" />
                      </div>
                      <div className="grid gap-2.5 md:grid-cols-[92px_1fr] md:items-start">
                        <div className="pt-2 text-xs font-semibold text-gray-700">報價說明</div>
                        <textarea value={detailQuoteNote} onChange={(e) => setDetailQuoteNote(e.target.value)} rows={3} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs leading-6 text-gray-900 outline-none focus:border-sky-400" placeholder="例如：不含導遊領隊服務費，每人每日300元" />
                      </div>
                      <div className="grid gap-2.5 md:grid-cols-[92px_1fr] md:items-start">
                        <div className="pt-2 text-xs font-semibold text-gray-700">簽證說明</div>
                        <textarea value={detailVisaNote} onChange={(e) => setDetailVisaNote(e.target.value)} rows={3} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs leading-6 text-gray-900 outline-none focus:border-sky-400" placeholder="例如：持台灣護照可免簽入境" />
                      </div>
                    </div>
                  </div>
                  </div>

                  <div className="flex flex-wrap justify-end gap-2 pt-1">
                    <button type="button" onClick={() => setShowPriceDetailModal(false)} className="rounded-full border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 transition hover:bg-gray-100 hover:text-gray-900">取消</button>
                    <button
                      type="button"
                      onClick={async () => {
                        let saved = false;
                        if (selectedDeparture) {
                          saved = await saveSelectedDepartureInfo();
                        } else {
                          saved = await saveDepartureInfoAsFirstDeparture();
                        }
                        if (saved) {
                          setShowPriceDetailModal(false);
                        }
                      }}
                      disabled={saving}
                      className="rounded-full bg-sky-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-sky-500 disabled:opacity-60"
                    >
                      {saving ? '儲存中...' : '儲存明細'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 bg-white px-6 py-6 text-slate-800 sm:px-8">
                  <div className="grid gap-6 border-b border-dashed border-slate-300 pb-5 md:grid-cols-[90px_1fr] md:gap-8">
                    <div><span className="inline-block bg-slate-200 px-3 py-1 text-sm font-semibold text-slate-700">團費</span></div>
                    <div className="space-y-5 text-sm md:pl-2">
                        <div className="grid gap-3 md:grid-cols-[88px_1fr] md:items-center">
                          <div className="font-semibold text-slate-700">大人</div>
                          <div className="grid gap-1.5 text-slate-500 md:grid-cols-[92px_1fr] md:items-center">
                            <span>12歲以上</span>
                            <span className="inline-grid grid-cols-[42px_1fr] items-center gap-1 font-bold text-orange-500"><span></span><span>{displayAdultUnit(priceDetailPreview.adultPrice)}</span></span>
                          </div>
                        </div>
                      <div className="grid gap-3 md:grid-cols-[88px_1fr] md:items-start">
                        <div className="font-semibold text-slate-700">小孩</div>
                          <div className="grid gap-1.5 md:grid-cols-[92px_1fr] md:items-start">
                            <div className="text-slate-500">2~未滿12歲</div>
                            <div className="grid gap-x-4 gap-y-2 sm:grid-cols-3">
                               <div><p className="inline-grid grid-cols-[42px_1fr] items-center gap-1 font-semibold"><span className="text-slate-500">佔床</span><span className="text-sky-600">{displayChildPrice(priceDetailPreview.childWithBedPrice)}</span></p></div>
                               <div><p className="inline-grid grid-cols-[52px_1fr] items-center gap-1 font-semibold"><span className="text-slate-500">不佔床</span><span className="text-sky-600">{displayChildPrice(priceDetailPreview.childNoBedPrice)}</span></p></div>
                               <div><p className="inline-grid grid-cols-[42px_1fr] items-center gap-1 font-semibold"><span className="text-slate-500">加床</span><span className="text-sky-600">{displayChildPrice(priceDetailPreview.childExtraBedPrice)}</span></p></div>
                            </div>
                           </div>
                        </div>
                         <div className="grid gap-3 md:grid-cols-[88px_1fr] md:items-center">
                           <div className="font-semibold text-slate-700">嬰兒</div>
                           <div className="grid gap-1.5 text-slate-500 md:grid-cols-[92px_1fr] md:items-center">
                             <span>2歲以下</span>
                             <span className="inline-grid grid-cols-[42px_1fr] items-center gap-1 font-semibold text-sky-600"><span></span><span>{displayInfantUnit(priceDetailPreview.infantPrice)}</span></span>
                           </div>
                         </div>
                      {priceDetailPreview.pricingNote && <p className="text-xs text-slate-500">{priceDetailPreview.pricingNote}</p>}
                    </div>
                  </div>

                  <div className="grid gap-6 border-b border-dashed border-slate-300 pb-5 md:grid-cols-[90px_1fr] md:gap-8">
                    <div><span className="inline-block bg-slate-200 px-3 py-1 text-sm font-semibold text-slate-700">每席</span></div>
                    <div className="grid gap-x-10 gap-y-4 sm:grid-cols-2 text-sm md:pl-2">
                       <div className="flex items-center gap-5"><span className="min-w-[56px] text-slate-600">訂金</span><span className="font-semibold text-sky-600">{formatDepositText(priceDetailPreview.deposit || String(editTripBanner.deposit_label || ''))}</span></div>
                         <div className="flex items-center gap-5"><span className="min-w-[56px] text-slate-600">單人房</span><span className="font-semibold text-sky-600">{formatSingleRoomText(priceDetailPreview.singleRoom)}</span></div>
                         <div className="flex items-center gap-5"><span className="min-w-[56px] text-slate-600">簽證費</span><span className="font-semibold text-sky-600">{displayVisaFeeText(priceDetailPreview.visaFee)}</span></div>
                         <div className="flex items-center gap-5"><span className="min-w-[56px] text-slate-600">附加費</span><span className="font-semibold text-sky-600">{displaySurchargeText(priceDetailPreview.surcharge)}</span></div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-[90px_1fr]">
                    <div><span className="inline-block bg-slate-200 px-3 py-1 text-sm font-semibold text-slate-700">說明</span></div>
                    <div className="space-y-4 text-sm leading-7">
                       <div className="grid gap-1 md:grid-cols-[96px_1fr]"><div className="font-semibold text-slate-700">團體說明</div><div className="text-slate-600">{priceDetailPreview.groupNote || '—'}</div></div>
                       <div className="grid gap-1 md:grid-cols-[96px_1fr]"><div className="font-semibold text-slate-700">報價說明</div><div className="text-slate-600">{priceDetailPreview.quoteNote || '—'}</div></div>
                       <div className="grid gap-1 md:grid-cols-[96px_1fr]"><div className="font-semibold text-slate-700">簽證說明</div><div className="text-slate-600">{priceDetailPreview.visaNote || '—'}</div></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

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
              <div>
                <label className="mb-1 block text-xs text-gray-500">價格區間</label>
                <input value={editPriceRange} onChange={e => setEditPriceRange(e.target.value)}
                  placeholder="例：NT$ 25,000 起"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-sky-400" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">行程亮點（輸入後按 Enter 新增）</label>
                <div className="flex flex-wrap gap-1.5 rounded-lg border border-gray-200 bg-white px-2 py-2">
                  {editHighlights.split(/[、,，]/).filter(s => s.trim()).map((tag, i) => (
                    <span key={i} className="flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-xs text-sky-600">
                      {tag.trim()}
                      <button
                        type="button"
                        onClick={() => {
                          const tags = editHighlights.split(/[、,，]/).filter(s => s.trim());
                          tags.splice(i, 1);
                          setEditHighlights(tags.join('、'));
                        }}
                        className="ml-0.5 text-gray-400 hover:text-red-500"
                      >×</button>
                    </span>
                  ))}
                  <input
                    placeholder="輸入亮點..."
                    className="min-w-[80px] flex-1 bg-transparent px-1 py-0.5 text-sm text-gray-900 outline-none"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = (e.target as HTMLInputElement).value.trim();
                        if (val) {
                          setEditHighlights(prev => prev ? `${prev}、${val}` : val);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                  />
                </div>
              </div>
              <div className="pt-2">
                <p className="mb-1.5 text-[11px] font-semibold text-sky-600">右側出團資訊</p>
                <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-2.5 sm:p-3">
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[11px] text-gray-500">左上標籤</label>
                      <input value={editTripBanner.code_label} onChange={e => setEditTripBanner(prev => ({ ...prev, code_label: e.target.value }))}
                        placeholder="例：5天4夜" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-900 outline-none focus:border-sky-400" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-gray-500">價格標籤</label>
                      <input value={editTripBanner.price_label} onChange={e => setEditTripBanner(prev => ({ ...prev, price_label: e.target.value }))}
                        placeholder="例：NT$45,000~55,000" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-900 outline-none focus:border-sky-400" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-gray-500">出發資訊</label>
                      <input value={editTripBanner.departure_label} onChange={e => setEditTripBanner(prev => ({ ...prev, departure_label: e.target.value }))}
                        placeholder="例：2026/07/14 台北出發" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-900 outline-none focus:border-sky-400" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-gray-500">天數顯示</label>
                      <input value={editTripBanner.duration_label} onChange={e => setEditTripBanner(prev => ({ ...prev, duration_label: e.target.value }))}
                        placeholder="例：4天" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-900 outline-none focus:border-sky-400" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-gray-500">團位總數</label>
                      <input type="number" value={editTripBanner.seats_total ?? ''} onChange={e => setEditTripBanner(prev => ({ ...prev, seats_total: e.target.value ? Number(e.target.value) : null }))}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-900 outline-none focus:border-sky-400" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-gray-500">可售團位</label>
                      <input type="number" value={editTripBanner.seats_available ?? ''} onChange={e => setEditTripBanner(prev => ({ ...prev, seats_available: e.target.value ? Number(e.target.value) : null }))}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-900 outline-none focus:border-sky-400" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-gray-500">訂金說明</label>
                    <input value={editTripBanner.deposit_label} onChange={e => setEditTripBanner(prev => ({ ...prev, deposit_label: e.target.value }))}
                      placeholder="例：訂金 15,000/人" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-900 outline-none focus:border-sky-400" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-gray-500">標籤（按 Enter 新增）</label>
                    <div className="flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5">
                      {editTripBanner.tags.map((tag, i) => (
                        <span key={`${tag}-${i}`} className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-600">
                          {tag}
                          <button type="button" onClick={() => setEditTripBanner(prev => ({ ...prev, tags: prev.tags.filter((_, idx) => idx !== i) }))} className="ml-0.5 text-gray-400 hover:text-red-500">×</button>
                        </span>
                      ))}
                      <input
                        value={editBannerTagInput}
                        onChange={e => setEditBannerTagInput(e.target.value)}
                        placeholder="輸入標籤..."
                        className="min-w-[80px] flex-1 bg-transparent px-1 py-0.5 text-xs text-gray-900 outline-none"
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = editBannerTagInput.trim();
                            if (!val) return;
                            setEditTripBanner(prev => ({ ...prev, tags: [...prev.tags, val] }));
                            setEditBannerTagInput('');
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setEditTripBanner(EMPTY_TRIP_BANNER)}
                      className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-semibold text-red-600 transition hover:bg-red-100"
                    >
                      清空右側資訊
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <button
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                const highlights = editHighlights.split(/[、,，]/).map(s => s.trim()).filter(Boolean);
                const res = await fetch(`/api/trips/${tripId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    title: editTitle.trim(),
                    subtitle: editSubtitle.trim(),
                    price_range: editPriceRange.trim(),
                    highlights,
                    trip_banner: editTripBanner,
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

      {/* 行程概要編輯彈窗 */}
      {showTextEditor && createPortal(
        <div className="fixed inset-0 z-modal-top flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setShowTextEditor(false)}>
          <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">編輯行程概要</h3>
              <button onClick={() => setShowTextEditor(false)} className="text-gray-400 hover:text-gray-700">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="mb-3 text-xs text-gray-500">每天的行程獨立編輯，格式範例：第1天【桃園機場】—【目的地】</p>
            <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
              {editDaySections.map((sec, i) => (
                <div key={sec.num} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-xs font-bold text-sky-600">第{sec.num}天</label>
                    {editDaySections.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditDaySections(prev => prev.filter((_, idx) => idx !== i));
                        }}
                        className="text-[10px] text-red-400/70 transition hover:text-red-400"
                      >
                        刪除此天
                      </button>
                    )}
                  </div>
                    <textarea
                    value={sec.text}
                    onChange={e => {
                      setEditDaySections(prev => {
                        const updated = [...prev];
                        updated[i] = { ...sec, text: e.target.value };
                        return updated;
                      });
                    }}
                    rows={3}
                    placeholder={`第${sec.num}天【景點A】—【景點B】—【景點C】`}
                    className="w-full rounded border border-gray-200 bg-white px-2 py-1.5 text-sm leading-relaxed text-gray-900 outline-none focus:border-sky-400"
                  />
                </div>
              ))}
              {/* 新增天數按鈕 */}
              <button
                type="button"
                onClick={() => {
                  const maxNum = editDaySections.length > 0
                    ? Math.max(...editDaySections.map(s => s.num))
                    : 0;
                  setEditDaySections(prev => [...prev, { num: maxNum + 1, text: '' }]);
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 bg-gray-50 py-2.5 text-xs text-gray-500 transition hover:border-sky-400 hover:text-sky-600"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                新增天數
              </button>
            </div>
            <button
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                // 組合所有天數為一段文字
                const combinedText = editDaySections
                  .filter(s => s.text.trim())
                  .map(s => {
                    // 如果使用者沒有自己寫「第X天」開頭，自動補上
                    const trimmed = s.text.trim();
                    if (/^第\s*\d+\s*天/.test(trimmed)) return trimmed;
                    return `第${s.num}天 ${trimmed}`;
                  })
                  .join('\n');
                const res = await fetch(`/api/trips/${tripId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ document_text: combinedText }),
                });
                if (res.ok) {
                  setTrip(prev => prev ? { ...prev, document_text: combinedText } : prev);
                  setShowTextEditor(false);
                  showSaveSuccess('儲存成功');
                } else {
                  alert('儲存失敗，請再試一次');
                }
                setSaving(false);
              }}
              className="mt-4 w-full rounded-full bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
            >
              {saving ? '儲存中...' : '儲存行程概要'}
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* 內容區 */}
      <div className="mx-auto max-w-[1000px] px-3 py-4 sm:px-4 sm:py-6 md:px-8 md:py-10">
        {/* 出團日期 */}
        {(departureDates.length > 0 || isDevMode) && (
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
        )}
      </div>

      {/* 每日行程（全寬顯示） */}
      {days.length > 0 && (
        <div className="w-full px-3 sm:px-4 md:px-8">
          <div className="mx-auto mb-6 min-h-[calc(100vh-14rem)] w-full max-w-none pb-4">
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
            {isDevMode && (
              <button
                type="button"
                disabled={uploadingDoc}
                onClick={() => docInputRef.current?.click()}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12" />
                </svg>
                {uploadingDoc ? "上傳中..." : "上傳 PDF 行程檔"}
              </button>
            )}
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
        {/* 分享 & 下載 */}
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <button
            onClick={() => setShowShareGate(true)}
            className="flex flex-1 items-center justify-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 active:scale-[0.98] md:py-3"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            分享給好友
          </button>

          {trip.document_url && (
            <button
              onClick={() => setShowDownloadGate(true)}
              className="flex flex-1 items-center justify-center gap-2 rounded-full border-2 border-emerald-400 bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-600 active:scale-[0.98] md:py-3"
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
