"use client";

function isInAppOrMobileBrowser() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iPhone|iPad|iPod|Android|Line\/|LIFF|FBAN|FBAV|Instagram/i.test(ua);
}

export function openExternalLink(url: string) {
  if (!url || url.trim() === "" || url === "#") return;

  if (typeof window === "undefined") return;

  // 優先嘗試開新分頁，讓使用者能返回網站
  const newWindow = window.open(url, "_blank", "noopener,noreferrer");

  // 若被 in-app 瀏覽器攔截（回傳 null），才 fallback 跳轉
  if (!newWindow) {
    window.location.assign(url);
  }
}
