"use client";

import { useState } from "react";
import { submitInquiry } from "@/lib/supabase";

interface InquiryFormProps {
  tripId?: string;
  tripTitle: string;
}

export default function InquiryForm({ tripId, tripTitle }: InquiryFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(`我想了解「${tripTitle}」的詳細行程與報價`);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      await submitInquiry({
        trip_id: tripId,
        trip_title: tripTitle,
        customer_name: name,
        customer_phone: phone || undefined,
        customer_email: email || undefined,
        message: message || undefined,
        source: "FORM",
      });
      setSubmitted(true);
    } catch {
      alert("提交失敗，請稍後再試或直接透過 LINE 聯繫");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-6 text-center backdrop-blur-[12px]">
        <svg className="mx-auto mb-3 h-12 w-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-bold text-green-400">已收到您的諮詢！</h3>
        <p className="mt-2 text-sm text-white/70">蓋瑞會盡快與您聯繫，謝謝！</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-white/10 bg-[rgba(20,20,30,0.38)] p-6 backdrop-blur-[12px]">
      <h3 className="mb-4 text-lg font-bold text-white">線上諮詢表單</h3>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-white/80">
            姓名 <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="您的姓名"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-white/30 transition focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-white/80">電話</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0912-345-678"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-white/30 transition focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-white/80">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-white/30 transition focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-white/80">留言</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-white/30 transition focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="w-full rounded-lg bg-sky-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-sky-500 disabled:opacity-50"
        >
          {submitting ? "提交中..." : "送出諮詢"}
        </button>
      </div>
    </form>
  );
}
