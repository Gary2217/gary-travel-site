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
      className="group relative block aspect-[4/3] overflow-hidden rounded-xl border border-white/[0.08] bg-[#182838] transition hover:-translate-y-1 hover:shadow-lg hover:shadow-black/30"
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
      <main className="min-h-screen bg-brand-bg pt-14 text-white">
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
      <main className="flex min-h-screen items-center justify-center bg-[#0f1923] text-white">
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
    <main className="min-h-screen bg-[#0f1923] pt-14 text-white">
      <StickyHeader
        logoUrl={siteLogoUrl}
        logoEditorSlot={isDevMode ? <LogoUploader currentLogoUrl={siteLogoUrl} onUpdate={setSiteLogoUrl} /> : null}
        devModeSlot={<DevModeToggle onToggle={setIsDevMode} />}
      />

      {/* Search Section */}
      <section className="bg-gradient-to-b from-[#162a3a] to-[#0f1923] px-4 pb-6 pt-3">
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
      <div className="sticky top-14 z-40 border-b border-white/[0.08] bg-[rgba(15,25,35,0.92)] backdrop-blur-[8px]">
        <div className="mx-auto max-w-site overflow-x-auto px-4 py-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max justify-start gap-2 md:min-w-0 md:flex-wrap md:justify-center">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => scrollToSection(section.id)}
                className="rounded-full border border-white/[0.08] bg-transparent px-4 py-2.5 text-sm font-medium text-white/75 transition hover:border-[#00b4d8] hover:bg-[rgba(0,180,216,0.15)] hover:text-[#48cae4]"
              >
                {section.categoryLabel}
              </button>
            ))}
            <Link
              href="/flights"
              className="rounded-full border border-white/[0.08] bg-transparent px-4 py-2.5 text-sm font-medium text-white/75 transition hover:border-[#00b4d8] hover:bg-[rgba(0,180,216,0.15)] hover:text-[#48cae4]"
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
            <div className="rounded-[calc(1.45rem-1px)] bg-[#13263a] p-2.5 sm:p-3">
            <div className="mb-3 px-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl">&#x1F525;</span>
                <h2 className="text-lg font-bold text-white">
                  熱門推薦
                </h2>
                <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
                  2025–2026
                </span>
              </div>
              <p className="mt-1 text-xs text-white/50">首頁熱門目的地精選，直接帶你進入對應目的地列表</p>
             </div>
             <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
               {popularDestinations.slice(0, 4).map((destination, i) => (
                  <div
                    key={destination.id}
                    className="group relative overflow-hidden rounded-xl border border-white/10 bg-[#182838] transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/30"
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
                <p className="text-base text-white/50">找不到符合條件的目的地</p>
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
                  <h2 className="text-lg font-bold text-white">{section.title}</h2>
                  <p className="text-xs text-white/50">{section.description}</p>
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
                <div className="mb-4 rounded-2xl border border-white/10 bg-[rgba(20,20,30,0.38)] p-4 backdrop-blur-[12px]">
                  <div className="grid gap-3 md:grid-cols-3">
                    <input
                      type="text"
                      value={newDestinationTitle}
                      onChange={(e) => setNewDestinationTitle(e.target.value)}
                      placeholder="卡片主標題"
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-emerald-500"
                    />
                    <input
                      type="text"
                      value={newDestinationSubtitle}
                      onChange={(e) => setNewDestinationSubtitle(e.target.value)}
                      placeholder="卡片副標題"
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-emerald-500"
                    />
                    <input
                      type="text"
                      value={newDestinationSubRegion}
                      onChange={(e) => setNewDestinationSubRegion(e.target.value)}
                      placeholder="子區域（可留空）"
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-emerald-500"
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
                <div className="rounded-xl border border-white/[0.08] bg-[#1a3347] px-5 py-6 text-sm text-white/50">
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
                              <h3 className="mb-2 px-1 text-sm font-bold text-sky-400">{group.label}</h3>
                            )}
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                              {group.destinations.map(renderCard)}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                          {section.destinations.map(renderCard)}
                        </div>
                      )
                    ) : (
                      // 收合：固定只顯示前 5 張，不分組
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
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
                        className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] py-2.5 text-sm font-medium text-sky-300 transition hover:bg-white/[0.06] hover:text-sky-200"
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

        {isDevMode && <ContactInquiries />}
      </div>

      <FloatingContact />
    </main>
  );
}
