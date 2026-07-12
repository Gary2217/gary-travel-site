# Gary Travel Site — Project Whitepaper

> Snapshot for any AI/developer picking up this project cold. Pairs with
> `CLAUDE.md` (rules & conventions) — this file describes **what exists and how
> it flows**, CLAUDE.md describes **how to work on it**. Last full audit:
> 2026-07-12 (every line of the two main pages read).

---

## 1. What this is

A Traditional-Chinese travel agency site for planner "GARY". Users arrive
(often from a LINE hub), browse destinations, view trips, and request a PDF
itinerary or a LINE quote. Trip data is scraped from a wholesaler,
**Penway** (`pwgotravel.com.tw`), and curated by GARY through an in-page
**developer mode** (no separate admin CMS for content — editing happens inline
on the public pages when authenticated).

- **Stack**: Next.js 14 App Router, TypeScript, Tailwind, Supabase (Postgres + RLS).
- **Hosting**: Vercel (only production; never rely on localhost).
- **Media**: Cloudflare R2 bucket `gary-travel-media`, public base
  `https://pub-3881231e994f4158b5d05c0ec109b3ef.r2.dev`. All images must live on
  R2 (`images/...` key prefix); external CDN URLs are forbidden in stored data.
- **Scraper runtime**: GitHub Actions (`.github/workflows/scrape-trips.yml`)
  running `scripts/auto-scrape.mjs` with the Supabase service role.

---

## 2. Architecture rules (do not violate)

- All page components are **client components** (`"use client"`). No Server
  Components for pages.
- Data flow is strictly: **component → fetch helper in `src/lib/supabase.ts` →
  `/api/*` route → Supabase**. Components and lib never import the Supabase
  client directly; only API routes create a client (per-request, not shared).
- Social links (`lineHref`/`fbHref`/`igHref`) come from `src/lib/supabase.ts`,
  driven by `NEXT_PUBLIC_*` env vars — never hard-coded.
- External links open via `openExternalLink()` (`src/lib/external-link.ts`),
  which uses `location.assign` inside in-app browsers (LINE/FB/IG) and
  `window.open(..., noopener)` elsewhere.

---

## 3. Page map

| Route | File | Purpose |
|---|---|---|
| `/` | `app/page.tsx` | Home: destination overview + popular trips |
| `/destination/[id]` | `app/destination/[id]/page.tsx` (~1940 lines) | **Trip selection page**. Region → sub-region → sub-area tab navigation; trip cards; dev-mode CRUD + region scrape |
| `/trip/[id]` | `app/trip/[id]/page.tsx` (~3400 lines) | **Trip detail / file page**. Departure dates, flight table, price modals, PDF viewer, share/download gates, dev-mode editors + single-trip scrape + PDF scrape |
| `/search` | `app/search/page.tsx` | Search by keyword / date / city |
| `/admin` | `app/admin/page.tsx` | Stats + pending-change management |
| `/document-services`, `/mini-transit-tickets` | resp. dirs | Secondary content pages |

Shared components: `StickyHeader` (nav + favorites + social), `TripCard`,
`DepartureDates`, `DayItinerary`, `PdfViewer` (canvas render, blocks direct
download), `InquiryButtons`, `SocialCta`, `Toast`, `DevModeToggle`.

---

## 4. Key database tables

- **`regions`** — top nav categories (日本, 港澳大陸, …). `category_label`, `is_active`.
- **`destinations`** — belong to a region. `sub_region` (groups destinations),
  `source_url` (Penway region page + `#blk-` anchor), `image_url`, `is_active`.
- **`trips`** — the core card. `destination_id`, `title`, `subtitle`,
  `price_range`, `duration`, `cover_image_url` (R2), `document_url` (PDF on R2),
  `document_text` (extracted PDF text cache), `source_url` (Penway detail URL),
  `scrape_managed` (bool — see §5), `is_active`, `display_order`, and
  **`trip_banner`** (jsonb).
  - `trip_banner` holds: `code_label` (tour code), `airline`, `airport`, `tags`,
    `sub_area` (finer tab grouping), `custom_tour` (bool — inquiry-only card),
    `promo_enabled`/`promo_content`, `price_detail` (tab-separated 5-column
    price string), `departure_info_map` (`{depId: {group_code, price_detail}}`,
    the JSON the price modal reads), `duration_label`, `min_group_size`, etc.
- **`trip_departure_dates`** — one row per departure. `departure_date`, `price`,
  `seats_total`/`seats_available`, `label` (保證出團/即將成團/限時優惠/schedule),
  `outbound_*`/`return_*` flight fields, and **`flight_segments`** (jsonb array —
  what the flight table on the trip page actually renders).
- **`pending_changes`** — scraper output awaiting human approval. `change_type`
  (see §5), `field_name`, `old_value`/`new_value`, `scraped_data`, `status`
  (pending/processing/approved/applied/dismissed), `trip_id`, `destination_id`.
- **`scrape_logs`** — one per scrape run. `status`, `completed_trips`,
  `changes_found`, `region_details`.
- **`analytics_events`** — trip_view/flight_view/download/share/inquiry.
- **`inquiries`**, `click_analytics` — public-writable (RLS), rate-limited.
- `site_settings` (key/value: scrape_auto_enabled, auto_cleanup_enabled),
  `site_logo`, plus document-service / mini-transit content tables.

DB health (audit 2026-07-12): 0 orphan rows, 0 non-R2 images, 0 missing
required fields, 0 active trips under inactive destinations.

---

## 5. The scrape system (most important + most fragile)

Three entry points, **all produce `pending_changes` that a human approves** —
the scraper never writes live trip data directly (except silent metadata like
`source_url` auto-bind and `document_text` cache).

1. **Nightly cron** (03:00 TW) — full-site scan vs Penway, gated on
   `scrape_auto_enabled`. Monitoring only; nothing auto-applies.
2. **Destination page** "🔄 抓取此頁行程" — whole region (via `regions=<key>`)
   or selected cards / a single destination.
3. **Trip page** "🔄 抓取此行程" — single card, hits its `source_url` detail
   page directly.

### Matching order (`findExistingTripForScrapedTrip` in auto-scrape.mjs)

`⓪ source_url tour-code` (strongest — copy-paste, no typos) → `① code_label`
exact → `② title similarity ≥0.7` (+ airline guard). URL binding is the
authoritative model; code/title is only the **bridge** that first recognizes a
no-URL card so its URL can be auto-bound. Removable only once every card has a
URL (currently 98% bound — do not remove yet).

### Guardrails (hard-won — each maps to a real incident)

- **Empty-wipe protection** (`buildComparisonChanges`): scraped 0 departures /
  0 flight segments while existing is non-empty → **no change emitted** (applying
  it would DELETE everything). A "shrank to 0" warning still fires for humans.
  *(2026-07-11: a single-trip scrape deleted 17 departure dates — this is the fix.)*
- **all_inquiry_only skip**: if every Penway departure is "請來電洽詢", the trip
  is skipped entirely in both region and `--trip-ids` modes.
- **custom_tour (inquiry cards) are fully hands-off**: no content changes, skipped
  in direct mode, exempt from removal detection. GARY manages these by hand.
- **scrape_managed gate**: only cards flagged managed enter removal detection, so
  an employee's pre-made card (Penway hasn't listed yet) is never flagged removed.
  Flips true when a non-removed change is applied. `new_trip`→true, `clone`→false.
- **Removal cross-check**: before flagging removed, look across the whole region
  by code_label/title; skip if it matches elsewhere.

### change_type → what apply does (`api/scrape/apply/route.ts`)

`info` updates just its field; `price`/`price_detail`/`flight`/`promotion`
"full-sync" title/subtitle/duration/price/cover too. `price`/`price_detail`
rebuild `departure_info_map`. **`flight` now also writes flight segments into all
active departure dates** *(2026-07-12 fix — the table reads
`departure_dates.flight_segments`, so a banner-only merge looked applied but never
showed)*. `departure` DELETEs + re-INSERTs dates. `removed` sets `is_active=false`.
Applying a non-removed change also flips `scrape_managed`/binds `source_url`.

### PDF scrape (`api/trips/[id]/scrape-pdf` + trip page `handlePdfScrape`)

Separate from Penway scraping. Parses an uploaded PDF (`unpdf`) for
flight_segments/title/tags/etc. Preview modal has **per-field checkboxes,
defaulting to flight_segments only** — PDF scrape is positioned as flight-table
backfill; titles/tags stay manually curated. Title extraction skips
table-header lines (3+ column keywords) *(2026-07-12 fix — a header row was
being saved as the title)*.

---

## 6. Auth & security posture (audited, solid)

- **Dev auth** (`src/lib/dev-auth.ts`): LINE Login → HMAC-SHA256 signed cookie,
  verified with `timingSafeEqual` + a single-user allowlist (`DEV_LINE_USER_ID`),
  7-day expiry. Secret is server-only (never `NEXT_PUBLIC_*`).
- Public write endpoints (`inquiries`, `track-click`) are rate-limited + length-
  capped, use the anon client (RLS).
- Uploads require dev auth; image upload validates magic bytes; PDF is a
  presigned R2 PUT restricted to `.pdf`.
- Security headers + CSP in `next.config.mjs` (R2 + Supabase allowlisted).
- Trip page `from` param is accepted only as a site-relative path (no open redirect).

---

## 7. Known open items (non-blocking, as of 2026-07-12)

- ~82 past-dated departure rows still `is_active` (front-end filters them out;
  data cleanup only).
- pending_changes has ~1900 historical (approved/applied/dismissed) rows — admin
  "clear processed" or the nightly auto-cleanup (if enabled) clears these.
- A few trips share one Penway tour code intentionally (one tour, multiple cards,
  e.g. star/4-star Bhutan) — removal cross-check keeps them safe.
- Freetour 東京/大阪 share one `#blk-` anchor (copy artifact; low impact).
- "限時折500" strikethrough price is an **intentional** global marketing device
  (every card shows original = current + 500), not a bug.

---

## 8. Where to look first

- Scrape logic: `scripts/auto-scrape.mjs` (matching, guards, comparison).
- Apply logic: `src/app/api/scrape/apply/route.ts`.
- Trip selection UX + region scrape trigger: `src/app/destination/[id]/page.tsx`.
- Trip detail + PDF + editors: `src/app/trip/[id]/page.tsx`.
- Types + fetch helpers + social links: `src/lib/supabase.ts`.
- Rules & conventions for contributors: `CLAUDE.md`.
