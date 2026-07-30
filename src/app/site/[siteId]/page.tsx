"use client"

import { useParams } from 'next/navigation'
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase'
import { doc } from 'firebase/firestore'
import { Loader2, ShoppingCart, CheckCircle2, Star, ShieldCheck, ArrowRight, LayoutTemplate, Zap, Cpu, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Image from 'next/image'

export default function PublicSitePage() {
  const params = useParams()
  const siteId = params.siteId as string
  const db = useFirestore()

  const siteRef = useMemoFirebase(() => (db ? doc(db, 'user_sites', siteId) : null), [db, siteId]);
  const { data: site, isLoading } = useDoc(siteRef);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="flex flex-col items-center gap-6">
          <div className="relative h-20 w-20">
            <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-t-primary rounded-full animate-spin" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-primary animate-pulse">Sincronizando Realidad...</p>
        </div>
      </div>
    );
  }

  if (!site) {
    return <div className="min-h-screen flex items-center justify-center font-black uppercase text-slate-800 tracking-widest">ERROR: NODE_NOT_FOUND</div>;
  }

  const content = site.content || {};
  const hero = content.hero || {};
  const headline = hero.headline || 'Sync Direct';
  const subheadline = hero.subheadline || 'Oferta Especial';
  const ctaText = hero.ctaText || 'Adquirir Ahora';
  const sections = content.sections || [];
  const footerMessage = content.footerMessage || '';
  const checkoutUrl = `/checkout/${site.productId}?ref=${site.userId}`;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-body selection:bg-primary/30 overflow-x-hidden">
      {/* NAVEGACIÓN FUTURISTA */}
      <nav className="h-20 flex items-center justify-between px-6 md:px-12 border-b border-white/5 bg-black/40 backdrop-blur-2xl sticky top-0 z-[100]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center text-slate-950 shadow-[0_0_20px_rgba(255,153,0,0.5)] rotate-3">
            <Zap className="h-6 w-6 fill-current" />
          </div>
          <span className="font-headline font-black text-xl tracking-tighter uppercase italic">Sync <span className="text-primary">Direct</span></span>
        </div>
        <Button asChild className="rounded-full bg-white text-slate-950 hover:bg-primary hover:text-white transition-all font-black text-[10px] uppercase tracking-widest px-8 h-12 shadow-2xl border-none">
          <Link href={checkoutUrl}>ADQUIRIR ACCESO</Link>
        </Button>
      </nav>

      {/* HERO SECTION - CYBER IMPACT */}
      <section className="relative py-32 md:py-56 px-6 overflow-hidden">
        {/* Background FX */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(255,153,0,0.08),transparent_70%)] pointer-events-none" />
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-primary/5 blur-[120px] rounded-full" />
        
        <div className="max-w-6xl mx-auto text-center space-y-16 relative z-10">
          <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-white/5 border border-white/10 text-primary text-[10px] font-black uppercase tracking-[0.4em] shadow-2xl backdrop-blur-md">
            <Star className="h-4 w-4 fill-primary" /> Sistema Verificado por Sync Network
          </div>
          
          <div className="space-y-6">
            <h1 className="text-5xl md:text-9xl font-headline font-black tracking-tighter leading-[0.9] text-white uppercase italic">
              {headline}
            </h1>
            <div className="h-1 w-40 bg-primary mx-auto rounded-full" />
          </div>

          <p className="max-w-3xl mx-auto text-lg md:text-2xl text-slate-400 font-medium leading-relaxed">
            {subheadline}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-10">
            <Button asChild size="lg" className="w-full sm:w-auto h-24 px-20 bg-primary hover:bg-primary/80 text-white font-black text-xl rounded-full shadow-[0_30px_100px_-10px_rgba(255,153,0,0.4)] transition-all hover:scale-105 active:scale-95 group border-none">
              <Link href={checkoutUrl}>
                {hero.ctaText?.toUpperCase() || 'ADQUIRIR AHORA'} <ArrowRight className="ml-4 h-8 w-8 transition-transform group-hover:translate-x-4" />
              </Link>
            </Button>
          </div>
          
          <div className="pt-24 grid grid-cols-2 md:grid-cols-4 gap-10 opacity-30">
             <div className="flex flex-col items-center gap-4">
                <ShieldCheck className="h-8 w-8 text-primary" />
                <span className="font-black text-[10px] uppercase tracking-widest">Cifrado Militar</span>
             </div>
             <div className="flex flex-col items-center gap-4">
                <Globe className="h-8 w-8 text-primary" />
                <span className="font-black text-[10px] uppercase tracking-widest">Alcance Global</span>
             </div>
             <div className="flex flex-col items-center gap-4">
                <Cpu className="h-8 w-8 text-primary" />
                <span className="font-black text-[10px] uppercase tracking-widest">IA Optimizada</span>
             </div>
             <div className="flex flex-col items-center gap-4">
                <CheckCircle2 className="h-8 w-8 text-primary" />
                <span className="font-black text-[10px] uppercase tracking-widest">Garantía Real</span>
             </div>
          </div>
        </div>
      </section>

      {/* CONTENT SECTIONS - TECH GRID */}
      <section className="py-40 bg-[#07070c] relative">
        <div className="max-w-6xl mx-auto px-6 space-y-56">
          {sections.map((section: any, i: number) => (
            <div key={i} className={`flex flex-col ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} gap-20 md:gap-40 items-center`}>
              <div className="flex-1 space-y-10">
                <div className="inline-block p-4 rounded-3xl bg-primary/10 border border-primary/20 text-primary shadow-2xl rotate-6">
                  <span className="font-black text-3xl italic">0{i + 1}</span>
                </div>
                <div className="space-y-8">
                  <h3 className="text-4xl md:text-7xl font-headline font-black text-white leading-[1] uppercase italic tracking-tighter">{section.title}</h3>
                  <p className="text-xl md:text-2xl text-slate-400 font-medium leading-relaxed border-l-4 border-primary pl-8">
                    {section.content}
                  </p>
                </div>
              </div>
              <div className="flex-1 w-full aspect-square bg-slate-900/50 rounded-[4rem] border border-white/5 p-12 flex flex-col justify-center gap-10 relative overflow-hidden group shadow-3xl">
                 <div className="absolute top-0 right-0 p-16 opacity-5 group-hover:opacity-10 transition-opacity"><LayoutTemplate className="h-64 w-64" /></div>
                 <div className="space-y-6 relative z-10">
                   <div className="h-2 w-48 bg-primary rounded-full animate-pulse" />
                   <div className="h-2 w-full bg-white/5 rounded-full" />
                   <div className="h-2 w-full bg-white/5 rounded-full" />
                   <div className="h-2 w-3/4 bg-white/5 rounded-full" />
                 </div>
                 <div className="grid grid-cols-2 gap-8 relative z-10">
                   <div className="h-32 rounded-3xl bg-primary/5 border border-primary/10 shadow-inner group-hover:border-primary/30 transition-colors" />
                   <div className="h-32 rounded-3xl bg-white/5 border border-white/5" />
                 </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CALL TO ACTION - BLACK HOLE DESIGN */}
      <section className="py-40 px-6">
        <div className="max-w-6xl mx-auto rounded-[6rem] bg-gradient-to-br from-slate-900 to-black p-16 md:p-32 text-center space-y-16 relative overflow-hidden shadow-[0_0_150px_rgba(255,153,0,0.1)] border border-white/5">
          <div className="absolute -top-20 -right-20 p-20 opacity-5 rotate-45"><Zap className="h-[500px] w-[500px] text-primary" /></div>
          
          <div className="relative z-10 space-y-12">
            <h2 className="text-5xl md:text-9xl font-headline font-black text-white leading-none uppercase italic tracking-tighter">
              El Futuro <br/> <span className="text-primary underline decoration-primary/50 underline-offset-[20px]">Comienza Hoy</span>
            </h2>
            <p className="text-slate-400 text-xl md:text-3xl font-medium max-w-4xl mx-auto leading-relaxed italic">
              "{footerMessage}"
            </p>
            <div className="pt-10">
              <Button asChild size="lg" className="h-28 px-24 bg-white text-slate-950 hover:bg-primary hover:text-white font-black text-3xl rounded-full shadow-[0_40px_100px_rgba(255,255,255,0.1)] transition-all hover:scale-110 active:scale-95 border-none">
                <Link href={checkoutUrl}>DESPLEGAR ACCESO</Link>
              </Button>
            </div>
            <p className="text-[12px] font-black text-slate-600 uppercase tracking-[0.6em]">Sync Connect Infrastructure • Neural Sales Core</p>
          </div>
        </div>
      </section>

      <footer className="py-20 px-6 border-t border-white/5 bg-black text-center space-y-10">
        <div className="flex items-center justify-center gap-4">
           <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center text-slate-950 font-black text-xl shadow-[0_0_30px_rgba(255,255,255,0.2)]">S</div>
           <p className="text-sm font-black uppercase text-white tracking-[0.5em]">Sync Connect Nicaragua</p>
        </div>
        <p className="text-[10px] font-bold uppercase text-slate-500 tracking-[0.3em]">© 2024 Global Education & Management Systems • Secure Node ID: {siteId.substring(0,8)}</p>
        <div className="flex items-center justify-center gap-6 text-[10px] font-black text-slate-700 uppercase">
          <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> 256-BIT ENCRYPTION</span>
          <span className="h-1 w-1 bg-slate-800 rounded-full" />
          <span className="flex items-center gap-2"><Zap className="h-4 w-4" /> QUANTUM SPEED DELIVERY</span>
        </div>
      </footer>
    </div>
  );
}