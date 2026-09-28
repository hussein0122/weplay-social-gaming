"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Profile = { id:string; username:string|null; display_name:string; level:number; status:string };
type Request = { id:string; sender_id:string; receiver_id:string; status:string; profiles?:Profile|null };

export default function FriendsPage() {
  const supabase = createClient();
  const [me,setMe]=useState<string|null>(null);
  const [friends,setFriends]=useState<Profile[]>([]);
  const [incoming,setIncoming]=useState<Request[]>([]);
  const [search,setSearch]=useState("");
  const [results,setResults]=useState<Profile[]>([]);
  const [msg,setMsg]=useState("");

  async function load(){
    const {data:{user}}=await supabase.auth.getUser();
    if(!user) return;
    setMe(user.id);
    const [{data:in},{data:out}] = await Promise.all([
      supabase.from("friend_requests").select("id,sender_id,receiver_id,status,profiles!friend_requests_sender_id_fkey(id,username,display_name,level,status)").eq("receiver_id",user.id).eq("status","pending"),
      supabase.from("friend_requests").select("id,sender_id,receiver_id,status,profiles!friend_requests_receiver_id_fkey(id,username,display_name,level,status)").eq("sender_id",user.id).eq("status","accepted")
    ]);
    setIncoming((in??[]) as unknown as Request[]);
    setFriends((out??[]).map((x:any)=>x.profiles).filter(Boolean));
  }
  useEffect(()=>{void load()},[]);

  async function find(){
    const q=search.trim();
    if(q.length<2){setResults([]);return}
    const {data}=await supabase.from("profiles").select("id,username,display_name,level,status").or(`username.ilike.%${q}%,display_name.ilike.%${q}%`).neq("id",me??"").limit(20);
    setResults(data??[]);
  }
  async function add(id:string){
    if(!me)return;
    const {error}=await supabase.from("friend_requests").insert({sender_id:me,receiver_id:id});
    setMsg(error ? (error.code==="23505" ? "الطلب موجود بالفعل." : error.message) : "تم إرسال طلب الصداقة ❤️");
    await load();
  }
  async function respond(id:string,accept:boolean){
    const {error}=await supabase.from("friend_requests").update({status:accept?"accepted":"rejected",responded_at:new Date().toISOString()}).eq("id",id);
    setMsg(error?.message??(accept?"تم قبول الطلب ❤️":"تم رفض الطلب"));
    await load();
  }

  return <main className="min-h-screen p-5"><div className="mx-auto max-w-5xl">
    <Link href="/lobby" className="text-sm text-white/50">← اللوبي</Link>
    <div className="mt-6 card"><h1 className="text-3xl font-black">الأصدقاء 👥</h1><p className="mt-2 text-white/50">دور على لاعبين وابعت لهم طلب صداقة.</p>
      <div className="mt-6 flex gap-2"><input className="input" value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==="Enter"&&void find()} placeholder="اسم اللاعب أو Username"/><button onClick={()=>void find()} className="rounded-2xl bg-violet-600 px-5 font-black">بحث</button></div>
      {msg&&<div className="mt-3 rounded-2xl bg-violet-500/10 p-3 text-sm text-violet-100">{msg}</div>}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">{results.map(p=><div key={p.id} className="rounded-2xl bg-white/5 p-4 flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-full bg-violet-500/20">👤</div><div className="min-w-0"><b>{p.display_name}</b><div className="text-xs text-white/40">@{p.username??"player"} · LV.{p.level}</div></div><button onClick={()=>void add(p.id)} className="mr-auto rounded-xl bg-white/10 px-3 py-2 text-xs">إضافة</button></div>)}</div>
    </div>
    <div className="mt-5 grid gap-5 md:grid-cols-2">
      <section className="card"><h2 className="font-black">طلبات الصداقة ({incoming.length})</h2><div className="mt-4 space-y-3">{incoming.length?incoming.map(r=><div key={r.id} className="rounded-2xl bg-white/5 p-3 flex items-center gap-3"><div><b>{r.profiles?.display_name??"لاعب"}</b><div className="text-xs text-white/40">@{r.profiles?.username??"player"}</div></div><div className="mr-auto flex gap-2"><button onClick={()=>void respond(r.id,true)} className="rounded-xl bg-violet-600 px-3 py-2 text-xs">قبول</button><button onClick={()=>void respond(r.id,false)} className="rounded-xl bg-white/10 px-3 py-2 text-xs">رفض</button></div></div>):<p className="mt-4 text-sm text-white/40">مفيش طلبات جديدة.</p>}</div></section>
      <section className="card"><h2 className="font-black">أصدقائي ({friends.length})</h2><div className="mt-4 space-y-3">{friends.length?friends.map(p=><div key={p.id} className="rounded-2xl bg-white/5 p-3 flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-full bg-violet-500/20">👤</div><div><b>{p.display_name}</b><div className="text-xs text-white/40">@{p.username??"player"} · LV.{p.level}</div></div><span className={`mr-auto text-xs ${p.status==="online"?"text-emerald-300":"text-white/30"}`}>● {p.status==="online"?"متصل":"غير متصل"}</span></div>):<p className="mt-4 text-sm text-white/40">لسه مفيش أصدقاء.</p>}</div></section>
    </div>
  </div></main>;
}
