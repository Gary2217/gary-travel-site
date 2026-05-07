-- ============================================
-- 焦點話題資料表（首頁圖文焦點）
-- 執行方式：貼到 Supabase SQL Editor 執行
-- ============================================

create table if not exists public.focus_topic_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null default '',
  image_url text not null,
  source_name text not null default '外部來源',
  source_url text not null,
  source_item_id text,
  license_type text not null default 'unknown',
  pair_verified boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create index if not exists idx_focus_topic_items_status_published_at
  on public.focus_topic_items (status, published_at desc);

create index if not exists idx_focus_topic_items_updated_at
  on public.focus_topic_items (updated_at desc);

create unique index if not exists uq_focus_topic_items_source_pair
  on public.focus_topic_items (source_name, source_item_id)
  where source_item_id is not null;

create or replace function public.set_focus_topic_items_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_focus_topic_items_updated_at on public.focus_topic_items;

create trigger trg_focus_topic_items_updated_at
before update on public.focus_topic_items
for each row
execute function public.set_focus_topic_items_updated_at();

alter table public.focus_topic_items enable row level security;

drop policy if exists "Allow public read published focus_topic_items" on public.focus_topic_items;
create policy "Allow public read published focus_topic_items"
  on public.focus_topic_items
  for select
  using (status = 'published');

drop policy if exists "Allow service_role all focus_topic_items" on public.focus_topic_items;
create policy "Allow service_role all focus_topic_items"
  on public.focus_topic_items
  for all
  to service_role
  using (true)
  with check (true);

-- ============================================
-- 焦點話題來源設定表（自動抓取）
-- ============================================
create table if not exists public.focus_topic_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  endpoint_url text not null,
  homepage_url text,
  default_status text not null default 'pending' check (default_status in ('pending', 'approved', 'published')),
  max_items_per_fetch int not null default 6 check (max_items_per_fetch >= 1 and max_items_per_fetch <= 20),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_focus_topic_sources_name on public.focus_topic_sources (name);

create or replace function public.set_focus_topic_sources_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_focus_topic_sources_updated_at on public.focus_topic_sources;

create trigger trg_focus_topic_sources_updated_at
before update on public.focus_topic_sources
for each row
execute function public.set_focus_topic_sources_updated_at();

alter table public.focus_topic_sources enable row level security;

drop policy if exists "Allow service_role all focus_topic_sources" on public.focus_topic_sources;
create policy "Allow service_role all focus_topic_sources"
  on public.focus_topic_sources
  for all
  to service_role
  using (true)
  with check (true);
