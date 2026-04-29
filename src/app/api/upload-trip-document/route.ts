import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as pdfParse from 'pdf-parse';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const ALLOWED_EXTENSIONS = ['pdf'];

function getStoragePathFromPublicUrl(publicUrl: string) {
  try {
    const currentProjectUrl = new URL(supabaseUrl);
    const url = new URL(publicUrl);

    if (url.origin !== currentProjectUrl.origin) {
      return null;
    }

    const prefix = '/storage/v1/object/public/images/';

    if (!url.pathname.startsWith(prefix)) {
      return null;
    }

    return url.pathname.slice(prefix.length) || null;
  } catch {
    return null;
  }
}

// POST: 建立 signed upload URL（檔案不經過 Vercel）
export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ error: 'Missing server configuration.' }, { status: 500 });
    }

    const body = await request.json();
    const { trip_id, file_name } = body;

    if (!trip_id || !file_name) {
      return NextResponse.json({ error: 'Missing trip_id or file_name' }, { status: 400 });
    }

    const fileExt = file_name.split('.').pop()?.toLowerCase() || '';
    const sanitizedExt = fileExt.replace(/[^a-z0-9]/g, '');

    if (!ALLOWED_EXTENSIONS.includes(sanitizedExt)) {
      return NextResponse.json(
        { error: '僅支援 PDF 檔案格式' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const fileName = `${trip_id}-${Date.now()}.${sanitizedExt}`;
    const filePath = `documents/${fileName}`;

    const { data: signedData, error: signedError } = await supabase.storage
      .from('images')
      .createSignedUploadUrl(filePath);

    if (signedError || !signedData) {
      return NextResponse.json({ error: signedError?.message || '無法建立上傳連結' }, { status: 500 });
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
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: 刪除行程檔案
export async function DELETE(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ error: 'Missing server configuration.' }, { status: 500 });
    }

    const body = await request.json();
    const { trip_id } = body;

    if (!trip_id) {
      return NextResponse.json({ error: 'Missing trip_id' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

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
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 刪除 Storage 中的檔案
    const oldStoragePath = getStoragePathFromPublicUrl(existingTrip?.document_url || '');
    if (oldStoragePath) {
      await supabase.storage.from('images').remove([oldStoragePath]);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT: 確認上傳完成，更新資料庫，清除舊檔案
export async function PUT(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ error: 'Missing server configuration.' }, { status: 500 });
    }

    const body = await request.json();
    const { trip_id, url } = body;

    if (!trip_id || !url) {
      return NextResponse.json({ error: 'Missing trip_id or url' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

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
        const pdf = (pdfParse as any).default || pdfParse;
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
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 刪除舊檔案
    const oldStoragePath = getStoragePathFromPublicUrl(existingTrip?.document_url || '');
    const newStoragePath = getStoragePathFromPublicUrl(url);

    if (oldStoragePath && oldStoragePath !== newStoragePath) {
      await supabase.storage.from('images').remove([oldStoragePath]);
    }

    return NextResponse.json({ url, document_is_available: true, trip: updatedTrip });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
