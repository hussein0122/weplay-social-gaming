"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
      else window.location.href = "/lobby";
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName, username } },
      });
      if (error) setMessage(error.message);
      else setMessage("تم إنشاء الحساب. لو تأكيد البريد مفعّل، راجع بريدك ثم سجّل الدخول.");
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen px-5 py-10 flex items-center justify-center">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur-xl">
        <Link href="/" className="text-sm text-white/60">← الرئيسية</Link>
        <div className="mt-6 mb-7 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-violet-500/20 text-3xl">🎮</div>
          <h1 className="text-3xl font-black">WePlay Social</h1>
          <p className="mt-2 text-white/60">{mode === "login" ? "سجّل دخولك وابدأ اللعب" : "أنشئ حسابك وادخل عالم اللعب"}</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <>
              <input className="input" placeholder="اسم العرض" value={displayName} onChange={e => setDisplayName(e.target.value)} required />
              <input className="input" placeholder="اسم المستخدم" value={username} onChange={e => setUsername(e.target.value)} required />
            </>
          )}
          <input className="input" type="email" placeholder="البريد الإلكتروني" value={email} onChange={e => setEmail(e.target.value)} required />
          <input className="input" type="password" minLength={6} placeholder="كلمة المرور" value={password} onChange={e => setPassword(e.target.value)} required />
          {message && <div className="rounded-2xl bg-white/10 p-3 text-sm text-white/80">{message}</div>}
          <button className="w-full rounded-2xl bg-violet-600 px-5 py-3 font-bold transition hover:bg-violet-500 disabled:opacity-50" disabled={loading}>
            {loading ? "جارٍ التنفيذ..." : mode === "login" ? "دخول" : "إنشاء حساب"}
          </button>
        </form>

        <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }} className="mt-5 w-full text-sm text-violet-300 hover:text-violet-200">
          {mode === "login" ? "ليس لديك حساب؟ إنشاء حساب" : "لديك حساب بالفعل؟ تسجيل الدخول"}
        </button>
      </div>
    </main>
  );
}
