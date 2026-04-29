import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts, PDFName, PDFArray } from 'pdf-lib';

export const dynamic = 'force-dynamic';

const LINE_ID = process.env.NEXT_PUBLIC_LINE_ID || '@jsh9321p';
const LINE_URL = `https://line.me/R/oaMessage/${encodeURIComponent(LINE_ID)}/`;

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

    const pdfBytes = await res.arrayBuffer();

    // 用 pdf-lib 在每頁底部加上 LINE 資訊
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();

    const barHeight = 28;
    const textSize = 10;
    const lineText = `LINE Official : ${LINE_ID}`;
    const linkText = LINE_URL;

    for (const page of pages) {
      const { width } = page.getSize();

      // 底部深色背景條
      page.drawRectangle({
        x: 0,
        y: 0,
        width,
        height: barHeight,
        color: rgb(0.08, 0.08, 0.15),
      });

      // LINE 圖示圓形背景
      page.drawCircle({
        x: 20,
        y: barHeight / 2,
        size: 8,
        color: rgb(0.024, 0.78, 0.333), // #06C755
      });

      // "L" 字母代替 LINE icon
      page.drawText('L', {
        x: 16.5,
        y: barHeight / 2 - 4,
        size: 9,
        font: fontBold,
        color: rgb(1, 1, 1),
      });

      // LINE 官方帳號文字
      page.drawText(lineText, {
        x: 34,
        y: barHeight / 2 - 3.5,
        size: textSize,
        font: fontBold,
        color: rgb(0.024, 0.78, 0.333),
      });

      // 右側網址文字
      const linkWidth = font.widthOfTextAtSize(linkText, 8);
      page.drawText(linkText, {
        x: width - linkWidth - 12,
        y: barHeight / 2 - 3,
        size: 8,
        font,
        color: rgb(0.7, 0.7, 0.75),
      });

      // 加上可點擊的連結 annotation（整個底部條）
      const linkAnnotation = pdfDoc.context.register(
        pdfDoc.context.obj({
          Type: 'Annot',
          Subtype: 'Link',
          Rect: [0, 0, width, barHeight],
          Border: [0, 0, 0],
          A: {
            Type: 'Action',
            S: 'URI',
            URI: LINE_URL,
          },
        })
      );

      const existingAnnots = page.node.lookup(PDFName.of('Annots'));
      if (existingAnnots instanceof PDFArray) {
        existingAnnots.push(linkAnnotation);
      } else {
        page.node.set(PDFName.of('Annots'), pdfDoc.context.obj([linkAnnotation]));
      }
    }

    const modifiedPdfBytes = await pdfDoc.save();
    const filename = `${name}.pdf`;

    return new NextResponse(modifiedPdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch {
    return NextResponse.json({ error: '下載失敗' }, { status: 500 });
  }
}
