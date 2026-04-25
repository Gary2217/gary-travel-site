"use client";

import { ChangeEvent, MouseEvent, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { uploadImage } from "@/lib/supabase";

interface ImageEditorProps {
  entityId: string;
  currentImageUrl: string;
  title: string;
  onUpdate: (newImageUrl: string) => void;
  onOpenChange?: (open: boolean) => void;
  uploadFn?: (entityId: string, file: File) => Promise<string>;
  documentUrl?: string;
  onDocumentUpdate?: (url: string) => void;
  documentUploadFn?: (entityId: string, file: File) => Promise<string>;
}

export default function ImageEditor({ entityId, currentImageUrl, title, onUpdate, onOpenChange, uploadFn = uploadImage, documentUrl, onDocumentUpdate, documentUploadFn }: ImageEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [selectedDocFile, setSelectedDocFile] = useState<File | null>(null);
  const [selectedDocFileName, setSelectedDocFileName] = useState("");
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const previewUrl = useMemo(() => {
    if (!selectedFile) {
      return null;
    }

    return URL.createObjectURL(selectedFile);
  }, [selectedFile]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleModalClick = (e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };

  const stopMouseEvent = (e: MouseEvent<HTMLElement>) => {
    e.stopPropagation();
  };

  const resetSelection = () => {
    setSelectedFile(null);
    setSelectedFileName("");
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.target.files?.[0];

    if (!file) {
      resetSelection();
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("請選擇圖片檔案");
      e.target.value = "";
      resetSelection();
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("圖片檔案不能超過 5MB");
      e.target.value = "";
      resetSelection();
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
      const publicUrl = await uploadFn(entityId, selectedFile);
      onUpdate(publicUrl);

      resetSelection();
      setIsOpen(false);
      alert("圖片已儲存並同步更新！");
    } catch (error) {
      console.error("Error uploading image:", error);
      const message = error instanceof Error ? error.message : "上傳失敗，請稍後再試";
      alert(`上傳失敗：${message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(true);
        }}
        className="absolute right-2 top-2 z-10 rounded-full bg-blue-600 p-2 text-white shadow-lg transition hover:bg-blue-700"
        title="編輯圖片"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </button>

      {mounted && isOpen && createPortal(
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => {
            e.stopPropagation();
            if (e.target === e.currentTarget) {
              setIsOpen(false);
            }
          }}
        >
          <div
            className="w-full max-w-2xl rounded-xl bg-[rgba(20,20,30,0.98)] p-6 shadow-2xl backdrop-blur-xl"
            onClick={handleModalClick}
            onMouseDown={stopMouseEvent}
            onMouseUp={stopMouseEvent}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">編輯圖片 - {title}</h3>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  resetSelection();
                  setIsOpen(false);
                }}
                className="text-white/70 transition hover:text-white"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm text-white/70">當前圖片：</p>
                <div className="h-48 w-full overflow-hidden rounded-lg border border-white/10 bg-white/5">
                  {currentImageUrl ? (
                    <img
                      src={currentImageUrl}
                      alt={`${title} 當前圖片`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-white/50">
                      目前尚未設定圖片
                    </div>
                  )}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm text-white/70">預覽圖片：</p>
                <div className="h-48 w-full overflow-hidden rounded-lg border border-white/10 bg-white/5">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt={`${title} 預覽圖片`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-white/50">
                      選擇新圖片後，這裡會顯示預覽
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  上傳新圖片
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  onClick={stopMouseEvent}
                  onMouseDown={stopMouseEvent}
                  onMouseUp={stopMouseEvent}
                  disabled={uploading}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white file:mr-4 file:rounded-full file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-700 disabled:opacity-50"
                />
                {selectedFileName && (
                  <p className="mt-2 text-sm text-white/70">已選擇：{selectedFileName}</p>
                )}
                <p className="mt-2 text-xs text-white/50">
                  請先選檔確認預覽，再按儲存同步更新資料庫。支援 JPG、PNG、WebP，大小限制 5MB。
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!selectedFile || uploading}
                    className="rounded-lg bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {uploading ? "儲存中..." : "儲存圖片"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetSelection();
                    }}
                    disabled={!selectedFile || uploading}
                    className="rounded-lg border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    清除選擇
                  </button>
                </div>
                {uploading && (
                  <p className="mt-2 text-sm text-sky-300">圖片儲存中，請稍候...</p>
                )}
              </div>

              {/* 行程檔案上傳區塊 */}
              {documentUploadFn && onDocumentUpdate && (
                <div className="border-t border-white/10 pt-4">
                  <label className="mb-2 block text-sm font-medium text-white">
                    上傳行程檔案
                  </label>

                  {documentUrl && (
                    <div className="mb-3 flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                      <svg className="h-5 w-5 shrink-0 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <a
                        href={documentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="min-w-0 flex-1 truncate text-sm text-sky-300 underline hover:text-sky-200"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {documentUrl.split('/').pop() || '查看檔案'}
                      </a>
                    </div>
                  )}

                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                    onChange={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const file = e.target.files?.[0];
                      if (!file) {
                        setSelectedDocFile(null);
                        setSelectedDocFileName("");
                        return;
                      }
                      if (file.size > 50 * 1024 * 1024) {
                        alert("檔案不能超過 50MB");
                        e.target.value = "";
                        return;
                      }
                      setSelectedDocFile(file);
                      setSelectedDocFileName(file.name);
                    }}
                    onClick={stopMouseEvent}
                    onMouseDown={stopMouseEvent}
                    onMouseUp={stopMouseEvent}
                    disabled={uploadingDoc}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white file:mr-4 file:rounded-full file:border-0 file:bg-emerald-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-emerald-700 disabled:opacity-50"
                  />
                  {selectedDocFileName && (
                    <p className="mt-2 text-sm text-white/70">已選擇：{selectedDocFileName}</p>
                  )}
                  <p className="mt-2 text-xs text-white/50">
                    支援 PDF、DOC、DOCX、XLS、XLSX、JPG、PNG、WebP，大小限制 50MB。建議使用 PDF 格式，所有手機都能直接開啟。
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!selectedDocFile || !documentUploadFn) return;
                        setUploadingDoc(true);
                        try {
                          const url = await documentUploadFn(entityId, selectedDocFile);
                          onDocumentUpdate(url);
                          setSelectedDocFile(null);
                          setSelectedDocFileName("");
                          alert("行程檔案已儲存！");
                        } catch (error) {
                          const msg = error instanceof Error ? error.message : "上傳失敗";
                          alert(`上傳失敗：${msg}`);
                        } finally {
                          setUploadingDoc(false);
                        }
                      }}
                      disabled={!selectedDocFile || uploadingDoc}
                      className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {uploadingDoc ? "上傳中..." : "儲存檔案"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDocFile(null);
                        setSelectedDocFileName("");
                      }}
                      disabled={!selectedDocFile || uploadingDoc}
                      className="rounded-lg border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      清除選擇
                    </button>
                  </div>
                  {uploadingDoc && (
                    <p className="mt-2 text-sm text-emerald-300">檔案上傳中，請稍候...</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
