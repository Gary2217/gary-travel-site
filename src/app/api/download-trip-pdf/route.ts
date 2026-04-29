import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  const name = searchParams.get('name') || '行程檔';

  if (!url) {
    return NextResponse.json({ error: '缺少 url 參數' }, { status: 400 });
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json({ error: '檔案下載失敗' }, { status: 502 });
    }

    const blob = await res.blob();
    const filename = `${name}.pdf`;

    return new NextResponse(blob, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch {
    return NextResponse.json({ error: '下載失敗' }, { status: 500 });
  }
}
