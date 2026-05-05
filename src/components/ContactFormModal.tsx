"use client";

import { useState } from "react";

interface ContactFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ContactFormModal({ isOpen, onClose }: ContactFormModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [lineId, setLineId] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const hasContact = phone.trim() || lineId.trim() || email.trim();
  const canSubmit = name.trim() && hasContact && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/contact-forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || null,
          line_id: lineId.trim() || null,
          email: email.trim() || null,
          message: message.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "送出失敗");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "送出失敗，請稍後再試");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setName("");
    setPhone("");
    setLineId("");
    setEmail("");
    setMessage("");
    setError("");
    setSubmitted(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" onClick={handleClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#1a3347] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 關閉按鈕 */}
        <button
          onClick={handleClose}
          className="absolute right-3 top-3 rounded-full p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {submitted ? (
          /* 送出成功畫面 */
          <div className="py-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#06C755]/20">
              <svg className="h-7 w-7 text-[#06C755]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white">已送出！</h3>
            <p className="mt-2 text-sm text-white/60">蓋瑞 Gary 會盡快跟您聯絡！</p>
            <button
              onClick={handleClose}
              className="mt-5 rounded-lg bg-[#00b4d8] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#0096c7]"
            >
              關閉
            </button>
          </div>
        ) : (
          /* 表單 */
          <form onSubmit={handleSubmit}>
            <h3 className="text-lg font-bold text-white">聯絡我們</h3>
            <p className="mt-1 text-xs text-white/50">蓋瑞 Gary 會盡快跟您聯絡！</p>

            <div className="mt-5 space-y-3">
              {/* 姓名/暱稱 */}
              <div>
                <label className="mb-1 block text-xs font-medium text-white/70">
                  姓名 / 暱稱 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="請輸入姓名或暱稱"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-[#00b4d8] focus:ring-1 focus:ring-[#00b4d8]"
                />
              </div>

              {/* 聯繫方式提示 */}
              <p className="text-[11px] text-white/40">以下聯繫方式請至少填寫一項</p>

              {/* 電話 */}
              <div>
                <label className="mb-1 block text-xs font-medium text-white/70">電話</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="手機或市話號碼"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-[#00b4d8] focus:ring-1 focus:ring-[#00b4d8]"
                />
              </div>

              {/* LINE ID */}
              <div>
                <label className="mb-1 block text-xs font-medium text-white/70">LINE ID</label>
                <input
                  type="text"
                  value={lineId}
                  onChange={(e) => setLineId(e.target.value)}
                  placeholder="您的 LINE ID"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-[#00b4d8] focus:ring-1 focus:ring-[#00b4d8]"
                />
              </div>

              {/* 信箱 */}
              <div>
                <label className="mb-1 block text-xs font-medium text-white/70">信箱</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@mail.com"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-[#00b4d8] focus:ring-1 focus:ring-[#00b4d8]"
                />
              </div>

              {/* 想詢問的問題 */}
              <div>
                <label className="mb-1 block text-xs font-medium text-white/70">想詢問的問題</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="請簡述您想詢問的內容..."
                  rows={3}
                  className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-[#00b4d8] focus:ring-1 focus:ring-[#00b4d8]"
                />
              </div>
            </div>

            {error && (
              <p className="mt-3 text-xs text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-4 w-full rounded-lg bg-[#00b4d8] py-2.5 text-sm font-semibold text-white transition hover:bg-[#0096c7] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? "送出中..." : "送出"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
