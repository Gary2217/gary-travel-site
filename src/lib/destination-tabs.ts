import type { Trip } from '@/lib/supabase';

// 港澳大陸／日本目的地頁的 sub_area tab 顯示順序（非字母序，跟隨朋威官網介面慣例）
const CHINA_ORDER = ['張家界', '九寨溝', '張家界+九寨溝', '重慶', '長江三峽', '貴州', '桂林', '甘南', '新疆', '江南', '廈門', '金廈', '武夷山', '黃山', '青島', '洛陽', '哈爾濱', '高雄出發'];
const JAPAN_ORDER = ['北海道', '仙台', '東京', '名古屋', '京都/大阪/神戶/奈良', '四國', '北九州/福岡/熊本', '沖繩', '台中出發', '高雄出發'];

const getTripSubArea = (trip: Trip): string => ((trip.trip_banner?.sub_area as string) || '').trim();

export type SubRegionGroup = { subRegion: string; destinations: { id: string; label: string }[] };
export type RegionTab = { label: string; destId: string };

export interface DestinationListItem {
  id: string;
  title: string;
  region_id: string;
  display_order: number;
  sub_region?: string | null;
}

export interface DestinationTabStateInput {
  destinationId: string;
  destData: { region_id: string; sub_region?: string | null; title: string; regions?: { category_label?: string | null } | null };
  trips: Trip[];
  allDestinations: DestinationListItem[];
  savedTab: string;
  savedAll: boolean;
}

export interface DestinationTabState {
  subRegionGroups: SubRegionGroup[];
  activeSubRegion: string;
  regionTabs: RegionTab[];
  currentTabLabel: string;
  subAreaFilter: string;
  // 以下三個欄位只有 destination/[id] 頁的 client effect Phase 2（背景載入相關/隱藏/合併行程）需要，
  // 首次伺服器端渲染不使用，但一併回傳以確保跟 client 端算出來的完全是同一份資料，不會有兩套邏輯。
  restoredGroup: SubRegionGroup | null;
  shouldRestoreAll: boolean;
  allSingleDest: boolean;
}

/**
 * 目的地頁 Phase 1 的 sub_region／sub_area tab 推導邏輯（同區域兄弟目的地分組、
 * sub_area 篩選 tab、URL query param 深層連結還原）。
 *
 * 這是 destination/[id] 的伺服器端 page.tsx 與 client 端 DestinationPageClient.tsx
 * 的 loadData effect 共用的唯一實作 —— 兩邊都呼叫這支函式，不是各自維護一份，
 * 避免日後改動時漏改其中一邊造成兩邊算出不同的 tab 狀態。
 */
export function computeDestinationTabState({
  destinationId,
  destData,
  trips,
  allDestinations,
  savedTab,
  savedAll,
}: DestinationTabStateInput): DestinationTabState {
  const siblings = allDestinations
    .filter((d) => d.region_id === destData.region_id)
    .sort((a, b) => a.display_order - b.display_order);
  const hasSiblings = siblings.length > 1;

  let subRegionGroups: SubRegionGroup[] = [];
  let activeSubRegion = '';
  let restoredGroup: SubRegionGroup | null = null;
  let shouldRestoreAll = false;

  if (hasSiblings) {
    // 用當前 destData 的 sub_region 覆蓋列表中的值（列表 API 可能被 CDN 快取返回舊值）
    const currentSR = destData.sub_region || destData.title;
    const enrichedSiblings = siblings.map((s) =>
      s.id === destinationId ? { ...s, sub_region: currentSR } : s
    );
    const groupMap = new Map<string, { id: string; label: string }[]>();
    for (const s of enrichedSiblings) {
      const sr = s.sub_region || s.title;
      if (!groupMap.has(sr)) groupMap.set(sr, []);
      groupMap.get(sr)!.push({ id: s.id, label: s.title });
    }
    subRegionGroups = Array.from(groupMap.entries()).map(([subRegion, destinations]) => ({ subRegion, destinations }));

    const hasSavedSubRegion = Boolean(savedTab && subRegionGroups.some((g) => g.subRegion === savedTab));
    const hasSavedSubArea = Boolean(savedTab && trips.some((t) => getTripSubArea(t) === savedTab));
    const restoredSR = hasSavedSubRegion ? savedTab : currentSR;
    // sub_area tab（如富國島）也阻止 all=1 覆蓋，確保子標籤深層連結有效
    shouldRestoreAll = !hasSavedSubRegion && !hasSavedSubArea && savedAll;
    restoredGroup = subRegionGroups.find((g) => g.subRegion === restoredSR) || null;
    activeSubRegion = shouldRestoreAll ? '全部' : restoredSR;
  }

  const allSingleDest = subRegionGroups.length > 0 && subRegionGroups.every((g) => g.destinations.length === 1);

  const areas: string[] = Array.from(new Set(trips.map(getTripSubArea).filter(Boolean)));
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
  const regionTabs: RegionTab[] = areas.length >= 2
    ? [{ label: '全部', destId: 'all' }, ...areas.map((a) => ({ label: a, destId: `filter:${a}` }))]
    : [];

  // resetSubAreaState() 的預設值是 currentTabLabel='全部'，沒有 sub_area tabs 時維持這個預設
  let currentTabLabel = '全部';
  let subAreaFilter = '';
  if (regionTabs.length > 0) {
    const validTab = regionTabs.find((t) => t.label === savedTab);
    if (validTab && savedTab !== '全部') {
      currentTabLabel = validTab.label;
      subAreaFilter = validTab.destId.startsWith('filter:') ? validTab.destId.slice(7) : '';
    } else {
      currentTabLabel = '全部';
    }
  }

  return { subRegionGroups, activeSubRegion, regionTabs, currentTabLabel, subAreaFilter, restoredGroup, shouldRestoreAll, allSingleDest };
}
