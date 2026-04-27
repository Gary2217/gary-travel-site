"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface PdfViewerProps {
  url: string;
  title?: string;
}

interface PageInfo {
  width: number;
  height: number;
  rendered: boolean;
}

export default function PdfViewer({ url, title }: PdfViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const pdfRef = useRef<any>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const renderingRef = useRef<Set<number>>(new Set());
  const initRef = useRef(false);

  // 載入 PDF 文件（只取得 metadata，不渲染頁面）
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    let cancelled = false;

    async function loadPdf() {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs`;

        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;

        if (cancelled) return;

        pdfRef.current = pdf;
        setPageCount(pdf.numPages);

        // 取得每頁尺寸（用於佔位）
        const pageInfos: PageInfo[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1 });
          pageInfos.push({
            width: viewport.width,
            height: viewport.height,
            rendered: false,
          });
        }

        if (cancelled) return;

        setPages(pageInfos);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError("PDF 載入失敗");
          setLoading(false);
        }
      }
    }

    loadPdf();
    return () => { cancelled = true; };
  }, [url]);

  // 渲染單一頁面到 canvas
  const renderPage = useCallback(async (pageIndex: number) => {
    const pdf = pdfRef.current;
    const canvas = canvasRefs.current.get(pageIndex);
    if (!pdf || !canvas || renderingRef.current.has(pageIndex)) return;

    renderingRef.current.add(pageIndex);

    try {
      const page = await pdf.getPage(pageIndex + 1);
      const containerWidth = canvas.parentElement?.clientWidth || window.innerWidth;
      const originalViewport = page.getViewport({ scale: 1 });
      const scale = containerWidth / originalViewport.width;
      const viewport = page.getViewport({ scale });

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        await page.render({ canvasContext: ctx, viewport }).promise;
      }

      setPages((prev) => {
        const next = [...prev];
        next[pageIndex] = { ...next[pageIndex], rendered: true };
        return next;
      });
    } catch {
      // 單頁渲染失敗，靜默處理
    } finally {
      renderingRef.current.delete(pageIndex);
    }
  }, []);

  // IntersectionObserver：頁面進入視窗時才渲染
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (pages.length === 0) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute("data-page-index"));
            if (!isNaN(idx) && !pages[idx]?.rendered) {
              renderPage(idx);
            }
          }
        });
      },
      { rootMargin: "200px 0px" } // 提前 200px 開始渲染
    );

    canvasRefs.current.forEach((canvas) => {
      observerRef.current?.observe(canvas);
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [pages, renderPage]);

  // canvas ref callback
  const setCanvasRef = useCallback((el: HTMLCanvasElement | null, index: number) => {
    if (el) {
      canvasRefs.current.set(index, el);
      observerRef.current?.observe(el);
    } else {
      canvasRefs.current.delete(index);
    }
  }, []);

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 bg-[rgba(20,20,30,0.6)]">
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500"
        >
          點此開啟行程表
        </a>
      </div>
    );
  }

  return (
    <div className="relative">
      {loading && (
        <div className="flex h-64 items-center justify-center bg-[rgba(20,20,30,0.4)]">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-sky-400 border-r-transparent" />
            <p className="mt-3 text-sm text-white/70">
              行程表載入中...{pageCount > 0 ? `（共 ${pageCount} 頁）` : ""}
            </p>
          </div>
        </div>
      )}
      {!loading && (
        <div className="w-full bg-white" title={title}>
          {pages.map((page, index) => (
            <div
              key={index}
              className="relative w-full"
              style={{ aspectRatio: `${page.width} / ${page.height}` }}
            >
              <canvas
                ref={(el) => setCanvasRef(el, index)}
                data-page-index={index}
                className="block h-auto w-full"
              />
              {!page.rendered && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-sky-400 border-r-transparent" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
