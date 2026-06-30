"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
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

  // 記住 tab 到 URL query param，重整後恢復
  const setTabParam = (tab: string) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (tab && tab !== '全部') {
      url.searchParams.set('tab', tab);
    } else {
      url.searchParams.delete('tab');
    }
    window.history.replaceState({}, '', url.toString());
  };
  const getTabParam = () => {
    if (typeof window === 'undefined') return '';
    return new URL(window.location.href).searchParams.get('tab') || '';
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
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isPC, setIsPC] = useState(false);
  const [scrapeTriggering, setScrapeTriggering] = useState(false);
  const [scrapeRunning, setScrapeRunning] = useState(false);
  const [scrapePendingIds, setScrapePendingIds] = useState<string[]>([]);
  const [scrapeApplying, setScrapeApplying] = useState(false);
  const [scrapeApplyProgress, setScrapeApplyProgress] = useState('');
  const scrapePollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrapeTargetDestRef = useRef(destinationId);
  // 抓取完成後要查哪些 destination 的 pending changes（全部 tab 時查所有 sibling）
  const scrapeTargetDestsRef = useRef<string[]>([destinationId]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [subAreaFilter, setSubAreaFilter] = useState<string>("");
  const [selectedTripIds, setSelectedTripIds] = useState<Set<string>>(new Set());
  const [heroDest, setHeroDest] = useState<(Destination & { regions?: { category_label: string; title: string } }) | null>(null);
  const siblingDestsRef = useRef<string[]>([]);
  const siblingDestsDataRef = useRef<Map<string, Destination & { regions?: { category_label: string; title: string } }>>(new Map());
  const siblingTripsCache = useRef<Map<string, Trip[]>>(new Map());
  const destsListCache = useRef<{ id: string; title: string; region_id: string; display_order: number; sub_region?: string }[] | null>(null);
  const recommendRef = useRef<HTMLDivElement>(null);
  const relatedFetched = useRef(false);

  // 所有 sub_region 是否都只有 1 個 destination（港澳大陸等：直接用 sub_area tabs 取代 sub_region tabs）
  const allSingleDest = subRegionGroups.length > 0 && subRegionGroups.every(g => g.destinations.length === 1);

  // sub_area tabs（從合併行程或當前行程動態計算）
  const CHINA_SUB_AREA_ORDER = useMemo(() => ['張家界', '九寨溝', '張家界+九寨溝', '重慶', '長江三峽', '貴州', '桂林', '甘南', '北疆', '新疆', '江南', '廈門', '金廈', '武夷山', '黃山', '青島', '洛陽', '哈爾濱', '高雄出發'], []);
  const JAPAN_SUB_AREA_ORDER = useMemo(() => ['北海道', '仙台', '東京', '名古屋', '京都/大阪/神戶/奈良', '四國', '北九州/福岡/熊本', '沖繩', '台中出發', '高雄出發'], []);

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
  const MERGED_REGIONS = useMemo(() => ['港澳大陸', '日本', '中東亞非'], []);
  const regionCat = destination?.regions?.category_label || '';
  const useMergedMode = allSingleDest && MERGED_REGIONS.includes(regionCat);

  const mergedSubAreaTabs = useMemo(() => {
    const source = subRegionTrips || trips;
    if (!source || source.length === 0) return [];
    const areas: string[] = Array.from(new Set(
      source.flatMap(t => ((t.trip_banner?.sub_area as string) || "").split(",").map(s => s.trim())).filter(Boolean)
    ));
    if (regionCat === '港澳大陸') sortByOrder(areas, CHINA_SUB_AREA_ORDER);
    else if (regionCat === '日本') sortByOrder(areas, JAPAN_SUB_AREA_ORDER);
    return areas.length >= 2
      ? [{ label: "全部", destId: "all" }, ...areas.map(a => ({ label: a, destId: `filter:${a}` }))]
      : [];
  }, [subRegionTrips, trips, regionCat, CHINA_SUB_AREA_ORDER, JAPAN_SUB_AREA_ORDER, sortByOrder]);

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
      try {
        setPopularFallback(null);
        setSubRegionTrips(null);
        setActiveDestFilter(null);
        setHeroDest(null);

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

        const isChinaRegion = destData.regions?.title === '港澳大陸';
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
          // 從 URL query param 恢復 tab，否則用 currentSR
          const savedTab = getTabParam();
          const restoredSR = savedTab && groups.some(g => g.subRegion === savedTab) ? savedTab : currentSR;
          setActiveSubRegion(restoredSR);
        } else {
          setSubRegionGroups([]);
          setActiveSubRegion("");
        }

        // sub_area tabs 在 Phase 2 await 之前就計算好（避免 React render 時序問題）
        const currentTrips = tripsData as Trip[];
        const CHINA_ORDER = ['張家界', '九寨溝', '張家界+九寨溝', '重慶', '長江三峽', '貴州', '桂林', '甘南', '北疆', '新疆', '江南', '廈門', '金廈', '武夷山', '黃山', '青島', '洛陽', '哈爾濱', '高雄出發'];
        const JAPAN_ORDER = ['北海道', '仙台', '東京', '名古屋', '京都/大阪/神戶/奈良', '四國', '北九州/福岡/熊本', '沖繩', '台中出發', '高雄出發'];
        const areas: string[] = Array.from(new Set(
          currentTrips.flatMap(t => ((t.trip_banner?.sub_area as string) || "").split(",").map(s => s.trim())).filter(Boolean)
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
        // 排序：有出團日期的在前、custom_tour 在最後
        const sortedTrips = [...currentTrips].sort((a, b) => {
          const aCustom = a.trip_banner?.custom_tour ? 1 : 0;
          const bCustom = b.trip_banner?.custom_tour ? 1 : 0;
          if (aCustom !== bCustom) return aCustom - bCustom;
          const aHas = a.departure_dates && a.departure_dates.length > 0 ? 0 : 1;
          const bHas = b.departure_dates && b.departure_dates.length > 0 ? 0 : 1;
          if (aHas !== bHas) return aHas - bHas;
          return (a.display_order || 99) - (b.display_order || 99);
        });
        setTrips(sortedTrips);
        setRegionTabs(areaTabs);
        if (areaTabs.length > 0) setCurrentTabLabel("全部");

        // ★ Phase 1 完成 — 立即顯示頁面，不等 Phase 2
        setLoading(false);

        // Phase 2（背景載入，不阻塞頁面顯示）
        const hasRelated = destData.region_id && destData.regions?.category_label;
        if (hasRelated) setRelatedLoading(true);
        const isMergedRegion = ['港澳大陸', '日本', '中東亞非'].includes(rCat);

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
        const sibDestsP = hasSiblings
          ? Promise.all(siblingIds.map(id => getDestination(id).catch(() => null)))
          : Promise.resolve(null);

        const [relatedResult, hiddenResult, allSibTripsResult, sibDestsResult] = await Promise.all([relatedP, hiddenP, allSibTripsP, sibDestsP]);
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

        // MERGED 模式：設定合併行程
        if (hasSiblings && allSibTripsResult && isMergedRegion) {
          const merged = [...sortedTrips, ...(allSibTripsResult as Trip[][]).flat()].sort((a, b) => {
            const aCustom = a.trip_banner?.custom_tour ? 1 : 0;
            const bCustom = b.trip_banner?.custom_tour ? 1 : 0;
            if (aCustom !== bCustom) return aCustom - bCustom;
            const aHas = a.departure_dates && a.departure_dates.length > 0 ? 0 : 1;
            const bHas = b.departure_dates && b.departure_dates.length > 0 ? 0 : 1;
            if (aHas !== bHas) return aHas - bHas;
            return (a.display_order || 99) - (b.display_order || 99);
          });
          setSubRegionTrips(merged);
          setActiveDestFilter(destinationId);
        }

        // 兄弟 destination 資料快取（hero 切換用）
        if (sibDestsResult) {
          const map = new Map<string, Destination & { regions?: { category_label: string; title: string } }>();
          map.set(destinationId, destData);
          (sibDestsResult as ((Destination & { regions?: { category_label: string; title: string } }) | null)[]).forEach(d => { if (d) map.set(d.id, d); });
          siblingDestsDataRef.current = map;
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

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(pointer: fine)');
    const updateIsPC = (event?: MediaQueryListEvent) => {
      setIsPC(event?.matches ?? mediaQuery.matches);
    };

    updateIsPC();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateIsPC);
      return () => mediaQuery.removeEventListener('change', updateIsPC);
    }

    mediaQuery.addListener(updateIsPC);
    return () => mediaQuery.removeListener(updateIsPC);
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
      setTrips(prev => [...prev, tripWithFlag]);
      setSubRegionTrips(prev => prev ? [...prev, tripWithFlag] : null);
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
        setTrips(prev => [...prev, restored]);
        setSubRegionTrips(prev => prev ? [...prev, restored] : null);
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
      setTrips(prev => [...prev, newTrip]);
      setSubRegionTrips(prev => prev ? [...prev, newTrip] : null);
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

  function handleDragStart(index: number) {
    return (e: React.DragEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, [contenteditable]')) {
        e.preventDefault();
        return;
      }
      setDragIndex(index);
      setDragOverIndex(index);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));
    };
  }

  function handleDragOver(index: number) {
    return (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOverIndex(index);
    };
  }

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  function handleDrop(dropIndex: number) {
    return async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();

      if (dragIndex === null || dragIndex === dropIndex) {
        handleDragEnd();
        return;
      }

      try {
        await handleReorder('trips', trips, dragIndex, dropIndex, setTrips);
      } catch (error) {
        alert(error instanceof Error ? error.message : '排序失敗');
      } finally {
        handleDragEnd();
      }
    };
  }

  const clearFilters = () => {
    setDateFilter('');
    setCityFilter('');
    const isAll = currentTabLabel === "全部";
    router.replace(`/destination/${destinationId}${isAll ? '?all=1' : ''}`);
  };

  const handleShowAll = async () => {
    setCurrentTabLabel("全部");
    setSubAreaFilter("");
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('all', '1');
      window.history.replaceState({}, '', url.toString());
    }

    try {
      const freshTrips = (await getDestinationTrips(destinationId)) as Trip[];
      const areas: string[] = Array.from(new Set(
        freshTrips.flatMap(t => ((t.trip_banner?.sub_area as string) || "").split(",").map(s => s.trim())).filter(Boolean)
      ));
      // 依區域排序 sub_area tabs
      if (regionCat === '港澳大陸') sortByOrder(areas, CHINA_SUB_AREA_ORDER);
      else if (regionCat === '日本') sortByOrder(areas, JAPAN_SUB_AREA_ORDER);
      const areaTabs = areas.length >= 2
        ? [{ label: "全部", destId: "all" }, ...areas.map(a => ({ label: a, destId: `filter:${a}` }))]
        : [];

      const sorted = [...freshTrips].sort((a, b) => {
        const aCustom = a.trip_banner?.custom_tour ? 1 : 0;
        const bCustom = b.trip_banner?.custom_tour ? 1 : 0;
        if (aCustom !== bCustom) return aCustom - bCustom;
        const aHas = a.departure_dates && a.departure_dates.length > 0 ? 0 : 1;
        const bHas = b.departure_dates && b.departure_dates.length > 0 ? 0 : 1;
        if (aHas !== bHas) return aHas - bHas;
        return (a.display_order || 99) - (b.display_order || 99);
      });
      setTrips(sorted);
      setRegionTabs(areaTabs);
    } catch {
      // 保持目前行程不變
    }
  };

  const handleTabClick = (tab: { label: string; destId: string }) => {
    if (tab.label === currentTabLabel) return;
    if (tab.destId.startsWith("filter:")) {
      setSubAreaFilter(tab.destId.slice(7));
      setCurrentTabLabel(tab.label);
    } else if (tab.destId === "all") {
      setSubAreaFilter("");
      setCurrentTabLabel("全部");
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
    const visibleTrips = subAreaFilter
      ? displayTrips.filter(t => ((t.trip_banner?.sub_area as string) || '').split(',').map(s => s.trim()).includes(subAreaFilter))
      : displayTrips;
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

    if (selectedTripIds.size === 0 && !isAllTab && !targetDestData?.source_url) {
      alert('此目的地尚未設定朋威對應 URL（source_url），無法抓取。\n請到 Supabase 設定此目的地的 source_url 後再試。');
      return;
    }

    scrapeTargetDestRef.current = targetDestId;
    // 「全部」tab 時查所有 sibling，否則只查該 destination
    scrapeTargetDestsRef.current = isAllTab ? allSiblingIds : [targetDestId];
    setScrapeTriggering(true);
    setScrapePendingIds([]);
    try {
      const tripIds = Array.from(selectedTripIds);
      // 「全部」tab → 用 region key 觸發整區；否則觸發單一 destination
      const regionKey = destination?.source_url?.match(/\/([^/]+)\/$/)?.[1] || '';
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
      setToastMessage('更新完成！重新載入中...');
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
          {useMergedMode && mergedSubAreaTabs.length > 0 ? (
            /* merged mode（港澳大陸/日本/中東亞非）：直接用 sub_area tabs */
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
                      setSubAreaFilter("");
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
                        setTabParam(group.subRegion);
                        if (group.destinations.length === 1) {
                          const destId = group.destinations[0].id;
                          if (destId === destinationId) {
                            setSubRegionTrips(null);
                            setHeroDest(null);
                            // 恢復當前 destination 的 sub_area tabs
                            setSubAreaFilter("");
                            setCurrentTabLabel("全部");
                          } else {
                            // 從預快取瞬間切換，無快取時才 fetch
                            const cachedTrips = siblingTripsCache.current.get(destId);
                            const tripData = cachedTrips || await getDestinationTrips(destId).catch(() => []);
                            setSubRegionTrips(tripData as Trip[]);
                            // 計算新 destination 的 sub_area tabs
                            const sibAreas: string[] = Array.from(new Set(
                              (tripData as Trip[]).flatMap((tr: Trip) => ((tr.trip_banner?.sub_area as string) || "").split(",").map((s: string) => s.trim())).filter(Boolean)
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
                          setSubRegionLoading(true);
                          try {
                            const allTrips = await Promise.all(
                              group.destinations.map(d => getDestinationTrips(d.id).catch(() => []))
                            );
                            setSubRegionTrips(allTrips.flat());
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
                  {destination.title}目前暫無現成行程，可客製行程
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
                  const trips = relatedTrips.regionTrips as any[];
                  const hasSubRegions = trips.some((t) => t.destinations?.sub_region);
                  const groups: { label: string; trips: any[] }[] = [];
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
                                  departure_dates={trip.departure_dates} tags={trip.trip_banner?.tags} isDevMode={false} />
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
                                departure_dates={trip.departure_dates} tags={trip.trip_banner?.tags} isDevMode={false} />
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })()}

                {/* 同類別熱門行程（按 region title 分組） */}
                {relatedTrips && relatedTrips.categoryTrips.length > 0 && (() => {
                  const trips = relatedTrips.categoryTrips as any[];
                  const groups: { label: string; trips: any[] }[] = [];
                  const seen = new Set<string>();
                  trips.forEach((t) => {
                    const key = (t.destinations as any)?.regions?.title || '';
                    if (!seen.has(key)) {
                      seen.add(key);
                      groups.push({ label: key, trips: trips.filter((x) => ((x.destinations as any)?.regions?.title || '') === key) });
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
                                  departure_dates={trip.departure_dates} tags={trip.trip_banner?.tags} isDevMode={false} />
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
                可選行程（{subAreaFilter ? displayTrips.filter((t) => ((t.trip_banner?.sub_area as string) || "").split(",").map(s => s.trim()).includes(subAreaFilter)).length : displayTrips.length}）
              </h2>
              {isDevMode && (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="shrink-0 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 transition hover:bg-purple-100"
                >
                  {(() => {
                    const visibleTrips = subAreaFilter
                      ? displayTrips.filter(t => ((t.trip_banner?.sub_area as string) || '').split(',').map(s => s.trim()).includes(subAreaFilter))
                      : displayTrips;
                    const allSelected = visibleTrips.length > 0 && visibleTrips.every(t => selectedTripIds.has(t.id));
                    return allSelected ? '取消全選' : '全選';
                  })()}
                </button>
              )}
            </div>

            {(() => {
              const filtered = subAreaFilter
                ? displayTrips.filter((t) => ((t.trip_banner?.sub_area as string) || "").split(",").map(s => s.trim()).includes(subAreaFilter))
                : displayTrips;
              const sorted = dateFilter
                ? [...filtered].sort((a, b) => {
                    const aMatch = a.departure_dates?.some((d) => d.departure_date === dateFilter) ? 0 : 1;
                    const bMatch = b.departure_dates?.some((d) => d.departure_date === dateFilter) ? 0 : 1;
                    return aMatch - bMatch;
                  })
                : filtered;

              return (
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
                          isDevMode={isDevMode}
                          isSelected={selectedTripIds.has(trip.id)}
                          onSelect={handleSelectTrip}
                          isCustomTour={trip.trip_banner?.custom_tour ?? false}
                          isPromoEnabled={trip.trip_banner?.promo_enabled ?? false}
                          promoContent={trip.trip_banner?.promo_content || ''}
                          categoryLabel={subAreaFilter || ((trip.trip_banner?.sub_area as string) || '').split(',')[0].trim() || undefined}
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
              {scrapeApplying ? (scrapeApplyProgress || '⏳ 更新中...') : `✅ 更新 (${scrapePendingIds.length} 筆)`}
            </button>
          )}
          <button
            onClick={() => void handleScrapeThisPage()}
            disabled={scrapeTriggering || scrapeRunning}
            className="flex items-center gap-2 rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-purple-500 disabled:opacity-60"
          >
            {scrapeRunning ? '⏳ 抓取進行中...' : scrapeTriggering ? '⏳ 啟動中...' : selectedTripIds.size > 0 ? `🔄 更新抓取已選 (${selectedTripIds.size})` : '🔄 抓取此頁行程'}
          </button>
        </div>
      )}
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
    </main>
  );
}
