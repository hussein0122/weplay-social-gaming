"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Room = { id: string; name: string; game_type: string; max_players: number; status: string };
type Profile = { display_name: string; username: string | null; level: number; xp: number; coins: number };
const labels: Record<string,string> = { lobby:"دردشة", "who-am-i":"من أنا؟", ludo:"لودو", snakes:"سلم وثعبان", spy:"الجاسوس", quiz:"تحديات" };

export default function LobbyPage() {
  const supabase = createClient();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const [{ data: p, error: pe }, { data: r, error: re }] = await Promise.all([
      supabase.from("profiles").select("display_name,username,level,xp,coins").eq("id", user.id).single(),
      supabase.from("rooms").select("id,name,game_type,max_players,status").eq("is_public", true).eq("status", "waiting").order("created_at", { ascending: false }).limit(50),
    ]);
    if (pe) setError(pe.message);
    if (re) setError(re.message);
    setProfile(p);
    setRooms(r ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    const channel = supabase.channel("public-rooms")
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, []);

  if (loading) return <main className="min-h-screen grid place-items-center text-white/50">جارٍ تحميل اللوبي...</main>;

  return (
    <main className="min-h-screen p-5 pb-24">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <div><p className="text-sm text-white/50">أهلاً بيك 👋</p><h1 className="text-2xl font-black">{profile?.display_name ?? "لاعب"}</h1></div>
        <div className="flex items-center gap-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm">LV.{profile?.level ?? 1} · 🪙 {profile?.coins ?? 0}</div>
          <Link href="/lobby/create" className="rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-black">+ غرفة</Link>
        </div>
      </header>
      {error && <div className="mx-auto mt-5 max-w-6xl rounded-2xl bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
      <section className="mx-auto mt-8 max-w-6xl">
        <div className="mb-4"><h2 className="text-xl font-black">الغرف المفتوحة</h2><p className="text-sm text-white/50">ادخل غرفة وابدأ اللعب مع ناس حقيقيين.</p></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map(room => <Link key={room.id} href={`/rooms/${room.id}`} className="card block transition hover:-translate-y-1 hover:border-violet-400/30"><div className="text-3xl">🎮</div><h3 className="mt-3 font-black">{room.name}</h3><p className="mt-1 text-sm text-white/50">{labels[room.game_type] ?? room.game_type} · حتى {room.max_players} لاعبين</p></Link>)}
          {!rooms.length && <div className="card text-white/60">مفيش غرف مفتوحة دلوقتي. اعمل أول غرفة من زر + غرفة.</div>}
        </div>
      </section>
    </main>
  );
}
