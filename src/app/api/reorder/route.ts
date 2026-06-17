import { NextRequest, NextResponse } from 'next/server';
import { API_ERRORS, apiError } from '@/lib/api-error';
import { requireDevAuth } from '@/lib/api-auth';
import { createServiceClient, hasServiceRoleConfig } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

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
    if (!hasServiceRoleConfig()) {
      return API_ERRORS.missingConfig();
    }

    const body = await request.json();
    const table = body.table;
    const items = body.items;

    if (!isValidTable(table) || !isValidItems(items) || items.length === 0) {
      return apiError('無效的排序資料', 400);
    }

    const supabase = createServiceClient();

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
      return API_ERRORS.dbError(failed.error);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return API_ERRORS.internal(err);
  }
}
