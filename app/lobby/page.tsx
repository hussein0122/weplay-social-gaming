import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function LobbyPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;

  if (!userId) {
    return (
      <main className="min-h-screen grid place-items-center p-6">
        <div className="card text-center">
          <h1 className="text-2xl font-black">سجّل دخولك أولاً</h1>
          <Link href="/login" className="mt-4 inline-block rounded-2xl bg-violet-600 px-5 py-3 font-bold">تسجيل الدخول</Link>
        </div>
      </main>
    );
  }

  const [{ data: profile }, { data: rooms }] = await Promise.all([
    supabase.from("profiles").select("display_name,username,level,xp,coins").eq("id", userId).single(),
    supabase.from("rooms").select("id,name,game_type,max_players,status").eq("is_public", true).eq("status", "waiting").order("created_at", { ascending: false }).limit(20),
  ]);

  return (
    <main className="min-h-screen p-5 pb-24">
      <header className="mx-auto flex max-w-6xl items-center justify-between">
        <div>
          <p className="text-sm text-white/50">أهلاً بيك 👋</p>
          <h1 className="text-2xl font-black">{profile?.display_name ?? "لاعب"}</h1>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm">
          المستوى {profile?.level ?? 1} · 🪙 {profile?.coins ?? 0}
        </div>
      </header>

      <section className="mx-auto mt-8 max-w-6xl">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-black">الغرف المفتوحة</h2>
            <p className="text-sm text-white/50">ادخل غرفة وابدأ اللعب مع ناس حقيقيين.</p>
          </div>
          <Link href="/" className="text-sm text-violet-300">الرئيسية</Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(rooms ?? []).map(room => (
            <Link key={room.id} href={`/rooms/${room.id}`} className="card block transition hover:-translate-y-1 hover:border-violet-400/30">
              <div className="text-3xl">🎮</div>
              <h3 className="mt-3 font-black">{room.name}</h3>
              <p className="mt-1 text-sm text-white/50">{room.game_type} · حتى {room.max_players} لاعبين</p>
            </Link>
          ))}
          {!rooms?.length && <div className="card text-white/60">مفيش غرف مفتوحة دلوقتي. أول غرفة هنضيفها من داخل النظام هتظهر هنا.</div>}
        </div>
      </section>
    </main>
  );
}
