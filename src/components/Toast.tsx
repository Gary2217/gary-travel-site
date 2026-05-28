"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface ToastProps {
  message: string;
  duration?: number;
  type?: "success" | "error" | "warning";
  onClose: () => void;
}

export default function Toast({
  message,
  duration = 3000,
  type,
  onClose,
}: ToastProps) {
  const [visible, setVisible] = useState(true);
  const [mounted, setMounted] = useState(false);

  const prefix =
    type === "success"
      ? "✅"
      : type === "error"
        ? "❌"
        : type === "warning"
          ? "⚠️"
          : "";
  const prefixClass =
    type === "success"
      ? "text-emerald-500"
      : type === "error"
        ? "text-red-500"
        : type === "warning"
          ? "text-amber-500"
          : "text-gray-500";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={`fixed left-1/2 top-20 z-[9999] -translate-x-1/2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-900 shadow-xl transition-all duration-300 ${
        visible ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"
      }`}
    >
      <span className="inline-flex items-center gap-2">
        {prefix ? <span className={prefixClass}>{prefix}</span> : null}
        <span>{message}</span>
      </span>
    </div>,
    document.body
  );
}
