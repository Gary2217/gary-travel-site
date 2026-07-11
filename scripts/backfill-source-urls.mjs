// One-off transition tool: batch-bind trips.source_url for existing cards
// that don't have one yet, by matching them against Penway region-page
// listings (code_label first, then title similarity), scoped region-aware
// via each destination's source_url blk anchor.
//
// Dry-run by default (prints the card -> URL plan). Pass --execute to write.
//   node scripts/backfill-source-urls.mjs            # dry run
//   node scripts/backfill-source-urls.mjs --execute  # apply
//
// Helpers below are copied from scripts/auto-scrape.mjs to keep matching
// behaviour identical; keep them in sync if the originals change.

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';

const EXECUTE = process.argv.includes('--execute');
const BASE_URL = 'https://www.pwgotravel.com.tw';

const env = readFileSync('.env.local', 'utf8');
const getEnv = (k) => {
  const m = env.match(new RegExp(`^${k}=(.+)$`, 'm'));
  return m ? m[1].trim() : null;
};
const sb = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'));

// ---- copied helpers (in sync with auto-scrape.mjs) ----
function sanitizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeTitle(title) {
  return String(title || '')
    .replace(/[～~\-–—|｜×✕✖＋+&＆]/g, '')
    .replace(/\s+/g, '')
    .replace(/[，,。.、！!？?：:；;（）()【】\[\]「」『』"'']/g, '')
    .toLowerCase()
    .trim();
}

function bigrams(str) {
  const map = new Map();
  for (let i = 0; i < str.length - 1; i += 1) {
    const bg = str.slice(i, i + 2);
    map.set(bg, (map.get(bg) || 0) + 1);
  }
  return map;
}

function similarity(a, b) {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.length < 2 || nb.length < 2) return na === nb ? 1 : 0;
  const bgA = bigrams(na);
  const bgB = bigrams(nb);
  let intersection = 0;
  let totalA = 0;
  let totalB = 0;
  for (const count of bgA.values()) totalA += count;
  for (const count of bgB.values()) totalB += count;
  for (const [bg, countA] of bgA) {
    const countB = bgB.get(bg);
    if (countB) intersection += Math.min(countA, countB);
  }
  return (2 * intersection) / (totalA + totalB);
}

// end-of-path tour code from a Penway URL, ignoring query (e.g. ?sacct_no=)
function extractUrlCode(url) {
  try {
    const parts = new URL(url, BASE_URL).pathname.split('/').filter(Boolean);
    const last = parts[parts.length - 1] || '';
    return /^[A-Z][A-Z0-9]{4,}$/i.test(last) ? last.toUpperCase() : '';
  } catch {
    return '';
  }
}

const getBlk = (url) => {
  try { return new URL(url).hash.replace(/^#/, '').trim(); } catch { return ''; }
};
const getPath = (url) => {
  try { return new URL(url).pathname; } catch { return ''; }
};

// Some listings link to /products/group/search?kwd=CODE instead of a detail
// page; kwd is the tour code, so rewrite to the canonical detail URL.
function normalizePenwayHref(abs) {
  try {
    const u = new URL(abs);
    if (/\/search$/.test(u.pathname)) {
      const kwd = u.searchParams.get('kwd') || '';
      if (/^[A-Z][A-Z0-9]{4,}$/i.test(kwd)) {
        return `${BASE_URL}/products/group/mold-new/${kwd.toUpperCase()}`;
      }
    }
  } catch { /* keep original */ }
  return abs;
}

async function fetchHTML(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// Parse listing sections; if targetBlk given, only that blk section.
function parseSections(html, targetBlk) {
  const $ = cheerio.load(html);
  const seen = new Set();
  const sections = [];
  $('.row.expand-graphics').each((_, c) => {
    const $c = $(c);
    const $blk = $c.closest('[id^="blk-"]');
    const blockId = sanitizeText($blk.length ? $blk.attr('id') : '');
    if (targetBlk && blockId !== targetBlk) return;
    const trips = [];
    $c.find('.item-box a[href*="/products/group/"], .item-box a[href*="/products/domestic/"]').each((_, link) => {
      const href = $(link).attr('href') || '';
      const abs = normalizePenwayHref(href.startsWith('http') ? href : `${BASE_URL}${href}`);
      if (!href || seen.has(abs)) return;
      seen.add(abs);
      const title = sanitizeText($(link).find('h3').text());
      if (title) trips.push({ title, href: abs });
    });
    if (trips.length) sections.push({ blockId, trips });
  });
  return sections;
}

// ---- main ----
const { data: dests, error: destErr } = await sb
  .from('destinations')
  .select('id, title, sub_region, source_url')
  .eq('is_active', true);
if (destErr) { console.error('load destinations failed:', destErr.message); process.exit(1); }

const { data: allTrips, error: tripErr } = await sb
  .from('trips')
  .select('id, destination_id, title, trip_banner, source_url')
  .eq('is_active', true);
if (tripErr) { console.error('load trips failed:', tripErr.message); process.exit(1); }

const noUrlTrips = allTrips.filter((t) => !sanitizeText(t.source_url));

const byDest = new Map();
for (const t of noUrlTrips) {
  if (!byDest.has(t.destination_id)) byDest.set(t.destination_id, []);
  byDest.get(t.destination_id).push(t);
}

const htmlCache = new Map();
const matches = [];
const unmatched = [];

for (const [destId, cards] of byDest) {
  const dest = dests.find((d) => d.id === destId);
  if (!dest || !sanitizeText(dest.source_url)) {
    for (const c of cards) unmatched.push({ card: c, dest, reason: 'destination has no source_url' });
    continue;
  }
  const path = getPath(dest.source_url);
  const blk = getBlk(dest.source_url);

  if (!htmlCache.has(path)) {
    try { htmlCache.set(path, await fetchHTML(`${BASE_URL}${path}`)); }
    catch (e) { htmlCache.set(path, null); console.error(`fetch ${path} failed: ${e.message}`); }
  }
  const html = htmlCache.get(path);
  if (!html) {
    for (const c of cards) unmatched.push({ card: c, dest, reason: `region page load failed (${path})` });
    continue;
  }

  const penwayTrips = parseSections(html, blk).flatMap((s) => s.trips);
  const consumed = new Set();
  const matchedCardIds = new Set();

  // pass 1: code_label exact
  for (const card of cards) {
    const code = sanitizeText(card.trip_banner?.code_label).toUpperCase();
    if (!code) continue;
    const hit = penwayTrips.find((p) => !consumed.has(p.href) && extractUrlCode(p.href) === code);
    if (hit) {
      consumed.add(hit.href);
      matchedCardIds.add(card.id);
      matches.push({ card, dest, url: hit.href, penwayTitle: hit.title, method: `code ${code}` });
    }
  }

  // pass 2: title similarity for the rest
  for (const card of cards) {
    if (matchedCardIds.has(card.id)) continue;
    let best = null;
    let bestScore = 0;
    for (const p of penwayTrips) {
      if (consumed.has(p.href)) continue;
      const s = similarity(card.title, p.title);
      if (s > bestScore) { bestScore = s; best = p; }
    }
    if (best && bestScore >= 0.7) {
      consumed.add(best.href);
      matches.push({ card, dest, url: best.href, penwayTitle: best.title, method: `title ${bestScore.toFixed(2)}` });
    } else {
      unmatched.push({ card, dest, reason: best ? `best title score only ${bestScore.toFixed(2)}` : 'no trips in blk section' });
    }
  }
}

// ---- report ----
const tag = (d) => d?.sub_region || d?.title || '?';
console.log(`\n=== ${EXECUTE ? 'EXECUTE' : 'DRY RUN'} ===`);
console.log(`no-URL active cards: ${noUrlTrips.length}`);
console.log(`MATCHED: ${matches.length}   UNMATCHED: ${unmatched.length}\n`);

for (const m of matches) {
  console.log(`[MATCH ${m.method}] ${tag(m.dest)} | ${m.card.title}`);
  console.log(`   -> ${m.penwayTitle}`);
  console.log(`   ${m.url}`);
}
if (unmatched.length) {
  console.log('\n--- UNMATCHED (need manual bind) ---');
  for (const u of unmatched) {
    console.log(`[NO MATCH] ${tag(u.dest)} | ${u.card.title}  (${u.reason})`);
  }
}

if (EXECUTE) {
  console.log(`\nWriting ${matches.length} source_url bindings...`);
  let ok = 0;
  let fail = 0;
  for (const m of matches) {
    const { error } = await sb
      .from('trips')
      .update({ source_url: m.url, scrape_managed: true })
      .eq('id', m.card.id);
    if (error) { fail += 1; console.error(`  FAIL ${m.card.title}: ${error.message}`); }
    else ok += 1;
  }
  console.log(`Done. ok=${ok} fail=${fail}`);
} else {
  console.log('\n(dry run — no writes. Re-run with --execute to apply.)');
}
