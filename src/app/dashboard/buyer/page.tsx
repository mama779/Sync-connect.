
"use client"

import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { 
  ShoppingBag, 
  Loader2, 
  Calendar, 
  ShieldCheck, 
  Truck,
  Package,
  Clock,
  GraduationCap,
  PlayCircle,
  Trophy,
  Star,
  Zap,
  LayoutTemplate,
  ArrowRight,
  BookOpen,
  Award,
  Video
} from 'lucide-react'
import { useLanguage } from '@/components/language-context'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase'
import { collection, query, where, doc } from 'firebase/firestore'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export default function BuyerDashboard() {
  const { t } = useLanguage();
  const { user, isUserLoading } = useUser();
  const db = useFirestore();

  const buyerRef = useMemoFirebase(() => (db && user ? doc(db, 'buyers', user.uid) : null), [db, user]);
  const { data: profile, isLoading: profileLoading } = useDoc(buyerRef);

  const purchasesQuery = useMemoFirebase(() => (db && user ? query(collection(db, 'sales'), where('buyerId', '==', user.uid)) : null), [db, user]);
  const { data: purchases, isLoading: purchasesLoading } = useCollection(purchasesQuery);

  const productsQuery = useMemoFirebase(() => collection(db, 'products'), [db]);
  const { data: allProducts } = useCollection(productsQuery);

  if (isUserLoading || profileLoading) {
    return (
      <DashboardShell role="buyer">
        <div className="flex items-center justify-center min-h-[400px] bg-[#0a0a0f]">
          <div className="flex flex-col items-center gap-4">
             <Loader2 className="h-12 w-12 animate-spin text-primary opacity-30" />
             <p className="text-[10px] font-black uppercase text-slate-600 tracking-[0.5em]">Identificando Alumno...</p>
          </div>
        </div>
      </DashboardShell>
    )
  }

  const activePurchases = purchases?.filter(s => s.status === 'Completed') || [];

  return (
    <DashboardShell role="buyer">
      <div className="space-y-12 pb-20">
        {/* HEADER AREA DE MIEMBROS - FUTURISTA */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-10 bg-white/5 backdrop-blur-2xl p-12 rounded-[4rem] shadow-3xl border border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-16 opacity-5"><GraduationCap className="h-48 w-48 text-primary" /></div>
          
          <div className="flex items-center gap-8 relative z-10">
            <div className="h-28 w-28 bg-primary rounded-[2.5rem] flex items-center justify-center text-slate-950 shadow-[0_20px_60px_-10px_rgba(255,153,0,0.5)] rotate-3">
               <BookOpen className="h-14 w-14" />
            </div>
            <div className="space-y-3">
              <h1 className="text-5xl md:text-7xl font-headline font-black text-white leading-none uppercase italic tracking-tighter">
                Hola, <span className="text-primary">{profile?.firstName || 'Alumno'}</span>
              </h1>
              <p className="text-xl text-slate-400 font-medium max-w-xl leading-relaxed">Tu ecosistema de capacitación profesional y activos adquiridos.</p>
            </div>
          </div>
          
          <div className="flex gap-6 relative z-10">
             <div className="p-8 bg-slate-900/60 rounded-[2.5rem] text-center min-w-[160px] ring-1 ring-white/5">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Mis Cursos</p>
                <p className="text-5xl font-black text-white italic tracking-tighter">{activePurchases.length}</p>
             </div>
             <div className="p-8 bg-primary/10 rounded-[2.5rem] text-center min-w-[160px] ring-1 ring-primary/20">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">Estatus</p>
                <p className="text-2xl font-black text-white italic uppercase tracking-tighter">VIP</p>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-8 space-y-12">
             <div className="flex items-center justify-between px-4">
                <h3 className="text-2xl font-headline font-black text-white uppercase italic tracking-tight">Mi <span className="text-primary underline decoration-primary/30 underline-offset-8">Inventario</span></h3>
                <Badge variant="outline" className="px-5 py-2 rounded-full border-white/10 text-slate-500 font-black text-[9px] uppercase tracking-widest">{activePurchases.length} PRODUCTOS</Badge>
             </div>
             
             {activePurchases.length === 0 ? (
               <Card className="p-24 text-center border-dashed border-2 border-white/5 bg-white/5 rounded-[4rem] shadow-2xl">
                  <ShoppingBag className="h-20 w-20 text-slate-800 mx-auto mb-8" />
                  <h4 className="text-2xl font-black text-slate-400 uppercase tracking-tight">Sin adquisiciones activas</h4>
                  <p className="text-slate-500 text-sm font-medium mt-2 mb-12 max-w-xs mx-auto leading-relaxed">Explora nuestra infraestructura de activos para escalar tus habilidades hoy mismo.</p>
                  <Button asChild className="h-18 px-12 rounded-2xl bg-white text-slate-950 hover:bg-primary hover:text-white transition-all font-black text-sm uppercase tracking-widest shadow-3xl">
                    <Link href="/dashboard/buyer/products">EXPLORAR CATÁLOGO</Link>
                  </Button>
               </Card>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {activePurchases.map((sale) => {
                    const productData = allProducts?.find(p => p.id === sale.productId);
                    return (
                      <Card key={sale.id} className="border-none shadow-2xl hover:shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] transition-all duration-700 rounded-[3.5rem] bg-slate-900 overflow-hidden group ring-1 ring-white/5 hover:ring-primary/40">
                        <div className="relative h-56 w-full bg-black">
                           {productData?.imageUrl ? (
                             <img src={productData.imageUrl} className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-1000" alt="" />
                           ) : <div className="h-full w-full flex items-center justify-center"><Package className="h-14 w-14 text-white opacity-10" /></div>}
                           <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
                           <div className="absolute bottom-8 left-8 right-8">
                              <Badge className="bg-primary text-slate-950 border-none font-black text-[8px] uppercase tracking-widest px-4 py-1.5 rounded-full mb-4 shadow-2xl">PROPIEDAD VITALICIA</Badge>
                              <h4 className="text-2xl font-black text-white uppercase leading-tight line-clamp-2 tracking-tight">{sale.productName}</h4>
                           </div>
                        </div>
                        <CardContent className="p-10 space-y-8">
                           <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">
                              <span className="flex items-center gap-3"><PlayCircle className="h-4 w-4 text-primary" /> Clases Habilitadas</span>
                              <span className="text-green-500 font-bold">ACTIVO ✓</span>
                           </div>
                           <Button asChild className="w-full h-16 rounded-2xl bg-white text-slate-950 hover:bg-primary hover:text-white font-black text-xs uppercase tracking-widest shadow-2xl transition-all gap-4 active:scale-95">
                              <Link href="/dashboard/affiliate/academy">
                                ACCEDER AHORA <ArrowRight className="h-5 w-5" />
                              </Link>
                           </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
               </div>
             )}
          </div>

          <div className="lg:col-span-4 space-y-12">
             <Card className="border-none shadow-3xl rounded-[3.5rem] bg-primary text-slate-950 overflow-hidden p-2 relative">
                <div className="absolute top-0 right-0 p-12 opacity-10"><Award className="h-48 w-48" /></div>
                <div className="p-12 space-y-10 text-center bg-white/10 rounded-[3rem] backdrop-blur-sm relative z-10">
                   <div className="h-24 w-24 bg-slate-950 rounded-[2.5rem] flex items-center justify-center text-primary mx-auto shadow-2xl shadow-black/30">
                      <Trophy className="h-12 w-12 fill-current" />
                   </div>
                   <div className="space-y-3">
                      <h4 className="text-3xl font-headline font-black uppercase italic tracking-tighter leading-none">Diplomado Sync</h4>
                      <p className="text-slate-950/70 text-sm font-bold leading-relaxed uppercase tracking-widest">
                        Certifica el 100% de tus módulos para obtener tu credencial oficial.
                      </p>
                   </div>
                   <div className="pt-6 flex justify-center gap-1">
                      {[1,2,3,4,5].map(s => <Star key={s} className="h-5 w-5 fill-slate-950 text-slate-950" />)}
                   </div>
                </div>
             </Card>

             <Card className="border-none shadow-xl rounded-[3.5rem] bg-white/5 backdrop-blur-md p-10 space-y-10 ring-1 ring-white/10">
                <div className="flex items-center gap-6">
                   <div className="h-16 w-16 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-500 shadow-inner ring-1 ring-blue-500/20">
                      <ShieldCheck className="h-8 w-8" />
                   </div>
                   <div className="space-y-1">
                      <h5 className="font-black text-white text-sm uppercase tracking-tight">Soporte al Alumno</h5>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Asistencia Técnica</p>
                   </div>
                </div>
                <p className="text-sm text-slate-400 font-medium leading-relaxed italic border-l-2 border-blue-500/30 pl-6">
                  "Nuestro equipo de ingenieros de soporte está disponible 24/7 para garantizar que tu experiencia de aprendizaje sea ininterrumpida."
                </p>
                <Button variant="outline" className="w-full h-16 rounded-2xl border-white/10 text-white hover:bg-white/10 font-black text-[10px] uppercase tracking-[0.2em] shadow-xl">
                   SOLICITAR ASISTENCIA
                </Button>
             </Card>

             <div className="p-10 bg-slate-900/40 rounded-[3rem] border border-white/5 flex items-center gap-6 group cursor-pointer hover:bg-slate-900/60 transition-all">
                <div className="h-12 w-12 bg-white/5 rounded-xl flex items-center justify-center text-slate-500 group-hover:text-primary transition-colors">
                   <Video className="h-6 w-6" />
                </div>
                <div>
                   <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Tutorial de Sistema</p>
                   <p className="text-xs font-bold text-white group-hover:underline">¿Cómo funciona mi panel?</p>
                </div>
             </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
