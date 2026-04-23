"use client";

import { ChangeEvent, MouseEvent, useState } from "react";
import { supabase } from "@/lib/supabase";

interface ImageEditorProps {
  destinationId: string;
  currentImageUrl: string;
  title: string;
  onUpdate: (newImageUrl: string) => void;
}

export default function ImageEditor({ destinationId, currentImageUrl, title, onUpdate }: ImageEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleModalClick = (e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);

    if (!file.type.startsWith('image/')) {
      alert('請選擇圖片檔案');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('圖片檔案不能超過 5MB');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${destinationId}-${Date.now()}.${fileExt}`;
      const filePath = `destinations/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('destinations')
        .update({ image_url: publicUrl })
        .eq('id', destinationId);

      if (updateError) throw updateError;

      onUpdate(publicUrl);
      setIsOpen(false);
      setSelectedFileName("");
      e.target.value = "";
      alert('圖片已上傳並更新！');
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('上傳失敗，請稍後再試');
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

      {isOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.target === e.currentTarget) {
              setIsOpen(false);
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-xl bg-[rgba(20,20,30,0.95)] p-6 shadow-2xl backdrop-blur-xl"
            onClick={handleModalClick}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">編輯圖片 - {title}</h3>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
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
              {/* 當前圖片預覽 */}
              <div>
                <p className="mb-2 text-sm text-white/70">當前圖片：</p>
                <div className="h-32 w-full overflow-hidden rounded-lg">
                  <div
                    className="h-full w-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${currentImageUrl})` }}
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white">
                  上傳新圖片
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white file:mr-4 file:rounded-full file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-700 disabled:opacity-50"
                />
                {selectedFileName && (
                  <p className="mt-2 text-sm text-white/70">已選擇：{selectedFileName}</p>
                )}
                <p className="mt-2 text-xs text-white/50">
                  選擇圖片後會直接上傳到 Supabase Storage，並同步更新資料庫。支援 JPG、PNG、WebP，大小限制 5MB。
                </p>
                {uploading && (
                  <p className="mt-2 text-sm text-sky-300">圖片上傳中，請稍候...</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
