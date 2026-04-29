import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ error: 'Missing server configuration.' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 取得行程的 document_url
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id, document_url, document_text')
      .eq('id', params.id)
      .single();

    if (tripError || !trip) {
      return NextResponse.json({ error: '找不到行程' }, { status: 404 });
    }

    if (!trip.document_url) {
      return NextResponse.json({ error: '此行程沒有 PDF 檔案' }, { status: 400 });
    }

    // 如果已有文字就直接回傳
    if (trip.document_text) {
      return NextResponse.json({ text: trip.document_text });
    }

    // 擷取 PDF 文字
    const pdfRes = await fetch(trip.document_url);
    if (!pdfRes.ok) {
      return NextResponse.json({ error: 'PDF 下載失敗' }, { status: 502 });
    }

    const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
    const pdfModule = await (Function('return import("pdf-parse")')() as Promise<any>);
    const pdf = pdfModule.default || pdfModule;
    const pdfData = await pdf(pdfBuffer);
    const documentText = pdfData.text || '';

    // 存入資料庫
    await supabase
      .from('trips')
      .update({ document_text: documentText })
      .eq('id', params.id);

    return NextResponse.json({ text: documentText });
  } catch {
    return NextResponse.json({ error: '文字擷取失敗' }, { status: 500 });
  }
}
