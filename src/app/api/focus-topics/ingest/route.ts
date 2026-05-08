import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireDevAuth } from '@/lib/api-auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

type SourceRow = {
  id: string;
  name: string;
  endpoint_url: string;
  homepage_url: string | null;
  default_status: 'pending' | 'approved' | 'published';
  is_active: boolean;
  max_items_per_fetch: number;
};

type ExternalPayloadItem = {
  id?: string;
  title?: string;
  summary?: string;
  description?: string;
  image_url?: string;
  image?: string;
  source_url?: string;
  url?: string;
  published_at?: string;
};

function createAdminClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) return null;
  return createClient(supabaseUrl, supabaseServiceRoleKey);
}

function toItem(row: ExternalPayloadItem) {
  const title = (row.title || '').trim();
  const summary = (row.summary || row.description || '').trim();
  const imageUrl = (row.image_url || row.image || '').trim();
  const sourceUrl = (row.source_url || row.url || '').trim();
  const sourceItemId = String(row.id || sourceUrl || title).trim();

  return {
    title,
    summary,
    imageUrl,
    sourceUrl,
    sourceItemId,
    publishedAt: row.published_at || null,
  };
}

export async function POST(request: NextRequest) {
  const authError = requireDevAuth(request);
  if (authError) return authError;

  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Missing server configuration.' }, { status: 500 });
    }

    const { data: sources, error: sourceErr } = await supabase
      .from('focus_topic_sources')
      .select('id, name, endpoint_url, homepage_url, default_status, is_active, max_items_per_fetch')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (sourceErr) {
      return NextResponse.json({ error: sourceErr.message }, { status: 500 });
    }

    const activeSources = (sources || []) as SourceRow[];
    if (activeSources.length === 0) {
      return NextResponse.json({ inserted: 0, skipped: 0, sources: 0, message: '無啟用來源' });
    }

    let inserted = 0;
    let skipped = 0;

    for (const source of activeSources) {
      try {
        const res = await fetch(source.endpoint_url, { cache: 'no-store' });
        if (!res.ok) {
          skipped += 1;
          continue;
        }

        const raw = await res.json() as unknown;
        const list = Array.isArray(raw)
          ? raw
          : (raw && typeof raw === 'object' && Array.isArray((raw as { items?: unknown[] }).items)
              ? (raw as { items: unknown[] }).items
              : []);

        const maxCount = Math.max(1, Math.min(source.max_items_per_fetch || 6, 20));
        const picked = list.slice(0, maxCount) as ExternalPayloadItem[];

        for (const row of picked) {
          const normalized = toItem(row);

          // 強制「圖文原生配對」最小條件
          if (!normalized.title || !normalized.imageUrl || !normalized.sourceUrl || !normalized.sourceItemId) {
            skipped += 1;
            continue;
          }

          // 來源內同一 item 避免重複
          const { data: exists } = await supabase
            .from('focus_topic_items')
            .select('id')
            .eq('source_name', source.name)
            .eq('source_item_id', normalized.sourceItemId)
            .limit(1);

          if (exists && exists.length > 0) {
            skipped += 1;
            continue;
          }

          const { error: insErr } = await supabase
            .from('focus_topic_items')
            .insert({
              title: normalized.title,
              summary: normalized.summary,
              image_url: normalized.imageUrl,
              source_name: source.name,
              source_url: normalized.sourceUrl,
              source_item_id: normalized.sourceItemId,
              status: source.default_status,
              published_at: source.default_status === 'published' ? (normalized.publishedAt || new Date().toISOString()) : null,
              license_type: 'unknown',
              pair_verified: true,
            });

          if (insErr) {
            skipped += 1;
            continue;
          }

          inserted += 1;
        }
      } catch {
        skipped += 1;
      }
    }

    return NextResponse.json({ inserted, skipped, sources: activeSources.length });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
