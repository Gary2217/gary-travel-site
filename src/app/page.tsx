"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getRegionsWithDestinations, getSiteLogo, trackClick } from "@/lib/supabase";
import DevModeToggle from "@/components/DevModeToggle";
import ImageEditor from "@/components/ImageEditor";
import LogoUploader from "@/components/LogoUploader";
import FloatingContact from "@/components/FloatingContact";
import SocialCta from "@/components/SocialCta";
import StickyHeader from "@/components/StickyHeader";
import TravelSearchBar from "@/components/TravelSearchBar";
import ContactInquiries from "@/components/ContactInquiries";
import LegalNotice from "@/components/LegalNotice";
import { Skeleton, GridSkeleton } from "@/components/Skeleton";

type Destination = {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  sub_region?: string;
};

type RouteSection = {
  id: string;
  categoryLabel: string;
  title: string;
  description: string;
  destinations: Destination[];
};

interface HomeDestinationCardProps {
  destination: Destination;
  isDevMode: boolean;
  onImageUpdate: (destinationId: string, newImageUrl: string) => void;
  onTextUpdate: (destinationId: string, fields: Partial<Pick<Destination, 'title' | 'subtitle'>>) => void;
  onDelete?: (destinationId: string) => Promise<void>;
}

function HomeDestinationCard({ destination, isDevMode, onImageUpdate, onTextUpdate, onDelete }: HomeDestinationCardProps) {
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
      className="group relative block aspect-[4/3] overflow-hidden rounded-xl border border-gray-200 bg-gray-100 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-gray-300/50"
      onClick={() => { if (!isDevMode) trackClick(destination.id); }}
    >
      {isDevMode && (
        <>
          <ImageEditor
            entityId={destination.id}
            currentImageUrl={destination.image_url}
            title={destination.title}
            onUpdate={(newUrl) => onImageUpdate(destination.id, newUrl)}
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
  const [addingRegionId, setAddingRegionId] = useState<string | null>(null);
  const [newDestinationTitle, setNewDestinationTitle] = useState('');
  const [newDestinationSubtitle, setNewDestinationSubtitle] = useState('');
  const [newDestinationSubRegion, setNewDestinationSubRegion] = useState('');

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

      {/* Region Tabs */}
      <div className="sticky top-14 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-[8px]">
        <div className="mx-auto max-w-site overflow-x-auto px-4 py-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max justify-start gap-2 md:min-w-0 md:flex-wrap md:justify-center">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => scrollToSection(section.id)}
                className="rounded-full border border-gray-200 bg-transparent px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:border-[#00b4d8] hover:bg-sky-50 hover:text-[#0096c7]"
              >
                {section.categoryLabel}
              </button>
            ))}
            <Link
              href="/flights"
              className="rounded-full border border-gray-200 bg-transparent px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:border-[#00b4d8] hover:bg-sky-50 hover:text-[#0096c7]"
            >
              機票
            </Link>
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
                      onImageUpdate={handlePopularImageUpdate}
                      onTextUpdate={handleDestinationTextUpdate}
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

          return filtered.map((section) => (
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

                const renderCard = (destination: Destination) => (
                  <HomeDestinationCard
                    key={destination.id}
                    destination={destination}
                    isDevMode={isDevMode}
                    onImageUpdate={handleImageUpdate}
                    onTextUpdate={handleDestinationTextUpdate}
                    onDelete={handleDeleteDestination}
                  />
                );

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
          logoUrl={siteLogoUrl}
        />

        {/* 社群追蹤 */}
        <section id="social-community" className="mt-10 scroll-mt-[120px]">
          <div className="mb-4 text-center">
            <h2 className="text-lg font-bold text-gray-900">追蹤我們的社群</h2>
            <p className="mt-1 text-sm text-gray-500">關注最新旅遊資訊、優惠行程、出團動態</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* LINE 官方帳號 */}
            <a
              href="https://lin.ee/t64tR31J"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-[#06C755]/40 hover:shadow-md"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#06C755] text-white shadow-sm">
                <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24"><path d="M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" /></svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-900">LINE 官方帳號</p>
                <p className="mt-0.5 text-xs text-gray-500">旅行沒有終點｜即時諮詢</p>
              </div>
              <span className="shrink-0 rounded-full border border-[#06C755]/30 bg-[#06C755]/10 px-3 py-1 text-xs font-semibold text-[#06C755] transition group-hover:bg-[#06C755] group-hover:text-white">加入好友</span>
            </a>

            {/* FB 粉絲團 */}
            <a
              href="https://www.facebook.com/Travel.has.no.end"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-[#1877F2]/40 hover:shadow-md"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#1877F2] text-white shadow-sm">
                <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-900">Facebook 粉絲團</p>
                <p className="mt-0.5 text-xs text-gray-500">旅行沒有終點｜旅遊資訊</p>
              </div>
              <span className="shrink-0 rounded-full border border-[#1877F2]/30 bg-[#1877F2]/10 px-3 py-1 text-xs font-semibold text-[#1877F2] transition group-hover:bg-[#1877F2] group-hover:text-white">追蹤</span>
            </a>

            {/* FB 社團 */}
            <a
              href="https://www.facebook.com/share/g/18TSaJMtzb/"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-[#1877F2]/40 hover:shadow-md"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#1877F2] text-white shadow-sm">
                <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm4 0h-2v-6h2v6zm-2-8c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" /><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-900">Facebook 社團</p>
                <p className="mt-0.5 text-xs text-gray-500">旅行沒有終點｜優惠行程分享</p>
              </div>
              <span className="shrink-0 rounded-full border border-[#1877F2]/30 bg-[#1877F2]/10 px-3 py-1 text-xs font-semibold text-[#1877F2] transition group-hover:bg-[#1877F2] group-hover:text-white">加入</span>
            </a>

            {/* Instagram */}
            <a
              href="https://www.instagram.com/gary_____1207/"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-[#E4405F]/40 hover:shadow-md"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#E4405F] text-white shadow-sm">
                <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-900">Instagram</p>
                <p className="mt-0.5 text-xs text-gray-500">@gary_____1207｜旅遊日常</p>
              </div>
              <span className="shrink-0 rounded-full border border-[#E4405F]/30 bg-[#E4405F]/10 px-3 py-1 text-xs font-semibold text-[#E4405F] transition group-hover:bg-[#E4405F] group-hover:text-white">追蹤</span>
            </a>
          </div>
        </section>

        <LegalNotice className="mt-8" />

        {isDevMode && <ContactInquiries />}
      </div>

      <FloatingContact />
    </main>
  );
}
