"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const labels: Record<string,string> = { ludo:"لودو", snakes:"سلم وثعبان", "who-am-i":"من أنا؟", spy:"الجاسوس", quiz:"تحديات", lobby:"دردشة" };
const snakes: Record<number,number> = {16:6,27:1,38:9,48:26,62:19,70:31,89:68,95:75,99:80};
const ladders: Record<number,number> = {3:22,5:8,11:26,20:29,36:44,51:67,61:79,71:92};

export default function GamePage(){
 const supabase=createClient(); const params=useParams<{id:string}>(); const router=useRouter();
 const [room,setRoom]=useState<any>(null); const [session,setSession]=useState<any>(null); const [players,setPlayers]=useState<any[]>([]);
 const [me,setMe]=useState<any>(null); const [loading,setLoading]=useState(true); const [message,setMessage]=useState(""); const [lastRoll,setLastRoll]=useState(0);

 async function load(){
  const {data:{user}}=await supabase.auth.getUser(); if(!user){router.push("/login");return}
  const {data:r}=await supabase.from("rooms").select("id,name,game_type,max_players,owner_id").eq("id",params.id).single();
  if(!r){setMessage("الغرفة غير موجودة");setLoading(false);return} setRoom(r);
  let {data:s}=await supabase.from("game_sessions").select("*").eq("room_id",params.id).order("created_at",{ascending:false}).limit(1).maybeSingle();
  if(!s && r.owner_id===user.id){const created=await supabase.from("game_sessions").insert({room_id:params.id,game_type:r.game_type,status:"playing",state:{started:true}}).select().single();s=created.data}
  setSession(s);
  if(s){
   let {data:p}=await supabase.from("game_players").select("session_id,user_id,seat,score,state,profiles(display_name,username)").eq("session_id",s.id).order("seat");
   if(!(p||[]).some((x:any)=>x.user_id===user.id)){await supabase.from("game_players").insert({session_id:s.id,user_id:user.id,seat:(p?.length||0)+1,state:{position:0}});({data:p}=await supabase.from("game_players").select("session_id,user_id,seat,score,state,profiles(display_name,username)").eq("session_id",s.id).order("seat"))}
   setPlayers(p||[]);setMe((p||[]).find((x:any)=>x.user_id===user.id)||null);
  }
  setLoading(false);
 }
 useEffect(()=>{void load();const c=supabase.channel("game-"+params.id).on("postgres_changes",{event:"*",schema:"public",table:"game_players"},()=>void load()).on("postgres_changes",{event:"*",schema:"public",table:"game_sessions"},()=>void load()).subscribe();return()=>{void supabase.removeChannel(c)}},[params.id]);

 async function rollDice(){
  if(!session)return;
  const {data,error}=await supabase.rpc("roll_board_game",{p_session:session.id});
  setLastRoll(data?.roll||0);
  setMessage(error?error.message:("رميت "+data.roll+" ووصلت للمربع "+data.to+" 🎲"));
 }
 async function revealSpy(){
  if(!me||!session||me.state?.role)return;
  const hasSpy=players.some((p:any)=>p.state?.role==="spy");
  const role=hasSpy?"citizen":"spy";
  const {error}=await supabase.from("game_players").update({state:{...(me.state||{}),role}}).eq("session_id",session.id).eq("user_id",me.user_id);
  setMessage(error?error.message:"تم كشف دورك.");
 }

 if(loading)return <main className="min-h-screen grid place-items-center text-white/50">جارٍ تجهيز اللعبة...</main>;
 const type=room?.game_type;
 return <main className="min-h-screen p-5"><div className="mx-auto max-w-5xl"><Link href={"/rooms/"+params.id} className="text-sm text-white/50">← الغرفة</Link><section className="card mt-5">
 <div className="flex items-center justify-between"><div><div className="text-sm text-white/40">اللعبة</div><h1 className="text-3xl font-black">{labels[type]||type}</h1><p className="text-white/50">{room?.name}</p></div><span className="rounded-2xl bg-white/5 px-4 py-2 text-sm">👥 {players.length}</span></div>
 {(type==="ludo"||type==="snakes")&&<div className="mt-8"><div className="mx-auto grid max-w-xl grid-cols-10 gap-1 rounded-3xl bg-white/5 p-3">{Array.from({length:100},(_,i)=>{const n=i+1;const p=players.find(x=>x.state?.position===n);return <div key={n} className={"aspect-square grid place-items-center rounded-lg text-xs "+(p?"bg-violet-500/60":"bg-white/5")}>{p?"👤":n}</div>})}</div><div className="mt-6 flex justify-center gap-3"><button onClick={()=>void rollDice()} className="rounded-2xl bg-violet-600 px-6 py-3 font-black">🎲 ارمي النرد</button><div className="rounded-2xl bg-white/5 px-5 py-3">آخر رمية: {lastRoll||"—"}</div></div></div>}
 {type==="spy"&&<div className="mt-10 text-center"><div className="text-7xl">{me?.state?.role?"🕵️":"❓"}</div><h2 className="mt-5 text-2xl font-black">{me?.state?.role?(me.state.role==="spy"?"أنت الجاسوس":"أنت مواطن"):"دورك مخفي"}</h2><button disabled={!!me?.state?.role} onClick={()=>void revealSpy()} className="mt-5 rounded-2xl bg-violet-600 px-6 py-3 font-black disabled:opacity-50">{me?.state?.role?"تم كشف الدور":"كشف دوري"}</button></div>}
 {type==="who-am-i"&&<div className="mt-10 text-center"><div className="text-7xl">🤔</div><h2 className="mt-4 text-2xl font-black">من أنا؟</h2><p className="mx-auto mt-3 max-w-xl text-white/50">جلسة حقيقية متعددة اللاعبين جاهزة، مع مزامنة اللاعبين. نضيف بنك الشخصيات والجولات فوق نفس المحرك.</p></div>}
 {type==="quiz"&&<div className="mt-10 text-center"><div className="text-7xl">⚡</div><h2 className="mt-4 text-2xl font-black">تحديات</h2><p className="mt-3 text-white/50">محرك الجلسة الجماعية جاهز لإضافة بنك الأسئلة والجولات.</p></div>}
 {message&&<div className="mt-5 rounded-2xl bg-violet-500/10 p-3 text-center text-sm">{message}</div>}
 <div className="mt-8 border-t border-white/10 pt-5"><h3 className="font-black">اللاعبين</h3><div className="mt-3 flex flex-wrap gap-2">{players.map(p=><div key={p.user_id} className="rounded-2xl bg-white/5 px-4 py-2 text-sm">{p.profiles?.display_name||"لاعب"} {p.state?.position?"· "+p.state.position:""} {p.state?.role?"· "+(p.state.role==="spy"?"🕵️":"🧑"):""}</div>)}</div></div>
 </section></div></main>;
}
