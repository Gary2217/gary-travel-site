"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { getRegionsWithDestinations, getSiteLogo, trackClick } from "@/lib/supabase";
import { getFavorites, toggleFavorite } from "@/lib/favorites";
import DevModeToggle from "@/components/DevModeToggle";
import FloatingContact from "@/components/FloatingContact";
import SocialCta from "@/components/SocialCta";
import StickyHeader from "@/components/StickyHeader";
import TravelSearchBar from "@/components/TravelSearchBar";

const ImageEditor = dynamic(() => import("@/components/ImageEditor"), { ssr: false });
const LogoUploader = dynamic(() => import("@/components/LogoUploader"), { ssr: false });
const ContactInquiries = dynamic(() => import("@/components/ContactInquiries"), { ssr: false });

import { Skeleton, GridSkeleton } from "@/components/Skeleton";

type Destination = {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  display_order: number;
  sub_region?: string;
};

type RouteSection = {
  id: string;
  categoryLabel: string;
  title: string;
  description: string;
  destinations: Destination[];
};

type FavoriteTrip = {
  id: string;
  title: string;
  duration: string;
  cover_image_url?: string;
  destinations?: { title: string };
};

interface HomeDestinationCardProps {
  destination: Destination;
  isDevMode: boolean;
  isDraggable?: boolean;
  isDragging?: boolean;
  isDragOver?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLAnchorElement>) => void;
  onDragOver?: (e: React.DragEvent<HTMLAnchorElement>) => void;
  onDragEnd?: () => void;
  onDrop?: (e: React.DragEvent<HTMLAnchorElement>) => void;
  onImageUpdate: (destinationId: string, newImageUrl: string) => void;
  onTextUpdate: (destinationId: string, fields: Partial<Pick<Destination, 'title' | 'subtitle'>>) => void;
  onDelete?: (destinationId: string) => Promise<void>;
  onSaveSuccess?: (message: string) => void;
  reorderControls?: {
    canMoveUp: boolean;
    canMoveDown: boolean;
    onMoveUp: () => void;
    onMoveDown: () => void;
  };
  priority?: boolean;
}

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

function HomeDestinationCard({ destination, isDevMode, isDraggable = false, isDragging = false, isDragOver = false, onDragStart, onDragOver, onDragEnd, onDrop, onImageUpdate, onTextUpdate, onDelete, onSaveSuccess, reorderControls, priority = false }: HomeDestinationCardProps) {
  const [tripCount, setTripCount] = useState<number | null>(null);

  useEffect(() => {
    if (!isDevMode) return;

    let active = true;

    async function loadTripCount() {
      try {
        const res = await fetch(`/api/destinations/${destination.id}/trips`, { cache: 'no-store' });
        const data = res.ok ? await res.json() : [];
        if (!active) return;
        setTripCount(Array.isArray(data) ? data.length : 0);
      } catch {
        if (!active) return;
        setTripCount(0);
      }
    }

    loadTripCount();

    return () => {
      active = false;
    };
  }, [destination.id, isDevMode]);

  const updateField = async (field: 'title' | 'subtitle', value: string) => {
    const res = await fetch(`/api/destinations/${destination.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value.trim() }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || '更新失敗');
    }

    onTextUpdate(destination.id, { [field]: value.trim() });
  };

  return (
    <Link
      href={`/destination/${destination.id}`}
      draggable={isDraggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDrop={onDrop}
      className={`group relative block aspect-[4/3] overflow-hidden rounded-xl border border-gray-200 bg-gray-100 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-gray-300/50 ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''} ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'ring-2 ring-sky-400' : ''}`}
      onClick={() => { if (!isDevMode) trackClick(destination.id); }}
    >
      {isDevMode && (
        <>
          <ImageEditor
            entityId={destination.id}
            currentImageUrl={destination.image_url}
            title={destination.title}
            onUpdate={(newUrl) => onImageUpdate(destination.id, newUrl)}
            onSaveSuccess={onSaveSuccess}
            editableTitle={destination.title}
            editableSubtitle={destination.subtitle}
            onEditableTitleUpdate={(newTitle) => updateField('title', newTitle)}
            onEditableSubtitleUpdate={(newSubtitle) => updateField('subtitle', newSubtitle)}
          />
          {onDelete && (
            <button
              type="button"
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (!confirm(`確定要刪除「${destination.title}」嗎？`)) return;

                try {
                  const tripsRes = await fetch(`/api/destinations/${destination.id}/trips`, { cache: 'no-store' });
                  const tripsData = tripsRes.ok ? await tripsRes.json() : [];
                  const tripCount = Array.isArray(tripsData) ? tripsData.length : 0;
                  setTripCount(tripCount);

                  const shouldDelete = confirm(
                    tripCount > 0
                      ? `此目的地底下目前有 ${tripCount} 個行程卡片。\n刪除目的地後，裡面的行程卡片也會一起刪除。\n\n請再次確認是否刪除？`
                      : '此目的地下目前沒有行程卡片。\n\n請再次確認是否刪除？'
                  );
                  if (!shouldDelete) return;

                  await onDelete(destination.id);
                } catch (error) {
                  alert(error instanceof Error ? error.message : '刪除失敗');
                }
              }}
              className="absolute right-12 top-2 z-10 rounded-full bg-red-600/90 p-2 text-white shadow-lg transition hover:bg-red-500"
              title="刪除此卡片"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
          {reorderControls && (
            <div className="absolute right-2 top-12 z-10 flex flex-col gap-1">
              {reorderControls.canMoveUp && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void reorderControls.onMoveUp();
                  }}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-xs text-white/80 hover:bg-black/70"
                  title="上移"
                >
                  ↑
                </button>
              )}
              {reorderControls.canMoveDown && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void reorderControls.onMoveDown();
                  }}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-xs text-white/80 hover:bg-black/70"
                  title="下移"
                >
                  ↓
                </button>
              )}
            </div>
          )}
          <div className="absolute left-2 top-2 z-10 rounded-full bg-black/60 px-2 py-1 text-[10px] font-semibold text-white/90 backdrop-blur-sm">
            {tripCount === null ? '讀取行程中...' : tripCount > 0 ? `已有行程（${tripCount}）` : '尚無行程'}
          </div>
        </>
      )}
      <Image
        src={destination.image_url}
        alt={destination.title}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
        className="object-cover transition duration-300 group-hover:scale-105"
        priority={priority}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-3">
        <>
          <h3 className="text-sm font-bold text-white [text-shadow:_0_1px_6px_rgba(0,0,0,0.9)] sm:text-base">{destination.title}</h3>
          <p className="mt-0.5 text-[11px] text-white/90 [text-shadow:_0_1px_4px_rgba(0,0,0,0.9)]">{destination.subtitle}</p>
        </>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const [sections, setSections] = useState<RouteSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDevMode, setIsDevMode] = useState(false);
  const [siteLogoUrl, setSiteLogoUrl] = useState('/travel-logo.svg');
  const [filterRegionId, setFilterRegionId] = useState<string | null>(null);
  const [filterDestId, setFilterDestId] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [popularDestinations, setPopularDestinations] = useState<Destination[]>([]);
  const [favoriteTrips, setFavoriteTrips] = useState<FavoriteTrip[]>([]);
  const [addingRegionId, setAddingRegionId] = useState<string | null>(null);
  const [newDestinationTitle, setNewDestinationTitle] = useState('');
  const [newDestinationSubtitle, setNewDestinationSubtitle] = useState('');
  const [newDestinationSubRegion, setNewDestinationSubRegion] = useState('');
  const [dragSectionId, setDragSectionId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  const showSaveSuccess = (message = '儲存成功') => {
    setSaveSuccessMessage(message);
    window.setTimeout(() => setSaveSuccessMessage(null), 1500);
  };
  const [isPC, setIsPC] = useState(false);
  const [dragPopularIndex, setDragPopularIndex] = useState<number | null>(null);
  const [dragOverPopularIndex, setDragOverPopularIndex] = useState<number | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setError(null);
        const data = await getRegionsWithDestinations();
        const formattedSections = data.map((region: any) => ({
          id: region.id,
          categoryLabel: region.category_label,
          title: region.title,
          description: region.description || '',
          destinations: (region.destinations || []).map((dest: any) => ({
            id: dest.id,
            title: dest.title,
            subtitle: dest.subtitle || '',
            image_url: dest.image_url,
            display_order: dest.display_order ?? 0,
            sub_region: dest.sub_region || ''
          }))
        }));
        setSections(formattedSections);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('無法載入資料，請重新整理頁面');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

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
    async function loadPopular() {
      try {
        const res = await fetch('/api/popular-trips', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setPopularDestinations(data);
        }
      } catch {
        // 靜默失敗
      }
    }
    loadPopular();
  }, []);

  useEffect(() => {
    const ids = getFavorites();
    if (ids.length === 0) return;
    Promise.all(
      ids.map(id => fetch(`/api/trips/${id}`, { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null))
    ).then(results => setFavoriteTrips(results.filter(Boolean) as FavoriteTrip[]));
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

  const removeFavorite = (id: string) => {
    toggleFavorite(id);
    setFavoriteTrips(prev => prev.filter(t => t.id !== id));
  };

  const handleSearch = ({ regionId, destinationId, date }: { departureCity: string; regionId: string | null; destinationId: string | null; date: string }) => {
    setFilterRegionId(regionId);
    setFilterDestId(destinationId);
    setFilterDate(date);
    if (regionId) {
      setTimeout(() => scrollToSection(regionId), 50);
    }
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-transparent pt-14 text-gray-900">
        <div className="mx-auto max-w-site px-4 py-6 md:px-5">
          <div className="mb-8">
            <Skeleton className="mb-2 h-5 w-32" />
            <Skeleton className="h-3 w-56" />
            <div className="mt-4">
              <GridSkeleton count={4} cols="grid-cols-2 sm:grid-cols-3 md:grid-cols-4" />
            </div>
          </div>
          <div>
            <Skeleton className="mb-2 h-5 w-24" />
            <Skeleton className="h-3 w-48" />
            <div className="mt-4">
              <GridSkeleton count={5} />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-transparent text-gray-900">
        <div className="text-center px-4">
          <p className="text-lg text-red-400">{error}</p>
          <button
            onClick={() => { setLoading(true); setError(null); window.location.reload(); }}
            className="mt-4 rounded-lg bg-[#00b4d8] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#0096c7]"
          >
            重新載入
          </button>
        </div>
      </main>
    );
  }

  const handleImageUpdate = (destinationId: string, newImageUrl: string) => {
    setSections(prevSections =>
      prevSections.map(section => ({
        ...section,
        destinations: section.destinations.map(dest =>
          dest.id === destinationId ? { ...dest, image_url: newImageUrl } : dest
        )
      }))
    );
  };

  const handleDestinationTextUpdate = (destinationId: string, fields: Partial<Pick<Destination, 'title' | 'subtitle'>>) => {
    setSections((prevSections) =>
      prevSections.map((section) => ({
        ...section,
        destinations: section.destinations.map((dest) =>
          dest.id === destinationId ? { ...dest, ...fields } : dest
        ),
      }))
    );

    setPopularDestinations((prev) =>
      prev.map((destination) =>
        destination.id === destinationId ? { ...destination, ...fields } : destination
      )
    );
  };

  const handlePopularImageUpdate = (destinationId: string, newImageUrl: string) => {
    handleImageUpdate(destinationId, newImageUrl);
    setPopularDestinations((prev) =>
      prev.map((destination) =>
        destination.id === destinationId ? { ...destination, image_url: newImageUrl } : destination
      )
    );
  };

  const handleDeleteDestination = async (destinationId: string) => {
    const res = await fetch(`/api/destinations/${destinationId}`, {
      method: 'DELETE',
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || '刪除失敗');
    }

    setSections((prevSections) =>
      prevSections.map((section) => ({
        ...section,
        destinations: section.destinations.filter((dest) => dest.id !== destinationId),
      }))
    );

    setPopularDestinations((prev) => prev.filter((dest) => dest.id !== destinationId));
  };

  const handleCreateDestination = async (regionId: string) => {
    const title = newDestinationTitle.trim();
    if (!title) {
      alert('請先輸入卡片名稱');
      return;
    }

    const res = await fetch('/api/destinations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        region_id: regionId,
        title,
        subtitle: newDestinationSubtitle.trim(),
        sub_region: newDestinationSubRegion.trim(),
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || '新增失敗');
    }

    const createdDestination = data as Destination;
    setSections((prevSections) =>
      prevSections.map((section) =>
        section.id === regionId
          ? { ...section, destinations: [...section.destinations, createdDestination] }
          : section
      )
    );

    setAddingRegionId(null);
    setNewDestinationTitle('');
    setNewDestinationSubtitle('');
    setNewDestinationSubRegion('');
  };

  const handleDestinationReorder = async (sectionId: string, index: number, direction: -1 | 1) => {
    const section = sections.find((item) => item.id === sectionId);
    if (!section) return;

    try {
      await handleReorder('destinations', section.destinations, index, index + direction, (updatedDestinations) => {
        setSections((prevSections) =>
          prevSections.map((item) =>
            item.id === sectionId ? { ...item, destinations: updatedDestinations } : item
          )
        );
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : '排序失敗');
    }
  };

  function handleDragStart(sectionId: string, index: number) {
    return (e: React.DragEvent<HTMLAnchorElement>) => {
      setDragSectionId(sectionId);
      setDragIndex(index);
      setDragOverSectionId(sectionId);
      setDragOverIndex(index);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', `${sectionId}:${index}`);
    };
  }

  function handleDragOver(sectionId: string, index: number) {
    return (e: React.DragEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      if (dragSectionId !== sectionId) return;

      setDragOverSectionId(sectionId);
      setDragOverIndex(index);
    };
  }

  const handleDragEnd = () => {
    setDragSectionId(null);
    setDragIndex(null);
    setDragOverSectionId(null);
    setDragOverIndex(null);
  };

  function handleDrop(sectionId: string, dropIndex: number) {
    return async (e: React.DragEvent<HTMLAnchorElement>) => {
      e.preventDefault();

      if (dragSectionId !== sectionId || dragIndex === null || dragIndex === dropIndex) {
        handleDragEnd();
        return;
      }

      const section = sections.find((item) => item.id === sectionId);
      if (!section) {
        handleDragEnd();
        return;
      }

      try {
        await handleReorder('destinations', section.destinations, dragIndex, dropIndex, (updatedDestinations) => {
          setSections((prevSections) =>
            prevSections.map((item) =>
              item.id === sectionId ? { ...item, destinations: updatedDestinations } : item
            )
          );
        });
      } catch (error) {
        alert(error instanceof Error ? error.message : '排序失敗');
      } finally {
        handleDragEnd();
      }
    };
  }

  const handlePopularReorder = async (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    const visibleItems = popularDestinations.slice(0, 4);
    if (newIndex < 0 || newIndex >= visibleItems.length) return;

    const updated = [...visibleItems];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setPopularDestinations([...updated, ...popularDestinations.slice(4)]);

    const order = updated.map((item) => item.id);
    try {
      const res = await fetch('/api/popular-order', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order }),
      });
      if (!res.ok) {
        setPopularDestinations(popularDestinations);
        const data = await res.json().catch(() => ({}));
        alert(data?.error || '排序儲存失敗');
      }
    } catch {
      setPopularDestinations(popularDestinations);
      alert('排序失敗');
    }
  };

  function handlePopularDragStart(index: number) {
    return (e: React.DragEvent<HTMLAnchorElement>) => {
      setDragPopularIndex(index);
      setDragOverPopularIndex(index);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(index));
    };
  }

  function handlePopularDragOver(index: number) {
    return (e: React.DragEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOverPopularIndex(index);
    };
  }

  const handlePopularDragEnd = () => {
    setDragPopularIndex(null);
    setDragOverPopularIndex(null);
  };

  function handlePopularDrop(dropIndex: number) {
    return async (e: React.DragEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      if (dragPopularIndex === null || dragPopularIndex === dropIndex) {
        handlePopularDragEnd();
        return;
      }
      const fromIndex = dragPopularIndex;
      const visibleItems = popularDestinations.slice(0, 4);
      const updated = [...visibleItems];
      [updated[fromIndex], updated[dropIndex]] = [updated[dropIndex], updated[fromIndex]];
      setPopularDestinations([...updated, ...popularDestinations.slice(4)]);

      const order = updated.map((item) => item.id);
      try {
        const res = await fetch('/api/popular-order', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order }),
        });
        if (!res.ok) {
          setPopularDestinations(popularDestinations);
          const data = await res.json().catch(() => ({}));
          alert(data?.error || '排序儲存失敗');
        }
      } catch {
        setPopularDestinations(popularDestinations);
        alert('排序失敗');
      } finally {
        handlePopularDragEnd();
      }
    };
  }

  return (
    <main className="min-h-screen bg-transparent pt-14 text-gray-900">
      <StickyHeader
        logoUrl={siteLogoUrl}
        logoEditorSlot={isDevMode ? <LogoUploader currentLogoUrl={siteLogoUrl} onUpdate={setSiteLogoUrl} /> : null}
        devModeSlot={<DevModeToggle onToggle={setIsDevMode} />}
      />

      {/* Search Section */}
      <section className="relative overflow-hidden bg-[linear-gradient(135deg,#e0f2fe_0%,#ecfdf5_35%,#fef9c3_65%,#fce7f3_100%)] px-4 pb-8 pt-4">
        {/* 裝飾性飛機 icon */}
        <div className="pointer-events-none absolute -right-4 -top-2 text-sky-200/40">
          <svg className="h-28 w-28 rotate-12" fill="currentColor" viewBox="0 0 24 24">
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
          </svg>
        </div>
        <div className="pointer-events-none absolute -bottom-3 -left-6 text-emerald-200/30">
          <svg className="h-24 w-24 -rotate-12" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
          </svg>
        </div>
        <TravelSearchBar
          regions={sections.map((s) => ({
            id: s.id,
            categoryLabel: s.categoryLabel,
            destinations: s.destinations.map((d) => ({ id: d.id, title: d.title })),
          }))}
          onSearch={handleSearch}
        />
      </section>

      {/* 已收藏行程 */}
      {favoriteTrips.length > 0 && (
        <section className="border-b border-gray-100 bg-white/70 px-4 py-4 backdrop-blur-sm">
          <div className="mx-auto max-w-site">
            <div className="mb-2.5 flex items-center gap-2">
              <svg className="h-4 w-4 shrink-0 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <h2 className="text-sm font-bold text-gray-700">已收藏的行程</h2>
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-400">{favoriteTrips.length}</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {favoriteTrips.map(trip => (
                <div key={trip.id} className="group relative w-40 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <Link href={`/trip/${trip.id}`} className="block">
                    <div className="relative h-24 overflow-hidden bg-gray-200">
                      {trip.cover_image_url ? (
                        <Image
                          src={trip.cover_image_url}
                          alt={trip.title}
                          fill
                          sizes="160px"
                          className="object-cover object-center transition duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gray-100">
                          <svg className="h-7 w-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                      <span className="absolute right-1.5 top-1.5 rounded-full bg-sky-500/90 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                        {trip.duration}
                      </span>
                    </div>
                    <div className="p-2">
                      <p className="line-clamp-2 text-[11px] font-bold leading-snug text-gray-800">{trip.title}</p>
                      {trip.destinations?.title && (
                        <p className="mt-0.5 text-[10px] text-gray-400">{trip.destinations.title}</p>
                      )}
                    </div>
                  </Link>
                  {/* 移除收藏按鈕 */}
                  <button
                    type="button"
                    onClick={() => removeFavorite(trip.id)}
                    className="absolute right-1.5 bottom-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-400 opacity-0 transition hover:bg-red-200 group-hover:opacity-100"
                    title="取消收藏"
                  >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Region Tabs */}
      <div className="sticky top-20 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-[8px]">
        <div className="relative mx-auto max-w-site">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-white/90 to-transparent md:hidden" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-white/90 to-transparent md:hidden" />
          <div className="overflow-x-auto px-4 py-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-max justify-start gap-2 md:min-w-0 md:flex-wrap md:justify-center">
              {sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => scrollToSection(section.id)}
                  className="rounded-full border border-gray-200 bg-transparent px-4 py-3 text-sm font-medium text-gray-600 transition hover:border-[#00b4d8] hover:bg-sky-50 hover:text-[#0096c7]"
                >
                  {section.categoryLabel}
                </button>
              ))}
              <Link
                href="/flights"
                className="rounded-full border border-gray-200 bg-transparent px-4 py-3 text-sm font-medium text-gray-600 transition hover:border-[#00b4d8] hover:bg-sky-50 hover:text-[#0096c7]"
              >
                機票
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-site px-4 py-6 md:px-5">
        {/* 熱門推薦 */}
        {popularDestinations.length > 0 && !filterRegionId && (
          <section className="mx-auto mb-10 max-w-[1180px] rounded-[1.45rem] bg-[linear-gradient(135deg,rgba(251,146,60,0.55)_0%,rgba(250,204,21,0.45)_34%,rgba(244,63,94,0.4)_68%,rgba(56,189,248,0.35)_100%)] p-[1px] shadow-[0_16px_34px_rgba(245,158,11,0.18)]">
            <div className="rounded-[calc(1.45rem-1px)] bg-white p-2.5 sm:p-3">
            <div className="mb-3 px-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl">&#x1F525;</span>
                <h2 className="text-lg font-bold text-gray-900">
                  熱門推薦
                </h2>
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-600">
                  2025–2026
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">首頁熱門目的地精選，直接帶你進入對應目的地列表</p>
             </div>
             <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:gap-4">
               {popularDestinations.slice(0, 4).map((destination, i) => (
                  <div
                    key={destination.id}
                    className="group relative overflow-hidden rounded-xl border border-gray-200 bg-gray-100 transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-gray-300/50"
                  >
                    {i < 3 && (
                      <div className={`absolute -left-1 -top-1 z-10 flex h-8 w-8 items-center justify-center rounded-br-xl text-xs font-black shadow-lg ${
                        i === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white' : i === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white' : 'bg-gradient-to-br from-orange-500 to-orange-700 text-white'
                     }`}>
                       {i + 1}
                     </div>
                   )}
                    <HomeDestinationCard
                      destination={destination}
                      isDevMode={isDevMode}
                      isDraggable={isDevMode && isPC}
                      isDragging={dragPopularIndex === i}
                      isDragOver={dragOverPopularIndex === i}
                      onDragStart={handlePopularDragStart(i)}
                      onDragOver={handlePopularDragOver(i)}
                      onDragEnd={handlePopularDragEnd}
                      onDrop={handlePopularDrop(i)}
                      onImageUpdate={handlePopularImageUpdate}
                      onTextUpdate={handleDestinationTextUpdate}
                      onSaveSuccess={showSaveSuccess}
                      reorderControls={isDevMode ? {
                        canMoveUp: i > 0,
                        canMoveDown: i < Math.min(popularDestinations.length, 4) - 1,
                        onMoveUp: () => void handlePopularReorder(i, -1),
                        onMoveDown: () => void handlePopularReorder(i, 1),
                      } : undefined}
                      priority={true}
                    />
                  </div>
                ))}
             </div>
             </div>
          </section>
        )}

        {(() => {
          let filtered = sections;

          if (filterRegionId) {
            const matchedSection = sections.find((s) => s.id === filterRegionId);
            if (matchedSection) {
              const section = filterDestId
                ? { ...matchedSection, destinations: matchedSection.destinations.filter((d) => d.id === filterDestId) }
                : matchedSection;
              filtered = [section];
            } else {
              filtered = [];
            }
          }

          if ((filterRegionId || filterDate) && filtered.length === 0) {
            return (
              <div className="py-16 text-center">
                <p className="text-base text-gray-500">找不到符合條件的目的地</p>
                <button
                  onClick={() => handleSearch({ departureCity: '', regionId: null, destinationId: null, date: '' })}
                  className="mt-4 rounded-lg bg-[#00b4d8] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#0096c7]"
                >
                  清除篩選
                </button>
              </div>
            );
          }

          return filtered.map((section, sectionIndex) => (
            <section key={section.id} id={section.id} className="mb-8 scroll-mt-[120px]">
              <div className="mb-3 flex items-baseline justify-between px-1">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{section.title}</h2>
                  <p className="text-xs text-gray-500">{section.description}</p>
                </div>
                {isDevMode && (
                  <button
                    type="button"
                    onClick={() => {
                      setAddingRegionId((prev) => prev === section.id ? null : section.id);
                      setNewDestinationTitle('');
                      setNewDestinationSubtitle('');
                      setNewDestinationSubRegion('');
                    }}
                    className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-500"
                  >
                    {addingRegionId === section.id ? '取消新增' : '新增卡片'}
                  </button>
                )}
              </div>

              {isDevMode && addingRegionId === section.id && (
                <div className="mb-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <input
                      type="text"
                      value={newDestinationTitle}
                      onChange={(e) => setNewDestinationTitle(e.target.value)}
                      placeholder="卡片主標題"
                      className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-emerald-500"
                    />
                    <input
                      type="text"
                      value={newDestinationSubtitle}
                      onChange={(e) => setNewDestinationSubtitle(e.target.value)}
                      placeholder="卡片副標題"
                      className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-emerald-500"
                    />
                    <input
                      type="text"
                      value={newDestinationSubRegion}
                      onChange={(e) => setNewDestinationSubRegion(e.target.value)}
                      placeholder="子區域（可留空）"
                      className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="mt-3 flex gap-3">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await handleCreateDestination(section.id);
                        } catch (error) {
                          alert(error instanceof Error ? error.message : '新增失敗');
                        }
                      }}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
                    >
                      建立卡片
                    </button>
                  </div>
                </div>
              )}

              {section.destinations.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-6 text-sm text-gray-500">
                  尚無目的地
                </div>
              ) : (() => {
                const isExpanded = expandedSections.has(section.id);

                // 按 sub_region 分組
                const hasSubRegions = section.destinations.some((d) => d.sub_region);
                const subGroups: { label: string; destinations: Destination[] }[] = [];

                if (hasSubRegions) {
                  const seen = new Set<string>();
                  section.destinations.forEach((dest) => {
                    const key = dest.sub_region || '';
                    if (!seen.has(key)) {
                      seen.add(key);
                      subGroups.push({ label: key, destinations: section.destinations.filter((d) => (d.sub_region || '') === key) });
                    }
                  });
                }

                const hasMore = section.destinations.length > 5;

                const renderCard = (destination: Destination, cardIdx: number) => {
                  const destinationIndex = section.destinations.findIndex((item) => item.id === destination.id);

                  return (
                  <HomeDestinationCard
                    key={destination.id}
                    destination={destination}
                    isDevMode={isDevMode}
                    isDraggable={isDevMode && isPC}
                    isDragging={dragSectionId === section.id && dragIndex === destinationIndex}
                    isDragOver={dragOverSectionId === section.id && dragOverIndex === destinationIndex}
                    onDragStart={handleDragStart(section.id, destinationIndex)}
                    onDragOver={handleDragOver(section.id, destinationIndex)}
                    onDragEnd={handleDragEnd}
                    onDrop={handleDrop(section.id, destinationIndex)}
                    onImageUpdate={handleImageUpdate}
                    onTextUpdate={handleDestinationTextUpdate}
                    onDelete={handleDeleteDestination}
                    onSaveSuccess={showSaveSuccess}
                    reorderControls={isDevMode ? {
                      canMoveUp: destinationIndex > 0,
                      canMoveDown: destinationIndex < section.destinations.length - 1,
                      onMoveUp: () => handleDestinationReorder(section.id, destinationIndex, -1),
                      onMoveDown: () => handleDestinationReorder(section.id, destinationIndex, 1),
                    } : undefined}
                    priority={sectionIndex === 0 && cardIdx < 5}
                  />
                  );
                };

                return (
                  <>
                    {isExpanded ? (
                      // 展開：顯示全部，有子地區則分組顯示
                      hasSubRegions ? (
                        subGroups.map((group) => (
                          <div key={group.label || 'ungrouped'} className="mb-5">
                            {group.label && (
                              <h3 className="mb-2 px-1 text-sm font-bold text-sky-600">{group.label}</h3>
                            )}
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 lg:gap-4 xl:grid-cols-5">
                              {group.destinations.map(renderCard)}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 lg:gap-4 xl:grid-cols-5">
                          {section.destinations.map(renderCard)}
                        </div>
                      )
                    ) : (
                      // 收合：固定只顯示前 5 張，不分組
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 lg:gap-4 xl:grid-cols-5">
                        {section.destinations.slice(0, 5).map(renderCard)}
                      </div>
                    )}
                    {hasMore && (
                      <button
                        type="button"
                        onClick={() => setExpandedSections((prev) => {
                          const next = new Set(prev);
                          if (next.has(section.id)) {
                            next.delete(section.id);
                          } else {
                            next.add(section.id);
                          }
                          return next;
                        })}
                        className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl border border-gray-200 bg-gray-50 py-2.5 text-sm font-medium text-sky-600 transition hover:bg-gray-100 hover:text-sky-500"
                      >
                        {isExpanded ? '收合' : `查看全部 ${section.destinations.length} 個目的地`}
                        <svg className={`h-4 w-4 transition ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    )}
                  </>
                );
              })()}
            </section>
          ));
        })()}

        <SocialCta
          className="mt-10"
          title="找到心儀的旅遊目的地了嗎？"
          description="立即聯繫旅遊規劃師 蓋瑞 GARY，為您量身打造專屬行程"
        />


      </div>

      <FloatingContact />

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
