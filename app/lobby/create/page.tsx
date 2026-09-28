"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const gameTypes = [
  ["lobby", "🎮", "دردشة"],
  ["who-am-i", "🕵️", "من أنا؟"],
  ["ludo", "🎲", "لودو"],
  ["snakes", "🐍", "سلم وثعبان"],
  ["spy", "🕶️", "الجاسوس"],
  ["quiz", "⚡", "تحديات"],
];

export default function CreateRoomPage() {
  const supabase = createClient();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [gameType, setGameType] = useState("lobby");
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .insert({ owner_id: user.id, name: name.trim(), description: description.trim(), game_type: gameType, max_players: maxPlayers })
      .select("id")
      .single();

    if (roomError || !room) {
      setError(roomError?.message ?? "تعذر إنشاء الغرفة");
      setLoading(false);
      return;
    }

    const { error: memberError } = await supabase
      .from("room_members")
      .insert({ room_id: room.id, user_id: user.id, role: "owner" });

    if (memberError) {
      await supabase.from("rooms").delete().eq("id", room.id);
      setError(memberError.message);
      setLoading(false);
      return;
    }

    router.push(`/rooms/${room.id}`);
  }

  return (
    <main className="min-h-screen p-5">
      <div className="mx-auto max-w-xl">
        <Link href="/lobby" className="text-sm text-white/60">← الرجوع للغرف</Link>
        <div className="card mt-6">
          <h1 className="text-3xl font-black">إنشاء غرفة 🎮</h1>
          <p className="mt-2 text-sm text-white/50">اعمل غرفة وابدأ اللعب مع أصحابك.</p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <input className="input" placeholder="اسم الغرفة" value={name} onChange={e => setName(e.target.value)} minLength={2} maxLength={60} required />
            <textarea className="input min-h-28 resize-none" placeholder="وصف اختياري" value={description} onChange={e => setDescription(e.target.value)} maxLength={300} />

            <div>
              <label className="mb-2 block text-sm text-white/60">اللعبة</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {gameTypes.map(([value, emoji, label]) => (
                  <button type="button" key={value} onClick={() => setGameType(value)} className={`rounded-2xl border px-3 py-3 text-sm font-bold ${gameType === value ? "border-violet-400/60 bg-violet-500/20" : "border-white/10 bg-white/5"}`}>
                    {emoji} {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/60">عدد اللاعبين: {maxPlayers}</label>
              <input type="range" min="2" max="16" value={maxPlayers} onChange={e => setMaxPlayers(Number(e.target.value))} className="w-full" />
            </div>

            {error && <div className="rounded-2xl bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
            <button disabled={loading} className="w-full rounded-2xl bg-violet-600 px-5 py-3 font-black hover:bg-violet-500 disabled:opacity-50">
              {loading ? "جارٍ إنشاء الغرفة..." : "إنشاء الغرفة"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
