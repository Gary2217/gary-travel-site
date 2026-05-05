"use client";

import { useState } from "react";
import { lineDmHref } from "@/lib/supabase";

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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  // 格式驗證
  const validatePhone = (v: string) => {
    if (!v.trim()) return "";
    // 台灣手機 09xx 或市話 02/03/04... 或國際 +886，允許 - 和空格
    const cleaned = v.replace(/[\s-]/g, "");
    if (/^09\d{8}$/.test(cleaned)) return "";
    if (/^0[2-8]\d{7,8}$/.test(cleaned)) return "";
    if (/^\+?\d{10,15}$/.test(cleaned)) return "";
    return "請輸入正確的電話號碼（例如 0912345678）";
  };

  const validateLineId = (v: string) => {
    if (!v.trim()) return "";
    // LINE ID：4-20 字元，英數字、點、底線、橫線
    if (/^[a-zA-Z0-9._-]{4,20}$/.test(v.trim())) return "";
    return "LINE ID 格式不正確（4-20 字元，僅限英數字、點、底線）";
  };

  const validateEmail = (v: string) => {
    if (!v.trim()) return "";
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return "";
    return "請輸入正確的信箱格式（例如 example@mail.com）";
  };

  const hasContact = phone.trim() || lineId.trim() || email.trim();
  const hasFieldErrors = Object.values(fieldErrors).some((e) => e);
  const canSubmit = name.trim() && hasContact && !hasFieldErrors && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 送出前再驗證一次
    const errors: Record<string, string> = {};
    const phoneErr = validatePhone(phone);
    const lineErr = validateLineId(lineId);
    const emailErr = validateEmail(email);
    if (phoneErr) errors.phone = phoneErr;
    if (lineErr) errors.lineId = lineErr;
    if (emailErr) errors.email = emailErr;
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

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
    setFieldErrors({});
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
            <p className="mt-1 text-xs text-white/40">也可加 LINE 私訊蓋瑞 Gary 更快回覆您</p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <a
                href={lineDmHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#06C755] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-85"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" /></svg>
                LINE 私訊
              </a>
              <button
                onClick={handleClose}
                className="rounded-lg border border-white/15 px-5 py-2.5 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                關閉
              </button>
            </div>
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
                  onChange={(e) => { setPhone(e.target.value); setFieldErrors((p) => ({ ...p, phone: "" })); }}
                  onBlur={() => { const err = validatePhone(phone); setFieldErrors((p) => ({ ...p, phone: err })); }}
                  placeholder="例如 0912345678"
                  className={`w-full rounded-lg border bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-[#00b4d8] focus:ring-1 focus:ring-[#00b4d8] ${fieldErrors.phone ? "border-red-400/60" : "border-white/10"}`}
                />
                {fieldErrors.phone && <p className="mt-1 text-[11px] text-red-400">{fieldErrors.phone}</p>}
              </div>

              {/* LINE ID */}
              <div>
                <label className="mb-1 block text-xs font-medium text-white/70">LINE ID</label>
                <input
                  type="text"
                  value={lineId}
                  onChange={(e) => { setLineId(e.target.value); setFieldErrors((p) => ({ ...p, lineId: "" })); }}
                  onBlur={() => { const err = validateLineId(lineId); setFieldErrors((p) => ({ ...p, lineId: err })); }}
                  placeholder="例如 gary_travel"
                  className={`w-full rounded-lg border bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-[#00b4d8] focus:ring-1 focus:ring-[#00b4d8] ${fieldErrors.lineId ? "border-red-400/60" : "border-white/10"}`}
                />
                {fieldErrors.lineId && <p className="mt-1 text-[11px] text-red-400">{fieldErrors.lineId}</p>}
              </div>

              {/* 信箱 */}
              <div>
                <label className="mb-1 block text-xs font-medium text-white/70">信箱</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: "" })); }}
                  onBlur={() => { const err = validateEmail(email); setFieldErrors((p) => ({ ...p, email: err })); }}
                  placeholder="例如 example@mail.com"
                  className={`w-full rounded-lg border bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:border-[#00b4d8] focus:ring-1 focus:ring-[#00b4d8] ${fieldErrors.email ? "border-red-400/60" : "border-white/10"}`}
                />
                {fieldErrors.email && <p className="mt-1 text-[11px] text-red-400">{fieldErrors.email}</p>}
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
