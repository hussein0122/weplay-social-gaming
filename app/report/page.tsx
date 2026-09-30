"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function ReportForm() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [message, setMessage] = useState("");

  async function submit() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      reported_user_id: searchParams.get("user") || null,
      room_id: searchParams.get("room") || null,
      message_id: searchParams.get("message") || null,
      reason,
      details,
    });

    setMessage(error?.message || "تم إرسال البلاغ للمراجعة 🛡️");
  }

  return (
    <section className="card mx-auto mt-10 max-w-xl">
      <h1 className="text-2xl font-black">🛡️ إبلاغ</h1>
      <select
        className="input mt-5"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      >
        <option value="spam">إزعاج / Spam</option>
        <option value="harassment">تنمر أو إساءة</option>
        <option value="cheating">غش</option>
        <option value="inappropriate">محتوى غير مناسب</option>
        <option value="other">سبب آخر</option>
      </select>
      <textarea
        className="input mt-3 min-h-32"
        value={details}
        onChange={(event) => setDetails(event.target.value)}
        placeholder="التفاصيل..."
      />
      <button
        onClick={() => void submit()}
        className="mt-3 w-full rounded-2xl bg-red-600 py-3 font-black"
      >
        إرسال البلاغ
      </button>
      {message && (
        <p className="mt-3 text-center text-sm text-white/60">{message}</p>
      )}
    </section>
  );
}

function ReportFormFallback() {
  return (
    <section
      className="card mx-auto mt-10 max-w-xl animate-pulse"
      aria-label="جارٍ تحميل نموذج البلاغ"
    >
      <div className="h-8 w-24 rounded bg-white/10" />
      <div className="mt-5 h-12 rounded-2xl bg-white/10" />
      <div className="mt-3 h-32 rounded-2xl bg-white/10" />
      <div className="mt-3 h-12 rounded-2xl bg-white/10" />
    </section>
  );
}

export default function ReportPage() {
  return (
    <main className="min-h-screen p-5">
      <Suspense fallback={<ReportFormFallback />}>
        <ReportForm />
      </Suspense>
    </main>
  );
}
