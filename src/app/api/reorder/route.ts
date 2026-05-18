import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireDevAuth } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

type ReorderTable = 'destinations' | 'trips';

interface ReorderItem {
  id: string;
  display_order: number;
}

function isValidTable(table: unknown): table is ReorderTable {
  return table === 'destinations' || table === 'trips';
}

function isValidItems(items: unknown): items is ReorderItem[] {
  return Array.isArray(items) && items.every((item) => {
    if (!item || typeof item !== 'object') return false;

    const candidate = item as Record<string, unknown>;
    return typeof candidate.id === 'string' && typeof candidate.display_order === 'number';
  });
}

export async function POST(request: NextRequest) {
  const authError = requireDevAuth();
  if (authError) return authError;

  try {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ error: 'Missing server configuration.' }, { status: 500 });
    }

    const body = await request.json();
    const table = body.table;
    const items = body.items;

    if (!isValidTable(table) || !isValidItems(items) || items.length === 0) {
      return NextResponse.json({ error: '無效的排序資料' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const results = await Promise.all(
      items.map((item) =>
        supabase
          .from(table)
          .update({ display_order: item.display_order })
          .eq('id', item.id)
      )
    );

    const failed = results.find((result) => result.error);
    if (failed?.error) {
      return NextResponse.json({ error: failed.error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
