"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createPortal } from "react-dom";
import { getTripWithDays, getDestination, getRelatedTrips, getSiteLogo, getRegionsWithDestinations, uploadTripBannerImage, uploadTripDocument, deleteTripDocument, invalidateCache, scrapeTripPdf, type Trip, type TripBanner, type DepartureDate, type DepartureBannerInfo, type Region, type PdfScrapeResult, lineHref } from "@/lib/supabase";
import TripCard from "@/components/TripCard";
import dynamic from "next/dynamic";
import StickyHeader from "@/components/StickyHeader";
import DayItinerary from "@/components/DayItinerary";
import DepartureDates from "@/components/DepartureDates";
import InquiryButtons from "@/components/InquiryButtons";
import DevModeToggle from "@/components/DevModeToggle";
import SocialCta from "@/components/SocialCta";
import PriceInfoModal from "@/components/trip/PriceInfoModal";
import SourceUrlModal from "@/components/trip/SourceUrlModal";
import MobileDatePickerModal from "@/components/trip/MobileDatePickerModal";
import JapanInquiryBar from "@/components/JapanInquiryBar";

const PdfViewer = dynamic(() => import("@/components/PdfViewer"), { ssr: false });
const SideMediaCarousel = dynamic(() => import("@/components/SideMediaCarousel"), { ssr: false });
import { track } from "@/lib/analytics";
import {
  DEFAULT_PRICE_DETAIL,
  parseDeparturePrice,
  toBannerDaysNights,
  renderDaysNights,
  getDepartureBannerInfoMap,
  formatDepositText,
  formatFullDate,
  getScheduleLabel,
  parsePriceDetail,
  buildDepartureInfoPayload as buildDepartureInfoPayloadPure,
  filterUpcomingDepartures,
  todayLocalISO,
} from "@/lib/trip-format";

type ScrapeChange = {
  id: string;
  change_type: string;
  field_name?: string;
  old_value?: unknown;
  new_value?: unknown;
  trip_title?: string;
  trip_id?: string;
};

const CHANGE_FIELD_LABEL: Record<string, string> = {
  price: '價格',
  price_detail: '售價明細',
  flight: '航班',
  departure: '出發日期',
  promotion: '優惠',
  removed: '下架',
  warning: '提示',
  new_trip: '新行程',
};
const INFO_FIELD_LABEL: Record<string, string> = {
  title: '標題',
  cover_image_url: '封面圖',
  tags: '標籤',
  airline: '航空公司',
  airport: '出發機場',
  duration: '天數',
  display_order: '排序',
  subtitle: '副標題',
  code_label: '團型編號',
};

// 從行程標題拆出精選賣點當標籤（取 ~/～ 後、以標點/空格分隔、過濾雜訊、限 5 個）
function extractSellingPoints(title: string): string[] {
  if (!title) return [];
  let t = title.includes('|') ? title.split('|').pop()!.trim() : title;
  t = t.replace(/[【[][^】\]]*[】\]]/g, ''); // 去【】前綴
  const tildeIdx = t.search(/[~～]/);
  let pointsPart = tildeIdx >= 0 ? t.slice(tildeIdx + 1) : t;
  // 若 ~ 後是天數開頭（如「北疆13日(...)」），改抓括號內景點；否則移除括號註記
  const paren = pointsPart.match(/[（(]([^）)]+)[）)]/);
  if (/^\S*\d+\s*[天日]/.test(pointsPart.trim()) && paren) {
    pointsPart = paren[1];
  } else {
    pointsPart = pointsPart.replace(/[（(][^）)]*[）)]/g, '');
  }
  const rawPoints = pointsPart.split(/[、，,／/.．\s{}｛｝+]+/).map(s => s.trim()).filter(Boolean);
  const out: string[] = [];
  const seen = new Set<string>();
  for (let p of rawPoints) {
    p = p.replace(/^[\u4e00-\u9fa5]{2,4}(進出|出發)-?/, ''); // 去「XX進出-」前綴
    p = p.replace(/^季節限定/, '');
    p = p.replace(/[一二三四五六七八九十\d]+\s*[天日晚](遊|自由行)?/g, ''); // 去天數/晚數
    p = p.replace(/自由行/g, '');
    p = p.replace(/[-－總]+$/, '').trim(); // 去尾綴符號
    if (!p || p.length < 2 || p.length > 12) continue;
    if (/^\d+$/.test(p)) continue;
    if (p.includes('航空') || /航$/.test(p)) continue; // 過濾航空
    if (/(出發|直飛|飛往)$/.test(p)) continue;
    if (seen.has(p)) continue;
    seen.add(p);
    out.push(p);
    if (out.length >= 5) break;
  }
  return out;
}

function getChangeLabel(change_type: string, field_name?: string): string {
  if (change_type === 'info' && field_name) return INFO_FIELD_LABEL[field_name] ?? field_name;
  return CHANGE_FIELD_LABEL[change_type] ?? change_type;
}
function formatDiffValue(value: unknown): string {
  if (value === null || value === undefined) return '（無）';
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  return str.length > 80 ? str.slice(0, 80) + '...' : str;
}

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

export default function TripPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tripId = params.id as string;
  // from 僅接受站內相對路徑（拒絕 https://... 與 //host 形式，防外部導向）
  const fromRaw = searchParams.get("from");
  const from = fromRaw && fromRaw.startsWith("/") && !fromRaw.startsWith("//") ? fromRaw : null;
  const requestedDepartureId = searchParams.get("departureId");

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [siteLogoUrl, setSiteLogoUrl] = useState('/travel-logo.svg');
  const [isDevMode, setIsDevMode] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
const [scrapePhase, setScrapePhase] = useState<'idle' | 'triggering' | 'polling' | 'has_changes' | 'applying' | 'done' | 'no_changes' | 'error'>('idle');
const [scrapePendingChanges, setScrapePendingChanges] = useState<ScrapeChange[]>([]);
const [scrapeSelectedChangeIds, setScrapeSelectedChangeIds] = useState<Set<string>>(new Set());
const [showScrapePreviewModal, setShowScrapePreviewModal] = useState(false);
const [showSourceUrlModal, setShowSourceUrlModal] = useState(false);
const [sourceUrlDraft, setSourceUrlDraft] = useState('');
const [savingSourceUrl, setSavingSourceUrl] = useState(false);
  const scrapeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrapeTriggerTimeRef = useRef<number>(0);
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
  const [editBannerCountryInput, setEditBannerCountryInput] = useState('');
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
  const [pdfVisible, setPdfVisible] = useState(false);
  const pdfSentinelRef = useRef<HTMLDivElement>(null);
  const [showPromoEditor, setShowPromoEditor] = useState(false);
  const [promoContent, setPromoContent] = useState('');
  const [promoEnabled, setPromoEnabled] = useState(false);
  const [savingPromo, setSavingPromo] = useState(false);
  const [showPromoPopup, setShowPromoPopup] = useState(false);
  const [showAllDates, setShowAllDates] = useState(false);
  const [allRegions, setAllRegions] = useState<Region[]>([]);
  const [editDestinationId, setEditDestinationId] = useState('');
  const [showNewDestInput, setShowNewDestInput] = useState(false);
  const [newDestName, setNewDestName] = useState('');
  const [newDestSubRegion, setNewDestSubRegion] = useState('');
  const [creatingDest, setCreatingDest] = useState(false);
  const [deletingDest, setDeletingDest] = useState(false);
  const [pdfScraping, setPdfScraping] = useState(false);
  type PdfPreviewChange = { field: string; label: string; oldVal: string; newVal: string };
  type PdfPreviewState = { parsed: PdfScrapeResult; changes: PdfPreviewChange[] };
  const [pdfPreview, setPdfPreview] = useState<PdfPreviewState | null>(null);
  const [pdfSaving, setPdfSaving] = useState(false);
  const [pdfSelectedFields, setPdfSelectedFields] = useState<Set<string>>(new Set());

  const banner = trip?.trip_banner ?? EMPTY_TRIP_BANNER;

  /**
   * 客人可見的梯次：濾掉已出發的。開發者模式保留全部以便檢視與編輯。
   * DB 資料完全不動 —— 過期梯次是歷史紀錄，之後查帳或參考都還需要。
   *
   * 原則：客人只會看到未來梯次的資料，一致到底（含航班區塊）。
   * 例外只有兩處，皆為開發者專用而非客人可見：
   *   - selectedDeparture 的查找仍用完整清單（dev 可能選到過期梯次）
   *   - PDF 抓取預覽的「將更新 N 個出發日期」（dev 操作對象是全部梯次）
   */
  const visibleDepartureDates = filterUpcomingDepartures(departureDates, isDevMode, todayLocalISO());
  const selectedDeparture = departureDates.find((date) => date.id === selectedDepartureId) ?? null;
  const selectedDepartureInfo = selectedDepartureId
    ? banner.departure_info_map?.[selectedDepartureId] ?? EMPTY_DEPARTURE_INFO
    : EMPTY_DEPARTURE_INFO;

  const handleShare = async () => {
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

  const openSourceUrlModal = () => {
    setSourceUrlDraft(trip?.source_url || '');
    setShowSourceUrlModal(true);
  };

  const handleSaveSourceUrl = async () => {
    if (!trip || savingSourceUrl) return;
    const trimmed = sourceUrlDraft.trim();
    setSavingSourceUrl(true);
    try {
      const res = await fetch(`/api/trips/${tripId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ source_url: trimmed || null }),
      });
      if (!res.ok) throw new Error('儲存失敗，請確認已登入開發者模式');
      const updated = await res.json();
      setTrip(prev => prev ? { ...prev, source_url: updated.source_url ?? null } : prev);
      setShowSourceUrlModal(false);
      showSaveSuccess('朋威來源網址已儲存');
    } catch (err) {
      alert(err instanceof Error ? err.message : '儲存失敗');
    } finally {
      setSavingSourceUrl(false);
    }
  };

  const handleScrapeThisTrip = async () => {
    if ((scrapePhase !== 'idle' && scrapePhase !== 'error') || !trip) return;
    setScrapePhase('triggering');
    scrapeTriggerTimeRef.current = Date.now();
    try {
      const res = await fetch('/api/scrape/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ destinationId: trip.destination_id, tripIds: [tripId] }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || '觸發抓取失敗');
      }
      setScrapePhase('polling');
      const pollProgress = async () => {
        try {
          if (Date.now() - scrapeTriggerTimeRef.current > 10 * 60 * 1000) {
            setScrapePhase('error');
            return;
          }
          const progressRes = await fetch('/api/scrape/progress', { credentials: 'include' });
          if (!progressRes.ok) { scrapeTimerRef.current = setTimeout(pollProgress, 3000); return; }
          const progress = await progressRes.json();
          if (progress.running) { scrapeTimerRef.current = setTimeout(pollProgress, 3000); return; }
          const logStarted = progress.latest?.started_at ? new Date(progress.latest.started_at).getTime() : 0;
          if (logStarted < scrapeTriggerTimeRef.current - 10000) {
            scrapeTimerRef.current = setTimeout(pollProgress, 3000);
            return;
          }
          if (progress.latest?.status === 'failed') { setScrapePhase('error'); return; }
          const changesRes = await fetch('/api/scrape/changes?status=pending', { credentials: 'include' });
          if (!changesRes.ok) { setScrapePhase('error'); return; }
          const allChanges = await changesRes.json();
          const tripChanges = (allChanges as ScrapeChange[]).filter(c => c.trip_id === tripId);
          if (tripChanges.length > 0) {
            setScrapePendingChanges(tripChanges);
            setScrapeSelectedChangeIds(new Set(tripChanges.map(c => c.id)));
            setScrapePhase('has_changes');
          } else {
            setScrapePhase('no_changes');
            setTimeout(() => setScrapePhase('idle'), 2000);
          }
        } catch { scrapeTimerRef.current = setTimeout(pollProgress, 3000); }
      };
      scrapeTimerRef.current = setTimeout(pollProgress, 3000);
    } catch (err) {
      alert(err instanceof Error ? err.message : '觸發抓取失敗');
      setScrapePhase('idle');
    }
  };

  const handleApplyChanges = async () => {
    const selectedIds = scrapePendingChanges.filter(c => scrapeSelectedChangeIds.has(c.id)).map(c => c.id);
    if (scrapePhase !== 'has_changes' || selectedIds.length === 0) return;
    setScrapePhase('applying');
    try {
      const applyRes = await fetch('/api/scrape/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ changeIds: selectedIds }),
      });
      if (!applyRes.ok) throw new Error('套用失敗');
      invalidateCache('trip:' + tripId);
      const data = await getTripWithDays(tripId);
      setTrip(data);
      setDepartureDates(data.departure_dates || []);
      setScrapePendingChanges([]);
      setScrapePhase('done');
      showSaveSuccess('行程已更新');
      setTimeout(() => setScrapePhase('idle'), 2000);
    } catch (err) {
      alert(err instanceof Error ? err.message : '套用失敗');
      setScrapePhase('has_changes');
    }
  };

  const handlePdfScrape = async () => {
    if (!trip?.document_url || pdfScraping) return;
    setPdfScraping(true);
    try {
      const parsed = await scrapeTripPdf(tripId);

      // 計算有變更的欄位（只列出「新值與舊值不同」的欄位）
      const changes: PdfPreviewChange[] = [];

      const oldTitle = trip.title ?? '';
      const newTitle = parsed.title ?? '';
      if (newTitle && newTitle !== oldTitle) {
        changes.push({ field: 'title', label: '標題', oldVal: oldTitle, newVal: newTitle });
      }

      const oldDuration = trip.trip_banner?.duration_label ?? trip.duration ?? '';
      const newDuration = parsed.duration ?? '';
      if (newDuration && newDuration !== oldDuration) {
        changes.push({ field: 'duration_label', label: '天數', oldVal: oldDuration || '（無）', newVal: newDuration });
      }

      const oldAirline = trip.trip_banner?.airline ?? '';
      const newAirline = parsed.airline ?? '';
      if (newAirline && newAirline !== oldAirline) {
        changes.push({ field: 'airline', label: '航空公司', oldVal: oldAirline || '（無）', newVal: newAirline });
      }

      const oldAirport = trip.trip_banner?.airport ?? '';
      const newAirport = parsed.airport ?? '';
      if (newAirport && newAirport !== oldAirport) {
        changes.push({ field: 'airport', label: '出發機場', oldVal: oldAirport || '（無）', newVal: newAirport });
      }

      const oldDepartureLabel = trip.trip_banner?.departure_label ?? '';
      const newDepartureLabel = parsed.departure_label ?? '';
      if (newDepartureLabel && newDepartureLabel !== oldDepartureLabel) {
        changes.push({ field: 'departure_label', label: '出發地', oldVal: oldDepartureLabel || '（無）', newVal: newDepartureLabel });
      }

      const oldMinGroup = trip.trip_banner?.min_group_size != null ? String(trip.trip_banner.min_group_size) : '';
      const newMinGroup = parsed.min_group_size != null ? String(parsed.min_group_size) : '';
      if (newMinGroup && newMinGroup !== oldMinGroup) {
        changes.push({ field: 'min_group_size', label: '成團人數', oldVal: oldMinGroup ? `${oldMinGroup} 人` : '（無）', newVal: `${newMinGroup} 人` });
      }

      const oldHighlights = (trip.highlights ?? []).join('、');
      const newHighlights = (parsed.highlights ?? []).join('、');
      if (newHighlights && newHighlights !== oldHighlights) {
        changes.push({ field: 'highlights', label: '亮點標籤', oldVal: oldHighlights || '（無）', newVal: newHighlights });
      }

      // 從標題拆賣點標籤（顯示將新增哪些到綠色標籤）
      const oldTags = Array.isArray(trip.trip_banner?.tags) ? trip.trip_banner!.tags : [];
      const sellingPoints = extractSellingPoints(parsed.title || trip.title || '');
      const newTagsToAdd = sellingPoints.filter(p => !oldTags.includes(p));
      if (newTagsToAdd.length > 0) {
        changes.push({ field: 'tags', label: '賣點標籤', oldVal: oldTags.length ? oldTags.join('、') : '（無）', newVal: [...oldTags, ...newTagsToAdd].join('、') });
      }

      const newSegmentCount = parsed.flight_segments?.length ?? 0;
      if (newSegmentCount > 0 && departureDates.length > 0) {
        const currentSegmentCount = (departureDates[0] as Record<string, unknown>).flight_segments
          ? ((departureDates[0] as Record<string, unknown>).flight_segments as unknown[]).length
          : 0;
        changes.push({
          field: 'flight_segments',
          label: '航班資訊',
          oldVal: currentSegmentCount > 0 ? `現有 ${currentSegmentCount} 個航段` : '（無）',
          newVal: `將更新 ${departureDates.length} 個出發日期（${newSegmentCount} 個航段）`,
        });
      }

      setPdfPreview({ parsed, changes });
      // 預設只勾「航班資訊」：PDF 抓取定位為補航班表，標題/標籤等由人工維護或朋威抓取更新
      setPdfSelectedFields(new Set(changes.filter(c => c.field === 'flight_segments').map(c => c.field)));
    } catch (err) {
      console.error('[handlePdfScrape]', err);
      alert(err instanceof Error ? err.message : 'PDF 解析失敗');
    } finally {
      setPdfScraping(false);
    }
  };

  const confirmPdfSave = async () => {
    if (!pdfPreview || !trip) return;
    setPdfSaving(true);
    try {
      const parsed = pdfPreview.parsed;

      // 寫入 trip_banner（含各 banner 欄位）+ title + highlights
      const baseBanner = { ...EMPTY_TRIP_BANNER, ...(trip.trip_banner ?? {}) };
      // 從標題拆賣點 → 合併進現有標籤（不覆蓋、去重、最多 5 個）
      const existingTags = Array.isArray(baseBanner.tags) ? baseBanner.tags : [];
      const sellingPoints = extractSellingPoints(parsed.title || trip.title || '');
      const mergedTags = [...existingTags];
      for (const p of sellingPoints) {
        if (!mergedTags.includes(p)) mergedTags.push(p);
      }
      const sel = pdfSelectedFields;
      const updatedBanner = {
        ...baseBanner,
        ...(sel.has('tags') ? { tags: mergedTags } : {}),
        departure_info_map: trip.trip_banner?.departure_info_map ?? {},
        ...(sel.has('airline') && parsed.airline != null ? { airline: parsed.airline } : {}),
        ...(sel.has('airport') && parsed.airport != null ? { airport: parsed.airport } : {}),
        ...(sel.has('departure_label') && parsed.departure_label != null ? { departure_label: parsed.departure_label } : {}),
        ...(sel.has('min_group_size') && parsed.min_group_size != null ? { min_group_size: parsed.min_group_size } : {}),
        ...(sel.has('duration_label') && parsed.duration != null ? { duration_label: parsed.duration } : {}),
      };
      const patchPayload: Record<string, unknown> = { trip_banner: updatedBanner };
      if (sel.has('title') && parsed.title && parsed.title !== trip.title) {
        patchPayload.title = parsed.title;
      }
      // highlights 只在原本沒有時才填
      if (sel.has('highlights') && parsed.highlights?.length && !(trip.highlights?.length)) {
        patchPayload.highlights = parsed.highlights;
      }

      const patchRes = await fetch(`/api/trips/${tripId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(patchPayload),
      });
      if (!patchRes.ok) throw new Error('行程資訊儲存失敗，請確認已登入開發者模式');
      const updated = await patchRes.json();
      setTrip(prev => prev ? { ...prev, ...updated } : prev);

      // 自動寫入航班資訊到所有出發日期
      const segments = parsed.flight_segments;
      if (sel.has('flight_segments') && segments.length > 0 && trip.departure_dates && trip.departure_dates.length > 0) {
        const outboundSegs = segments.filter(s => s.day === segments[0].day);
        const returnSegs = segments.filter(s => s.day !== segments[0].day);

        // 推算去回時段 label
        const depHour = parseInt(outboundSegs[0].departure_time.split(':')[0]);
        const arrHour = returnSegs.length > 0
          ? parseInt(returnSegs[returnSegs.length - 1].arrival_time.split(':')[0])
          : parseInt(outboundSegs[outboundSegs.length - 1].arrival_time.split(':')[0]);
        const depPart = depHour < 12 ? '早去' : depHour < 17 ? '午去' : '晚去';
        const arrPart = arrHour < 12 ? '早回' : arrHour < 17 ? '午回' : '晚回';
        const derivedLabel = `${depPart}${arrPart}`;

        // 航空公司
        const airlines = [...new Set(segments.map(s => s.airline).filter(Boolean))];
        const airlineStr = airlines.join('/') || null;

        const firstOut = outboundSegs[0];
        const lastOut = outboundSegs[outboundSegs.length - 1];
        const firstRet = returnSegs.length > 0 ? returnSegs[0] : null;
        const lastRet = returnSegs.length > 0 ? returnSegs[returnSegs.length - 1] : null;

        // 「第X天」→ 數字（推算航段實際日期用）
        const parseDayNum = (dayText: string): number | null => {
          const m = String(dayText || '').match(/第\s*(\d+)\s*天/);
          if (m) return parseInt(m[1], 10);
          const cnMap: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
          const cn = String(dayText || '').match(/第\s*([一二三四五六七八九十]+)\s*天/);
          if (cn) { const t = cn[1]; if (t === '十') return 10; if (t.length === 1) return cnMap[t] ?? null; if (t.startsWith('十')) return 10 + (cnMap[t[1]] ?? 0); if (t.includes('十')) { const [a, b] = t.split('十'); return (cnMap[a] ?? 1) * 10 + (cnMap[b] ?? 0); } }
          return null;
        };
        const addDaysLocal = (dateStr: string, n: number): string => {
          const d = new Date(dateStr + 'T12:00:00');
          d.setDate(d.getDate() + n);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        };

        // 每個 dd 各自算航段日期、保留原本 label 的共用函式
        const buildUpdateForDd = (dd: DepartureDate) => {
          const segsForDd = segments.map(s => {
            const dayNum = parseDayNum(s.day);
            return {
              date: (dayNum != null && dd.departure_date) ? addDaysLocal(dd.departure_date, dayNum - 1) : '',
              airline: s.airline, flight_number: s.flight_number,
              dep_time: s.departure_time, dep_airport: s.from_city,
              arr_time: s.arrival_time, arr_airport: s.to_city, next_day: s.is_next_day,
            };
          });
          return {
            airline: airlineStr,
            ...(dd.label ? {} : { label: derivedLabel }), // 保留使用者原本設的標籤
            outbound_flight: firstOut.flight_number,
            outbound_time: firstOut.departure_time,
            outbound_from: firstOut.from_city,
            outbound_to: lastOut.to_city,
            outbound_arrival_time: lastOut.arrival_time,
            outbound_next_day: lastOut.is_next_day,
            ...(firstRet ? {
              return_flight: firstRet.flight_number,
              return_time: firstRet.departure_time,
              return_from: firstRet.from_city,
            } : {}),
            ...(lastRet ? {
              return_to: lastRet.to_city,
              return_arrival_time: lastRet.arrival_time,
              return_next_day: lastRet.is_next_day,
            } : {}),
            flight_segments: segsForDd,
          };
        };

        const results = await Promise.all(
          trip.departure_dates.map(dd => {
            const dbSegments = segments.map(s => {
              const dayNum = parseDayNum(s.day);
              return {
                date: (dayNum != null && dd.departure_date) ? addDaysLocal(dd.departure_date, dayNum - 1) : '',
                airline: s.airline,
                flight_number: s.flight_number,
                dep_time: s.departure_time,
                dep_airport: s.from_city,
                arr_time: s.arrival_time,
                arr_airport: s.to_city,
                next_day: s.is_next_day,
              };
            });

            const flightPayload: Record<string, unknown> = {
              airline: airlineStr,
              // 只在該梯次原本沒有 label 時，才用推算的時段 label；保留使用者手動設的標籤
              ...(dd.label ? {} : { label: derivedLabel }),
              outbound_flight: firstOut.flight_number,
              outbound_time: firstOut.departure_time,
              outbound_from: firstOut.from_city,
              outbound_to: lastOut.to_city,
              outbound_arrival_time: lastOut.arrival_time,
              outbound_next_day: lastOut.is_next_day,
              flight_segments: dbSegments,
            };
            if (firstRet && lastRet) {
              flightPayload.return_flight = firstRet.flight_number;
              flightPayload.return_time = firstRet.departure_time;
              flightPayload.return_from = firstRet.from_city;
              flightPayload.return_to = lastRet.to_city;
              flightPayload.return_arrival_time = lastRet.arrival_time;
              flightPayload.return_next_day = lastRet.is_next_day;
            }

            return fetch(`/api/trips/${tripId}/departure-dates?dateId=${dd.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify(flightPayload),
            });
          })
        );
        const okCount = results.filter(r => r.ok).length;
        if (okCount > 0) {
          setTrip(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              departure_dates: prev.departure_dates?.map(dd => ({ ...dd, ...buildUpdateForDd(dd) })),
            };
          });
          // 同步更新 departureDates state（航班顯示用的是這個 state）
          setDepartureDates(prev => prev.map(dd => ({ ...dd, ...buildUpdateForDd(dd) })));
        }
      }

      invalidateCache('trip:' + tripId);
      invalidateCache('dest-trips:');
      setPdfPreview(null);
      showSaveSuccess('儲存成功');
    } catch (err) {
      console.error('[confirmPdfSave]', err);
      alert(err instanceof Error ? err.message : '儲存失敗，請確認已登入開發者模式');
    } finally {
      setPdfSaving(false);
    }
  };

  useEffect(() => {
    return () => { if (scrapeTimerRef.current) clearTimeout(scrapeTimerRef.current); };
  }, []);

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
    const editorDurationStr = trip?.trip_banner?.duration_label || trip?.duration || '';
    const editorDayParsed = editorDurationStr.match(/(\d+)\s*天/);
    const editorNightParsed = editorDurationStr.match(/(\d+)\s*夜/);
    setEditDayCount(editorDayParsed ? editorDayParsed[1] : '');
    setEditNightCount(editorNightParsed ? editorNightParsed[1] : '');
    setEditBannerTagInput('');
    setEditBannerCountryInput('');
  };

  const openTripInfoEditor = () => {
    if (!trip) return;
    setEditTitle(trip.title);
    setEditSubtitle(trip.subtitle || '');
    setEditPriceRange(trip.price_range || '');
    setEditHighlights((trip.highlights || []).join('、'));
    setEditDestinationId(trip.destination_id);
    openBannerEditor();
    setShowEditPanel(true);
    if (allRegions.length === 0) {
      getRegionsWithDestinations().then((data: Region[]) => setAllRegions(data)).catch(() => {});
    }
  };

  const renderBannerItems = (items: string[], baseClassName: string) =>
    items.map((item, index) => (
      <div key={`${item}-${index}`} className="flex items-center gap-2">
        {index > 0 && <span className="text-gray-300">|</span>}
        <span className={baseClassName}>{item}</span>
      </div>
    ));

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
    const durationStr = trip.trip_banner?.duration_label || trip.duration || '';
    const dayParsed = durationStr.match(/(\d+)\s*天/);
    const nightParsed = durationStr.match(/(\d+)\s*夜/);
    setEditDayCount(dayParsed ? dayParsed[1] : '');
    setEditNightCount(nightParsed ? nightParsed[1] : '');
    setPromoEnabled(trip.trip_banner?.promo_enabled ?? false);
    setPromoContent(trip.trip_banner?.promo_content ?? '');
  }, [trip]);

  useEffect(() => {
    // 在 effect 內重算而非用 visibleDepartureDates：後者每次 render 都是新陣列，
    // 放進 deps 會導致此 effect 每次 render 都重跑。
    const pool = filterUpcomingDepartures(departureDates, isDevMode, todayLocalISO());
    if (pool.length === 0) {
      setSelectedDepartureId(null);
      return;
    }

    setSelectedDepartureId((current) => {
      if (requestedDepartureId && pool.some((date) => date.id === requestedDepartureId)) {
        return requestedDepartureId;
      }

      if (current && pool.some((date) => date.id === current)) {
        return current;
      }

      // 優先選有航班資料的梯次
      const withFlight = pool.find(d =>
        (d.flight_segments && d.flight_segments.length > 0) || d.outbound_flight || d.airline
      );
      return (withFlight || pool[0]).id;
    });
  }, [departureDates, requestedDepartureId, isDevMode]);

  useEffect(() => {
    if (!selectedDeparture) {
      setDepartureEditorDate(new Date().toLocaleDateString('sv-SE'));
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
    setDetailDeposit(parsedDetail.deposit);
    setDetailSingleRoom(parsedDetail.singleRoom);
    setDetailVisaFee(parsedDetail.visaFee || '免簽證');
    setDetailSurcharge(parsedDetail.surcharge || '售價已內含');
    setDetailGroupNote(parsedDetail.groupNote);
    setDetailQuoteNote(parsedDetail.quoteNote);
    setDetailVisaNote(parsedDetail.visaNote);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDepartureId, selectedDeparture, showBannerEditor]);

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
              const hasDates = (t: Trip) => t.departure_dates && t.departure_dates.length > 0 && !t.trip_banner?.custom_tour;
              const regionFiltered = (related.regionTrips || []).filter((t: Trip) => t.id !== tripId && hasDates(t));
              const categoryFiltered = (related.categoryTrips || []).filter((t: Trip) => t.id !== tripId && hasDates(t) && !regionFiltered.some((r: Trip) => r.id === t.id));
              let combined = [...regionFiltered, ...categoryFiltered].slice(0, 6);

              // 不足 6 筆時從熱門行程補足（並行 fetch 所有熱門目的地）
              if (combined.length < 6) {
                try {
                  const popRes = await fetch('/api/popular-trips');
                  if (popRes.ok) {
                    const popDests = await popRes.json();
                    const usedIds = new Set([tripId, ...combined.map((t: Trip) => t.id)]);
                    // 並行 fetch 所有熱門目的地的行程
                    const popTripsResults = await Promise.all(
                      popDests.map((pd: { id: string }) =>
                        fetch(`/api/destinations/${pd.id}/trips`)
                          .then(r => r.ok ? r.json() as Promise<Trip[]> : [])
                          .catch(() => [] as Trip[])
                      )
                    );
                    for (const destTrips of popTripsResults) {
                      if (combined.length >= 6) break;
                      for (const dt of destTrips) {
                        if (combined.length >= 6) break;
                        if (usedIds.has(dt.id)) continue;
                        if (!dt.departure_dates?.length || dt.trip_banner?.custom_tour) continue;
                        usedIds.add(dt.id);
                        combined.push(dt);
                      }
                    }
                  }
                } catch { /* 靜默 */ }
              }
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

  // PDF 延遲掛載：滾動到 600px 內才載入 pdfjs + PDF 檔案
  useEffect(() => {
    const el = pdfSentinelRef.current;
    if (!el || pdfVisible) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setPdfVisible(true); obs.disconnect(); }
    }, { rootMargin: '600px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [pdfVisible, trip]);

  /** 把散在各處的編輯器 state 收攏成草稿，交由 lib 的純函式組出 DB payload */
  const buildDepartureInfoPayload = (): DepartureBannerInfo =>
    buildDepartureInfoPayloadPure(
      {
        groupCode: departureEditorGroupCode,
        waitlist: departureEditorWaitlist,
        detail: {
          title: detailTitle,
          subtitle: detailSubtitle,
          adultPrice: detailAdultPrice,
          childWithBedPrice: detailChildWithBedPrice,
          childNoBedPrice: detailChildNoBedPrice,
          childExtraBedPrice: detailChildExtraBedPrice,
          infantPrice: detailInfantPrice,
          pricingNote: detailPricingNote,
          deposit: detailDeposit,
          singleRoom: detailSingleRoom,
          visaFee: detailVisaFee,
          surcharge: detailSurcharge,
          groupNote: detailGroupNote,
          quoteNote: detailQuoteNote,
          visaNote: detailVisaNote,
        },
      },
    );

  const saveSelectedDepartureInfo = async (): Promise<boolean> => {
    if (!selectedDepartureId || !selectedDeparture) {
      alert('請先選擇一個出團日期');
      return false;
    }

    setSaving(true);

    const bannerPayload: TripBanner = {
      ...EMPTY_TRIP_BANNER,
      ...editTripBanner,
      duration_label: renderDaysNights(previewDayText, previewNightText),
      departure_info_map: {
        ...getDepartureBannerInfoMap(editTripBanner),
        [selectedDepartureId]: buildDepartureInfoPayload(),
      },
    };

    const departurePayload: Record<string, unknown> = {
      price: parseDeparturePrice(departureEditorPrice),
      seats_total: editTripBanner.seats_total,
      seats_available: editTripBanner.seats_available,
      label: departureEditorLabel || null,
    };
    if (departureEditorDate) {
      departurePayload.departure_date = departureEditorDate;
    }

    try {
      const tripPatchBody: Record<string, unknown> = { trip_banner: bannerPayload };
      if (editDestinationId && editDestinationId !== trip?.destination_id) {
        tripPatchBody.destination_id = editDestinationId;
      }
      const [tripRes, departureRes] = await Promise.all([
        fetch(`/api/trips/${tripId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(tripPatchBody),
        }),
        fetch(`/api/trips/${tripId}/departure-dates?dateId=${selectedDepartureId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(departurePayload),
        }),
      ]);

      // 分開處理：即使出發日期失敗，只要 banner 成功就更新 state
      const tripOk = tripRes.ok;
      const depOk = departureRes.ok;

      if (tripOk) {
        const updatedTrip = await tripRes.json();
        let updatedDest: Trip['destinations'] = undefined;
        if (editDestinationId && editDestinationId !== trip?.destination_id) {
          for (const region of allRegions) {
            const found = (region.destinations || []).find(d => d.id === editDestinationId);
            if (found) { updatedDest = found; break; }
          }
        }
        setTrip((prev) => {
          if (!prev) return prev;
          const remoteBanner = updatedTrip?.trip_banner;
          return {
            ...prev,
            ...updatedTrip,
            ...(updatedDest ? { destinations: updatedDest } : {}),
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
        invalidateCache('trip:' + tripId);
        invalidateCache('dest-trips:');
      }

      if (depOk) {
        const updatedDeparture = await departureRes.json();
        const fallbackPrice = parseDeparturePrice(departureEditorPrice);
        const normalizedDeparture = {
          ...selectedDeparture,
          ...updatedDeparture,
          departure_date: updatedDeparture?.departure_date || departureEditorDate || selectedDeparture.departure_date,
          price: typeof updatedDeparture?.price === 'number' ? updatedDeparture.price : fallbackPrice,
        };
        setDepartureDates((prev) =>
          prev
            .map((date) => (date.id === selectedDepartureId ? { ...date, ...normalizedDeparture } : date))
            .sort((a, b) => a.departure_date.localeCompare(b.departure_date))
        );
        setDepartureEditorPrice(typeof normalizedDeparture.price === 'number' ? String(normalizedDeparture.price) : '');
      }

      if (!tripOk && !depOk) {
        alert('儲存失敗，請確認已登入開發者模式');
        return false;
      }
      if (!tripOk) {
        alert('行程資訊儲存失敗（標籤/banner），出發日期已更新');
        return false;
      }
      if (!depOk) {
        alert('出發日期儲存失敗，但行程資訊（標籤/banner）已更新');
      }

      setShowBannerEditor(false);
      setIsCreatingNewDeparture(false);
      showSaveSuccess(depOk ? '儲存成功' : '部分儲存成功');
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
      duration_label: renderDaysNights(previewDayText, previewNightText),
    };

    try {
      const res = await fetch(`/api/trips/${tripId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ trip_banner: bannerPayload }),
      });
      if (!res.ok) {
        alert('儲存失敗，請確認已登入開發者模式');
        return false;
      }
      const updatedTrip = await res.json();
      setTrip((prev) => (prev ? { ...prev, ...updatedTrip, trip_banner: updatedTrip?.trip_banner || bannerPayload } : prev));
      invalidateCache('trip:' + tripId);
      invalidateCache('dest-trips:');
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
        credentials: 'include',
        body: JSON.stringify(departureCreatePayload),
      });

      if (!createRes.ok) {
        // 即使建立梯次失敗，仍嘗試儲存 banner（標籤等）
        const bannerOnlyPayload: TripBanner = {
          ...EMPTY_TRIP_BANNER,
          ...editTripBanner,
          duration_label: renderDaysNights(previewDayText, previewNightText),
        };
        const fallbackRes = await fetch(`/api/trips/${tripId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ trip_banner: bannerOnlyPayload }),
        });
        if (fallbackRes.ok) {
          const fallbackTrip = await fallbackRes.json();
          setTrip((prev) => (prev ? { ...prev, ...fallbackTrip, trip_banner: fallbackTrip?.trip_banner || bannerOnlyPayload } : prev));
          invalidateCache('trip:' + tripId);
          invalidateCache('dest-trips:');
          alert('建立出團梯次失敗，但標籤/banner 已儲存');
        } else {
          alert('建立出團梯次失敗，請確認已登入開發者模式');
        }
        return false;
      }

      const createdDeparture = await createRes.json();

      const bannerPayload: TripBanner = {
        ...EMPTY_TRIP_BANNER,
        ...editTripBanner,
        duration_label: renderDaysNights(previewDayText, previewNightText),
        departure_info_map: {
          ...getDepartureBannerInfoMap(editTripBanner),
          [createdDeparture.id]: buildDepartureInfoPayload(),
        },
      };

      const depPrice = parseDeparturePrice(departureEditorPrice);
      const tripPatchBody2: Record<string, unknown> = { trip_banner: bannerPayload };
      if (depPrice) {
        tripPatchBody2.price_range = `NT$${depPrice.toLocaleString('zh-TW')}起`;
      }
      if (editDestinationId && editDestinationId !== trip?.destination_id) {
        tripPatchBody2.destination_id = editDestinationId;
      }
      const tripRes = await fetch(`/api/trips/${tripId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(tripPatchBody2),
      });

      if (!tripRes.ok) {
        alert('儲存出團資訊失敗，請確認已登入開發者模式');
        return false;
      }

      let updatedDest2: Trip['destinations'] = undefined;
      if (editDestinationId && editDestinationId !== trip?.destination_id) {
        for (const region of allRegions) {
          const found = (region.destinations || []).find(d => d.id === editDestinationId);
          if (found) { updatedDest2 = found; break; }
        }
      }
      const updatedTrip = await tripRes.json();
      setTrip((prev) => {
        if (!prev) return prev;
        const remoteBanner = updatedTrip?.trip_banner;
        return {
          ...prev,
          ...updatedTrip,
          ...(updatedDest2 ? { destinations: updatedDest2 } : {}),
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
      setDepartureDates((prev) => [...prev, createdDeparture].sort((a, b) => (a.departure_date || '').localeCompare(b.departure_date || '')));
      setSelectedDepartureId(createdDeparture.id);
      setDepartureEditorPrice(typeof createdDeparture.price === 'number' ? String(createdDeparture.price) : '');
      setIsCreatingNewDeparture(false);
      setShowBannerEditor(false);
      invalidateCache('trip:' + tripId);
      invalidateCache('dest-trips:');
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
    const isDeleted = error?.includes("已刪除");
    return (
      <main className="min-h-screen bg-transparent text-gray-900">
        <StickyHeader showBackButton backHref={from || "/"} logoUrl={siteLogoUrl} />
        <div className="flex min-h-[60vh] items-center justify-center px-4">
          <div className="text-center">
            <p className={`text-lg ${isDeleted ? "text-gray-600" : "text-red-400"}`}>{error || "找不到此行程"}</p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                onClick={() => { if (window.history.length > 1) { window.history.back(); } else { window.location.href = from || '/'; } }}
                className="rounded-full bg-sky-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
              >
                返回上一頁
              </button>
              <a href="/" className="text-sm text-gray-500 underline hover:text-gray-700">回首頁</a>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const days = trip.trip_days || [];
  const { dayText: previewDayText, nightText: previewNightText } = toBannerDaysNights(editDayCount, editNightCount);
  const priceDetailPreview = parsePriceDetail(selectedDepartureInfo.price_detail || '');

  // 出發日期表格：月份分組 & 篩選（用 visibleDepartureDates，否則會出現點了沒東西的空月份分頁）
  const departureMonthKeys = (() => {
    const map = new Map<string, boolean>();
    visibleDepartureDates.forEach(d => {
      if (!d.departure_date) return;
      const dt = new Date(d.departure_date + 'T00:00:00');
      map.set(`${dt.getFullYear()}-${dt.getMonth() + 1}`, true);
    });
    return Array.from(map.keys()).sort();
  })();
  const filteredDepartures = tableActiveMonth === 'all'
    ? visibleDepartureDates
    : visibleDepartureDates.filter(d => {
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
  // 用 visibleDepartureDates：航班區塊會把來源梯次的出團日期印出來（見下方「出團日期：」），
  // 若 fallback 到過期梯次，畫面會自相矛盾 —— 上方寫「尚未設定出團日期」，
  // 下方卻顯示已經出發過的日期。寧可整個航班區塊不顯示。
  const flightFallback = visibleDepartureDates.find(hasFlight) || null;
  const flightSource = (selectedDeparture && hasFlight(selectedDeparture)) ? selectedDeparture : flightFallback;
  const selectedFlightSegments = flightSource?.flight_segments;
  // 航段分組：同一段路線（去程／回程）可能有多家航空公司可選（如長榮/中華同班次、或真航空/濟州航空/
  // 易斯達航空/德威航空等多種選擇，甚至進出機場不同如大邱機場），分成上下多列顯示但仍算同一段，不誤標轉機。
  // 有 day_text（第幾天，抓取資料才有）時依此分桶最準確：同樣「第1天」的都算去程，不論它們彼此之間出發地／
  // 目的地是否相同，也不論它們在陣列中是否相鄰（抓取資料是 去/回/去/回... 交錯排列，而非去去去回回回）。
  // 沒有 day_text 的手動資料（如客製行程）才退回用「日期＋出發地＋目的地」合併相鄰航段。
  const flightLegGroups = (() => {
    const segs = selectedFlightSegments;
    if (!segs || segs.length === 0) return [];
    type Seg = (typeof segs)[number];
    const allHaveDayText = segs.every((s) => !!s.day_text);

    let buckets: { key: string; segs: Seg[] }[];
    if (allHaveDayText) {
      const order: string[] = [];
      const map = new Map<string, Seg[]>();
      segs.forEach((seg) => {
        const key = seg.day_text!;
        if (!map.has(key)) { map.set(key, []); order.push(key); }
        map.get(key)!.push(seg);
      });
      buckets = order.map((key) => ({ key, segs: map.get(key)! }));
    } else {
      const raw: { key: string; segs: Seg[] }[] = [];
      segs.forEach((seg) => {
        const key = `${seg.date}|${seg.dep_airport}|${seg.arr_airport}`;
        const last = raw[raw.length - 1];
        if (last && last.key === key) {
          last.segs.push(seg);
        } else {
          raw.push({ key, segs: [seg] });
        }
      });
      buckets = raw;
    }

    // 同一個 day_text 桶內可能混著兩種情況：(1) 多家航空公司平行可選的完整航班
    // （如真航空/濟州航空/易斯達航空都從桃園飛，德威航空則改飛大邱機場，各自獨立、
    // 出發地不一定相同）、(2) 真正的轉機續程（如高雄→香港→阿布達比，香港那段的
    // 出發地正好銜接上一段的抵達地）。用「這段出發地是否等於緊鄰前一段的抵達地」
    // 判斷才準確——不能只看是否等於本桶第一段出發地，否則像德威航空飛大邱這種
    // 平行可選但出發地不同的航班會被誤判成轉機。
    buckets = buckets.map((b) => {
      if (b.segs.length <= 1) return b;
      const marked = b.segs.map((seg, i) => {
        if (i === 0) return seg;
        const prev = b.segs[i - 1];
        return seg.dep_airport === prev.arr_airport ? { ...seg, isTransfer: true } : seg;
      });
      return { ...b, segs: marked };
    });

    const total = buckets.length;
    return buckets.map((b, i) => {
      const isFirst = i === 0;
      const isLast = i === total - 1 && total > 1;
      const label: '去程' | '回程' | '轉機' = isFirst ? '去程' : isLast ? '回程' : '轉機';
      return { label, date: b.segs[0]?.date, segs: b.segs };
    });
  })();
  const hasFlightData = !!flightSource;
  const isCustomTour = !!banner.custom_tour;
  const isJapanTrip = (trip.destinations as { regions?: { category_label?: string } } | undefined)?.regions?.category_label === '日本';
  const parsedTripPrice = trip.price_range ? Number(trip.price_range.replace(/\D/g, '')) || null : null;
  const selectedPriceValue = selectedDeparture?.price ?? null;
  const ctaPriceText = isCustomTour
    ? '歡迎詢問出團資訊'
    : selectedPriceValue
      ? `NT$ ${selectedPriceValue.toLocaleString('zh-TW')}`
      : trip.price_range?.trim() || (parsedTripPrice ? `NT$ ${parsedTripPrice.toLocaleString('zh-TW')}` : '歡迎詢問最新價格');
  const ctaDateText = !isCustomTour && selectedDeparture?.departure_date ? formatFullDate(selectedDeparture.departure_date) : '';
  const ctaGroupCode = banner.code_label?.trim() || selectedDepartureInfo.group_code?.trim() || '';

  return (
    <main className="min-h-screen bg-transparent pb-28 text-gray-900 sm:pb-32">
      <StickyHeader showBackButton backHref={from || "/"} logoUrl={siteLogoUrl} devModeSlot={<DevModeToggle onToggle={setIsDevMode} />} />

      <div id="trip-content" />

      {/* 標題區塊 */}
      <div className="mx-auto max-w-site px-3 pt-[9.5rem] sm:px-4 md:px-6 lg:px-6">
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

        <div className="flex flex-col lg:grid lg:grid-cols-[1fr_1.15fr] lg:items-start lg:gap-x-6">
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
                  <span className="min-w-[36px] text-[11px] text-sky-600">團號</span>
                  <span className="text-xs font-medium text-gray-900 sm:text-sm">{selectedDepartureInfo?.group_code || banner.code_label || '—'}</span>
                </div>
                {(editTripBanner.airline || selectedDeparture?.airline) && (
                  <div className="flex items-center gap-2.5">
                    <span className="min-w-[36px] text-[11px] text-sky-600">
                      <svg className="inline h-3.5 w-3.5 text-sky-600" fill="currentColor" viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" /></svg>
                    </span>
                    <span className="text-xs font-medium text-gray-900 sm:text-sm">{editTripBanner.airline || selectedDeparture?.airline}</span>
                  </div>
                )}
                <div className="flex items-center gap-2.5">
                  <span className="min-w-[36px] text-[11px] text-sky-600">
                    <svg className="inline h-3.5 w-3.5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </span>
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
                {editTripBanner.departure_label && (
                  <div className="flex items-center gap-2.5">
                    <span className="min-w-[36px] text-[11px] text-sky-600">出發地</span>
                    <span className="text-xs font-medium text-gray-900 sm:text-sm">{editTripBanner.departure_label}</span>
                  </div>
                )}
                {trip.destinations && (
                  <div className="flex items-center gap-2.5">
                    <span className="min-w-[36px] text-[11px] text-sky-600">目的地</span>
                    <span className="text-xs font-medium text-gray-900 sm:text-sm">{trip.destinations.title}</span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2">
                  {(selectedDeparture?.seats_total ?? 0) > 0 ? (
                    <div className="flex items-center gap-2.5">
                      <span className="min-w-[36px] text-[11px] text-sky-600">團位</span>
                      <span className="text-sm font-medium text-gray-900">團位 <strong>{selectedDeparture?.seats_total}</strong>　可售 <strong>{selectedDeparture?.seats_available}</strong></span>
                    </div>
                  ) : <div />}
                  <button type="button" onClick={() => setShowPriceInfoModal(true)} aria-label="查看售價明細" className="shrink-0 inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-[11px] font-medium text-orange-600 transition hover:bg-orange-100">
                    <span className="font-bold">$</span> 售價說明 / 加床 / 小孩 ..
                  </button>
                </div>
                {editTripBanner.min_group_size && (
                  <div className="flex items-center gap-2.5 mt-1">
                    <span className="min-w-[36px] text-[11px] text-sky-600">成團</span>
                    <span className="text-sm font-medium text-gray-900">成團人數 <strong>{editTripBanner.min_group_size}</strong> 人</span>
                  </div>
                )}
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
                    const fallbackPrice = !currentPrice && trip.price_range ? Number(trip.price_range.replace(/\D/g, '')) || null : null;
                    const displayPrice = currentPrice || fallbackPrice;
                    const originalPrice = displayPrice ? displayPrice + 500 : null;
                    return (
                      <>
                        {originalPrice && (
                          <span className="whitespace-nowrap text-2xl font-bold text-gray-600 line-through decoration-red-600 decoration-2">NT${originalPrice.toLocaleString('zh-TW')}</span>
                        )}
                        <div className="text-right">
                          <span className="whitespace-nowrap bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-3xl font-black tracking-tight text-transparent">
                            {displayPrice ? `NT$${displayPrice.toLocaleString('zh-TW')}` : '洽詢'}
                          </span>
                          <span className="ml-1 text-xs text-gray-500">起/人</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
                <div className="mt-3 flex gap-2">
                  {visibleDepartureDates.length > 1 && (
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
            <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm">
                {editTripBanner.tags && editTripBanner.tags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {editTripBanner.tags.map((tag, i) => (
                      <span key={i} className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600">{tag}</span>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2.5">
                  <span className="min-w-[36px] text-[11px] text-sky-600">團號</span>
                  <span className="text-sm font-medium text-gray-900">{selectedDepartureInfo.group_code || banner.code_label || '—'}</span>
                </div>
                {(editTripBanner.airline || selectedDeparture?.airline) && (
                  <div className="flex items-center gap-2.5">
                    <span className="min-w-[36px] text-[11px] text-sky-600">
                      <svg className="inline h-3.5 w-3.5 text-sky-600" fill="currentColor" viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" /></svg>
                    </span>
                    <span className="text-sm font-medium text-gray-900">{editTripBanner.airline || selectedDeparture?.airline}</span>
                  </div>
                )}
                {getScheduleLabel(selectedDeparture) && (
                  <div className="flex items-center gap-2.5">
                    <span className="min-w-[36px] text-[11px] text-sky-600">
                      <svg className="inline h-3.5 w-3.5 text-sky-600" fill="currentColor" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" /></svg>
                    </span>
                    <span className="text-sm font-medium text-gray-900">{getScheduleLabel(selectedDeparture)}</span>
                  </div>
                )}
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
                {editTripBanner.departure_label && (
                  <div className="flex items-center gap-2.5">
                    <span className="min-w-[36px] text-[11px] text-sky-600">出發地</span>
                    <span className="text-sm font-medium text-gray-900">{editTripBanner.departure_label}</span>
                  </div>
                )}
                {trip.destinations && (
                  <div className="flex items-center gap-2.5">
                    <span className="min-w-[36px] text-[11px] text-sky-600">目的地</span>
                    <span className="text-sm font-medium text-gray-900">{trip.destinations.title}</span>
                  </div>
                )}
              {/* ── 團位 ── */}
              {(selectedDeparture?.seats_total ?? 0) > 0 && (
                <div className="flex items-center gap-2.5">
                  <span className="min-w-[36px] text-[11px] text-sky-600">
                    <svg className="inline h-3.5 w-3.5 text-sky-600" fill="currentColor" viewBox="0 0 24 24"><path d="M4 18v3h3v-3h10v3h3v-3h1a1 1 0 001-1v-3H2v3a1 1 0 001 1h1zM19 6V5a3 3 0 00-3-3H8a3 3 0 00-3 3v1a3 3 0 00-3 3v4h20V9a3 3 0 00-3-3zM7 5a1 1 0 011-1h8a1 1 0 011 1v1H7V5z" /></svg>
                  </span>
                  <span className="text-sm font-medium text-gray-900">團位 <strong>{selectedDeparture?.seats_total}</strong>　可售 <strong>{selectedDeparture?.seats_available}</strong></span>
                </div>
              )}
              {/* ── 成團人數 + 售價說明（同一列） ── */}
              <div className="flex items-center justify-between gap-2">
                {editTripBanner.min_group_size ? (
                  <div className="flex items-center gap-2.5">
                    <span className="min-w-[36px] text-[11px] text-sky-600">
                      <svg className="inline h-3.5 w-3.5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                    </span>
                    <span className="text-sm font-medium text-gray-900">成團人數 <strong>{editTripBanner.min_group_size}</strong> 人</span>
                  </div>
                ) : <div />}
                <div className="flex shrink-0 gap-1.5">
                  <button type="button" onClick={() => setShowPriceInfoModal(true)} aria-label="查看售價明細" className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-[11px] font-medium text-orange-600 transition hover:bg-orange-100">
                    <span className="font-bold">$</span> 售價說明 / 加床 / 小孩 ..
                  </button>
                  {isDevMode && (
                    <button type="button" onClick={() => setShowPriceDetailModal((v) => !v)} className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition ${showPriceDetailModal ? 'bg-sky-100 text-sky-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                      {showPriceDetailModal ? '收起編輯' : '編輯售價'}
                    </button>
                  )}
                </div>
              </div>

              {/* Dev mode 售價編輯 Modal */}
              {isDevMode && showPriceDetailModal && createPortal(
                <div className="fixed inset-0 z-modal-top flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) setShowPriceDetailModal(false); }}>
                  <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[1.25rem] border border-sky-200 bg-white p-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                    <button type="button" onClick={() => setShowPriceDetailModal(false)} className="absolute right-3 top-3 z-10 text-gray-400 hover:text-gray-700">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <p className="mb-3 text-[10px] font-semibold tracking-[0.2em] text-sky-600">售價明細編輯</p>
                    <div className="space-y-3">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div><label className="mb-0.5 block text-[10px] text-gray-500">大人</label><input value={detailAdultPrice} onChange={(e) => setDetailAdultPrice(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-sky-400" /></div>
                        <div><label className="mb-0.5 block text-[10px] text-gray-500">小孩佔床</label><input value={detailChildWithBedPrice} onChange={(e) => setDetailChildWithBedPrice(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-sky-400" /></div>
                        <div><label className="mb-0.5 block text-[10px] text-gray-500">小孩不佔床</label><input value={detailChildNoBedPrice} onChange={(e) => setDetailChildNoBedPrice(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-sky-400" /></div>
                        <div><label className="mb-0.5 block text-[10px] text-gray-500">加床</label><input value={detailChildExtraBedPrice} onChange={(e) => setDetailChildExtraBedPrice(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-sky-400" /></div>
                        <div><label className="mb-0.5 block text-[10px] text-gray-500">嬰兒</label><input value={detailInfantPrice} onChange={(e) => setDetailInfantPrice(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-sky-400" /></div>
                        <div><label className="mb-0.5 block text-[10px] text-gray-500">航空公司</label><input value={editTripBanner.airline || ''} onChange={(e) => setEditTripBanner(prev => ({ ...prev, airline: e.target.value }))} placeholder="例：太陽富國航空" className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-sky-400" /></div>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div><label className="mb-0.5 block text-[10px] text-gray-500">訂金</label><input value={detailDeposit} onChange={(e) => setDetailDeposit(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-sky-400" /></div>
                        <div><label className="mb-0.5 block text-[10px] text-gray-500">單人房差</label><input value={detailSingleRoom} onChange={(e) => setDetailSingleRoom(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-sky-400" /></div>
                        <div><label className="mb-0.5 block text-[10px] text-gray-500">包含項目</label><input value={detailSurcharge} onChange={(e) => setDetailSurcharge(e.target.value)} placeholder="例：含機場稅燃油附加費" className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-sky-400" /></div>
                        <div><label className="mb-0.5 block text-[10px] text-gray-500">不包含項目</label><input value={detailVisaFee} onChange={(e) => setDetailVisaFee(e.target.value)} placeholder="例：不含導遊領隊小費" className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-sky-400" /></div>
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
                  </div>
                </div>,
                document.body
              )}
            </div>
          </div>

          {/* 出發日期 — 手機排第2、桌面右欄跨列 */}
          <div ref={rightColumnRef} className="hidden mt-3 lg:block lg:order-none lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:mt-0">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
              {/* Dev mode 按鈕 */}
              {isDevMode && (
                <div className="flex justify-end gap-1.5 px-4 pt-2.5 pb-1">
                  <button type="button" onClick={() => { setShowBannerEditor(true); setIsCreatingNewDeparture(true); setDepartureEditorDate(selectedDeparture?.departure_date || new Date().toLocaleDateString('sv-SE')); setDepartureEditorGroupCode(selectedDepartureInfo.group_code || ''); setDepartureEditorPrice(selectedDeparture?.price ? String(selectedDeparture.price) : ''); setDepartureEditorWaitlist(typeof selectedDepartureInfo.waitlist_count === 'number' ? String(selectedDepartureInfo.waitlist_count) : ''); setDepartureEditorLabel(selectedDeparture?.label || ''); setEditDestinationId(trip.destination_id); if (allRegions.length === 0) getRegionsWithDestinations().then((d: Region[]) => setAllRegions(d)).catch(() => {}); }} className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-600 transition hover:bg-emerald-100">新增</button>
                  <button type="button" onClick={() => { if (showBannerEditor) setIsCreatingNewDeparture(false); setShowBannerEditor((v) => !v); setEditDestinationId(trip.destination_id); if (allRegions.length === 0) getRegionsWithDestinations().then((d: Region[]) => setAllRegions(d)).catch(() => {}); }} className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition ${showBannerEditor ? "bg-sky-100 text-sky-600 hover:bg-sky-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"}`}>{showBannerEditor ? "關閉編輯" : "編輯"}</button>
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
              <div className={`relative ${!showAllDates && filteredDepartures.length > 5 ? 'max-h-[420px] overflow-hidden' : ''}`}>
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
                        onClick={() => { setSelectedDepartureId(d.id); if (d.label === '限時優惠' && promoContent) setShowPromoPopup(true); }}
                        className={`cursor-pointer transition ${isSelected ? "outline outline-2 outline-sky-400 bg-sky-50/40" : "hover:bg-gray-50"}`}
                        style={isSelected ? { outlineOffset: '-2px' } : undefined}
                      >
                        <td className="py-2.5 pl-5 pr-2 text-sm font-medium text-gray-900">
                          {formatFullDate(d.departure_date)}
                          {d.label === '保證出團' && <span className="ml-8 inline-flex items-center rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">保證出團</span>}
                          {d.label === '即將成團' && <span className="ml-8 inline-flex items-center rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-600">即將成團</span>}
                          {d.label === '限時優惠' && <button type="button" onClick={(e) => { e.stopPropagation(); setShowPromoPopup(true); }} className="ml-8 inline-flex items-center rounded bg-gradient-to-r from-red-100 to-rose-100 px-2 py-0.5 text-xs font-bold text-red-600 transition hover:from-red-200 hover:to-rose-200">🔥 限時優惠</button>}
                          {d.label && d.label !== '保證出團' && d.label !== '即將成團' && d.label !== '限時優惠' && !d.label.includes('去') && <span className="ml-8 inline-flex items-center rounded bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-600">{d.label}</span>}
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
              {!showAllDates && filteredDepartures.length > 5 && (
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white via-white/80 to-transparent" />
              )}
              </div>
              {filteredDepartures.length > 5 && (
                <div className="hidden justify-center border-t border-gray-100 py-2 sm:flex">
                  <button type="button" onClick={() => setShowAllDates(v => !v)} className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium text-sky-600 transition hover:bg-sky-50 hover:text-sky-500">
                    {showAllDates ? '收合 ▲' : `展開全部 ${filteredDepartures.length} 筆出發日期 ▼`}
                  </button>
                </div>
              )}

              {/* 手機版：選擇其他日期 + LINE 詢問 按鈕 */}
              {visibleDepartureDates.length > 1 && (
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

              {/* 折扣券 + 限時優惠 + 底部價格 */}
              <div className="border-t border-gray-100 px-4 pt-2.5 pb-0">
                <div className="flex flex-wrap items-center gap-2">
                <span className="relative inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-amber-500 to-orange-500 py-1 pl-3 pr-4 text-xs font-bold text-white shadow-sm before:absolute before:-left-1 before:top-1/2 before:h-2.5 before:w-2.5 before:-translate-y-1/2 before:rounded-full before:bg-white after:absolute after:-right-1 after:top-1/2 after:h-2.5 after:w-2.5 after:-translate-y-1/2 after:rounded-full after:bg-white">
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.94s4.18 1.36 4.18 3.85c0 1.89-1.44 2.96-3.12 3.19z" /></svg>
                  限時折500
                </span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-gray-200 px-4 py-3 mt-2">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-gray-700">團費</div>
                  <div className="flex items-baseline gap-1.5">
                    {(() => {
                      const currentPrice = selectedDeparture
                        ? (departureEditorPrice ? Number(departureEditorPrice) : selectedDeparture.price)
                        : null;
                      const fallbackPrice = !currentPrice && trip.price_range ? Number(trip.price_range.replace(/\D/g, '')) || null : null;
                      const displayPrice = currentPrice || fallbackPrice;
                      const originalPrice = displayPrice ? displayPrice + 500 : null;
                      return (
                        <>
                          {originalPrice && (
                            <span className="whitespace-nowrap text-lg font-bold text-gray-500 line-through decoration-red-600 decoration-2">NT${originalPrice.toLocaleString('zh-TW')}</span>
                          )}
                          <span className="whitespace-nowrap bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-2xl font-black tracking-tight text-transparent">
                            {displayPrice ? `NT$${displayPrice.toLocaleString('zh-TW')}` : '洽詢'}
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
              </div>
            </div>

            {/* Dev mode 出團資訊編輯器（Modal） */}
            {isDevMode && showBannerEditor && createPortal(
              <div className="fixed inset-0 z-modal-top flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) { setShowBannerEditor(false); setIsCreatingNewDeparture(false); } }}>
              <div className={`relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[1.25rem] border p-4 shadow-2xl ${isCreatingNewDeparture ? 'border-emerald-200 bg-emerald-50' : 'border-sky-200 bg-white'}`} onClick={e => e.stopPropagation()}>
                <button type="button" onClick={() => { setShowBannerEditor(false); setIsCreatingNewDeparture(false); }} className="absolute right-3 top-3 z-10 text-gray-400 hover:text-gray-700">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              <div className="space-y-3">
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
                    <div className="text-xs font-semibold text-gray-600">成團</div>
                    <input type="number" min="0" value={editTripBanner.min_group_size ?? ''} onChange={e => setEditTripBanner(prev => ({ ...prev, min_group_size: e.target.value ? Number(e.target.value) : null }))} placeholder="例：16" className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-sky-400" />
                  </div>
                  <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
                    <div className="text-xs font-semibold text-gray-600">標籤</div>
                    <div className="flex flex-wrap gap-1.5">
                      {['保證出團', '即將成團', '限時優惠'].map((lbl) => (
                        <button key={lbl} type="button" onClick={() => { setDepartureEditorLabel(departureEditorLabel === lbl ? '' : lbl); if (lbl === '限時優惠' && departureEditorLabel !== lbl) setShowPromoEditor(true); }} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${departureEditorLabel === lbl ? (lbl === '保證出團' ? 'bg-red-500 text-white' : lbl === '限時優惠' ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white' : 'bg-amber-500 text-white') : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>{lbl}</button>
                      ))}

                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
                    <div className="text-xs font-semibold text-gray-600">訂金</div>
                    <input value={editTripBanner.deposit_label} onChange={e => setEditTripBanner(prev => ({ ...prev, deposit_label: e.target.value.replace(/\D/g, '') }))} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-sky-400" />
                  </div>
                </div>

                <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
                  <div className="text-xs font-semibold text-gray-600">出發地</div>
                  <select
                    value={editTripBanner.departure_label || ''}
                    onChange={e => setEditTripBanner(prev => ({ ...prev, departure_label: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-sky-400"
                  >
                    <option value="">未設定</option>
                    <option value="桃園出發">桃園出發</option>
                    <option value="台北出發">台北出發</option>
                    <option value="台中出發">台中出發</option>
                    <option value="高雄出發">高雄出發</option>
                  </select>
                </div>

                <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
                  <div className="text-xs font-semibold text-gray-600">目的地</div>
                  <div className="flex items-center gap-1.5">
                    {allRegions.length > 0 ? (
                      <select
                        value={editDestinationId || trip?.destination_id}
                        onChange={e => setEditDestinationId(e.target.value)}
                        className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-sky-400"
                      >
                        {allRegions.map(region => (
                          <optgroup key={region.id} label={region.title}>
                            {(region.destinations || []).map(dest => (
                              <option key={dest.id} value={dest.id}>{dest.title}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    ) : (
                      <div className="flex flex-1 items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-400">
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-sky-400 border-r-transparent" />
                        載入中...
                      </div>
                    )}
                    <button type="button" onClick={() => setShowNewDestInput(v => !v)} className={`shrink-0 rounded-xl px-2.5 py-2 text-[11px] font-semibold transition ${showNewDestInput ? 'bg-sky-100 text-sky-600' : 'border border-gray-200 bg-white text-gray-500 hover:bg-gray-50'}`}>
                      {showNewDestInput ? '取消' : '+ 新增'}
                    </button>
                    <button
                      type="button"
                      disabled={deletingDest}
                      onClick={async () => {
                        const targetId = editDestinationId || trip?.destination_id || '';
                        if (!targetId) return;
                        if (targetId === trip?.destination_id) {
                          alert('不能刪除目前這個行程所屬的目的地，請先把行程改到其他目的地，再回來刪除這個');
                          return;
                        }
                        const targetDest = allRegions.flatMap(r => r.destinations || []).find(d => d.id === targetId);
                        if (!targetDest) return;
                        const count = targetDest.trip_count ?? 0;
                        if (count > 0) {
                          const typed = prompt(`「${targetDest.title}」底下還有 ${count} 筆行程，刪除目的地會把這些行程也一併永久刪除，且無法復原。\n\n請輸入目的地名稱「${targetDest.title}」以確認刪除：`);
                          if (typed !== targetDest.title) {
                            if (typed !== null) alert('輸入不符，已取消刪除');
                            return;
                          }
                        } else if (!confirm(`確定要刪除「${targetDest.title}」嗎？此操作無法復原。`)) {
                          return;
                        }
                        setDeletingDest(true);
                        try {
                          const res = await fetch(`/api/destinations/${targetId}`, { method: 'DELETE', credentials: 'include' });
                          if (!res.ok) { alert('刪除失敗'); return; }
                          invalidateCache('regions');
                          setAllRegions(prev => prev.map(r => ({ ...r, destinations: (r.destinations || []).filter(d => d.id !== targetId) })));
                          if (editDestinationId === targetId) setEditDestinationId(trip?.destination_id || '');
                          alert('已刪除');
                        } catch { alert('刪除失敗'); }
                        finally { setDeletingDest(false); }
                      }}
                      className="shrink-0 rounded-xl border border-red-200 bg-white px-2.5 py-2 text-[11px] font-semibold text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      {deletingDest ? '刪除中...' : '刪除'}
                    </button>
                  </div>
                </div>
                {showNewDestInput && (
                  <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-2">
                    <div className="text-xs font-semibold text-gray-600">新增</div>
                    <div className="flex items-center gap-1.5">
                      <input
                        value={newDestName}
                        onChange={e => setNewDestName(e.target.value)}
                        placeholder="輸入新目的地名稱，如：埃及"
                        className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-sky-400"
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('btn-create-dest')?.click(); } }}
                      />
                      <input
                        value={newDestSubRegion}
                        onChange={e => setNewDestSubRegion(e.target.value)}
                        placeholder="子分類（選填，如：華中）"
                        className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-sky-400"
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('btn-create-dest')?.click(); } }}
                      />
                      <button
                        id="btn-create-dest"
                        type="button"
                        disabled={creatingDest || !newDestName.trim()}
                        onClick={async () => {
                          const name = newDestName.trim();
                          if (!name) return;
                          const currentDest = trip?.destinations;
                          const regionId = currentDest?.region_id;
                          if (!regionId) { alert('無法取得目前區域 ID'); return; }
                          setCreatingDest(true);
                          try {
                            const res = await fetch('/api/destinations', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              credentials: 'include',
                              body: JSON.stringify({ region_id: regionId, title: name, sub_region: newDestSubRegion.trim() }),
                            });
                            if (!res.ok) { alert('建立失敗'); return; }
                            const created = await res.json();
                            invalidateCache('regions');
                            setAllRegions(prev => prev.map(r => r.id === regionId ? { ...r, destinations: [...(r.destinations || []), created] } : r));
                            setEditDestinationId(created.id);
                            setNewDestName('');
                            setNewDestSubRegion('');
                            setShowNewDestInput(false);
                          } catch { alert('建立失敗'); }
                          finally { setCreatingDest(false); }
                        }}
                        className="shrink-0 rounded-xl bg-emerald-500 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-50"
                      >
                        {creatingDest ? '建立中...' : '建立'}
                      </button>
                    </div>
                  </div>
                )}

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

                <div>
                  <div className="mb-1 text-xs text-gray-500">國家標籤（Enter 新增，卡片右上角會顯示）</div>
                  <div className="flex flex-wrap gap-1.5 rounded-xl border border-gray-200 bg-white px-2.5 py-2">
                    {(editTripBanner.countries || []).map((country, i) => (
                      <span key={`${country}-${i}`} className="flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs text-sky-600">
                        {country}
                        <button type="button" onClick={() => setEditTripBanner(prev => ({ ...prev, countries: (prev.countries || []).filter((_, idx) => idx !== i) }))} className="ml-0.5 text-gray-400 hover:text-red-500">×</button>
                      </span>
                    ))}
                    <input value={editBannerCountryInput} onChange={e => setEditBannerCountryInput(e.target.value)} placeholder="輸入國家名，如：烏茲別克..." className="min-w-[80px] flex-1 bg-transparent px-1 py-0.5 text-sm text-gray-900 outline-none" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const val = editBannerCountryInput.trim(); if (!val) return; setEditTripBanner(prev => ({ ...prev, countries: [...(prev.countries || []), val] })); setEditBannerCountryInput(''); } }} />
                  </div>
                </div>

                <div className="flex flex-wrap justify-center gap-2">
                  <button onClick={isCreatingNewDeparture ? saveDepartureInfoAsFirstDeparture : (selectedDeparture ? saveSelectedDepartureInfo : saveDepartureInfoAsFirstDeparture)} disabled={saving} className="rounded-full bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-500 disabled:opacity-60">
                    {saving ? '儲存中...' : isCreatingNewDeparture ? '建立新梯次' : selectedDeparture ? '儲存目前梯次' : '建立首梯並儲存'}
                  </button>
                  {selectedDeparture && !isCreatingNewDeparture && (
                    <button type="button" disabled={saving} onClick={() => { setIsCreatingNewDeparture(true); setDepartureEditorDate(selectedDeparture?.departure_date || new Date().toLocaleDateString('sv-SE')); setDepartureEditorGroupCode(selectedDepartureInfo.group_code || ''); setDepartureEditorPrice(selectedDeparture?.price ? String(selectedDeparture.price) : ''); setDepartureEditorWaitlist(typeof selectedDepartureInfo.waitlist_count === 'number' ? String(selectedDepartureInfo.waitlist_count) : ''); setDepartureEditorLabel(selectedDeparture?.label || ''); }} className="rounded-full border border-sky-200 bg-sky-50 px-4 py-1.5 text-xs font-semibold text-sky-600 transition hover:bg-sky-100 disabled:opacity-60">+ 新增梯次</button>
                  )}
                  {isCreatingNewDeparture && (
                    <button type="button" onClick={() => setIsCreatingNewDeparture(false)} className="rounded-full border border-gray-200 bg-gray-50 px-4 py-1.5 text-xs font-semibold text-gray-500 transition hover:bg-gray-100">取消新增</button>
                  )}
                  <button type="button" onClick={() => { setEditTripBanner(EMPTY_TRIP_BANNER); setEditDayCount(''); setEditNightCount(''); setDepartureEditorGroupCode(''); setDepartureEditorWaitlist(''); setDepartureEditorPrice(''); setDetailTitle(''); setDetailSubtitle(''); setDetailAdultPrice(''); setDetailChildWithBedPrice(''); setDetailChildNoBedPrice(''); setDetailChildExtraBedPrice(''); setDetailInfantPrice(''); setDetailPricingNote(''); setDetailDeposit(''); setDetailSingleRoom(''); setDetailVisaFee(''); setDetailSurcharge(''); setDetailGroupNote(''); setDetailQuoteNote(''); setDetailVisaNote(''); }} className="rounded-full border border-red-200 bg-red-50 px-4 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100">清空目前內容</button>
                </div>
              </div>
              </div>
              </div>,
              document.body
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
                <label className="mb-1 block text-xs text-gray-500">目的地</label>
                {allRegions.length > 0 ? (
                  <select
                    value={editDestinationId}
                    onChange={e => setEditDestinationId(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-sky-400"
                  >
                    {allRegions.map(region => (
                      <optgroup key={region.id} label={region.title}>
                        {(region.destinations || []).map(dest => (
                          <option key={dest.id} value={dest.id}>{dest.title}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-400">
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-sky-400 border-r-transparent" />
                    載入目的地列表...
                  </div>
                )}
              </div>
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
                <label className="mb-1 block text-xs text-gray-500">價格區間（不建梯次時用這個顯示價格）</label>
                <input value={editPriceRange} onChange={e => setEditPriceRange(e.target.value)}
                  placeholder="例：NT$39,900"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-sky-400" />
              </div>

            </div>
            <button
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                const payload: Record<string, string> = {
                  title: editTitle.trim(),
                  subtitle: editSubtitle.trim(),
                  price_range: editPriceRange.trim(),
                };
                if (editDestinationId && editDestinationId !== trip?.destination_id) {
                  payload.destination_id = editDestinationId;
                }
                const res = await fetch(`/api/trips/${tripId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify(payload),
                });
                if (res.ok) {
                  const updated = await res.json();
                  let newDest = trip.destinations;
                  if (editDestinationId && editDestinationId !== trip?.destination_id) {
                    for (const region of allRegions) {
                      const found = (region.destinations || []).find(d => d.id === editDestinationId);
                      if (found) { newDest = found; break; }
                    }
                  }
                  setTrip(prev => prev ? { ...prev, ...updated, destinations: newDest } : prev);
                  invalidateCache('trip:' + tripId);
                  invalidateCache('dest-trips:');
                  setShowEditPanel(false);
                  showSaveSuccess('儲存成功');
                } else {
                  alert('儲存失敗，請確認已登入開發者模式');
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
          dates={visibleDepartureDates}
          isDevMode={isDevMode}
          onDatesChange={setDepartureDates}
          selectedDateId={selectedDepartureId}
          onSelectedDateChange={setSelectedDepartureId}
          onSaveSuccess={() => showSaveSuccess('出團梯次已儲存')}
        />

        {/* ═══ 手機版：團號 + 航班標籤 + 標籤（桌面版在左欄顯示） ═══ */}
        {selectedDeparture && (
          <div className="mb-4 space-y-2 rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm lg:hidden">
            {editTripBanner.tags && editTripBanner.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {editTripBanner.tags.map((tag, i) => (
                  <span key={i} className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600">{tag}</span>
                ))}
              </div>
            )}
            {getScheduleLabel(selectedDeparture) && (
              <div className="flex items-center gap-2.5">
                <svg className="h-4 w-4 shrink-0 text-sky-600" fill="currentColor" viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" /></svg>
                <span className="text-sm font-medium text-gray-900">{getScheduleLabel(selectedDeparture)}</span>
              </div>
            )}
            <div className="flex items-center gap-2.5">
              <span className="min-w-[36px] text-[11px] text-sky-600">團號</span>
              <span className="text-sm font-medium text-gray-900">{selectedDepartureInfo.group_code || '—'}</span>
            </div>
          </div>
        )}

        {/* ═══ 航班資訊 ═══ */}
        {hasFlightData && flightSource && (
          <section className="mb-8 flex flex-col gap-0 sm:flex-row">
            {/* 左側直排標籤 */}
            <div className="hidden shrink-0 sm:flex sm:flex-col sm:items-center sm:justify-center sm:rounded-l-xl sm:border sm:border-r-0 sm:border-sky-200 sm:bg-sky-50 sm:px-3 sm:py-4">
              <span className="text-base font-bold tracking-[0.3em] text-sky-600" style={{writingMode:'vertical-rl'}}>參考航班</span>
            </div>
            {/* 手機版標題（已整合到下方卡片） */}
            <div className="min-w-0 flex-1">
            <div className="hidden flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-t-xl border border-b-0 border-gray-200 bg-white px-4 py-3 sm:flex sm:rounded-tl-none">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 shrink-0 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <span className="text-sm font-bold text-gray-900">出團日期：{formatFullDate(selectedDeparture?.departure_date || flightSource.departure_date)}</span>
                {selectedDeparture && !hasFlight(selectedDeparture) && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">以其他梯次為參考</span>
                )}
                {getScheduleLabel(flightSource) && (
                  <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-600">{getScheduleLabel(flightSource)}</span>
                )}
                {flightSource.label && !flightSource.label.includes('去') && (
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${flightSource.label === '保證出團' ? 'bg-red-100 text-red-600' : flightSource.label === '即將成團' ? 'bg-amber-100 text-amber-600' : 'bg-sky-100 text-sky-600'}`}>
                    {flightSource.label}
                  </span>
                )}
              </div>
              <span className="text-xs text-amber-600">實際航班以團體確認為準</span>
            </div>

            {flightSource.flight_segments && flightSource.flight_segments.length > 0 ? (
              <>
                {/* 桌面版航班表格 */}
                <div className="hidden overflow-hidden rounded-r-lg rounded-bl-lg border border-gray-200 sm:block">
                  <div className="grid grid-cols-[84px_1.4fr_1fr_1fr] bg-gray-50">
                    <div className="border-b border-r border-gray-200 px-3 py-2.5 text-center text-sm font-bold text-gray-600">航段</div>
                    <div className="border-b border-r border-gray-200 px-3 py-2.5 text-center text-sm font-bold text-gray-600">班機日期・航空公司及航班</div>
                    <div className="border-b border-r border-gray-200 px-3 py-2.5 text-center text-sm font-bold text-gray-600">起飛時間及機場</div>
                    <div className="border-b border-gray-200 px-3 py-2.5 text-center text-sm font-bold text-gray-600">抵達時間及機場</div>
                  </div>
                  {flightLegGroups.map((group, gi) => {
                    const isFirst = group.label === '去程';
                    const isLast = group.label === '回程';
                    const iconColor = isFirst ? "text-sky-500" : isLast ? "text-amber-500" : "text-violet-500";
                    const groupBg = isFirst ? "bg-sky-50/50" : isLast ? "bg-amber-50/50" : "bg-violet-50/50";
                    const segDate = group.date ? (() => { const sd = new Date(group.date + 'T00:00:00'); if (isNaN(sd.getTime())) return null; const w = ['日','一','二','三','四','五','六'][sd.getDay()]; return `${sd.getFullYear()}/${String(sd.getMonth()+1).padStart(2,'0')}/${String(sd.getDate()).padStart(2,'0')}（${w}）`; })() : null;
                    return (
                      // 每一組（去程／回程）用底色區塊框起來，組內每個航班選項之間有分隔線，
                      // 組跟組之間有較粗的邊框，避免多家航空公司選項全部黏在一起分不清楚
                      <div key={gi} className={`${groupBg} ${gi < flightLegGroups.length - 1 ? 'border-b-2 border-gray-300' : 'border-b border-gray-200'}`}>
                        {group.segs.map((seg, si) => (
                          <div key={si} className={`grid grid-cols-[84px_1.4fr_1fr_1fr] items-stretch ${si > 0 ? 'border-t border-dashed border-gray-200' : ''}`}>
                            <div className="flex items-center justify-center gap-2 border-r border-gray-200 px-3 py-3">
                              {si === 0 && (
                                <>
                                  <svg className={`h-3.5 w-3.5 shrink-0 ${iconColor} ${isLast ? "rotate-180" : ""}`} fill="currentColor" viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" /></svg>
                                  <span className={`text-sm font-bold ${isFirst ? "text-sky-600" : isLast ? "text-amber-600" : "text-violet-600"}`}>{group.label}</span>
                                </>
                              )}
                            </div>
                            <div className="flex flex-col items-center justify-center border-r border-gray-200 px-3 py-3 text-center leading-tight">
                              {si === 0 && segDate && <div className="text-xs text-gray-500">{segDate}</div>}
                              <div className="text-base font-bold text-gray-900">{seg.isTransfer && <span className="mr-1.5 rounded bg-violet-100 px-1.5 py-0.5 align-middle text-[10px] font-bold text-violet-600">轉機</span>}{seg.airline}{seg.flight_number && <span className="ml-1.5 text-gray-600">{seg.flight_number}</span>}</div>
                            </div>
                            <div className="flex flex-col justify-center border-r border-gray-200 px-3 py-3">
                              <div className="flex items-baseline gap-2">
                                {seg.dep_time && <span className="text-base font-bold text-gray-900">{seg.dep_time}</span>}
                                {seg.dep_airport && <span className="text-sm text-gray-600">{seg.dep_airport}</span>}
                              </div>
                            </div>
                            <div className="flex flex-col justify-center px-3 py-3">
                              <div className="flex items-baseline gap-2">
                                {seg.arr_time && <span className="text-base font-bold text-gray-900">{seg.arr_time}</span>}
                                {seg.arr_airport && <span className="text-sm text-gray-600">{seg.arr_airport}</span>}
                                {seg.next_day && <span className="ml-1 text-base font-bold text-amber-600">+1天</span>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
                {/* 手機版航班（仿易飛網） */}
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white sm:hidden">
                  <div className="border-b border-gray-200 py-2.5 text-center text-sm font-bold text-gray-900">
                    參考航班
                  </div>
                  {flightLegGroups.map((group, gi) => {
                    const isFirst = group.label === '去程';
                    const isLast = group.label === '回程';
                    const labelColor = isFirst ? "text-sky-600" : isLast ? "text-amber-600" : "text-violet-600";
                    const groupBg = isFirst ? "bg-sky-50/50" : isLast ? "bg-amber-50/50" : "bg-violet-50/50";
                    const segDate = group.date ? (() => { const sd = new Date(group.date + 'T00:00:00'); if (isNaN(sd.getTime())) return null; const w = ['日','一','二','三','四','五','六'][sd.getDay()]; return `${sd.getFullYear()}/${String(sd.getMonth()+1).padStart(2,'0')}/${String(sd.getDate()).padStart(2,'0')}（${w}）`; })() : null;
                    return (
                      // 每一組（去程／回程）用底色區塊框起來，組跟組之間有較粗的邊框
                      <div key={gi} className={`${groupBg} ${gi < flightLegGroups.length - 1 ? 'border-b-2 border-gray-300' : ''}`}>
                        {group.segs.map((seg, si) => (
                          <div key={si} className={`px-4 py-3 ${si > 0 ? 'border-t border-dashed border-gray-200' : ''}`}>
                            <div className="flex items-center gap-2 text-xs text-gray-700">
                              <span className={`font-bold ${labelColor}`}>{group.label}</span>
                              <span className="text-gray-300">|</span>
                              {si === 0 && segDate && <span>{segDate}</span>}
                              <span className="ml-1">{seg.isTransfer && <span className="mr-1 rounded bg-violet-100 px-1 text-[10px] font-bold text-violet-600">轉機</span>}{seg.airline}{seg.flight_number && ` ${seg.flight_number}`}</span>
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
                                  {seg.next_day && <span className="ml-1 text-base font-bold text-amber-600">+1天</span>}
                                </div>
                                <div className="mt-0.5 text-xs text-gray-500">{seg.arr_airport || ''}</div>
                              </div>
                            </div>
                          </div>
                        ))}
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
                    <span className="text-xs">→ <span className="font-semibold text-gray-900">{flightSource.outbound_arrival_time}</span> {flightSource.outbound_to}{flightSource.outbound_next_day && <span className="ml-1 font-bold text-amber-600">+1天</span>}</span>
                  </div>
                )}
                {(flightSource.return_flight || flightSource.return_time) && (
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-3">
                    <span className="text-xs font-bold text-amber-600">回程</span>
                    <span className="text-xs text-gray-700">{flightSource.return_date ? formatFullDate(flightSource.return_date) : '—'}</span>
                    <span className="text-xs text-gray-700">{flightSource.airline} {flightSource.return_flight}</span>
                    <span className="text-xs"><span className="font-semibold text-gray-900">{flightSource.return_time}</span> {flightSource.return_from}</span>
                    <span className="text-xs">→ <span className="font-semibold text-gray-900">{flightSource.return_arrival_time}</span> {flightSource.return_to}{flightSource.return_next_day && <span className="ml-1 font-bold text-amber-600">+1天</span>}</span>
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
                  invalidateCache('trip:' + tripId);
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
                    invalidateCache('trip:' + tripId);
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
            </div>
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

      {/* PDF 全版面嵌入（canvas 渲染，防止直接下載）— 滾動到才載入 */}
      {days.length === 0 && trip.document_url && (
        <div id="trip-document" className="mx-auto w-full max-w-[800px] px-3 sm:px-4">
          <div ref={pdfSentinelRef} />
          {pdfVisible ? (
            <PdfViewer url={trip.document_url} title={`${trip.title} 行程表`} isDevMode={isDevMode} />
          ) : (
            <div className="flex items-center justify-center py-16">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-sky-400 border-r-transparent" />
              <span className="ml-3 text-sm text-gray-500">載入行程檔案...</span>
            </div>
          )}
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
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {recommendedTrips.slice(0, 6).map((rt) => (
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
                    countries={rt.trip_banner?.countries}
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

        {/* 索取行程 / 詢問報價 CTA */}
        <div className="mb-8 mt-6">
          <InquiryButtons tripTitle={trip.title} tripId={tripId} variant="inline" selectedDate={selectedDeparture?.departure_date} />
        </div>

        <SocialCta className="mt-10" title="喜歡這個行程嗎？" description="聯繫旅遊規劃師蓋瑞 GARY，為您量身打造專屬行程" />

      </div>

      {/* 售價說明彈窗（用戶端） */}
      <PriceInfoModal
        open={showPriceInfoModal}
        detail={priceDetailPreview}
        onClose={() => setShowPriceInfoModal(false)}
      />

      {/* 手機版出發日期選擇 Modal（仿易飛網全螢幕樣式） */}
      <MobileDatePickerModal
        open={showMobileDatePicker}
        departureDates={visibleDepartureDates}
        selectedDepartureId={selectedDepartureId}
        onSelect={(id, label) => {
          setSelectedDepartureId(id);
          setShowMobileDatePicker(false);
          // 促銷判斷留在此處：需要頁面的 promoContent
          if (label === '限時優惠' && promoContent) setShowPromoPopup(true);
        }}
        onClose={() => setShowMobileDatePicker(false)}
      />

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
      {/* 限時優惠 — 開發者編輯彈窗 */}
      {showPromoEditor && createPortal(
        <div className="fixed inset-0 z-modal-top flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) setShowPromoEditor(false); }}>
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">編輯限時優惠</h3>
              <button onClick={() => setShowPromoEditor(false)} className="text-gray-400 hover:text-gray-700">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <span className="text-sm font-semibold text-gray-700">啟用限時優惠彈窗</span>
                <button type="button" onClick={() => setPromoEnabled(!promoEnabled)} className={`relative h-6 w-11 rounded-full transition ${promoEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${promoEnabled ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">優惠內容（用戶看到的文字）</label>
                <textarea value={promoContent} onChange={e => setPromoContent(e.target.value)} rows={5} placeholder="例：即日起報名享早鳥優惠折扣 NT$500！&#10;加碼贈送：免費 WiFi 機&#10;活動期限：2026/06/30 止" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-sky-400" />
              </div>
              <button type="button" disabled={savingPromo} onClick={async () => {
                setSavingPromo(true);
                try {
                  const updatedBanner = { ...editTripBanner, promo_enabled: promoEnabled, promo_content: promoContent.trim() };
                  const res = await fetch(`/api/trips/${tripId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ trip_banner: updatedBanner }) });
                  if (res.ok) {
                    const updated = await res.json();
                    setTrip(prev => prev ? { ...prev, ...updated } : prev);
                    invalidateCache('trip:' + tripId);
                    invalidateCache('dest-trips:');
                    setShowPromoEditor(false);
                    showSaveSuccess('限時優惠已儲存');
                  } else { alert('儲存失敗，請確認已登入開發者模式'); }
                } catch { alert('儲存失敗'); } finally { setSavingPromo(false); }
              }} className="w-full rounded-full bg-sky-600 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:opacity-60">
                {savingPromo ? '儲存中...' : '儲存'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* PDF 變更預覽 Modal */}
      {pdfPreview && createPortal(
        <div
          className="fixed inset-0 z-modal-top flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setPdfPreview(null); }}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* 標題列 */}
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">PDF 解析結果預覽</h3>
                <p className="mt-0.5 text-xs text-gray-500">確認以下變更後按「確認儲存」寫入資料庫</p>
              </div>
              <button
                onClick={() => setPdfPreview(null)}
                className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 變更列表 */}
            <div className="max-h-[50vh] overflow-y-auto px-5 py-4">
              {pdfPreview.changes.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500">未偵測到任何欄位變更</p>
              ) : (
                <div className="space-y-3">
                  {pdfPreview.changes.map(c => (
                    <label key={c.field} className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 transition hover:bg-gray-100">
                      <input
                        type="checkbox"
                        checked={pdfSelectedFields.has(c.field)}
                        onChange={() => setPdfSelectedFields(prev => {
                          const next = new Set(prev);
                          if (next.has(c.field)) next.delete(c.field); else next.add(c.field);
                          return next;
                        })}
                        className="mt-1 h-4 w-4 shrink-0 accent-sky-600"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="mb-1.5 text-xs font-semibold tracking-wide text-sky-600">{c.label}</p>
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-medium text-gray-400">舊值</p>
                            <p className="mt-0.5 break-words text-xs text-gray-500 line-through">{c.oldVal}</p>
                          </div>
                          <div className="mt-4 shrink-0 text-gray-300">→</div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-medium text-emerald-600">新值</p>
                            <p className="mt-0.5 break-words text-sm font-semibold text-gray-900">{c.newVal}</p>
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* 底部按鈕 */}
            <div className="flex gap-3 border-t border-gray-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setPdfPreview(null)}
                disabled={pdfSaving}
                className="flex-1 rounded-full border border-gray-200 bg-white py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-60"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => void confirmPdfSave()}
                disabled={pdfSaving || pdfSelectedFields.size === 0}
                className="flex-1 rounded-full bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
              >
                {pdfSaving ? '儲存中...' : '✅ 確認儲存'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 限時優惠 — 用戶彈窗 */}
      {showPromoPopup && promoEnabled && promoContent && createPortal(
        <div className="fixed inset-0 z-modal-top flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) setShowPromoPopup(false); }}>
          <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="relative rounded-t-2xl bg-gradient-to-r from-red-500 to-rose-500 px-5 py-4">
              <h3 className="text-lg font-black text-white">🎉 限時優惠</h3>
              <button onClick={() => setShowPromoPopup(false)} className="absolute right-3 top-3 rounded-full bg-white/20 p-1 text-white transition hover:bg-white/40">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-5 py-4">
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{promoContent}</div>
              <a href={lineHref} target="_blank" rel="noopener noreferrer" className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#06C755] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#05b64d]">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" /></svg>
                立即 LINE 詢問優惠
              </a>
            </div>
          </div>
        </div>,
        document.body
      )}

      {isDevMode && (
        <button
          type="button"
          onClick={openSourceUrlModal}
          title={trip?.source_url ? `朋威來源：${trip.source_url}` : '尚未設定朋威來源網址'}
          className={`fixed bottom-48 right-4 z-[56] flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-lg transition ${
            trip?.source_url ? 'bg-slate-600 hover:bg-slate-500' : 'bg-orange-500 hover:bg-orange-400'
          }`}
        >
          {trip?.source_url ? '🔗 來源網址' : '🔗 設定來源'}
        </button>
      )}

      {isDevMode && (
        <button
          type="button"
          onClick={() => void handlePdfScrape()}
          disabled={pdfScraping || !trip?.document_url}
          title={!trip?.document_url ? '請先上傳 PDF' : undefined}
          className="fixed bottom-36 right-4 z-[56] flex items-center gap-2 rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-amber-500 disabled:opacity-60"
        >
          {pdfScraping ? '⏳ 解析中...' : '📄 從 PDF 抓取'}
        </button>
      )}

      {isDevMode && (
        <button
          type="button"
          onClick={() => {
            if (scrapePhase === 'has_changes') setShowScrapePreviewModal(true);
            else void handleScrapeThisTrip();
          }}
          disabled={scrapePhase === 'triggering' || scrapePhase === 'polling' || scrapePhase === 'applying' || scrapePhase === 'done' || scrapePhase === 'no_changes'}
          className={`fixed bottom-24 right-4 z-[56] flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-lg transition disabled:opacity-60 ${
            scrapePhase === 'has_changes' ? 'bg-emerald-600 hover:bg-emerald-500' :
            scrapePhase === 'error' ? 'bg-red-600 hover:bg-red-500' :
            scrapePhase === 'done' || scrapePhase === 'no_changes' ? 'bg-emerald-600' :
            'bg-purple-600 hover:bg-purple-500'
          }`}
        >
          {scrapePhase === 'idle' && '🔄 抓取此行程'}
          {scrapePhase === 'triggering' && '⏳ 啟動中...'}
          {scrapePhase === 'polling' && '⏳ 抓取中...'}
          {scrapePhase === 'has_changes' && `✅ 套用更新 (${scrapePendingChanges.length} 筆)`}
          {scrapePhase === 'applying' && '⏳ 套用中...'}
          {scrapePhase === 'done' && '✅ 已更新'}
          {scrapePhase === 'no_changes' && '✅ 無變更'}
          {scrapePhase === 'error' && '❌ 重試'}
        </button>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-[55] flex flex-col">
        {isJapanTrip && <JapanInquiryBar />}
        <div className="px-0 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:px-4 sm:pb-4">
        <div className="mx-auto w-full max-w-[1000px] overflow-hidden bg-white/95 shadow-lg backdrop-blur-md border-t border-gray-200 sm:rounded-2xl sm:border">
          <div className="flex items-center justify-between gap-2 px-4 py-3 sm:px-5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-gray-900 sm:text-sm">{trip.title}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2">
                <span className="text-[10px] font-semibold tracking-[0.15em] text-sky-600">立即詢價</span>
                {ctaGroupCode && (
                  <span className="text-[10px] text-gray-400">團號 {ctaGroupCode}</span>
                )}
              </div>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="truncate text-base font-black text-gray-900 sm:text-2xl">{ctaPriceText}</span>
                {!isCustomTour && ctaDateText && (
                  <span className="truncate text-[11px] text-gray-500 sm:text-xs">{ctaDateText}</span>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => {
                  track({ event_type: 'trip_share', platform: 'LINE', trip_id: tripId, trip_title: trip.title });
                  handleShare();
                }}
                title="分享行程"
                aria-label="分享行程"
                className="flex h-10 w-10 shrink-0 items-center justify-center gap-1.5 rounded-full bg-sky-600 px-0 text-sm font-bold text-white transition hover:bg-sky-500 sm:w-auto sm:px-4"
              >
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7.5 10.5L12 6m0 0l4.5 4.5M12 6v10.5" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 16.5v2A1.5 1.5 0 006.5 20h11a1.5 1.5 0 001.5-1.5v-2" />
                </svg>
                <span className="hidden sm:inline">分享行程</span>
              </button>

              {trip.document_url && (
                <button
                  type="button"
                  onClick={() => {
                    track({ event_type: 'trip_download', platform: 'direct', trip_id: tripId, trip_title: trip.title });
                    window.open(`/api/download-trip-pdf?url=${encodeURIComponent(trip.document_url || '')}&name=${encodeURIComponent(trip.title)}`, '_blank');
                  }}
                  title="下載行程"
                  aria-label="下載行程"
                  className="flex h-10 w-10 shrink-0 items-center justify-center gap-1.5 rounded-full bg-slate-700 px-0 text-sm font-bold text-white transition hover:bg-slate-600 sm:w-auto sm:px-4"
                >
                  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v10.5m0 0l-4-4m4 4l4-4" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 16.5v2A1.5 1.5 0 006.5 20h11a1.5 1.5 0 001.5-1.5v-2" />
                  </svg>
                  <span className="hidden sm:inline">下載行程</span>
                </button>
              )}

              <a
                href={lineHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track({ event_type: 'line_inquiry', trip_id: tripId, trip_title: trip.title })}
                className="flex h-10 shrink-0 items-center justify-center rounded-full bg-[#06C755] px-4 text-sm font-bold text-white transition hover:bg-[#05b64d]"
              >
                LINE 諮詢
              </a>
            </div>
          </div>
        </div>
        </div>
      </div>

      <SourceUrlModal
        open={showSourceUrlModal}
        draft={sourceUrlDraft}
        saving={savingSourceUrl}
        onDraftChange={setSourceUrlDraft}
        onSave={() => void handleSaveSourceUrl()}
        onClose={() => setShowSourceUrlModal(false)}
      />

      {showScrapePreviewModal && createPortal(
        <div
          className="fixed inset-0 z-modal-top flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setShowScrapePreviewModal(false); }}
        >
          <div className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h3 className="text-base font-bold text-gray-900">📋 抓取變更預覽</h3>
              <button
                type="button"
                onClick={() => setShowScrapePreviewModal(false)}
                className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-2">
              <span className="text-xs text-gray-500">已選 {scrapeSelectedChangeIds.size} / {scrapePendingChanges.length} 項，取消打勾的不會更新</span>
              <button
                type="button"
                onClick={() => setScrapeSelectedChangeIds(
                  scrapeSelectedChangeIds.size === scrapePendingChanges.length
                    ? new Set()
                    : new Set(scrapePendingChanges.map(c => c.id))
                )}
                className="text-xs font-medium text-sky-600 hover:text-sky-500"
              >
                {scrapeSelectedChangeIds.size === scrapePendingChanges.length ? '取消全選' : '全選'}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {scrapePendingChanges.map(c => (
                <label key={c.id} className="flex cursor-pointer items-start gap-2.5 px-5 py-3 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={scrapeSelectedChangeIds.has(c.id)}
                    onChange={() => {
                      const next = new Set(scrapeSelectedChangeIds);
                      if (next.has(c.id)) next.delete(c.id); else next.add(c.id);
                      setScrapeSelectedChangeIds(next);
                    }}
                    className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="inline-block rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                      {getChangeLabel(c.change_type, c.field_name)}
                    </span>
                    <div className="mt-1.5 grid grid-cols-[1fr_auto_1fr] items-start gap-1.5">
                      <p className="break-all rounded bg-red-50 px-2 py-1 text-xs text-red-700 line-through">
                        {formatDiffValue(c.old_value)}
                      </p>
                      <span className="pt-1 text-xs text-gray-400">→</span>
                      <p className="break-all rounded bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                        {formatDiffValue(c.new_value)}
                      </p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setShowScrapePreviewModal(false)}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
              >
                取消
              </button>
              <button
                type="button"
                disabled={scrapeSelectedChangeIds.size === 0}
                onClick={() => { setShowScrapePreviewModal(false); void handleApplyChanges(); }}
                className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ✅ 確認更新 ({scrapeSelectedChangeIds.size})
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </main>
  );
}
