"use client";

function isInAppOrMobileBrowser() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iPhone|iPad|iPod|Android|Line\/|LIFF|FBAN|FBAV|Instagram/i.test(ua);
}

export function openExternalLink(url: string) {
  if (!url || url.trim() === "" || url === "#") return;

  if (typeof window === "undefined") return;

  if (isInAppOrMobileBrowser()) {
    window.location.assign(url);
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}
