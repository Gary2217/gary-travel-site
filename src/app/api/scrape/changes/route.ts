import { NextRequest, NextResponse } from 'next/server';
import { API_ERRORS, apiError } from '@/lib/api-error';
import { requireDevAuth } from '@/lib/api-auth';
import { createServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function createSupabase() {
  return createServiceClient();
}

// GET: 讀取待確認變更列表
export async function GET(req: NextRequest) {
  const authError = requireDevAuth();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'pending';

    const destinationId = searchParams.get('destination_id');

    const supabase = createSupabase();
    let query = supabase
      .from('pending_changes')
      .select('*')
      .eq('status', status);

    if (destinationId) {
      query = query.eq('destination_id', destinationId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return API_ERRORS.dbError(error);
    }

    return NextResponse.json(data || [], {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (err) {
    return API_ERRORS.internal(err);
  }
}

// PATCH: 批量更新狀態（dismissed / approved）
export async function PATCH(req: NextRequest) {
  const authError = requireDevAuth();
  if (authError) return authError;

  try {
    const body = await req.json();
    const { ids, status } = body as { ids: string[]; status: 'approved' | 'dismissed' };

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return apiError('缺少 ids 參數', 400);
    }
    if (!['approved', 'dismissed'].includes(status)) {
      return apiError('status 只能是 approved 或 dismissed', 400);
    }

    const supabase = createSupabase();
    const { error } = await supabase
      .from('pending_changes')
      .update({ status })
      .in('id', ids);

    if (error) {
      return API_ERRORS.dbError(error);
    }

    return NextResponse.json({ updated: ids.length });
  } catch (err) {
    return API_ERRORS.internal(err);
  }
}

// DELETE: 清除已處理的變更紀錄
export async function DELETE(req: NextRequest) {
  const authError = requireDevAuth();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'dismissed';

    const supabase = createSupabase();
    const { error } = await supabase
      .from('pending_changes')
      .delete()
      .eq('status', status);

    if (error) {
      return API_ERRORS.dbError(error);
    }

    return NextResponse.json({ deleted: true });
  } catch (err) {
    return API_ERRORS.internal(err);
  }
}
