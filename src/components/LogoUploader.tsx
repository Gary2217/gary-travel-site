"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { uploadSiteLogo } from "@/lib/supabase";

interface LogoUploaderProps {
  currentLogoUrl: string;
  onUpdate: (url: string) => void;
}

export default function LogoUploader({ currentLogoUrl, onUpdate }: LogoUploaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [uploading, setUploading] = useState(false);

  const previewUrl = useMemo(() => (selectedFile ? URL.createObjectURL(selectedFile) : null), [selectedFile]);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      setSelectedFileName("");
      return;
    }

    if ((!file.type.startsWith("image/") && file.type !== "image/svg+xml") || file.size > 5 * 1024 * 1024) {
      alert("請選擇 5MB 內的圖片檔案");
      e.target.value = "";
      return;
    }

    setSelectedFile(file);
    setSelectedFileName(file.name);
  };

  const handleSave = async () => {
    if (!selectedFile) {
      alert("請先選擇圖片");
      return;
    }

    setUploading(true);
    try {
      const url = await uploadSiteLogo(selectedFile);
      onUpdate(url);
      setIsOpen(false);
      setSelectedFile(null);
      setSelectedFileName("");
      alert("LOGO 已儲存到後端！");
    } catch (error) {
      const message = error instanceof Error ? error.message : "上傳失敗";
      alert(`上傳失敗：${message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-500/80 text-white transition hover:bg-sky-400 sm:h-8 sm:w-8"
        title="編輯 LOGO"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </button>

      {isOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-4" onClick={() => setIsOpen(false)}>
          <div className="w-full max-w-lg rounded-xl bg-[rgba(20,20,30,0.98)] p-4 shadow-2xl backdrop-blur-xl sm:p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-white sm:text-lg">編輯網站 LOGO</h3>
              <button onClick={() => setIsOpen(false)} className="text-white/70 transition hover:text-white">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm text-white/70">目前 LOGO：</p>
                <div className="flex h-28 items-center justify-center rounded-lg border border-white/10 bg-white/5 sm:h-32">
                  <img src={currentLogoUrl} alt="目前 LOGO" className="h-20 w-20 object-contain sm:h-24 sm:w-24" />
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm text-white/70">預覽：</p>
                <div className="flex h-28 items-center justify-center rounded-lg border border-white/10 bg-white/5 sm:h-32">
                  {previewUrl ? (
                    <img src={previewUrl} alt="LOGO 預覽" className="h-20 w-20 object-contain sm:h-24 sm:w-24" />
                  ) : (
                    <span className="text-sm text-white/50">選擇新圖片後顯示</span>
                  )}
                </div>
              </div>

              <div>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleFileSelect}
                  disabled={uploading}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white file:mr-3 file:rounded-full file:border-0 file:bg-sky-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-sky-500 disabled:opacity-50"
                />
                {selectedFileName && <p className="mt-2 text-sm text-white/70">已選擇：{selectedFileName}</p>}
                <p className="mt-2 text-xs text-white/50">支援 PNG、JPG、WebP、SVG，大小限制 5MB。</p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!selectedFile || uploading}
                  className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {uploading ? "儲存中..." : "儲存 LOGO"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setSelectedFileName("");
                  }}
                  disabled={!selectedFile || uploading}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  清除選擇
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
