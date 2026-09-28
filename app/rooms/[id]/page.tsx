"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Profile = { id: string; display_name: string; username: string | null; level: number; coins: number };
type Member = { user_id: string; role: "owner" | "player"; profiles: Profile | null };
type Room = { id: string; name: string; description: string; game_type: string; max_players: number; status: string; owner_id: string };

const labels: Record<string, string> = { lobby: "دردشة", "who-am-i": "من أنا؟", ludo: "لودو", snakes: "سلم وثعبان", spy: "الجاسوس", quiz: "تحديات" };

export default function RoomPage() {
  const supabase = createClient();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const roomId = params.id;
  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<Array<{ id: string; body: string; sender_id: string; created_at: string; profile?: Profile | null }>>([]);
  const [body, setBody] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    setUserId(user.id);

    const { data: r, error: roomError } = await supabase.from("rooms").select("id,name,description,game_type,max_players,status,owner_id").eq("id", roomId).single();
    if (roomError || !r) { setError("الغرفة غير موجودة أو لم تعد متاحة."); setBusy(false); return; }
    setRoom(r);

    const { data: membership } = await supabase.from("room_members").select("room_id,user_id,role").eq("room_id", roomId).eq("user_id", user.id).maybeSingle();
    if (!membership) {
      const { data: existing } = await supabase.from("room_members").select("user_id").eq("room_id", roomId);
      if ((existing?.length ?? 0) >= r.max_players) { setError("الغرفة مكتملة."); setBusy(false); return; }
      const { error: joinError } = await supabase.from("room_members").insert({ room_id: roomId, user_id: user.id, role: "player" });
      if (joinError) { setError(joinError.message); setBusy(false); return; }
    }

    const [{ data: ms }, { data: msgs }] = await Promise.all([
      supabase.from("room_members").select("user_id,role,profiles(id,display_name,username,level,coins)").eq("room_id", roomId).order("joined_at"),
      supabase.from("messages").select("id,body,sender_id,created_at,profiles(id,display_name,username,level,coins)").eq("room_id", roomId).order("created_at").limit(100),
    ]);
    setMembers((ms ?? []) as unknown as Member[]);
    setMessages((msgs ?? []).map((m: any) => ({ ...m, profile: m.profiles })) as any);
    setBusy(false);
  }

  useEffect(() => { load(); }, [roomId]);

  useEffect(() => {
    if (!roomId) return;
    const channel = supabase.channel(`room-${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_members", filter: `room_id=eq.${roomId}` }, load)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` }, async (payload) => {
        const m = payload.new as any;
        const { data: p } = await supabase.from("profiles").select("id,display_name,username,level,coins").eq("id", m.sender_id).single();
        setMessages(prev => prev.some(x => x.id === m.id) ? prev : [...prev, { ...m, profile: p }]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text || !userId) return;
    setBody("");
    const { error: sendError } = await supabase.from("messages").insert({ sender_id: userId, room_id: roomId, body: text });
    if (sendError) setError(sendError.message);
  }

  async function leave() {
    if (!userId) return;
    await supabase.from("room_members").delete().eq("room_id", roomId).eq("user_id", userId);
    router.push("/lobby");
  }

  if (busy) return <main className="min-h-screen grid place-items-center p-6 text-white/60">جارٍ فتح الغرفة...</main>;
  if (error && !room) return <main className="min-h-screen grid place-items-center p-6"><div className="card text-center"><p>{error}</p><Link href="/lobby" className="mt-4 inline-block text-violet-300">العودة</Link></div></main>;

  return (
    <main className="min-h-screen p-5 pb-10">
      <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1fr_320px]">
        <section className="card min-h-[75vh] flex flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
            <div><Link href="/lobby" className="text-xs text-white/50">← الغرف</Link><h1 className="mt-2 text-2xl font-black">{room?.name}</h1><p className="text-sm text-white/50">{labels[room?.game_type ?? ""] ?? room?.game_type} · {room?.description}</p></div>
            <button onClick={leave} className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">خروج</button>
          </div>

          <div className="flex-1 overflow-y-auto py-5 space-y-3">
            {messages.length === 0 && <div className="py-20 text-center text-sm text-white/40">ابدأ أول رسالة في الغرفة 👋</div>}
            {messages.map(m => <div key={m.id} className={`flex ${m.sender_id === userId ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-2xl px-4 py-3 ${m.sender_id === userId ? "bg-violet-600" : "bg-white/10"}`}><div className="mb-1 text-xs font-bold opacity-70">{m.profile?.display_name ?? "لاعب"}</div><div>{m.body}</div></div></div>)}
          </div>

          <form onSubmit={sendMessage} className="flex gap-2 border-t border-white/10 pt-4">
            <input className="input" value={body} onChange={e => setBody(e.target.value)} placeholder="اكتب رسالة..." maxLength={2000} />
            <button className="rounded-2xl bg-violet-600 px-5 font-black">إرسال</button>
          </form>
        </section>

        <aside className="card h-fit">
          <div className="flex items-center justify-between"><h2 className="font-black">اللاعبين</h2><span className="text-xs text-white/40">{members.length}/{room?.max_players}</span></div>
          <div className="mt-4 space-y-2">
            {members.map(m => <div key={m.user_id} className="flex items-center gap-3 rounded-2xl bg-white/5 p-3"><div className="grid h-10 w-10 place-items-center rounded-full bg-violet-500/20">👤</div><div className="min-w-0"><div className="truncate font-bold">{m.profiles?.display_name ?? "لاعب"}</div><div className="text-xs text-white/40">@{m.profiles?.username ?? "player"} · LV.{m.profiles?.level ?? 1}</div></div>{m.role === "owner" && <span className="mr-auto text-xs text-amber-300">👑</span>}</div>)}
          </div>
          <div className="mt-5 rounded-2xl bg-violet-500/10 p-4 text-sm text-white/70">🎮 اللعبة: <b className="text-white">{labels[room?.game_type ?? ""] ?? room?.game_type}</b><br/>اللعب الجماعي الحقيقي هنفعّله على نفس الغرفة.</div>
        </aside>
      </div>
    </main>
  );
}
