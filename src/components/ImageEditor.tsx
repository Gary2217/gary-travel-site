"use client";

import { ChangeEvent, MouseEvent, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { uploadImage, deleteTripDocument, updateTrip } from "@/lib/supabase";

interface ImageEditorProps {
  entityId: string;
  currentImageUrl: string;
  title: string;
  onUpdate: (newImageUrl: string) => void;
  onOpenChange?: (open: boolean) => void;
  uploadFn?: (entityId: string, file: File) => Promise<string>;
  documentUrl?: string;
  onDocumentUpdate?: (url: string) => void;
  documentUploadFn?: (entityId: string, file: File) => Promise<{ url: string; document_is_available: boolean }>;
  onDocumentAvailabilityUpdate?: (available: boolean) => void;
  duration?: string;
  onDurationUpdate?: (newDuration: string) => void;
}

export default function ImageEditor({ entityId, currentImageUrl, title, onUpdate, onOpenChange, uploadFn = uploadImage, documentUrl, onDocumentUpdate, documentUploadFn, onDocumentAvailabilityUpdate, duration, onDurationUpdate }: ImageEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [selectedDocFile, setSelectedDocFile] = useState<File | null>(null);
  const [selectedDocFileName, setSelectedDocFileName] = useState("");
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [deletingDoc, setDeletingDoc] = useState(false);
  const [durationValue, setDurationValue] = useState(duration || "");
  const [savingDuration, setSavingDuration] = useState(false);

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
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-4"
          onClick={(e) => {
            e.stopPropagation();
            if (e.target === e.currentTarget) {
              setIsOpen(false);
            }
          }}
        >
          <div
            className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-xl bg-[rgba(20,20,30,0.98)] p-3 shadow-2xl backdrop-blur-xl sm:p-4"
            onClick={handleModalClick}
            onMouseDown={stopMouseEvent}
            onMouseUp={stopMouseEvent}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold text-white sm:text-lg">編輯圖片 - {title}</h3>
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

            <div className="space-y-3">
              <div>
                <p className="mb-1.5 text-sm text-white/70">當前圖片：</p>
                <div className="h-20 w-full overflow-hidden rounded-lg border border-white/10 bg-white/5 sm:h-28">
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
                <p className="mb-1.5 text-sm text-white/70">預覽圖片：</p>
                <div className="h-20 w-full overflow-hidden rounded-lg border border-white/10 bg-white/5 sm:h-28">
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
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white file:mr-3 file:rounded-full file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-blue-700 disabled:opacity-50"
                />
                {selectedFileName && (
                  <p className="mt-2 text-sm text-white/70">已選擇：{selectedFileName}</p>
                )}
                  <p className="mt-1.5 text-xs text-white/50">
                    支援 JPG、PNG、WebP，大小限制 5MB。
                  </p>
                <div className="sticky bottom-0 mt-2 flex flex-wrap gap-3 bg-[rgba(20,20,30,0.98)] pb-1 pt-1.5">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!selectedFile || uploading}
                  className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {uploading ? "儲存中..." : "儲存圖片"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetSelection();
                    }}
                    disabled={!selectedFile || uploading}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    清除選擇
                  </button>
                </div>
                {uploading && (
                  <p className="mt-2 text-sm text-sky-300">圖片儲存中，請稍候...</p>
                )}
              </div>

              {/* 天數編輯區塊 */}
              {onDurationUpdate && (
                <div className="border-t border-white/10 pt-2.5">
                  <label className="mb-2 block text-sm font-medium text-white">
                    行程天數
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={durationValue}
                      onChange={(e) => setDurationValue(e.target.value)}
                      onClick={stopMouseEvent}
                      onMouseDown={stopMouseEvent}
                      placeholder="例：5天4夜"
                      className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-sky-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={savingDuration || durationValue === duration}
                      onClick={async () => {
                        if (!durationValue.trim()) return;
                        setSavingDuration(true);
                        try {
                          await updateTrip(entityId, { duration: durationValue.trim() });
                          onDurationUpdate(durationValue.trim());
                          alert("天數已更新！");
                        } catch (err) {
                          const msg = err instanceof Error ? err.message : "更新失敗";
                          alert(`更新失敗：${msg}`);
                        } finally {
                          setSavingDuration(false);
                        }
                      }}
                      className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {savingDuration ? "儲存中..." : "儲存"}
                    </button>
                  </div>
                </div>
              )}

              {/* 行程檔案上傳區塊 */}
              {documentUploadFn && onDocumentUpdate && (
                <div className="border-t border-white/10 pt-2.5">
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
                      <button
                        type="button"
                        disabled={deletingDoc}
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!confirm("確定要刪除此行程檔案嗎？")) return;
                          setDeletingDoc(true);
                          try {
                            await deleteTripDocument(entityId);
                            onDocumentUpdate?.("");
                            onDocumentAvailabilityUpdate?.(false);
                            setIsOpen(false);
                            alert("行程檔案已刪除");
                          } catch (err) {
                            const msg = err instanceof Error ? err.message : "刪除失敗";
                            alert(`刪除失敗：${msg}`);
                          } finally {
                            setDeletingDoc(false);
                          }
                        }}
                        className="shrink-0 rounded-full p-1 text-red-400 transition hover:bg-red-500/20 hover:text-red-300 disabled:opacity-50"
                        title="刪除檔案"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}

                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const file = e.target.files?.[0];
                      if (!file) {
                        setSelectedDocFile(null);
                        setSelectedDocFileName("");
                        return;
                      }
                      const ext = file.name.split('.').pop()?.toLowerCase();
                      if (ext !== 'pdf') {
                        alert("僅支援 PDF 檔案格式，請先將檔案轉換為 PDF 後再上傳");
                        e.target.value = "";
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
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white file:mr-3 file:rounded-full file:border-0 file:bg-emerald-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-emerald-700 disabled:opacity-50"
                  />
                  {selectedDocFileName && (
                    <p className="mt-2 text-sm text-white/70">已選擇：{selectedDocFileName}</p>
                  )}
                  <p className="mt-1.5 text-xs text-white/50">
                    僅支援 PDF 檔案，大小限制 50MB。
                  </p>
                  <div className="sticky bottom-0 mt-2 flex flex-wrap gap-3 bg-[rgba(20,20,30,0.98)] pb-1 pt-1.5">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!selectedDocFile || !documentUploadFn) return;
                        setUploadingDoc(true);
                        try {
                           const result = await documentUploadFn(entityId, selectedDocFile);
                           onDocumentUpdate(result.url);
                           onDocumentAvailabilityUpdate?.(result.document_is_available);
                           setSelectedDocFile(null);
                           setSelectedDocFileName("");
                           setIsOpen(false);
                           alert("行程檔案已儲存！");
                        } catch (error) {
                          const msg = error instanceof Error ? error.message : "上傳失敗";
                          alert(`上傳失敗：${msg}`);
                        } finally {
                          setUploadingDoc(false);
                        }
                      }}
                      disabled={!selectedDocFile || uploadingDoc}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
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
                      className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
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
