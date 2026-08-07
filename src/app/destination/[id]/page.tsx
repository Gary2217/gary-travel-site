"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import { getDestination, getDestinationTrips, getRelatedTrips, getSiteLogo, createTrip, deleteTrip, cloneTrip, lineDmHref, invalidateCache, type Destination, type Trip } from "@/lib/supabase";
import Image from "next/image";
import { openExternalLink } from "@/lib/external-link";
import FloatingContact from "@/components/FloatingContact";
import SocialCta from "@/components/SocialCta";
import StickyHeader from "@/components/StickyHeader";
import TripCard from "@/components/TripCard";
import DevModeToggle from "@/components/DevModeToggle";
import Toast from "@/components/Toast";

type DestScrapeChange = {
  id: string;
  change_type: string;
  field_name?: string;
  old_value?: unknown;
  new_value?: unknown;
  trip_title?: string;
  trip_id?: string;
};

const DEST_CHANGE_FIELD_LABEL: Record<string, string> = {
  price: '價格',
  price_detail: '售價明細',
  flight: '航班',
  departure: '出發日期',
  promotion: '優惠',
  removed: '下架',
  warning: '提示',
  new_trip: '新行程',
};
const DEST_INFO_FIELD_LABEL: Record<string, string> = {
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
function getDestChangeLabel(change_type: string, field_name?: string): string {
  if (change_type === 'info' && field_name) return DEST_INFO_FIELD_LABEL[field_name] ?? field_name;
  return DEST_CHANGE_FIELD_LABEL[change_type] ?? change_type;
}
function formatDestDiffValue(value: unknown): string {
  if (value === null || value === undefined) return '（無）';
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  return str.length > 80 ? str.slice(0, 80) + '...' : str;
}

// 只有「洽詢加LINE」(custom_tour) 的行程排最後；其餘（含目前無出發日期）一律排前面，同組內依 display_order，再 id 穩定排序
const isInquiryOnly = (trip: Trip) =>
  !!trip.trip_banner?.custom_tour;

/** 取行程的子區域標籤（trim；無值回空字串）。與元件內的 normalizeSubArea 同義，供元件外/內共用 */
const getTripSubArea = (trip: Trip): string =>
  ((trip.trip_banner?.sub_area as string) || '').trim();

const compareTrips = (a: Trip, b: Trip): number => {
  const ap = isInquiryOnly(a) ? 1 : 0;
  const bp = isInquiryOnly(b) ? 1 : 0;
  if (ap !== bp) return ap - bp;
  const ao = a.display_order ?? Number.MAX_SAFE_INTEGER;
  const bo = b.display_order ?? Number.MAX_SAFE_INTEGER;
  if (ao !== bo) return ao - bo;
  return 0;
};

async function handleReorder<T extends { id: string; display_order: number }>(
  table: 'destinations' | 'trips',
  items: T[],
  fromIndex: number,
  toIndex: number,
  setItems: (items: T[]) => void
) {
  if (toIndex < 0 || toIndex >= items.length || fromIndex === toIndex) return;

  const current = items[fromIndex];
  const target = items[toIndex];

  const currentOrder = current.display_order;
  const targetOrder = target.display_order;

  const updated = [...items];
  updated[fromIndex] = { ...current, display_order: targetOrder };
  updated[toIndex] = { ...target, display_order: currentOrder };
  updated.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  setItems(updated);

  const res = await fetch('/api/reorder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      table,
      items: [
        { id: current.id, display_order: targetOrder },
        { id: target.id, display_order: currentOrder },
      ],
    }),
  });

  if (!res.ok) {
    setItems(items);
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || '排序儲存失敗');
  }
}

export default function DestinationPage() {
  const params = useParams();
  const router = useRouter();
  const destinationId = params.id as string;

  // 從 URL ?tab= 讀取/寫入當前 tab（支援深層連結）
  const setTabParam = (tab: string) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (tab && tab !== '全部') {
      url.searchParams.set('tab', tab);
      url.searchParams.delete('all');
    } else {
      url.searchParams.delete('tab');
    }
    window.history.replaceState({}, '', url.toString());
  };
  const getTabParam = () => {
    if (typeof window === 'undefined') return '';
    return new URL(window.location.href).searchParams.get('tab') || '';
  };
  const getAllParam = () => {
    if (typeof window === 'undefined') return false;
    return new URL(window.location.href).searchParams.get('all') === '1';
  };
  // 多-destination sub_region 內選中的特定 destination（如「新疆」群組下的「南疆」），
  // 讓返回上一頁時能還原到當初點進行程卡片時的確切篩選狀態，而不是退回整個群組的合併列表。
  const setDestFilterParam = (destId: string | null) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (destId) {
      url.searchParams.set('dest', destId);
    } else {
      url.searchParams.delete('dest');
    }
    window.history.replaceState({}, '', url.toString());
  };
  const getDestFilterParam = () => {
    if (typeof window === 'undefined') return '';
    return new URL(window.location.href).searchParams.get('dest') || '';
  };

  const [destination, setDestination] = useState<Destination & { regions?: { category_label: string; title: string } } | null>(null);
  const [regionTabs, setRegionTabs] = useState<{ label: string; destId: string }[]>([]);
  const [currentTabLabel, setCurrentTabLabel] = useState("");
  const [subRegionGroups, setSubRegionGroups] = useState<{ subRegion: string; destinations: { id: string; label: string }[] }[]>([]);
  const [activeSubRegion, setActiveSubRegion] = useState("");
  const [subRegionTrips, setSubRegionTrips] = useState<Trip[] | null>(null);
  const [activeDestFilter, setActiveDestFilter] = useState<string | null>(null);
  const [subRegionLoading, setSubRegionLoading] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDevMode, setIsDevMode] = useState(false);
  const [hiddenTrips, setHiddenTrips] = useState<Trip[]>([]);
  const [showHidden, setShowHidden] = useState(false);
  const [siteLogoUrl, setSiteLogoUrl] = useState('/travel-logo.svg');
  const [dateFilter, setDateFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [relatedTrips, setRelatedTrips] = useState<{ regionTrips: Trip[]; categoryTrips: Trip[] } | null>(null);
  const [popularFallback, setPopularFallback] = useState<Trip[] | null>(null);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [scrapeTriggering, setScrapeTriggering] = useState(false);
  const [scrapeRunning, setScrapeRunning] = useState(false);
  const [scrapePendingIds, setScrapePendingIds] = useState<string[]>([]);
  const [scrapeApplying, setScrapeApplying] = useState(false);
  const [scrapeApplyProgress, setScrapeApplyProgress] = useState('');
  const [showScrapePreviewModal, setShowScrapePreviewModal] = useState(false);
  const [scrapePreviewChanges, setScrapePreviewChanges] = useState<DestScrapeChange[]>([]);
  const [globalPendingCount, setGlobalPendingCount] = useState(0);
  const scrapePollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrapeTargetDestRef = useRef(destinationId);
  // 抓取完成後要查哪些 destination 的 pending changes（全部 tab 時查所有 sibling）
  const scrapeTargetDestsRef = useRef<string[]>([destinationId]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [subAreaFilter, setSubAreaFilter] = useState<string>("");
  const [selectedTripIds, setSelectedTripIds] = useState<Set<string>>(new Set());

  // 重設第三排 sub_area 篩選狀態（避免跨頁/切換 tab 時殘留舊篩選）
  const resetSubAreaState = useCallback(() => {
    setSubAreaFilter('');
    setCurrentTabLabel('全部');
  }, []);
  const [heroDest, setHeroDest] = useState<(Destination & { regions?: { category_label: string; title: string } }) | null>(null);
  const siblingDestsRef = useRef<string[]>([]);
  const siblingDestsDataRef = useRef<Map<string, Destination & { regions?: { category_label: string; title: string } }>>(new Map());
  const siblingTripsCache = useRef<Map<string, Trip[]>>(new Map());
  const destsListCache = useRef<{ id: string; title: string; region_id: string; display_order: number; sub_region?: string }[] | null>(null);
  const originalRegionTabsRef = useRef<{ label: string; destId: string }[]>([]);

  // 所有 sub_region 是否都只有 1 個 destination（港澳大陸等：直接用 sub_area tabs 取代 sub_region tabs）
  const allSingleDest = subRegionGroups.length > 0 && subRegionGroups.every(g => g.destinations.length === 1);

  // sub_area tabs（從合併行程或當前行程動態計算）
  const SUB_AREA_CHILDREN = useMemo<Record<string, string[]>>(() => ({
    新疆: ['北疆', '南疆'],
  }), []);
  const CHINA_SUB_AREA_ORDER = useMemo(() => ['張家界', '九寨溝', '張家界+九寨溝', '重慶', '長江三峽', '貴州', '桂林', '甘南', '新疆', '江南', '廈門', '金廈', '武夷山', '黃山', '青島', '洛陽', '哈爾濱', '高雄出發'], []);
  const JAPAN_SUB_AREA_ORDER = useMemo(() => ['北海道', '仙台', '東京', '名古屋/小松', '京都/大阪/神戶/奈良', '四國', '北九州/福岡/熊本', '沖繩', '台中出發', '高雄出發'], []);
  const SUB_AREA_PARENT_MAP = useMemo(() => {
    const entries = Object.entries(SUB_AREA_CHILDREN).flatMap(([parent, children]) =>
      children.map((child) => [child, parent] as const)
    );
    return new Map<string, string>(entries);
  }, [SUB_AREA_CHILDREN]);

  /** 依指定順序排列 sub_area 標籤（不在清單中的排末尾） */
  const sortByOrder = useCallback((areas: string[], order: string[]) => {
    areas.sort((a, b) => {
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, []);

  // 使用 merged sub_area tabs 的區域白名單（sub_area 代表區域內細分，適合合併顯示）
  // 不在名單中的區域（東南亞等）使用兩層 tab：上面國家/地區切換，下面 sub_area 篩選
  const MERGED_REGIONS = useMemo(() => ['港澳大陸', '日本'], []);
  const regionCat = destination?.regions?.category_label || '';
  const useMergedMode = allSingleDest && MERGED_REGIONS.includes(regionCat);

  const normalizeSubArea = useCallback((value: string | null | undefined) => (value || '').trim(), []);
  const getParentSubArea = useCallback((label: string) => {
    const normalizedLabel = normalizeSubArea(label);
    return SUB_AREA_PARENT_MAP.get(normalizedLabel) || null;
  }, [SUB_AREA_PARENT_MAP, normalizeSubArea]);
  const isParentSubArea = useCallback((label: string) => {
    const normalizedLabel = normalizeSubArea(label);
    return normalizedLabel in SUB_AREA_CHILDREN;
  }, [SUB_AREA_CHILDREN, normalizeSubArea]);
  const getMainSubAreaLabel = useCallback((label: string) => {
    const normalizedLabel = normalizeSubArea(label);
    return getParentSubArea(normalizedLabel) || normalizedLabel;
  }, [getParentSubArea, normalizeSubArea]);
  const tripMatchesFilter = useCallback((trip: Trip, filter: string) => {
    const normalizedFilter = normalizeSubArea(filter);
    if (!normalizedFilter) return true;
    const tripSubArea = getTripSubArea(trip);
    const childAreas = SUB_AREA_CHILDREN[normalizedFilter];
    if (childAreas?.length) return childAreas.includes(tripSubArea);
    return tripSubArea === normalizedFilter;
  }, [SUB_AREA_CHILDREN, normalizeSubArea]);
  const filterTripsBySubArea = useCallback((tripList: Trip[], filter: string) => {
    const normalizedFilter = normalizeSubArea(filter);
    return normalizedFilter ? tripList.filter((trip) => tripMatchesFilter(trip, normalizedFilter)) : tripList;
  }, [normalizeSubArea, tripMatchesFilter]);

  const mergedSubAreaTabs = useMemo(() => {
    // 子標籤採「固定 canonical 清單」：即使某標籤下暫無行程也永遠顯示，不會消失。
    const order = regionCat === '港澳大陸' ? CHINA_SUB_AREA_ORDER
      : regionCat === '日本' ? JAPAN_SUB_AREA_ORDER
      : null;
    const source = subRegionTrips || trips;
    const tripAreas = Array.from(new Set(
      (source || []).map(getTripSubArea).filter(Boolean)
    ));
    const mainTripAreas = Array.from(new Set(tripAreas.map(getMainSubAreaLabel)));
    let areas: string[];
    if (order) {
      // 固定清單全列，並補上不在清單中的實際 trip 子標籤（避免行程被藏起來）
      const extra = mainTripAreas.filter(a => !order.includes(a)).sort((a, b) => a.localeCompare(b));
      areas = [...order, ...extra];
    } else {
      areas = [...mainTripAreas];
    }
    return areas.length >= 2
      ? [{ label: "全部", destId: "all" }, ...areas.map(a => ({ label: a, destId: `filter:${a}` }))]
      : [];
  }, [subRegionTrips, trips, regionCat, CHINA_SUB_AREA_ORDER, JAPAN_SUB_AREA_ORDER, getMainSubAreaLabel]);

  const mergedChildTabs = useMemo(() => {
    if (!useMergedMode || !isParentSubArea(currentTabLabel)) return [];
    const source = subRegionTrips || trips;
    const childAreas = SUB_AREA_CHILDREN[currentTabLabel] || [];
    const availableChildren = childAreas.filter((child) =>
      source.some((trip) => getTripSubArea(trip) === child)
    );
    return availableChildren.length > 0
      ? [{ label: '全部', value: currentTabLabel }, ...availableChildren.map((child) => ({ label: child, value: child }))]
      : [];
  }, [SUB_AREA_CHILDREN, currentTabLabel, isParentSubArea, subRegionTrips, trips, useMergedMode]);

  // mergedSubAreaTabs 載入完成後，從 URL 恢復 tab（解決重整後 tab 錯亂）
  // 僅限 merged mode（港澳/日本）：多-destination sub_region（中東亞非等）的 URL tab 是 sub_region 名，
  // 不可當作 sub_area filter，否則 sub_region 名與 sub_area 名撞名時會誤篩（如中東）。
  useEffect(() => {
    if (!useMergedMode) return;
    if (mergedSubAreaTabs.length === 0) return;
    const savedTab = getTabParam();
    if (!savedTab || savedTab === '全部') return;
    const parentTab = getParentSubArea(savedTab);
    const matchedParent = parentTab ? mergedSubAreaTabs.find((tab) => tab.label === parentTab) : null;
    const validTab = mergedSubAreaTabs.find((tab) => tab.label === savedTab);
    if (parentTab && matchedParent) {
      if (currentTabLabel !== parentTab || subAreaFilter !== savedTab) {
        setCurrentTabLabel(parentTab);
        setSubAreaFilter(savedTab);
      }
    } else if (validTab && (validTab.label !== currentTabLabel || subAreaFilter !== savedTab)) {
      setCurrentTabLabel(validTab.label);
      setSubAreaFilter(validTab.destId.startsWith('filter:') ? validTab.destId.slice(7) : '');
    }
    // 同步 hero 區塊：URL 帶的 sub_area（如沖繩）若對應到另一個實際 destination，
    // hero 圖／標題／副標要跟著換，否則會停留在網址路徑本身那個 destination（如北海道）
    if (savedTab) {
      const heroCandidate = Array.from(siblingDestsDataRef.current.values()).find(
        (d) => d.sub_region === savedTab || d.title === savedTab
      );
      if (heroCandidate && heroCandidate.id !== destinationId) {
        setHeroDest(heroCandidate);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTabLabel, destinationId, getParentSubArea, mergedSubAreaTabs, subAreaFilter, useMergedMode]);

  // 行程列表：如果有 sub_region 合併行程就用它（可再按 destination 篩選），否則用當前 destination 的行程
  const displayTrips = useMemo(() => {
    if (subRegionTrips) {
      if (activeDestFilter) return subRegionTrips.filter(t => t.destination_id === activeDestFilter);
      return subRegionTrips;
    }
    return trips;
  }, [subRegionTrips, activeDestFilter, trips]);

  // 從 URL query params 讀取搜尋條件（含 sub_area 篩選）
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const qs = new URLSearchParams(window.location.search);
    setDateFilter(qs.get('date') || '');
    setCityFilter(qs.get('city') || '');
  }, []);

  // 檢查是否有抓取進行中 + 是否有待更新的 pending changes
  useEffect(() => {
    if (!isDevMode) return;
    let cancelled = false;
    async function checkScrapeState() {
      try {
        // 檢查進行中
        const progRes = await fetch('/api/scrape/progress', { credentials: 'include', cache: 'no-store' });
        if (progRes.ok) {
          const prog = await progRes.json();
          if (!cancelled) {
            const running = prog.running === true;
            setScrapeRunning(running);
            setGlobalPendingCount(prog.pending_count ?? 0);
            // 如果正在跑，啟動輪詢
            if (running && !scrapePollingRef.current) {
              scrapePollingRef.current = setInterval(async () => {
                try {
                  const r = await fetch('/api/scrape/progress', { credentials: 'include', cache: 'no-store' });
                  if (!r.ok) return;
                  const p = await r.json();
                  if (!p.running) {
                    if (scrapePollingRef.current) { clearInterval(scrapePollingRef.current); scrapePollingRef.current = null; }
                    setScrapeRunning(false);
                    if (p.latest?.status !== 'failed') {
                      // 抓完後檢查 pending changes
                      const cr = await fetch(`/api/scrape/changes?destination_id=${destinationId}&status=pending`, { credentials: 'include', cache: 'no-store' });
                      if (cr.ok) {
                        const changes = await cr.json();
                        setScrapePendingIds(Array.isArray(changes) ? changes.map((c: { id: string }) => c.id) : []);
                      }
                    }
                  }
                } catch { /* ignore */ }
              }, 5000);
            }
          }
        }
        // 檢查待更新的 pending changes（頁面載入時就檢查，查所有 sibling destinations）
        const sibIds = siblingDestsRef.current.length > 0 ? siblingDestsRef.current : [destinationId];
        const initIds = await fetchPendingForDests(sibIds);
        if (!cancelled && initIds.length > 0) setScrapePendingIds(initIds);
      } catch { /* ignore */ }
    }
    checkScrapeState();
    return () => { cancelled = true; };
  }, [isDevMode, destinationId]);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      // 初次進頁的 URL restore 狀態（供 Phase 2 補齊資料集合）
      let restoredGroup: { subRegion: string; destinations: { id: string; label: string }[] } | null = null;
      let shouldRestoreAll = false;
      // 與 render 時的 useMergedMode 判斷一致（allSingleDest && 白名單），避免 Phase 2 選錯資料載入分支
      let allSingleDestLocal = false;
      try {
        setPopularFallback(null);
        setSubRegionTrips(null);
        setActiveDestFilter(null);
        setHeroDest(null);
        resetSubAreaState();
        setRegionTabs([]);

        // Phase 1：核心資料 + 全部目的地清單 並行載入（列表用 ref 快取加速切換）
        const destsPromise = destsListCache.current
          ? Promise.resolve(destsListCache.current)
          : fetch('/api/destinations').then(r => r.ok ? r.json() : []).catch(() => []);
        const [destData, tripsData, destsData] = await Promise.all([
          getDestination(destinationId),
          getDestinationTrips(destinationId),
          destsPromise,
        ]);
        if (!destsListCache.current && Array.isArray(destsData) && destsData.length > 0) {
          destsListCache.current = destsData;
        }
        if (!isMounted) return;
        if (!destData) { setError("找不到此目的地"); return; }
        setDestination(destData);
        setTrips(tripsData);

        const isDevOn = typeof window !== 'undefined' && localStorage.getItem('dev_mode_enabled') === '1';

        // 建立同區域兄弟目的地清單
        const siblings = (destsData as { id: string; title: string; region_id: string; display_order: number; sub_region?: string }[])
          .filter((d) => d.region_id === destData.region_id)
          .sort((a, b) => a.display_order - b.display_order);
        const allSiblingIds = siblings.map(d => d.id);
        siblingDestsRef.current = allSiblingIds;
        const siblingIds = allSiblingIds.filter(id => id !== destinationId);
        const hasSiblings = siblings.length > 1;

        // 建立 sub_region 兩層導航（第一排 sub_region 分組，第二排該分組下的 destinations）
        if (hasSiblings) {
          // 用當前 destData 的 sub_region 覆蓋列表中的值（列表 API 可能被 CDN 快取返回舊值）
          const currentSR = destData.sub_region || destData.title;
          const enrichedSiblings = siblings.map(s =>
            s.id === destinationId ? { ...s, sub_region: currentSR } : s
          );
          const groupMap = new Map<string, { id: string; label: string }[]>();
          for (const s of enrichedSiblings) {
            const sr = s.sub_region || s.title;
            if (!groupMap.has(sr)) groupMap.set(sr, []);
            groupMap.get(sr)!.push({ id: s.id, label: s.title });
          }
          const groups = Array.from(groupMap.entries()).map(([subRegion, destinations]) => ({ subRegion, destinations }));
          setSubRegionGroups(groups);
          allSingleDestLocal = groups.length > 0 && groups.every(g => g.destinations.length === 1);
          // 從 URL query param 恢復 tab，否則用 currentSR
          const savedTab = getTabParam();
          const hasSavedSubRegion = Boolean(savedTab && groups.some(g => g.subRegion === savedTab));
          const hasSavedSubArea = Boolean(savedTab && (tripsData as Trip[]).some(
            t => getTripSubArea(t) === savedTab
          ));
          const restoredSR = hasSavedSubRegion ? savedTab : currentSR;
          // sub_area tab（如富國島）也阻止 all=1 覆蓋，確保子標籤深層連結有效
          shouldRestoreAll = !hasSavedSubRegion && !hasSavedSubArea && getAllParam();
          restoredGroup = groups.find(g => g.subRegion === restoredSR) || null;
          setActiveSubRegion(shouldRestoreAll ? '全部' : restoredSR);
        } else {
          setSubRegionGroups([]);
          setActiveSubRegion("");
        }

        // sub_area tabs 在 Phase 2 await 之前就計算好（避免 React render 時序問題）
        const currentTrips = tripsData as Trip[];
        const CHINA_ORDER = ['張家界', '九寨溝', '張家界+九寨溝', '重慶', '長江三峽', '貴州', '桂林', '甘南', '新疆', '江南', '廈門', '金廈', '武夷山', '黃山', '青島', '洛陽', '哈爾濱', '高雄出發'];
        const JAPAN_ORDER = ['北海道', '仙台', '東京', '名古屋', '京都/大阪/神戶/奈良', '四國', '北九州/福岡/熊本', '沖繩', '台中出發', '高雄出發'];
        const areas: string[] = Array.from(new Set(
          currentTrips.map(getTripSubArea).filter(Boolean)
        ));
        const rCat = destData.regions?.category_label || '';
        const orderList = rCat === '港澳大陸' ? CHINA_ORDER : rCat === '日本' ? JAPAN_ORDER : null;
        if (orderList) {
          areas.sort((a, b) => {
            const ai = orderList.indexOf(a);
            const bi = orderList.indexOf(b);
            if (ai === -1 && bi === -1) return a.localeCompare(b);
            if (ai === -1) return 1;
            if (bi === -1) return -1;
            return ai - bi;
          });
        }
        const areaTabs = areas.length >= 2
          ? [{ label: "全部", destId: "all" }, ...areas.map(a => ({ label: a, destId: `filter:${a}` }))]
          : [];
        // 排序：有出發日行程排前面，請洽詢（無出發日或 custom_tour）排最後，同組依 display_order
        const sortedTrips = [...currentTrips].sort(compareTrips);
        setTrips(sortedTrips);
        setRegionTabs(areaTabs);
        originalRegionTabsRef.current = areaTabs;
        if (areaTabs.length > 0) {
          // 從 URL query param 恢復 tab（merged mode 用 currentTabLabel）
          const savedTab = getTabParam();
          const validTab = areaTabs.find(t => t.label === savedTab);
          if (validTab && savedTab !== '全部') {
            setCurrentTabLabel(validTab.label);
            setSubAreaFilter(validTab.destId.startsWith('filter:') ? validTab.destId.slice(7) : '');
          } else {
            setCurrentTabLabel("全部");
          }
        }

        // ★ Phase 1 完成 — 立即顯示頁面，不等 Phase 2
        setLoading(false);

        // Phase 2（背景載入，不阻塞頁面顯示）
        const hasRelated = destData.region_id && destData.regions?.category_label;
        if (hasRelated) setRelatedLoading(true);
        const isMergedRegion = allSingleDestLocal && ['港澳大陸', '日本'].includes(rCat);

        // 所有 Phase 2 請求並行
        const relatedP = hasRelated
          ? getRelatedTrips(destData.region_id, destData.regions!.category_label, destinationId).catch(() => null)
          : Promise.resolve(null);
        const hiddenDestIds = allSiblingIds.length > 0 ? allSiblingIds : [destinationId];
        const hiddenP = (isDevOn && destData.region_id)
          ? Promise.allSettled(hiddenDestIds.map(id => fetch(`/api/destinations/${id}/trips?hidden=1`).then(r => r.json())))
          : Promise.resolve(null);
        const allSibTripsP = hasSiblings && siblingIds.length > 0
          ? Promise.all(siblingIds.map(id => getDestinationTrips(id).catch(() => [])))
          : Promise.resolve(null);

        // 兄弟 destination 資料直接複用上方已取得的完整清單（destsData），不再對每個兄弟各打一次 API。
        // /api/destinations 與 /api/destinations/[id] 的快取策略相同（s-maxage=300, SWR=600），新鮮度等價；
        // 清單 select 也已涵蓋 hero 會用到的欄位（image_url / title / subtitle / source_url / regions.category_label），
        // 因此可省下每次進頁 N 個（每個兄弟一個）重複請求。
        const sibDestsResult: (Destination & { regions?: { category_label: string; title: string } })[] | null = hasSiblings
          ? (destsData as (Destination & { regions?: { category_label: string; title: string } })[])
              .filter((d) => d.region_id === destData.region_id && d.id !== destinationId)
          : null;

        const [relatedResult, hiddenResult, allSibTripsResult] = await Promise.all([relatedP, hiddenP, allSibTripsP]);
        if (!isMounted) return;

        // 隱藏行程
        if (hiddenResult) {
          const hiddenAll = (hiddenResult as PromiseSettledResult<Trip[]>[])
            .filter((r): r is PromiseFulfilledResult<Trip[]> => r.status === 'fulfilled')
            .flatMap(r => r.value);
          setHiddenTrips(hiddenAll);
          setShowHidden(true);
        }

        // 兄弟行程快取（供 tab 瞬切）
        if (hasSiblings && allSibTripsResult) {
          const cache = new Map<string, Trip[]>();
          cache.set(destinationId, sortedTrips);
          siblingIds.forEach((id, i) => {
            cache.set(id, (allSibTripsResult as Trip[][])[i] || []);
          });
          siblingTripsCache.current = cache;
        }

        // MERGED 模式：設定合併行程（初始顯示全部合併行程，用 sub_area tabs 篩選）
        if (hasSiblings && allSibTripsResult && isMergedRegion) {
          const merged = [...sortedTrips, ...(allSibTripsResult as Trip[][]).flat()].sort(compareTrips);
          setSubRegionTrips(merged);
          setActiveDestFilter(null);
        }

        // 兄弟 destination 資料快取（hero 切換用）。
        // 當前 destination 仍用單筆 API 的 destData（最完整），兄弟則用清單資料。
        if (sibDestsResult) {
          const map = new Map<string, Destination & { regions?: { category_label: string; title: string } }>();
          map.set(destinationId, destData);
          sibDestsResult.forEach(d => { if (d) map.set(d.id, d); });
          siblingDestsDataRef.current = map;
        }

        // 非 merged mode：補齊初次進頁（URL restore）的 subRegionTrips 資料集合
        // （merged mode 已在上方處理；此處處理中東亞非等多-destination sub_region 的深層連結）
        if (hasSiblings && allSibTripsResult && !isMergedRegion) {
          const allRegionTrips = [...sortedTrips, ...(allSibTripsResult as Trip[][]).flat()].sort(compareTrips);
          if (shouldRestoreAll) {
            // URL 帶 all=1：載入整個 region 所有行程（優先於 tab，避免當前 destination 屬多-dest group 時被 group 篩選蓋掉）
            resetSubAreaState();
            setSubRegionTrips(allRegionTrips);
            setActiveDestFilter(null);
            setHeroDest(null);
          } else if (restoredGroup && restoredGroup.destinations.length > 1) {
            // URL 帶 tab=某多-destination sub_region：載入該 group 所有 destination 行程
            resetSubAreaState();
            const groupIds = new Set(restoredGroup.destinations.map(d => d.id));
            const filteredForGroup = allRegionTrips.filter(t => groupIds.has(t.destination_id)).sort(compareTrips);
            setSubRegionTrips(filteredForGroup);
            // 還原 group 內選中的特定 destination（如新疆群組下的南疆），確保返回上一頁時篩選狀態一致
            const savedDestId = getDestFilterParam();
            const restoredDestId = savedDestId && restoredGroup.destinations.some(d => d.id === savedDestId) ? savedDestId : null;
            setActiveDestFilter(restoredDestId);
            const heroId = restoredDestId || restoredGroup.destinations[0].id;
            const firstDest = siblingDestsDataRef.current.get(heroId);
            if (firstDest) setHeroDest(firstDest);
          } else if (restoredGroup && restoredGroup.destinations.length === 1 && restoredGroup.destinations[0].id !== destinationId) {
            // URL 帶 tab=某單-destination sub_region（西伯利亞/高雄出發等）：載入該 destination 行程
            resetSubAreaState();
            const targetId = restoredGroup.destinations[0].id;
            const targetTrips = allRegionTrips.filter(t => t.destination_id === targetId).sort(compareTrips);
            setSubRegionTrips(targetTrips);
            // 計算並套用該 destination 的 sub_area tabs
            const targetAreas: string[] = Array.from(new Set(
              targetTrips.map(getTripSubArea).filter(Boolean)
            ));
            const targetAreaTabs = targetAreas.length >= 2
              ? [{ label: "全部", destId: "all" }, ...targetAreas.map((a: string) => ({ label: a, destId: `filter:${a}` }))]
              : [];
            setRegionTabs(targetAreaTabs);
            setActiveDestFilter(null);
            const firstDest = siblingDestsDataRef.current.get(targetId);
            if (firstDest) setHeroDest(firstDest);
          }
        }

        // 推薦行程
        if (relatedResult) {
          setRelatedTrips(relatedResult as { regionTrips: Trip[]; categoryTrips: Trip[] });
          const rel = relatedResult as { regionTrips: Trip[]; categoryTrips: Trip[] };
          if (rel.regionTrips.length === 0 && rel.categoryTrips.length === 0) {
            try {
              const res = await fetch('/api/popular-trips');
              if (res.ok && isMounted) setPopularFallback((await res.json()) as Trip[]);
            } catch { /* 靜默 */ }
          }
        }
        if (hasRelated && isMounted) setRelatedLoading(false);
      } catch {
        if (isMounted) setError("無法載入資料，請重新整理頁面");
      } finally {
        if (isMounted) setLoading(false); // 確保錯誤時也關閉 loading
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, [destinationId]);

  // lazy loading observer 已移除 — 推薦行程在 loadData 中直接載入

  useEffect(() => {
    async function loadSiteLogo() {
      try {
        const url = await getSiteLogo();
        setSiteLogoUrl(url);
      } catch {
        setSiteLogoUrl('/travel-logo.svg');
      }
    }

    loadSiteLogo();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsDevMode(localStorage.getItem('dev_mode_enabled') === '1');
  }, []);

  const updateTrip = (tripId: string, updater: (t: Trip) => Trip) => {
    setTrips(prev => prev.map(t => t.id === tripId ? updater(t) : t));
    setSubRegionTrips(prev => prev ? prev.map(t => t.id === tripId ? updater(t) : t) : null);
  };

  const handleTripImageUpdate = (tripId: string, newImageUrl: string) => {
    updateTrip(tripId, t => ({ ...t, cover_image_url: newImageUrl }));
  };

  const handleTripDocumentUpdate = (tripId: string, newDocUrl: string) => {
    updateTrip(tripId, t => ({ ...t, document_url: newDocUrl }));
  };

  const handleTripDocumentAvailabilityUpdate = (tripId: string, available: boolean) => {
    updateTrip(tripId, t => ({ ...t, document_is_available: available }));
  };

  const handleTripDurationUpdate = (tripId: string, newDuration: string) => {
    updateTrip(tripId, t => ({ ...t, duration: newDuration }));
  };

  const handleTripTitleUpdate = (tripId: string, newTitle: string) => {
    updateTrip(tripId, t => ({ ...t, title: newTitle }));
  };

  const handleTripPriceUpdate = (tripId: string, newPrice: string) => {
    updateTrip(tripId, t => ({ ...t, price_range: newPrice }));
  };

  const handleCustomTourToggle = async (tripId: string, value: boolean) => {
    try {
      const trip = trips.find(t => t.id === tripId);
      const currentBanner = trip?.trip_banner;
      const updatedBanner = { ...(currentBanner || { code_label: '', price_label: '', tags: [], departure_label: '', duration_label: '', seats_total: null, seats_available: null, deposit_label: '' }), custom_tour: value };
      const res = await fetch(`/api/trips/${tripId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ trip_banner: updatedBanner }),
              });
      if (res.ok) {
        updateTrip(tripId, t => ({ ...t, trip_banner: updatedBanner }));
        invalidateCache('dest-trips');
      } else if (res.status === 401) {
        // 由 DevModeToggle 的 fetch 攔截器處理 re-login toast
      } else {
        alert('設定失敗，請再試一次');
      }
    } catch {
      alert('設定失敗，請再試一次');
    }
  };

  const handleAddTrip = async () => {
    try {
      const newTrip = await createTrip(destinationId);
      const tripWithFlag = { ...newTrip, document_is_available: false } as Trip;
      setTrips(prev => [...prev, tripWithFlag].sort(compareTrips));
      setSubRegionTrips(prev => prev ? [...prev, tripWithFlag].sort(compareTrips) : null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "新增失敗";
      alert(`新增行程失敗：${msg}`);
    }
  };

  const handleHideTrip = async (tripId: string) => {
    try {
      const res = await fetch(`/api/trips/${tripId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ is_active: false }),
              });
      if (!res.ok) throw new Error('隱藏失敗');
      invalidateCache('dest-trips:');
      invalidateCache('trip:');
      const hidden = trips.find(t => t.id === tripId) || subRegionTrips?.find(t => t.id === tripId);
      setTrips(prev => prev.filter(trip => trip.id !== tripId));
      setSubRegionTrips(prev => prev ? prev.filter(trip => trip.id !== tripId) : null);
      if (hidden) {
        setShowHidden(true);
        await loadHiddenTrips();
        setTimeout(() => {
          document.getElementById('hidden-trips-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "隱藏失敗";
      alert(`隱藏行程失敗：${msg}`);
    }
  };

  const handleRestoreTrip = async (tripId: string) => {
    try {
      const res = await fetch(`/api/trips/${tripId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ is_active: true }),
              });
      if (!res.ok) throw new Error('恢復失敗');
      invalidateCache('dest-trips:');
      invalidateCache('trip:');
      const restored = hiddenTrips.find(t => t.id === tripId);
      setHiddenTrips(prev => prev.filter(t => t.id !== tripId));
      if (restored) {
        // 恢復後依 compareTrips 重新排序，卡片回到正確位置（不跳到最底部）
        setTrips(prev => [...prev, restored].sort(compareTrips));
        setSubRegionTrips(prev => prev ? [...prev, restored].sort(compareTrips) : null);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "恢復失敗";
      alert(`恢復行程失敗：${msg}`);
    }
  };

  const loadHiddenTrips = async () => {
    const allIds = siblingDestsRef.current.length > 0 ? siblingDestsRef.current : [destinationId];
    try {
      const results = await Promise.allSettled(
        allIds.map(id => fetch(`/api/destinations/${id}/trips?hidden=1`).then(r => r.json()))
      );
      const all = results.filter((r): r is PromiseFulfilledResult<Trip[]> => r.status === 'fulfilled').flatMap(r => r.value);
      setHiddenTrips(all);
    } catch { /* ignore */ }
  };

  const handleDeleteTrip = async (tripId: string) => {
    try {
      await deleteTrip(tripId);
      setTrips(prev => prev.filter(trip => trip.id !== tripId));
      setSubRegionTrips(prev => prev ? prev.filter(trip => trip.id !== tripId) : null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "刪除失敗";
      alert(`刪除行程失敗：${msg}`);
    }
  };

  const handleDuplicateTrip = async (tripId: string) => {
    try {
      const newTrip = await cloneTrip(tripId);
      setTrips(prev => [...prev, newTrip].sort(compareTrips));
      setSubRegionTrips(prev => prev ? [...prev, newTrip].sort(compareTrips) : null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "複製失敗";
      alert(`複製行程失敗：${msg}`);
    }
  };

  const handleTripReorder = async (index: number, direction: -1 | 1) => {
    try {
      await handleReorder('trips', trips, index, index + direction, setTrips);
    } catch (error) {
      alert(error instanceof Error ? error.message : '排序失敗');
    }
  };

  const clearFilters = () => {
    setDateFilter('');
    setCityFilter('');
    const isAll = currentTabLabel === "全部";
    router.replace(`/destination/${destinationId}${isAll ? '?all=1' : ''}`);
  };

  const handleMergedChildTabClick = (value: string) => {
    const normalizedValue = normalizeSubArea(value);
    if (!normalizedValue) return;
    setCurrentTabLabel(getParentSubArea(normalizedValue) || normalizedValue);
    setSubAreaFilter(normalizedValue);
    setTabParam(normalizedValue);
  };

  const handleTabClick = (tab: { label: string; destId: string }) => {
    if (tab.destId === 'all' && currentTabLabel === '全部' && !subAreaFilter) return;
    if (tab.destId.startsWith('filter:')) {
      const filterValue = tab.destId.slice(7);
      const nextCurrentLabel = useMergedMode ? (getParentSubArea(filterValue) || tab.label) : tab.label;
      if (tab.label === currentTabLabel && subAreaFilter === filterValue && nextCurrentLabel === currentTabLabel) return;
    }
    if (tab.destId.startsWith("filter:")) {
      const filterValue = tab.destId.slice(7);
      if (useMergedMode) {
        setSubAreaFilter(filterValue);
        setCurrentTabLabel(getParentSubArea(filterValue) || tab.label);
      } else {
        setSubAreaFilter(filterValue);
        setCurrentTabLabel(tab.label);
      }
      setTabParam(tab.label);
    } else if (tab.destId === "all") {
      setSubAreaFilter("");
      setCurrentTabLabel("全部");
      setTabParam("全部");
      setHeroDest(null);
    }
  };

  const formatDate = (d: string) => {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${y}/${m}/${day}`;
  };

  const getTripCardPrice = (trip: Trip) => {
    // 取出發日期中的最低價（對齊朋威的「NT$xx,xxx起」）
    const prices = (trip.departure_dates || [])
      .map(d => d.price)
      .filter((p): p is number => typeof p === 'number' && p > 0);

    if (prices.length > 0) {
      const minPrice = Math.min(...prices);
      return `NT$ ${minPrice.toLocaleString('zh-TW')}`;
    }

    return trip.price_range;
  };

  const handleSelectTrip = (tripId: string) => {
    setSelectedTripIds(prev => {
      const next = new Set(prev);
      if (next.has(tripId)) {
        next.delete(tripId);
      } else {
        next.add(tripId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const visibleTrips = filterTripsBySubArea(displayTrips, subAreaFilter);
    const allIds = visibleTrips.map(t => t.id);
    const allSelected = allIds.every(id => selectedTripIds.has(id));
    if (allSelected) {
      setSelectedTripIds(new Set());
    } else {
      setSelectedTripIds(new Set(allIds));
    }
  };

  // 清理 polling timer
  useEffect(() => {
    return () => { if (scrapePollingRef.current) clearInterval(scrapePollingRef.current); };
  }, []);

  // 查多個 destination 的 pending changes
  const fetchPendingForDests = async (destIds: string[]) => {
    const allIds: string[] = [];
    await Promise.all(destIds.map(async (did) => {
      const res = await fetch(`/api/scrape/changes?destination_id=${did}&status=pending`, { credentials: 'include', cache: 'no-store' });
      if (res.ok) {
        const changes = await res.json();
        if (Array.isArray(changes)) allIds.push(...changes.map((c: { id: string }) => c.id));
      }
    }));
    return allIds;
  };

  const handleScrapeThisPage = async () => {
    if (scrapeTriggering || scrapeRunning) return;

    // 判斷是「全部」tab 還是特定 destination
    const isAllTab = !activeDestFilter && !heroDest;
    const allSiblingIds = siblingDestsRef.current.length > 0 ? siblingDestsRef.current : [destinationId];
    const targetDestId = activeDestFilter || heroDest?.id || destinationId;
    const targetDestData = siblingDestsDataRef.current.get(targetDestId) || destination;

    // 目的地本身沒有 source_url，但底下行程有 → 改用行程 direct scrape
    // （涵蓋中東埃及/土耳其/伊朗這類 dest 無 url、trip 有 url，以及手動建卡設了來源網址的情況）
    const selectedIds = Array.from(selectedTripIds);
    const destTripsWithUrl = !isAllTab && !targetDestData?.source_url
      ? displayTrips.filter(t => t.destination_id === targetDestId && t.is_active && t.source_url).map(t => t.id)
      : [];

    if (selectedIds.length === 0 && !isAllTab && !targetDestData?.source_url && destTripsWithUrl.length === 0) {
      alert('此目的地與其行程都尚未設定朋威來源網址，無法抓取。\n可到行程頁用「🔗 設定來源」貼上朋威網址，或到 Supabase 設定此目的地的 source_url。');
      return;
    }

    scrapeTargetDestRef.current = targetDestId;
    // 「全部」tab 時查所有 sibling，否則只查該 destination
    scrapeTargetDestsRef.current = isAllTab ? allSiblingIds : [targetDestId];
    setScrapeTriggering(true);
    setScrapePendingIds([]);
    try {
      // 優先手動勾選；否則若目的地無 url 則用底下有 url 的行程做 direct scrape
      const tripIds = selectedIds.length > 0 ? selectedIds : destTripsWithUrl;
      // 「全部」tab → 用 region key 觸發整區；否則觸發單一 destination
      // 從 pathname 取 region key（source_url 可能帶 #blk- hash，直接對全字串 match 會失敗）
      const regionKey = (() => {
        try { return new URL(destination?.source_url || '').pathname.match(/\/([^/]+)\/$/)?.[1] || ''; }
        catch { return ''; }
      })();
      const body = isAllTab && regionKey && tripIds.length === 0
        ? { regions: regionKey }
        : { destinationId: targetDestId, tripIds: tripIds.length > 0 ? tripIds : undefined };
      const res = await fetch('/api/scrape/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || '觸發抓取失敗');
      }

      setScrapeRunning(true);
      setScrapeTriggering(false);
      setToastMessage('已觸發抓取，等待完成...');

      // 啟動輪詢進度
      if (scrapePollingRef.current) clearInterval(scrapePollingRef.current);
      scrapePollingRef.current = setInterval(async () => {
        try {
          const progRes = await fetch('/api/scrape/progress', { credentials: 'include', cache: 'no-store' });
          if (!progRes.ok) return;
          const prog = await progRes.json();
                  if (!prog.running) {
                    if (scrapePollingRef.current) { clearInterval(scrapePollingRef.current); scrapePollingRef.current = null; }
                    setScrapeRunning(false);
                    if (prog.latest?.status === 'failed') { setToastMessage('抓取失敗'); return; }
            const ids = await fetchPendingForDests(scrapeTargetDestsRef.current);
            setScrapePendingIds(ids);
            setGlobalPendingCount(prog.pending_count ?? 0);
            setToastMessage(ids.length > 0 ? `抓取完成，${ids.length} 筆待更新` : '抓取完成，無新變更');
          }
        } catch { /* ignore */ }
      }, 5000);
    } catch (err) {
      alert(err instanceof Error ? err.message : '觸發抓取失敗');
      setScrapeTriggering(false);
    }
  };

  const handleApplyPendingChanges = async () => {
    if (scrapeApplying || scrapePendingIds.length === 0) return;
    try {
      // 先 fetch 完整變更明細，給使用者預覽（掃描所有目標目的地，避免整個區域抓取時漏掉非第一個目的地的變更）
      const destIds = scrapeTargetDestsRef.current.length > 0 ? scrapeTargetDestsRef.current : [destinationId];
      const results = await Promise.all(destIds.map(async (did) => {
        const r = await fetch(`/api/scrape/changes?destination_id=${did}&status=pending`, { credentials: 'include' });
        if (!r.ok) return [];
        return (await r.json()) as DestScrapeChange[];
      }));
      const allChanges = results.flat();
      const changes = allChanges.filter(c => scrapePendingIds.includes(c.id));
      setScrapePreviewChanges(changes);
      setShowScrapePreviewModal(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : '取得變更明細失敗');
    }
  };

  const handleConfirmApply = async () => {
    setShowScrapePreviewModal(false);
    setScrapeApplying(true);
    const total = scrapePendingIds.length;
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < total; i++) {
      setScrapeApplyProgress(`⏳ 更新中 (${i + 1}/${total})...`);
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 30000);
        const res = await fetch('/api/scrape/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ changeIds: [scrapePendingIds[i]] }),
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (res.ok) {
          const data = await res.json();
          if (data.results?.[0]?.success) successCount++;
          else failCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    setScrapePendingIds([]);
    setScrapeApplyProgress('');
    invalidateCache('dest-trips:');
    invalidateCache('trip:');
    invalidateCache('regions');

    if (failCount > 0) {
      setToastMessage(`更新完成：${successCount} 成功、${failCount} 失敗`);
    } else {
      setToastMessage('儲存成功！重新載入中...');
    }
    setTimeout(() => window.location.reload(), 800);
    setScrapeApplying(false);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-transparent text-gray-900">
        <StickyHeader showBackButton backHref="/" logoUrl={siteLogoUrl} />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-sky-400 border-r-transparent" />
            <p className="mt-4 text-gray-600">載入中...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !destination || !destination.title) {
    return (
      <main className="min-h-screen bg-white text-gray-900">
        <StickyHeader showBackButton backHref="/" logoUrl={siteLogoUrl} />
        <div className="flex min-h-[60vh] items-center justify-center px-4">
          <div className="text-center">
            <p className="text-4xl">🔍</p>
            <p className="mt-3 text-lg font-bold text-gray-700">{error || "找不到此目的地"}</p>
            <p className="mt-1 text-sm text-gray-400">此頁面可能已移除或網址有誤</p>
            <button
              onClick={() => { if (window.history.length > 1) { window.history.back(); } else { window.location.href = '/'; } }}
              className="mt-5 rounded-full bg-sky-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
            >
              回首頁
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-transparent pt-[8.5rem] text-gray-900">
      <StickyHeader showBackButton backHref="/" logoUrl={siteLogoUrl} devModeSlot={<DevModeToggle onToggle={setIsDevMode} />} />

      {/* Hero 區塊 */}
      {(() => {
        const d = heroDest || destination;
        return (
          <div className="relative h-48 overflow-hidden sm:h-56 md:h-64">
            <Image
              src={d.image_url}
              alt={d.title}
              fill
              priority
              sizes="100vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white via-black/40 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 md:p-8">
              <div className="mx-auto max-w-site">
                {d.regions && (
                  <span className="mb-1.5 inline-block rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-white/90 backdrop-blur-sm sm:mb-2 sm:px-3 sm:py-1 sm:text-xs">
                    {d.regions.category_label}
                  </span>
                )}
                <h1 className="text-2xl font-bold text-white sm:text-3xl md:text-4xl">
                  {d.title}
                </h1>
                {d.subtitle && (
                  <p className="mt-0.5 text-sm text-white/80 sm:mt-1 sm:text-base md:text-lg">{d.subtitle}</p>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* 兩層導航：第一排 sub_region 分組，第二排該分組下的 destinations */}
      {subRegionGroups.length > 1 && (
        <div className="mx-auto max-w-site px-3 pt-5 sm:px-4 md:px-8">
          <h2 className="mb-3 text-center text-xl font-bold text-gray-800 sm:text-2xl">
            {destination.regions?.title}
          </h2>
          {useMergedMode && mergedSubAreaTabs.length === 0 ? (
            /* merged mode 載入中：顯示 skeleton 避免閃現錯誤 tabs */
            <div className="flex justify-center gap-2 px-1 pb-1">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-9 w-16 animate-pulse rounded-full bg-gray-100" />
              ))}
            </div>
          ) : useMergedMode && mergedSubAreaTabs.length > 0 ? (
            /* merged mode（港澳大陸/日本）：直接用 sub_area tabs */
            <div>
              <div className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex flex-wrap justify-center gap-2 px-1 pb-1">
                  {mergedSubAreaTabs.map((tab) => (
                    <button
                      key={tab.label}
                      type="button"
                      onClick={() => { setActiveDestFilter(null); handleTabClick(tab); }}
                      className={`shrink-0 rounded-full px-5 py-2 text-[13px] font-bold tracking-wide transition-all ${
                        currentTabLabel === tab.label
                          ? "bg-gradient-to-b from-[#0ea5e9] to-[#0369a1] text-white shadow-md shadow-sky-500/20 ring-1 ring-sky-400/30"
                          : "border border-sky-100 bg-gradient-to-b from-white to-sky-50/80 text-gray-600 shadow-sm ring-1 ring-sky-100/50 hover:border-sky-200 hover:from-sky-50 hover:to-sky-100/60 hover:text-sky-700 hover:shadow-md"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
              {mergedChildTabs.length > 0 && (
                <div className="mt-3 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <div className="flex flex-wrap justify-center gap-1.5 px-1 pb-1">
                    {mergedChildTabs.map((tab) => (
                      <button
                        key={tab.label}
                        type="button"
                        onClick={() => handleMergedChildTabClick(tab.value)}
                        className={`shrink-0 rounded-full px-4 py-1.5 text-[12px] font-semibold tracking-wide transition-all ${
                          subAreaFilter === tab.value
                            ? "bg-sky-100 text-sky-700 ring-1 ring-sky-300"
                            : "border border-gray-200 bg-white text-gray-500 shadow-sm hover:border-sky-200 hover:text-sky-600 hover:shadow"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* multi-dest sub_regions（中東亞非等）：sub_region tabs + destination tabs */
            <>
              <div className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex flex-wrap justify-center gap-2 px-1 pb-1">
                  <button
                    type="button"
                    onClick={async () => {
                      setActiveSubRegion("全部");
                      setActiveDestFilter(null);
                      setDestFilterParam(null);
                      resetSubAreaState();
                      setHeroDest(null);
                      setTabParam("全部");
                      setSubRegionLoading(true);
                      try {
                        const ids = siblingDestsRef.current;
                        // 優先從預快取讀取
                        const results = await Promise.all(ids.map(id => {
                          const cached = siblingTripsCache.current.get(id);
                          return cached ? Promise.resolve(cached) : getDestinationTrips(id).catch(() => []);
                        }));
                        setSubRegionTrips(results.flat());
                      } catch { setSubRegionTrips(null); }
                      setSubRegionLoading(false);
                    }}
                    className={`shrink-0 rounded-full px-5 py-2 text-[13px] font-bold tracking-wide transition-all ${
                      activeSubRegion === "全部"
                        ? "bg-gradient-to-b from-[#0ea5e9] to-[#0369a1] text-white shadow-md shadow-sky-500/20 ring-1 ring-sky-400/30"
                        : "border border-sky-100 bg-gradient-to-b from-white to-sky-50/80 text-gray-600 shadow-sm ring-1 ring-sky-100/50 hover:border-sky-200 hover:from-sky-50 hover:to-sky-100/60 hover:text-sky-700 hover:shadow-md"
                    }`}
                  >
                    全部
                  </button>
                  {subRegionGroups.map((group) => (
                    <button
                      key={group.subRegion}
                      type="button"
                      onClick={async () => {
                        setActiveSubRegion(group.subRegion);
                        setActiveDestFilter(null);
                        setDestFilterParam(null);
                        setTabParam(group.subRegion);
                        if (group.destinations.length === 1) {
                          const destId = group.destinations[0].id;
                          if (destId === destinationId) {
                            setSubRegionTrips(null);
                            setHeroDest(null);
                            setRegionTabs(originalRegionTabsRef.current);
                            setSubAreaFilter("");
                            setCurrentTabLabel("全部");
                          } else {
                            // 從預快取瞬間切換，無快取時才 fetch
                            const cachedTrips = siblingTripsCache.current.get(destId);
                            const tripData = cachedTrips || await getDestinationTrips(destId).catch(() => []);
                            setSubRegionTrips(tripData as Trip[]);
                            // 計算新 destination 的 sub_area tabs
                            const sibAreas: string[] = Array.from(new Set(
                              (tripData as Trip[]).map(getTripSubArea).filter(Boolean)
                            ));
                            const sibAreaTabs = sibAreas.length >= 2
                              ? [{ label: "全部", destId: "all" }, ...sibAreas.map((a: string) => ({ label: a, destId: `filter:${a}` }))]
                              : [];
                            setRegionTabs(sibAreaTabs);
                            setCurrentTabLabel("全部");
                            setSubAreaFilter("");
                            const cachedDest = siblingDestsDataRef.current.get(destId);
                            if (cachedDest) setHeroDest(cachedDest);
                          }
                        } else {
                          // 多-destination sub_region：清掉殘留 sub_area 篩選，避免隱藏行程
                          resetSubAreaState();
                          setSubRegionLoading(true);
                          try {
                            const allTrips = await Promise.all(
                              group.destinations.map(d => getDestinationTrips(d.id).catch(() => []))
                            );
                            setSubRegionTrips(allTrips.flat().sort(compareTrips));
                            const cached = siblingDestsDataRef.current.get(group.destinations[0].id);
                            if (cached) setHeroDest(cached);
                          } catch { setSubRegionTrips(null); }
                          setSubRegionLoading(false);
                        }
                      }}
                      className={`shrink-0 rounded-full px-5 py-2 text-[13px] font-bold tracking-wide transition-all ${
                        activeSubRegion === group.subRegion
                          ? "bg-gradient-to-b from-[#0ea5e9] to-[#0369a1] text-white shadow-md shadow-sky-500/20 ring-1 ring-sky-400/30"
                          : "border border-sky-100 bg-gradient-to-b from-white to-sky-50/80 text-gray-600 shadow-sm ring-1 ring-sky-100/50 hover:border-sky-200 hover:from-sky-50 hover:to-sky-100/60 hover:text-sky-700 hover:shadow-md"
                      }`}
                    >
                      {group.subRegion}
                    </button>
                  ))}
                </div>
              </div>
              {/* 第二排：選中 sub_region 下的 destinations（2+ 個才顯示） */}
              {(() => {
                const activeGroup = subRegionGroups.find(g => g.subRegion === activeSubRegion);
                if (!activeGroup || activeGroup.destinations.length <= 1) return null;
                return (
                  <div className="mt-3 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <div className="flex flex-wrap justify-center gap-2 px-1 pb-1">
                      {activeGroup.destinations.map((dest) => (
                        <button
                          key={dest.id}
                          type="button"
                          onClick={async () => {
                            const newFilter = activeDestFilter === dest.id ? null : dest.id;
                            setActiveDestFilter(newFilter);
                            setDestFilterParam(newFilter);
                            // subRegionTrips 未載入時先載入，否則篩選無效
                            if (!subRegionTrips && activeGroup) {
                              const allTrips = await Promise.all(
                                activeGroup.destinations.map(d => getDestinationTrips(d.id).catch(() => []))
                              );
                              setSubRegionTrips(allTrips.flat());
                            }
                          }}
                          className={`shrink-0 rounded-full px-4 py-1.5 text-[12px] font-semibold tracking-wide transition-all ${
                            activeDestFilter === dest.id
                              ? "bg-sky-100 text-sky-700 ring-1 ring-sky-300"
                              : "border border-gray-200 bg-white text-gray-500 shadow-sm hover:border-sky-200 hover:text-sky-600 hover:shadow"
                          }`}
                        >
                          {dest.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* 第三排：當前/兄弟 destination 的 sub_area 篩選（曼谷/清邁 等） */}
              {/* 僅在 sub_region 下只有 1 個 destination 時顯示，避免與第二排 destination tabs 重複 */}
              {regionTabs.length > 0 && activeSubRegion !== '全部' && (() => {
                const g = subRegionGroups.find(gr => gr.subRegion === activeSubRegion);
                return !g || g.destinations.length <= 1;
              })() && (
                <div className="mt-3 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <div className="flex flex-wrap justify-center gap-1.5 px-1 pb-1">
                    {regionTabs.map((tab) => (
                      <button
                        key={tab.label}
                        type="button"
                        onClick={() => handleTabClick(tab)}
                        className={`shrink-0 rounded-full px-4 py-1.5 text-[12px] font-semibold tracking-wide transition-all ${
                          currentTabLabel === tab.label
                            ? "bg-sky-100 text-sky-700 ring-1 ring-sky-300"
                            : "border border-gray-200 bg-white text-gray-500 shadow-sm hover:border-sky-200 hover:text-sky-600 hover:shadow"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* sub_area 篩選 tabs 已內嵌到二層 tab 區塊中 */}

      {/* 行程列表 */}
      <section className="mx-auto max-w-site px-3 py-4 sm:px-4 sm:py-6 md:px-8 md:py-10">

        {subRegionLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-sky-400 border-r-transparent" />
            <span className="ml-2 text-sm text-gray-500">載入行程中...</span>
          </div>
        ) : displayTrips.length === 0 && !isDevMode ? (
          <>
            {/* 客製洽詢區塊（緊湊橫排） */}
            <div className="mb-6 flex flex-col items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 sm:flex-row sm:px-5">
              <div className="text-center sm:text-left">
                <p className="text-sm font-bold text-gray-900">
                  {(() => {
                    const targetId = activeDestFilter || heroDest?.id || destinationId;
                    const targetDest = siblingDestsDataRef.current.get(targetId) || heroDest || destination;
                    return targetDest.title;
                  })()}目前暫無現成行程，可客製行程
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  免費諮詢 · 不收服務費 · 讓蓋瑞為您量身打造專屬行程
                </p>
              </div>
              <button
                type="button"
                onClick={() => openExternalLink(lineDmHref)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#06C755] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#05b64d] active:scale-95"
              >
                <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                </svg>
                LINE 私訊洽詢
              </button>
            </div>

            {/* 相關行程載入中 */}
            {relatedLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-sky-400 border-r-transparent" />
                <span className="ml-3 text-sm text-gray-500">載入相關行程...</span>
              </div>
            ) : (
              <>
                {/* 同地區其他行程（按 sub_region 分組）— 選中 sub_region tab 時隱藏 */}
                {!subRegionTrips && relatedTrips && relatedTrips.regionTrips.length > 0 && (() => {
                  const trips = relatedTrips.regionTrips;
                  const hasSubRegions = trips.some((t) => t.destinations?.sub_region);
                  const groups: { label: string; trips: Trip[] }[] = [];
                  if (hasSubRegions) {
                    const seen = new Set<string>();
                    trips.forEach((t) => {
                      const key = t.destinations?.sub_region || '';
                      if (!seen.has(key)) {
                        seen.add(key);
                        groups.push({ label: key, trips: trips.filter((x) => (x.destinations?.sub_region || '') === key) });
                      }
                    });
                  }
                  return (
                    <section className="mb-10">
                      <h2 className="mb-3 text-base font-bold text-gray-900 sm:mb-4 sm:text-lg md:text-xl">
                        {destination.regions?.title} 其他行程（{trips.length}）
                      </h2>
                      {hasSubRegions ? groups.map((g) => (
                        <div key={g.label || 'ungrouped'} className="mb-5">
                          {g.label && <h3 className="mb-2 px-1 text-sm font-bold text-sky-600">{g.label}</h3>}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {g.trips.map((trip) => (
                              <div key={trip.id} className="md:min-w-0">
                                <TripCard id={trip.id} title={trip.title} duration={trip.duration}
                                  price_range={getTripCardPrice(trip)} cover_image_url={trip.cover_image_url}
                                  document_url={trip.document_url} document_is_available={trip.document_is_available}
                                  departure_dates={trip.departure_dates} tags={trip.trip_banner?.tags} countries={trip.trip_banner?.countries} isDevMode={false} />
                              </div>
                            ))}
                          </div>
                        </div>
                      )) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {trips.map((trip) => (
                            <div key={trip.id} className="md:min-w-0">
                              <TripCard id={trip.id} title={trip.title} duration={trip.duration}
                                price_range={getTripCardPrice(trip)} cover_image_url={trip.cover_image_url}
                                document_url={trip.document_url} document_is_available={trip.document_is_available}
                                departure_dates={trip.departure_dates} tags={trip.trip_banner?.tags} countries={trip.trip_banner?.countries} isDevMode={false} />
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })()}

                {/* 同類別熱門行程（按 region title 分組） */}
                {relatedTrips && relatedTrips.categoryTrips.length > 0 && (() => {
                  const trips = relatedTrips.categoryTrips;
                  const groups: { label: string; trips: Trip[] }[] = [];
                  const seen = new Set<string>();
                  trips.forEach((t) => {
                    const key = t.destinations?.regions?.title || '';
                    if (!seen.has(key)) {
                      seen.add(key);
                      groups.push({ label: key, trips: trips.filter((x) => (x.destinations?.regions?.title || '') === key) });
                    }
                  });
                  return (
                    <section className="mb-10">
                      <h2 className="mb-3 text-base font-bold text-gray-900 sm:mb-4 sm:text-lg md:text-xl">
                        推薦{destination.regions?.category_label}熱門團（{trips.length}）
                      </h2>
                      {groups.map((g) => (
                        <div key={g.label || 'ungrouped'} className="mb-5">
                          {g.label && <h3 className="mb-2 px-1 text-sm font-bold text-sky-600">{g.label}</h3>}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {g.trips.map((trip) => (
                              <div key={trip.id} className="md:min-w-0">
                                <TripCard id={trip.id} title={trip.title} duration={trip.duration}
                                  price_range={getTripCardPrice(trip)} cover_image_url={trip.cover_image_url}
                                  document_url={trip.document_url} document_is_available={trip.document_is_available}
                                  departure_dates={trip.departure_dates} tags={trip.trip_banner?.tags} countries={trip.trip_banner?.countries} isDevMode={false} />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </section>
                  );
                })()}
              </>
            )}
          </>
        ) : (
          <>
            {/* 搜尋條件 banner */}
            {(dateFilter || cityFilter) && (
              <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5">
                <svg className="h-4 w-4 shrink-0 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
                </svg>
                <span className="text-sm text-sky-700">搜尋條件：</span>
                {cityFilter && (
                  <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
                    出發地：{cityFilter}
                  </span>
                )}
                {dateFilter && (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                    出發日：{formatDate(dateFilter)}
                  </span>
                )}
                <button
                  onClick={clearFilters}
                  className="ml-auto text-xs text-gray-400 transition hover:text-gray-700"
                >
                  清除篩選
                </button>
              </div>
            )}

            {/* 無符合梯次提示 */}
            {dateFilter && displayTrips.length > 0 && !displayTrips.some((t) => t.departure_dates?.some((d) => d.departure_date === dateFilter)) && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
                <div className="flex items-start gap-3">
                  <svg className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-semibold text-amber-700">
                      {formatDate(dateFilter)} 目前暫無出發梯次
                    </p>
                    <p className="mt-0.5 text-xs text-amber-600">
                      以下為其他可選行程，歡迎諮詢旅遊規劃師蓋瑞，為您安排客製出發日期
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-4 flex items-center gap-3 sm:mb-6">
              <h2 className="text-lg font-bold text-gray-900 sm:text-xl md:text-2xl">
                可選行程（{filterTripsBySubArea(displayTrips, subAreaFilter).length}）
              </h2>
              {isDevMode && (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="shrink-0 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 transition hover:bg-purple-100"
                >
                  {(() => {
                    const visibleTrips = filterTripsBySubArea(displayTrips, subAreaFilter);
                    const allSelected = visibleTrips.length > 0 && visibleTrips.every(t => selectedTripIds.has(t.id));
                    return allSelected ? '取消全選' : '全選';
                  })()}
                </button>
              )}
            </div>

            {(() => {
              const filtered = filterTripsBySubArea(displayTrips, subAreaFilter);
              const sorted = dateFilter
                ? [...filtered].sort((a, b) => {
                    const aMatch = a.departure_dates?.some((d) => d.departure_date === dateFilter) ? 0 : 1;
                    const bMatch = b.departure_dates?.some((d) => d.departure_date === dateFilter) ? 0 : 1;
                    return aMatch - bMatch;
                  })
                : filtered;

              return sorted.length === 0 ? (
                <div className="rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center text-sm text-gray-500 shadow-sm">
                  此分類目前沒有行程，敬請期待，或聯繫蓋瑞為您規劃。
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sorted.map((trip) => {
                    const hasMatchingDate = Boolean(
                      dateFilter && trip.departure_dates?.some((d) => d.departure_date === dateFilter)
                    );
                    const tripIndex = trips.findIndex((item) => item.id === trip.id);

                    return (
                      <div
                        key={trip.id}
                        className="relative md:min-w-0"
                      >
                          {hasMatchingDate && (
                            <div className="absolute -top-2 left-2 z-10 rounded-full bg-sky-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-lg shadow-sky-500/30">
                              符合出發日
                            </div>
                          )}
                          {isDevMode && (
                            <div className="absolute right-2 top-12 z-10 flex flex-col gap-1">
                              {tripIndex > 0 && (
                                <button
                                  type="button"
                                  onClick={() => void handleTripReorder(tripIndex, -1)}
                                  className="flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-xs text-white/80 hover:bg-black/70"
                                  title="上移"
                                >
                                  ↑
                                </button>
                              )}
                              {tripIndex < trips.length - 1 && (
                                <button
                                  type="button"
                                  onClick={() => void handleTripReorder(tripIndex, 1)}
                                  className="flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-xs text-white/80 hover:bg-black/70"
                                  title="下移"
                                >
                                  ↓
                                </button>
                              )}
                            </div>
                          )}
                          <TripCard
                            id={trip.id}
                            title={trip.title}
                          duration={trip.duration}
                          price_range={getTripCardPrice(trip)}
                          cover_image_url={trip.cover_image_url}
                          document_url={trip.document_url}
                          document_is_available={trip.document_is_available}
                          departure_dates={trip.departure_dates}
                          tags={trip.trip_banner?.tags}
                          countries={trip.trip_banner?.countries}
                          isDevMode={isDevMode}
                          isSelected={selectedTripIds.has(trip.id)}
                          onSelect={handleSelectTrip}
                          isCustomTour={trip.trip_banner?.custom_tour ?? false}
                          isPromoEnabled={trip.trip_banner?.promo_enabled ?? false}
                          promoContent={trip.trip_banner?.promo_content || ''}
                          categoryLabel={subAreaFilter || getTripSubArea(trip) || undefined}
                          onCustomTourToggle={handleCustomTourToggle}
                          onImageUpdate={handleTripImageUpdate}
                          onDocumentUpdate={handleTripDocumentUpdate}
                          onDocumentAvailabilityUpdate={handleTripDocumentAvailabilityUpdate}
                          onDurationUpdate={handleTripDurationUpdate}
                          onTitleUpdate={handleTripTitleUpdate}
                          onPriceUpdate={handleTripPriceUpdate}
                          onDelete={handleDeleteTrip}
                          onHide={handleHideTrip}
                          onDuplicate={handleDuplicateTrip}
                        />
                      </div>
                    );
                  })}
                  {isDevMode && (
                    <button
                      onClick={handleAddTrip}
                      className="group/add col-span-full flex flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-sky-200 bg-gray-50 p-6 transition hover:border-sky-300 hover:bg-sky-50 md:flex-row md:p-8"
                    >
                      <div className="flex h-full w-32 shrink-0 items-center justify-center sm:w-40 md:w-48">
                        <svg className="h-10 w-10 text-sky-400 transition group-hover/add:text-sky-500 sm:h-12 sm:w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                      <div className="flex flex-1 flex-col justify-center p-2.5 sm:p-3 md:p-4">
                        <p className="text-xs font-semibold text-sky-600 sm:text-sm">新增行程</p>
                        <div className="mt-2 flex w-full items-center justify-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-[11px] font-semibold text-sky-600 sm:px-4 sm:py-2 sm:text-xs md:text-sm">
                          點擊新增
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Dev mode 已隱藏行程（緊接在行程列表下方） */}
            {isDevMode && (
              <div className="mt-6" id="hidden-trips-section">
                <button
                  type="button"
                  onClick={() => { if (!showHidden) { setShowHidden(true); void loadHiddenTrips(); } else { setShowHidden(false); } }}
                  className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M3 3l18 18" />
                  </svg>
                  {showHidden ? `收起已隱藏行程（${hiddenTrips.length}）` : `顯示已隱藏行程（${hiddenTrips.length}）`}
                </button>
                {showHidden && hiddenTrips.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {hiddenTrips.map((trip) => (
                      <div key={trip.id} className="relative rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/30 p-1">
                        <div className="absolute left-2 top-2 z-10 rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-bold text-white">已隱藏</div>
                        <div className="pointer-events-none opacity-50">
                          <TripCard
                            id={trip.id}
                            title={trip.title}
                            duration={trip.duration}
                            price_range={getTripCardPrice(trip)}
                            cover_image_url={trip.cover_image_url}
                            tags={trip.trip_banner?.tags}
                            isDevMode={false}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleRestoreTrip(trip.id)}
                          className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow transition hover:bg-emerald-500 active:scale-95"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          恢復顯示
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {showHidden && hiddenTrips.length === 0 && (
                  <p className="text-sm text-gray-400">沒有已隱藏的行程</p>
                )}
              </div>
            )}
          </>
        )}

        {/* 熱門行程推薦（直接顯示同區域推薦） */}
        {relatedTrips && relatedTrips.regionTrips.length > 0 && (
          <section className="mt-10">
            <div className="-mx-3 mb-4 rounded-xl bg-gradient-to-r from-red-700 via-amber-600 to-yellow-500 px-4 py-5 shadow-lg sm:-mx-4 sm:mb-6 sm:px-5 sm:py-6">
              <div className="flex flex-col items-center gap-1">
                <h2 className="text-xl font-black tracking-[0.15em] text-white drop-shadow-md sm:text-2xl">
                  {destination.regions?.title}熱門行程
                </h2>
                <div className="mt-0.5 h-[2px] w-16 rounded-full bg-gradient-to-r from-transparent via-yellow-300 to-transparent" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {relatedTrips.regionTrips.slice(0, 6).map((trip) => (
                <div key={trip.id} className="relative md:min-w-0">
                  {/* 推薦標籤 */}
                  <div className="absolute -top-1.5 left-2 z-10 flex items-center gap-1 rounded-md bg-gradient-to-r from-orange-400 to-orange-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-md sm:text-xs">
                    <span>👍</span>
                    <span>推薦</span>
                  </div>
                  <TripCard
                    id={trip.id}
                    title={trip.title}
                    duration={trip.duration}
                    price_range={getTripCardPrice(trip)}
                    cover_image_url={trip.cover_image_url}
                    document_url={trip.document_url}
                    document_is_available={trip.document_is_available}
                    departure_dates={trip.departure_dates}
                    tags={trip.trip_banner?.tags}
                    countries={trip.trip_banner?.countries}
                    isDevMode={false}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 熱門行程推薦 fallback */}
        {relatedTrips && relatedTrips.regionTrips.length === 0 && relatedTrips.categoryTrips.length === 0 && popularFallback && popularFallback.length > 0 && (
          <section className="mt-10">
            <div className="-mx-3 mb-4 rounded-xl bg-gradient-to-r from-red-700 via-amber-600 to-yellow-500 px-4 py-5 shadow-lg sm:-mx-4 sm:mb-6 sm:px-5 sm:py-6">
              <div className="flex flex-col items-center gap-1">
                <h2 className="text-xl font-black tracking-[0.15em] text-white drop-shadow-md sm:text-2xl">
                  其他熱門行程推薦
                </h2>
                <div className="mt-0.5 h-[2px] w-16 rounded-full bg-gradient-to-r from-transparent via-yellow-300 to-transparent" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {popularFallback.slice(0, 6).map((trip) => (
                <div key={trip.id} className="relative md:min-w-0">
                  <div className="absolute -top-1.5 left-2 z-10 flex items-center gap-1 rounded-md bg-gradient-to-r from-orange-400 to-orange-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-md sm:text-xs">
                    <span>👍</span>
                    <span>推薦</span>
                  </div>
                  <TripCard
                    id={trip.id}
                    title={trip.title}
                    duration={trip.duration}
                    price_range={getTripCardPrice(trip)}
                    cover_image_url={trip.cover_image_url}
                    document_url={trip.document_url}
                    document_is_available={trip.document_is_available}
                    departure_dates={trip.departure_dates}
                    tags={trip.trip_banner?.tags}
                    isDevMode={false}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 載入推薦行程中 */}
        {displayTrips.length > 0 && relatedLoading && (
          <div className="mt-10 flex items-center justify-center py-6">
            <div className="inline-block h-5 w-5 animate-spin rounded-full border-4 border-solid border-sky-400 border-r-transparent" />
            <span className="ml-2 text-sm text-gray-500">載入推薦行程...</span>
          </div>
        )}

        <SocialCta
          className="mt-10"
          title="找不到想要的行程？"
          description="聯繫旅遊規劃師蓋瑞 GARY，為您客製專屬行程"
        />
      </section>

      <FloatingContact />
      {isDevMode && (
        <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-2">
          {scrapePendingIds.length > 0 && (
            <button
              onClick={() => void handleApplyPendingChanges()}
              disabled={scrapeApplying}
              className="flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-lg ring-2 ring-emerald-300 ring-offset-2 animate-pulse transition hover:bg-emerald-400 disabled:opacity-60 disabled:animate-none"
            >
              {scrapeApplying ? (scrapeApplyProgress || '⏳ 更新中...') : `✅ 更新此頁 (${scrapePendingIds.length} 筆)`}
            </button>
          )}
          <button
            onClick={() => void handleScrapeThisPage()}
            disabled={scrapeTriggering || scrapeRunning}
            className="flex items-center gap-2 rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-purple-500 disabled:opacity-60"
          >
            {scrapeRunning ? '⏳ 抓取進行中...' : scrapeTriggering ? '⏳ 啟動中...' : selectedTripIds.size > 0 ? `🔄 更新抓取已選 (${selectedTripIds.size})` : '🔄 抓取此頁行程'}
          </button>
          {globalPendingCount > 0 && (
            <button
              onClick={() => { window.location.href = '/admin'; }}
              className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-500 shadow-sm transition hover:border-gray-300 hover:text-gray-700"
            >
              🌐 全站尚有 {globalPendingCount} 筆待確認
            </button>
          )}
        </div>
      )}
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}

      {showScrapePreviewModal && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setShowScrapePreviewModal(false); }}
        >
          <div className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h3 className="text-base font-bold text-gray-900">📋 抓取變更預覽（{scrapePreviewChanges.length} 筆）</h3>
              <button
                type="button"
                onClick={() => setShowScrapePreviewModal(false)}
                className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {scrapePreviewChanges.map(c => (
                <div key={c.id} className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-block rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                      {getDestChangeLabel(c.change_type, c.field_name)}
                    </span>
                    {c.trip_title && (
                      <span className="truncate text-xs text-gray-500">{c.trip_title}</span>
                    )}
                  </div>
                  <div className="mt-1.5 grid grid-cols-[1fr_auto_1fr] items-start gap-1.5">
                    <p className="break-all rounded bg-red-50 px-2 py-1 text-xs text-red-700 line-through">
                      {formatDestDiffValue(c.old_value)}
                    </p>
                    <span className="pt-1 text-xs text-gray-400">→</span>
                    <p className="break-all rounded bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                      {formatDestDiffValue(c.new_value)}
                    </p>
                  </div>
                </div>
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
                onClick={() => void handleConfirmApply()}
                className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
              >
                ✅ 確認更新
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </main>
  );
}
