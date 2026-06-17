import { NextRequest, NextResponse } from 'next/server';
import { API_ERRORS, apiError } from '@/lib/api-error';
import { requireDevAuth } from '@/lib/api-auth';
import { createServiceClient, hasServiceRoleConfig } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const SETTINGS_KEY = 'popular_destination_order';

export async function PUT(request: NextRequest) {
  const authError = requireDevAuth();
  if (authError) return authError;

  try {
    if (!hasServiceRoleConfig()) {
      return API_ERRORS.missingConfig();
    }

    const body = await request.json();
    const order: unknown = body.order;

    if (!Array.isArray(order) || order.some((id) => typeof id !== 'string')) {
      return apiError('無效的排序資料', 400);
    }

    const supabase = createServiceClient();

    const { error } = await supabase
      .from('site_settings')
      .upsert(
        { key: SETTINGS_KEY, value: order, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );

    if (error) {
      return API_ERRORS.dbError(error);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return API_ERRORS.internal(err);
  }
}
