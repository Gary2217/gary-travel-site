"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { getTripWithDays, getSiteLogo, uploadTripBannerImage, type Trip, type TripBanner, type DepartureDate, type DepartureBannerInfo, lineHref, lineMessageHref, fbHref, igHref } from "@/lib/supabase";
import StickyHeader from "@/components/StickyHeader";
import PdfViewer from "@/components/PdfViewer";
import DayItinerary from "@/components/DayItinerary";
import DepartureDates from "@/components/DepartureDates";
import InquiryButtons from "@/components/InquiryButtons";
import DevModeToggle from "@/components/DevModeToggle";
import ImageEditor from "@/components/ImageEditor";
import SideMediaCarousel from "@/components/SideMediaCarousel";
import { track } from "@/lib/analytics";

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
  infantPrice: '6,000元',
  pricingNote: '＊ 年齡以「團體回國日」計算',
  deposit: '20,000元/人',
  singleRoom: '18,000元/人',
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

  const handleFollowAndShare = (socialUrl: string) => {
    window.open(socialUrl, '_blank');
    setTimeout(() => {
      setShowShareGate(false);
      triggerNativeShare();
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
        {index > 0 && <span className="text-white/35">|</span>}
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
    if (!normalized) return '—';
    const amount = normalized.replace(/^NT\$\s*/i, '').replace(/^\$\s*/, '').replace(/元\/?人$/i, '').replace(/元$/i, '').trim();
    return `$ ${amount} 元/人`;
  };

  const formatSingleRoomText = (text: string) => {
    const normalized = text.trim();
    if (!normalized) return '—';
    const stripped = normalized.replace(/^\+/, '').replace(/^NT\$\s*/i, '').replace(/^\$\s*/, '').replace(/元\/?人$/i, '').replace(/元$/i, '').trim();
    return `+ ${stripped} 元/人`;
  };

  const formatPerPersonPrice = (text: string, fallback = '—') => {
    const normalized = text.trim().replace(/^NT\$\s*/i, '').replace(/元\/?人$/i, '').replace(/元$/i, '').trim();
    if (!normalized) return fallback;
    return `$ ${normalized} 元/人`;
  };

  const displayAdultUnit = (text: string) => formatPerPersonPrice(text);
  const displayChildPrice = (text: string) => formatPerPersonPrice(text, '—');
  const displayInfantUnit = (text: string) => formatPerPersonPrice(text);
  const displaySurchargeText = (text: string) => text.trim() || '售價已內含';
  const displayVisaFeeText = (text: string) => text.trim() || '簽證費';

  const formatFullDate = (dateStr: string) => {
    const d = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(d.getTime())) return formatDateInput(dateStr);

    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
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
    async function loadData() {
      try {
        const data = await getTripWithDays(tripId);
        setTrip(data);
        setDepartureDates(data.departure_dates || []);
        track({ event_type: "trip_view", trip_id: tripId, trip_title: data.title });
      } catch {
        setError("無法載入行程資料");
      } finally {
        setLoading(false);
      }
    }
    loadData();
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
      return;
    }

    setDepartureEditorDate(selectedDeparture.departure_date);
    setDepartureEditorPrice(selectedDeparture.price ? String(selectedDeparture.price) : '');

    // 若當前梯次無資料，從其他梯次找最近一筆來預填
    let infoSource = selectedDepartureInfo;
    const hasOwnData = !!(selectedDepartureInfo.group_code || selectedDepartureInfo.price_detail);
    if (!hasOwnData && banner.departure_info_map) {
      for (const d of departureDates) {
        if (d.id === selectedDepartureId) continue;
        const info = banner.departure_info_map[d.id];
        if (info?.price_detail) { infoSource = info; break; }
      }
    }

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
    setDetailDeposit(parsedDetail.deposit);
    setDetailSingleRoom(parsedDetail.singleRoom);
    setDetailVisaFee(parsedDetail.visaFee || '免簽證');
    setDetailSurcharge(parsedDetail.surcharge || '售價已內含');
    setDetailGroupNote(parsedDetail.groupNote);
    setDetailQuoteNote(parsedDetail.quoteNote);
    setDetailVisaNote(parsedDetail.visaNote);
  }, [selectedDepartureId, selectedDeparture, selectedDepartureInfo.group_code, selectedDepartureInfo.price_detail]);

  useEffect(() => {
    getSiteLogo().then(setSiteLogoUrl).catch(() => {});
  }, []);

  const saveSelectedDepartureInfo = async () => {
    if (!selectedDepartureId || !selectedDeparture) {
      alert('請先選擇一個出團日期');
      return;
    }

    setSaving(true);

    const bannerPayload: TripBanner = {
      ...EMPTY_TRIP_BANNER,
      ...editTripBanner,
      code_label: previewDayText,
      duration_label: previewNightText,
      departure_info_map: {
        ...getDepartureBannerInfoMap(editTripBanner),
        [selectedDepartureId]: {
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
            deposit: detailDeposit.trim(),
            singleRoom: detailSingleRoom.trim(),
            visaFee: detailVisaFee.trim(),
            surcharge: detailSurcharge.trim(),
            groupNote: detailGroupNote.trim(),
            quoteNote: detailQuoteNote.trim(),
            visaNote: detailVisaNote.trim(),
          }),
        },
      },
    };

    const departurePayload = {
      departure_date: departureEditorDate,
      price: departureEditorPrice ? Number(departureEditorPrice.replace(/\D/g, '')) : null,
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
        return;
      }

      const [updatedTrip, updatedDeparture] = await Promise.all([tripRes.json(), departureRes.json()]);

      setTrip((prev) => (prev ? { ...prev, ...updatedTrip } : prev));
      setDepartureDates((prev) =>
        prev
          .map((date) => (date.id === selectedDepartureId ? { ...date, ...updatedDeparture } : date))
          .sort((a, b) => a.departure_date.localeCompare(b.departure_date))
      );
      alert('出團資訊已更新');
    } catch {
      alert('儲存失敗，請再試一次');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0f1923] text-white">
        <StickyHeader showBackButton backHref={from || "/"} logoUrl={siteLogoUrl} />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-sky-400 border-r-transparent" />
            <p className="mt-4 text-white/70">載入中...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !trip) {
    return (
      <main className="min-h-screen bg-[#0f1923] text-white">
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
    <main className="min-h-screen bg-[#0f1923] text-white">
      <StickyHeader showBackButton backHref={from || "/"} logoUrl={siteLogoUrl} devModeSlot={<DevModeToggle onToggle={setIsDevMode} />} />

      {/* 浮動詢問按鈕 */}
      <InquiryButtons tripTitle={trip.title} tripId={tripId} variant="floating" />

      <div id="trip-content" />

      {/* 標題區塊 */}
      <div className="mx-auto max-w-site px-3 pt-[72px] sm:px-4 md:px-6 lg:px-6">
        <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-4">
          <div className="min-w-0 lg:col-span-1">
            <div ref={titleRef}>
            <h1 className="text-2xl font-bold text-white sm:text-[1.75rem] md:text-[2rem]">{trip.title}</h1>
            {trip.subtitle && (
              <p className="mt-0.5 text-sm text-white/80 sm:mt-1 sm:text-[15px] md:text-base">{trip.subtitle}</p>
            )}
            {isDevMode && (
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={openTripInfoEditor}
                  className="rounded-full bg-sky-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-sky-500"
                >
                  編輯資訊
                </button>
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
            <div className="relative rounded-xl border border-white/[0.08] bg-[#1a3347] p-3.5">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-wider text-white/50">出團資訊</h3>
                  <p className="mt-0.5 text-[11px] text-white">團號：{departureEditorGroupCode || selectedDepartureInfo.group_code || '未設定'}</p>
                </div>
                {isDevMode && (
                  <button
                    type="button"
                    onClick={() => setShowBannerEditor((v) => !v)}
                    className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                      showBannerEditor
                        ? "bg-sky-500/20 text-sky-300 hover:bg-sky-500/30"
                        : "bg-white/8 text-white/50 hover:bg-white/12 hover:text-white"
                    }`}
                  >
                    {showBannerEditor ? "關閉編輯" : "編輯"}
                  </button>
                )}
              </div>

              {selectedDeparture ? (
                <div className="space-y-3">
                  {editTripBanner.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {editTripBanner.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex w-fit rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-center text-[11px] font-medium text-emerald-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-white/95 sm:text-sm">
                    {renderBannerItems(
                        [
                          formatFullDate(selectedDeparture.departure_date),
                          renderDaysNights(previewDayText, previewNightText),
                        ].filter(Boolean),
                      'font-medium'
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-white/95 sm:text-sm">
                    {renderBannerItems(
                      [
                        selectedDeparture.seats_total > 0 ? `團位 ${selectedDeparture.seats_total}` : '',
                        selectedDeparture.seats_available > 0 ? `可售 ${selectedDeparture.seats_available}` : '',
                         `候補 ${selectedDepartureInfo.waitlist_count ?? 0}`,
                         editTripBanner.deposit_label
                          ? `訂金 ${Number(String(editTripBanner.deposit_label).replace(/\D/g, '')).toLocaleString('zh-TW')}/人`
                          : '',
                      ].filter(Boolean),
                      'font-medium'
                    )}
                  </div>

                  <div className="border-t border-white/10 pt-2 text-left">
                    <p className="text-[11px] font-semibold tracking-[0.2em] text-amber-200/70">團費價格</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="text-base font-bold text-amber-300">
                        {formatDisplayPrice(departureEditorPrice ? Number(departureEditorPrice) : selectedDeparture.price)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowPriceDetailModal(true)}
                        className="inline-flex min-h-9 items-center px-1 text-sm font-medium text-sky-300 underline underline-offset-4 transition hover:text-sky-200"
                      >
                        看詳細內容
                      </button>
                    </div>
                  </div>

                  {isDevMode && showBannerEditor && (
                    <div className="space-y-3 rounded-[1.25rem] border border-sky-400/15 bg-sky-400/5 p-4">
                      <div>
                        <p className="text-[10px] font-semibold tracking-[0.2em] text-sky-200/70">目前編輯梯次</p>
                        <p className="mt-1 text-xs text-white/75">點下方出團日期卡片可切換這裡的內容</p>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
                          <div className="text-xs font-semibold text-white/70">團號</div>
                          <input
                            value={departureEditorGroupCode}
                            onChange={(e) => setDepartureEditorGroupCode(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none focus:border-sky-400"
                          />
                        </div>
                        <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
                          <div className="text-xs font-semibold text-white/70">日期</div>
                          <input
                            type="date"
                            value={departureEditorDate}
                            onChange={(e) => setDepartureEditorDate(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none focus:border-sky-400 [color-scheme:dark]"
                          />
                        </div>
                        <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
                          <div className="text-xs font-semibold text-white/70">團費</div>
                          <input
                            value={departureEditorPrice}
                            onChange={(e) => setDepartureEditorPrice(e.target.value.replace(/\D/g, ''))}
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none focus:border-sky-400"
                          />
                        </div>
                        <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
                          <div className="text-xs font-semibold text-white/70">明細</div>
                          <button
                            type="button"
                            onClick={() => setShowPriceDetailModal(true)}
                            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-xs text-white/80 transition hover:border-sky-400/40 hover:text-white"
                          >
                            編輯售價明細
                          </button>
                        </div>
                        <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
                          <div className="text-xs font-semibold text-white/70">天數</div>
                          <input
                            value={editDayCount}
                            onChange={e => setEditDayCount(e.target.value.replace(/\D/g, '').slice(0, 2))}
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none focus:border-sky-400"
                          />
                        </div>
                        <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
                          <div className="text-xs font-semibold text-white/70">夜數</div>
                          <input
                            id="night-count-input"
                            value={editNightCount}
                            onChange={e => setEditNightCount(e.target.value.replace(/\D/g, '').slice(0, 2))}
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none focus:border-sky-400"
                          />
                        </div>
                        <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
                          <div className="text-xs font-semibold text-white/70">團位</div>
                          <input
                            type="number"
                            value={editTripBanner.seats_total ?? ''}
                            onChange={e => setEditTripBanner(prev => ({ ...prev, seats_total: e.target.value ? Number(e.target.value) : null }))}
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none focus:border-sky-400"
                          />
                        </div>
                        <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
                          <div className="text-xs font-semibold text-white/70">可售</div>
                          <input
                            type="number"
                            value={editTripBanner.seats_available ?? ''}
                            onChange={e => setEditTripBanner(prev => ({ ...prev, seats_available: e.target.value ? Number(e.target.value) : null }))}
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none focus:border-sky-400"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
                          <div className="text-xs font-semibold text-white/70">候補</div>
                          <input
                            type="number"
                            min="0"
                            value={departureEditorWaitlist}
                            onChange={(e) => setDepartureEditorWaitlist(e.target.value.replace(/\D/g, ''))}
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none focus:border-sky-400"
                          />
                        </div>
                        <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
                          <div className="text-xs font-semibold text-white/70">訂金</div>
                          <input
                            value={editTripBanner.deposit_label}
                            onChange={e => setEditTripBanner(prev => ({ ...prev, deposit_label: e.target.value.replace(/\D/g, '') }))}
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none focus:border-sky-400"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="mb-1 text-xs text-white/50">標籤（Enter 新增）</div>
                        <div className="flex flex-wrap gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2">
                          {editTripBanner.tags.map((tag, i) => (
                            <span key={`${tag}-${i}`} className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs text-emerald-200">
                              {tag}
                              <button type="button" onClick={() => setEditTripBanner(prev => ({ ...prev, tags: prev.tags.filter((_, idx) => idx !== i) }))} className="ml-0.5 text-white/40 hover:text-red-400">×</button>
                            </span>
                          ))}
                          <input
                            value={editBannerTagInput}
                            onChange={e => setEditBannerTagInput(e.target.value)}
                            placeholder="輸入標籤..."
                            className="min-w-[80px] flex-1 bg-transparent px-1 py-0.5 text-sm text-white outline-none"
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
                          onClick={saveSelectedDepartureInfo}
                          disabled={saving}
                          className="rounded-full bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-500 disabled:opacity-60"
                        >
                          {saving ? '儲存中...' : '儲存目前梯次'}
                        </button>
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
                          className="rounded-full border border-red-500/30 bg-red-500/10 px-4 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/20"
                        >
                          清空目前內容
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-white/50">請先從下方選一個出團日期，或新增新的梯次。</p>
              )}
            </div>

            {trip.document_url && (
              <div className="mt-2 min-h-[240px] rounded-xl border border-white/[0.08] bg-[#1a3347] p-2.5">
                <div className="mb-1.5 flex items-start justify-between gap-3">
                  <h3 className="text-sm font-bold text-sky-300">行程概要</h3>
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
                {!trip.document_text && (
                  <p className="py-1.5 text-center text-[11px] text-white/40">尚未填寫行程概要，請於開發者模式編輯</p>
                )}
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
                        <div key={d.num} className="flex items-start gap-2 rounded-xl bg-white/5 px-2.5 py-1">
                          <span className="shrink-0 rounded-full bg-sky-400/20 px-2 py-0.5 text-[10px] font-semibold text-sky-200">第{d.num}天</span>
                          <span className="text-[13.5px] leading-[1.35] text-white/80">{d.title}</span>
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
          className="fixed inset-0 z-modal-top flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setShowPriceDetailModal(false)}
        >
          <div
            className="w-full max-w-5xl overflow-hidden rounded-[1.9rem] border border-white/10 bg-[rgba(12,16,28,0.98)] shadow-2xl backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[linear-gradient(135deg,rgba(56,189,248,0.18),rgba(15,23,42,0.18),rgba(251,191,36,0.12))] px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.22em] text-sky-200/75">TOUR PRICE DETAIL</p>
                  <h3 className="mt-1.5 text-xl font-bold text-white sm:text-2xl">{detailTitle || '團費與售價說明'}</h3>
                  <p className="mt-1.5 text-sm font-semibold text-amber-300 sm:text-base">{formatDisplayPrice(departureEditorPrice ? Number(departureEditorPrice) : selectedDeparture?.price ?? null)}</p>
                  <p className="mt-1.5 text-xs text-white/60 sm:text-sm">
                    {selectedDeparture ? `${formatFullDate(selectedDeparture.departure_date)}${selectedDepartureInfo.group_code ? `｜團號 ${selectedDepartureInfo.group_code}` : ''}` : '尚未選擇出團日期'}
                  </p>
                  {(isDevMode ? detailSubtitle : priceDetailPreview.subtitle) && (
                    <p className="mt-2 max-w-2xl text-xs leading-6 text-white/75 sm:text-sm">{isDevMode ? detailSubtitle : priceDetailPreview.subtitle}</p>
                  )}
                </div>
                <button onClick={() => setShowPriceDetailModal(false)} className="text-white/45 transition hover:text-white">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="space-y-4 p-4 sm:p-6">
              {isDevMode ? (
                <div className="space-y-4">
                  <div className="grid gap-4 xl:grid-cols-[0.82fr_1.38fr]">
                    <div className="space-y-4">
                      <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
                        <div className="mb-3 flex items-center gap-2 border-b border-dashed border-white/10 pb-3">
                          <span className="rounded-sm bg-white/85 px-2.5 py-0.5 text-xs font-semibold text-slate-900">團費</span>
                          <p className="text-xs text-white/55">設定大人、小孩、嬰兒的價格與補充說明</p>
                        </div>
                        <div className="space-y-3">
                          <div className="grid gap-2.5 lg:grid-cols-[104px_minmax(0,1fr)] lg:items-center">
                            <div className="text-xs font-semibold text-white/80">團費</div>
                            <input
                              value={departureEditorPrice}
                              onChange={(e) => setDepartureEditorPrice(e.target.value.replace(/\D/g, ''))}
                              placeholder="例如：100000"
                              className="w-full max-w-[135px] rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none focus:border-sky-400"
                            />
                          </div>
                        <div className="grid gap-2.5 lg:grid-cols-[104px_minmax(0,1fr)] lg:items-center">
                            <div className="text-xs font-semibold text-white/80">大人</div>
                                <input value={detailAdultPrice} onChange={(e) => setDetailAdultPrice(e.target.value)} placeholder="例如：100,000元起" className="w-full max-w-[135px] rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none focus:border-sky-400" />
                          </div>
                          <div className="grid gap-2.5 lg:grid-cols-[104px_minmax(0,1fr)] lg:items-center">
                            <div className="text-xs font-semibold text-white/80">嬰兒</div>
                            <div>
                                <input value={detailInfantPrice} onChange={(e) => setDetailInfantPrice(e.target.value)} placeholder="例如：6,000元" className="w-full max-w-[135px] rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none focus:border-sky-400" />
                            </div>
                          </div>
                          <div className="grid gap-2.5 lg:grid-cols-[72px_minmax(0,1fr)] lg:items-start">
                            <div className="pt-2 text-xs font-semibold text-white/80">小孩</div>
                            <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                              <div className="space-y-1">
                                <div className="text-xs font-semibold text-white/75">佔床</div>
                                <input value={detailChildWithBedPrice} onChange={(e) => setDetailChildWithBedPrice(e.target.value)} className="w-full max-w-[135px] rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none focus:border-sky-400" />
                              </div>
                              <div className="space-y-1">
                                <div className="text-xs font-semibold text-white/75">不佔床</div>
                                <input value={detailChildNoBedPrice} onChange={(e) => setDetailChildNoBedPrice(e.target.value)} className="w-full max-w-[135px] rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none focus:border-sky-400" />
                              </div>
                              <div className="space-y-1 sm:col-span-2 xl:col-span-1">
                                <div className="text-xs font-semibold text-white/75">加床</div>
                                <input value={detailChildExtraBedPrice} onChange={(e) => setDetailChildExtraBedPrice(e.target.value)} className="w-full max-w-[135px] rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none focus:border-sky-400" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
                        <div className="mb-3 flex items-center gap-2 border-b border-dashed border-white/10 pb-3">
                          <span className="rounded-sm bg-white/85 px-2.5 py-0.5 text-xs font-semibold text-slate-900">每席</span>
                          <p className="text-xs text-white/55">設定每席相關附加費用與說明</p>
                        </div>
                        <div className="space-y-2.5">
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
                              <div className="text-xs font-semibold text-white/75">訂金</div>
                              <input value={detailDeposit} onChange={(e) => setDetailDeposit(e.target.value)} placeholder="20,000元/人" className="w-full max-w-[180px] rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none focus:border-sky-400" />
                            </div>
                            <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
                              <div className="text-xs font-semibold text-white/75">單人房</div>
                              <input value={detailSingleRoom} onChange={(e) => setDetailSingleRoom(e.target.value)} placeholder="18,000元/人" className="w-full max-w-[180px] rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none focus:border-sky-400" />
                            </div>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
                              <div className="text-xs font-semibold text-white/75">簽證費</div>
                              <input value={detailVisaFee} onChange={(e) => setDetailVisaFee(e.target.value)} placeholder="免簽證" className="w-full max-w-[180px] rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none focus:border-sky-400" />
                            </div>
                            <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
                              <div className="text-xs font-semibold text-white/75">附加費</div>
                              <input value={detailSurcharge} onChange={(e) => setDetailSurcharge(e.target.value)} placeholder="售價已內含" className="w-full max-w-[180px] rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none focus:border-sky-400" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
                    <div className="mb-3 flex items-center gap-2 border-b border-dashed border-white/10 pb-3">
                      <span className="rounded-sm bg-white/85 px-2.5 py-0.5 text-xs font-semibold text-slate-900">說明</span>
                      <p className="text-xs text-white/55">設定團體、報價與簽證說明</p>
                    </div>
                    <div className="space-y-2.5">
                      <div className="grid gap-2.5 md:grid-cols-[92px_1fr] md:items-start">
                        <div className="pt-2 text-xs font-semibold text-white/80">團體說明</div>
                        <textarea value={detailGroupNote} onChange={(e) => setDetailGroupNote(e.target.value)} rows={3} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs leading-6 text-white outline-none focus:border-sky-400" placeholder="例如：10人成團，16人滿團" />
                      </div>
                      <div className="grid gap-2.5 md:grid-cols-[92px_1fr] md:items-start">
                        <div className="pt-2 text-xs font-semibold text-white/80">報價說明</div>
                        <textarea value={detailQuoteNote} onChange={(e) => setDetailQuoteNote(e.target.value)} rows={3} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs leading-6 text-white outline-none focus:border-sky-400" placeholder="例如：不含導遊領隊服務費，每人每日300元" />
                      </div>
                      <div className="grid gap-2.5 md:grid-cols-[92px_1fr] md:items-start">
                        <div className="pt-2 text-xs font-semibold text-white/80">簽證說明</div>
                        <textarea value={detailVisaNote} onChange={(e) => setDetailVisaNote(e.target.value)} rows={3} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs leading-6 text-white outline-none focus:border-sky-400" placeholder="例如：持台灣護照可免簽入境" />
                      </div>
                    </div>
                  </div>
                  </div>

                  <div className="flex flex-wrap justify-end gap-2 pt-1">
                    <button type="button" onClick={() => setShowPriceDetailModal(false)} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/75 transition hover:bg-white/10 hover:text-white">取消</button>
                    <button
                      type="button"
                      onClick={async () => {
                        await saveSelectedDepartureInfo();
                        setShowPriceDetailModal(false);
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
                       <div className="flex items-center gap-5"><span className="min-w-[56px] text-slate-600">訂金</span><span className="font-semibold text-sky-600">{formatDepositText(priceDetailPreview.deposit)}</span></div>
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
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f1923] p-5 shadow-2xl backdrop-blur-xl"
            onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">編輯行程資訊</h3>
              <button onClick={() => setShowEditPanel(false)} className="text-white/50 hover:text-white">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-white/60">標題</label>
                <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-sky-400" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/60">副標題</label>
                <input value={editSubtitle} onChange={e => setEditSubtitle(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-sky-400" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/60">價格區間</label>
                <input value={editPriceRange} onChange={e => setEditPriceRange(e.target.value)}
                  placeholder="例：NT$ 25,000 起"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-sky-400" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/60">行程亮點（輸入後按 Enter 新增）</label>
                <div className="flex flex-wrap gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-2">
                  {editHighlights.split(/[、,，]/).filter(s => s.trim()).map((tag, i) => (
                    <span key={i} className="flex items-center gap-1 rounded-full bg-sky-500/20 px-2.5 py-1 text-xs text-sky-200">
                      {tag.trim()}
                      <button
                        type="button"
                        onClick={() => {
                          const tags = editHighlights.split(/[、,，]/).filter(s => s.trim());
                          tags.splice(i, 1);
                          setEditHighlights(tags.join('、'));
                        }}
                        className="ml-0.5 text-white/40 hover:text-red-400"
                      >×</button>
                    </span>
                  ))}
                  <input
                    placeholder="輸入亮點..."
                    className="min-w-[80px] flex-1 bg-transparent px-1 py-0.5 text-sm text-white outline-none"
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
                <p className="mb-1.5 text-[11px] font-semibold text-sky-300">右側出團資訊</p>
                <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-2.5 sm:p-3">
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[11px] text-white/55">左上標籤</label>
                      <input value={editTripBanner.code_label} onChange={e => setEditTripBanner(prev => ({ ...prev, code_label: e.target.value }))}
                        placeholder="例：5天4夜" className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none focus:border-sky-400" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-white/55">價格標籤</label>
                      <input value={editTripBanner.price_label} onChange={e => setEditTripBanner(prev => ({ ...prev, price_label: e.target.value }))}
                        placeholder="例：NT$45,000~55,000" className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none focus:border-sky-400" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-white/55">出發資訊</label>
                      <input value={editTripBanner.departure_label} onChange={e => setEditTripBanner(prev => ({ ...prev, departure_label: e.target.value }))}
                        placeholder="例：2026/07/14 台北出發" className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none focus:border-sky-400" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-white/55">天數顯示</label>
                      <input value={editTripBanner.duration_label} onChange={e => setEditTripBanner(prev => ({ ...prev, duration_label: e.target.value }))}
                        placeholder="例：4天" className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none focus:border-sky-400" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-white/55">團位總數</label>
                      <input type="number" value={editTripBanner.seats_total ?? ''} onChange={e => setEditTripBanner(prev => ({ ...prev, seats_total: e.target.value ? Number(e.target.value) : null }))}
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none focus:border-sky-400" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-white/55">可售團位</label>
                      <input type="number" value={editTripBanner.seats_available ?? ''} onChange={e => setEditTripBanner(prev => ({ ...prev, seats_available: e.target.value ? Number(e.target.value) : null }))}
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none focus:border-sky-400" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-white/55">訂金說明</label>
                    <input value={editTripBanner.deposit_label} onChange={e => setEditTripBanner(prev => ({ ...prev, deposit_label: e.target.value }))}
                      placeholder="例：訂金 15,000/人" className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white outline-none focus:border-sky-400" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-white/55">標籤（按 Enter 新增）</label>
                    <div className="flex flex-wrap gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5">
                      {editTripBanner.tags.map((tag, i) => (
                        <span key={`${tag}-${i}`} className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-200">
                          {tag}
                          <button type="button" onClick={() => setEditTripBanner(prev => ({ ...prev, tags: prev.tags.filter((_, idx) => idx !== i) }))} className="ml-0.5 text-white/40 hover:text-red-400">×</button>
                        </span>
                      ))}
                      <input
                        value={editBannerTagInput}
                        onChange={e => setEditBannerTagInput(e.target.value)}
                        placeholder="輸入標籤..."
                        className="min-w-[80px] flex-1 bg-transparent px-1 py-0.5 text-xs text-white outline-none"
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
                      className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-[11px] font-semibold text-red-300 transition hover:bg-red-500/20"
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
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#0f1923] p-5 shadow-2xl backdrop-blur-xl"
            onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">編輯行程概要</h3>
              <button onClick={() => setShowTextEditor(false)} className="text-white/50 hover:text-white">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="mb-3 text-xs text-white/50">每天的行程獨立編輯，格式範例：第1天【桃園機場】—【目的地】</p>
            <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
              {editDaySections.map((sec, i) => (
                <div key={sec.num} className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-xs font-bold text-sky-300">第{sec.num}天</label>
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
                    className="w-full rounded border border-white/10 bg-white/5 px-2 py-1.5 text-sm leading-relaxed text-white outline-none focus:border-sky-400"
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
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/20 bg-white/5 py-2.5 text-xs text-white/50 transition hover:border-sky-400/40 hover:text-sky-300"
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
          />
        )}
      </div>

      {/* 每日行程（全寬顯示） */}
      {days.length > 0 && (
        <div className="w-full px-3 sm:px-4 md:px-8">
          <div className="mx-auto mb-6 min-h-[calc(100vh-14rem)] w-full max-w-none pb-4">
            <h2 className="mb-4 text-xl font-bold text-white md:text-2xl">每日行程</h2>
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
          <div className="mb-8 rounded-2xl border border-white/10 bg-[#1a3347] p-5 text-center backdrop-blur-[12px] sm:p-6">
            <h2 className="mb-2 text-xl font-bold text-white md:text-2xl">每日行程尚未建立</h2>
            <p className="text-sm leading-6 text-white/70 md:text-base">
              目前這個行程尚未建立詳細內容，請透過 LINE 聯繫蓋瑞取得完整行程資料。
            </p>
          </div>
        </div>
      )}

      {/* PDF 全版面嵌入（canvas 渲染，防止直接下載） */}
      {days.length === 0 && trip.document_url && (
        <div id="trip-document" className="mx-auto w-full max-w-[800px] px-3 sm:px-4">
          <PdfViewer url={trip.document_url} title={`${trip.title} 行程表`} />
        </div>
      )}

      {/* 按鈕區 */}
      <div className="mx-auto max-w-[1000px] px-3 py-6 sm:px-4 md:px-8">
        {/* 分享 & 下載 */}
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <button
            onClick={() => setShowShareGate(true)}
            className="flex flex-1 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white active:scale-[0.98] md:py-3"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            分享給好友
          </button>

          {trip.document_url && (
            <button
              onClick={() => setShowDownloadGate(true)}
              className="flex flex-1 items-center justify-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-600/20 px-4 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-600/30 active:scale-[0.98] md:py-3"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              下載 PDF 行程檔
            </button>
          )}
        </div>

        {/* 索取行程 / 詢問報價 CTA */}
        <div className="mb-8 mt-6">
          <InquiryButtons tripTitle={trip.title} tripId={tripId} variant="inline" />
        </div>

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
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0f1923] p-5 shadow-2xl backdrop-blur-xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-white sm:text-lg">下載行程檔</h3>
              <button
                onClick={() => { setShowDownloadGate(false); setDownloadReady(false); }}
                className="text-white/50 transition hover:text-white"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {!downloadReady ? (
              <>
                <p className="mb-2 text-sm text-white/80">
                  想下載「{trip.title}」的行程檔嗎？
                </p>
                <p className="mb-4 text-xs leading-5 text-white/60">
                  請先加入我們任一社群帳號，追蹤後切回瀏覽器即可下載！
                </p>

                <div className="space-y-2">
                  <a
                    href={lineHref}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => {
                      track({ event_type: "trip_download", platform: "LINE", trip_id: tripId, trip_title: trip.title });
                      setDownloadReady(true);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl bg-[#06C755] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#05b64d] active:scale-[0.98]"
                  >
                    <svg className="h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" /></svg>
                    <span className="flex-1 text-left">加入 LINE 好友</span>
                    <svg className="h-4 w-4 shrink-0 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>

                  <a
                    href={fbHref}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => {
                      track({ event_type: "trip_download", platform: "FB", trip_id: tripId, trip_title: trip.title });
                      setDownloadReady(true);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl bg-[#1877F2] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1565d8] active:scale-[0.98]"
                  >
                    <svg className="h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                    <span className="flex-1 text-left">追蹤 FB 粉專</span>
                    <svg className="h-4 w-4 shrink-0 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>

                  <a
                    href={igHref}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => {
                      track({ event_type: "trip_download", platform: "IG", trip_id: tripId, trip_title: trip.title });
                      setDownloadReady(true);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl bg-[#E4405F] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#d62d4a] active:scale-[0.98]"
                  >
                    <svg className="h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                    <span className="flex-1 text-left">追蹤 IG</span>
                    <svg className="h-4 w-4 shrink-0 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>
                </div>

                <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-center">
                  <p className="text-sm font-bold text-amber-300">
                    追蹤完成後，請{getBackHint()}
                  </p>
                  <p className="mt-1 text-xs text-amber-200/70">
                    回到網站即可下載行程檔
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-center">
                  <svg className="mx-auto mb-2 h-10 w-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-base font-bold text-emerald-300">感謝追蹤！</p>
                  <p className="mt-1 text-sm text-white/70">點擊下方按鈕下載行程檔</p>
                </div>

                <a
                  href={`/api/download-trip-pdf?url=${encodeURIComponent(trip.document_url || "")}&name=${encodeURIComponent(trip.title)}`}
                  onClick={() => { setShowDownloadGate(false); setDownloadReady(false); }}
                  className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-sky-600 px-4 py-4 text-base font-bold text-white shadow-lg transition hover:bg-sky-500 active:scale-[0.98]"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  下載「{trip.title}」行程檔
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
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0f1923] p-5 shadow-2xl backdrop-blur-xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-white sm:text-lg">分享行程給好友</h3>
              <button
                onClick={() => setShowShareGate(false)}
                className="text-white/50 transition hover:text-white"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="mb-2 text-sm text-white/80">
              想分享「{trip.title}」給好友嗎？
            </p>
            <p className="mb-4 text-xs leading-5 text-white/60">
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

            <p className="mt-3 text-center text-[10px] text-white/40 sm:text-[11px]">
              加入後將開啟分享選單，可選擇 LINE、FB、IG 等好友分享
            </p>
          </div>
        </div>,
        document.body
      )}
    </main>
  );
}
