import { NextRequest, NextResponse } from 'next/server';
import { API_ERRORS, apiError } from '@/lib/api-error';
import { requireDevAuth } from '@/lib/api-auth';
import { getStoragePathFromPublicUrl } from '@/lib/storage';
import { createServiceClient, hasServiceRoleConfig } from '@/lib/supabase-server';

const ALLOWED_EXTENSIONS = ['pdf'];

// POST: 建立 signed upload URL（檔案不經過 Vercel）
export async function POST(request: NextRequest) {
  const authError = requireDevAuth();
  if (authError) return authError;

  try {
    if (!hasServiceRoleConfig()) {
      return API_ERRORS.missingConfig();
    }

    const body = await request.json();
    const { trip_id, file_name } = body;

    if (!trip_id || !file_name) {
      return apiError('缺少 trip_id 或 file_name', 400);
    }

    const fileExt = file_name.split('.').pop()?.toLowerCase() || '';
    const sanitizedExt = fileExt.replace(/[^a-z0-9]/g, '');

    if (!ALLOWED_EXTENSIONS.includes(sanitizedExt)) {
      return NextResponse.json(
        { error: '僅支援 PDF 檔案格式' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const fileName = `${trip_id}-${Date.now()}.${sanitizedExt}`;
    const filePath = `documents/${fileName}`;

    const { data: signedData, error: signedError } = await supabase.storage
      .from('images')
      .createSignedUploadUrl(filePath);

    if (signedError || !signedData) {
      return signedError ? API_ERRORS.dbError(signedError) : apiError('無法建立上傳連結', 500);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(filePath);

    return NextResponse.json({
      signedUrl: signedData.signedUrl,
      token: signedData.token,
      path: filePath,
      publicUrl,
    });
  } catch (err) {
    return API_ERRORS.internal(err);
  }
}

// DELETE: 刪除行程檔案
export async function DELETE(request: NextRequest) {
  const authError = requireDevAuth();
  if (authError) return authError;

  try {
    if (!hasServiceRoleConfig()) {
      return API_ERRORS.missingConfig();
    }

    const body = await request.json();
    const { trip_id } = body;

    if (!trip_id) {
      return apiError('缺少 trip_id', 400);
    }

    const supabase = createServiceClient();

    // 取得舊檔案路徑
    const { data: existingTrip } = await supabase
      .from('trips')
      .select('document_url')
      .eq('id', trip_id)
      .single();

    // 清除資料庫欄位
    const { error: updateError } = await supabase
      .from('trips')
      .update({ document_url: null })
      .eq('id', trip_id);

    if (updateError) {
      return API_ERRORS.dbError(updateError);
    }

    // 刪除 Storage 中的檔案
    const oldStoragePath = getStoragePathFromPublicUrl(existingTrip?.document_url || '');
    if (oldStoragePath) {
      await supabase.storage.from('images').remove([oldStoragePath]);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return API_ERRORS.internal(err);
  }
}

// PUT: 確認上傳完成，更新資料庫，清除舊檔案
export async function PUT(request: NextRequest) {
  const authError = requireDevAuth();
  if (authError) return authError;

  try {
    if (!hasServiceRoleConfig()) {
      return API_ERRORS.missingConfig();
    }

    const body = await request.json();
    const { trip_id, url } = body;

    if (!trip_id || !url) {
      return apiError('缺少 trip_id 或 url', 400);
    }

    const supabase = createServiceClient();

    // 取得舊檔案路徑
    const { data: existingTrip } = await supabase
      .from('trips')
      .select('document_url')
      .eq('id', trip_id)
      .single();

    // 擷取 PDF 文字內容
    let documentText = '';
    try {
      const pdfRes = await fetch(url);
      if (pdfRes.ok) {
        const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
        const pdfModule = await (Function('return import("pdf-parse")')() as Promise<any>);
        const pdf = pdfModule.default || pdfModule;
        const pdfData = await pdf(pdfBuffer);
        documentText = pdfData.text || '';
      }
    } catch {
      // PDF 文字擷取失敗，靜默處理（不影響上傳流程）
    }

    // 更新資料庫
    const { data: updatedTrip, error: updateError } = await supabase
      .from('trips')
      .update({ document_url: url, document_text: documentText || null })
      .eq('id', trip_id)
      .select('id,document_url,document_text,updated_at')
      .single();

    if (updateError) {
      return API_ERRORS.dbError(updateError);
    }

    // 刪除舊檔案
    const oldStoragePath = getStoragePathFromPublicUrl(existingTrip?.document_url || '');
    const newStoragePath = getStoragePathFromPublicUrl(url);

    if (oldStoragePath && oldStoragePath !== newStoragePath) {
      await supabase.storage.from('images').remove([oldStoragePath]);
    }

    return NextResponse.json({ url, document_is_available: true, trip: updatedTrip });
  } catch (err) {
    return API_ERRORS.internal(err);
  }
}
