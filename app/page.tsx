import Link from "next/link";
import { Gamepad2, Users, MessageCircle, Mic2, Trophy, ShieldCheck } from "lucide-react";

const games=[["من أنا؟","🕵️","خمّن الشخصية قبل الوقت ما يخلص."],["لودو","🎲","لعبة جماعية تنافسية مع أصحابك."],["سلم وثعبان","🐍","سباق سريع مليان مفاجآت."],["الجاسوس","🕶️","اكتشف الجاسوس من بين اللاعبين."],["تحديات","⚡","أسئلة وتحديات قصيرة وسريعة."]];

export default function Home(){
 return <main className="min-h-screen">
  <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
   <div className="flex items-center gap-3 font-black"><Gamepad2 className="text-violet-400"/>WePlay Social</div>
   <Link href="/login" className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold hover:bg-white/10">دخول / إنشاء حساب</Link>
  </header>
  <section className="mx-auto max-w-6xl px-5 pb-16 pt-16 text-center">
   <div className="mx-auto max-w-3xl">
    <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-4 py-2 text-sm text-violet-200">منصة ألعاب اجتماعية متعددة اللاعبين</span>
    <h1 className="mt-7 text-5xl font-black tracking-tight sm:text-7xl">العب. اتعرف. استمتع.</h1>
    <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/60">غرف، أصدقاء، رسائل، صوت، ألعاب جماعية وتقدّم حقيقي — في تجربة واحدة.</p>
    <div className="mt-8 flex justify-center gap-3"><Link href="/login" className="rounded-2xl bg-violet-600 px-6 py-3 font-black hover:bg-violet-500">ابدأ الآن</Link><Link href="/lobby" className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 font-bold hover:bg-white/10">استكشف الغرف</Link></div>
   </div>
   <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{games.map(([name,emoji,desc])=><div key={name} className="card text-right"><div className="text-4xl">{emoji}</div><h3 className="mt-4 font-black">{name}</h3><p className="mt-2 text-sm leading-6 text-white/50">{desc}</p></div>)}</div>
   <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {[[Users,"الأصدقاء","طلبات صداقة وحالة اللاعبين."],[MessageCircle,"الدردشة","رسائل خاصة ورسائل داخل الغرف."],[Mic2,"الغرف الصوتية","بنية جاهزة لصوت حي داخل الغرف."],[Trophy,"التقدّم","XP ومستويات ومكافآت."],[ShieldCheck,"أمان","RLS وصلاحيات على مستوى قاعدة البيانات."],[Gamepad2,"Realtime","حالة الغرف والألعاب للتحديث الفوري."]].map(([Icon,title,desc])=>{const C=Icon as typeof Users;return <div key={String(title)} className="card text-right"><C className="text-violet-400"/><h3 className="mt-3 font-black">{String(title)}</h3><p className="mt-1 text-sm text-white/50">{String(desc)}</p></div>})}
   </div>
  </section>
 </main>
}
