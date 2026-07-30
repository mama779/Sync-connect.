
"use client"

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { 
  ShoppingBag, 
  Loader2, 
  Wallet, 
  Link as LinkIcon, 
  Copy, 
  Zap,
  Camera,
  Bell,
  CheckCircle2,
  Upload,
  ShieldCheck,
  PieChart,
  Target,
  ArrowUpRight,
  Video,
  Activity,
  Globe,
  Cpu,
  TrendingUp,
  Landmark,
  UserCircle
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
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc, updateDocumentNonBlocking, initializeFirebase } from '@/firebase'
import { collection, query, where, doc, orderBy, limit } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { useToast } from '@/hooks/use-toast'
import { getGoogleDriveDirectLink } from '@/lib/utils'
import { cn } from '@/lib/utils'

export default function AffiliateDashboard() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { user, isUserLoading: isAuthLoading } = useUser();
  const db = useFirestore();

  const [isMounted, setIsMounted] = useState(false);
  const [copiedAffiliate, setCopiedAffiliate] = useState(false);
  const [inviteAffiliateLink, setInviteAffiliateLink] = useState('');

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    if (isMounted && user?.uid) {
      const origin = window.location.origin;
      setInviteAffiliateLink(`${origin}/auth/register/affiliate?ref=${user.uid}`);
    }
  }, [isMounted, user]);

  const affiliateRef = useMemoFirebase(() => (db && user ? doc(db, 'affiliates', user.uid) : null), [db, user]);
  const { data: profile, isLoading: profileLoading } = useDoc(affiliateRef);

  const activeLiveRef = useMemoFirebase(() => db ? doc(db, 'site_config', 'active_live') : null, [db]);
  const { data: activeLive } = useDoc(activeLiveRef);

  const notificationsQuery = useMemoFirebase(() => {
    if(!db || !user) return null;
    return query(collection(db, 'notifications'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'), limit(3));
  }, [db, user]);
  const { data: notifications } = useCollection(notificationsQuery);

  const salesQuery = useMemoFirebase(() => (db && user ? query(collection(db, 'sales'), where('affiliateId', '==', user.uid), orderBy('saleDate', 'desc'), limit(10)) : null), [db, user]);
  const { data: sales, isLoading: salesLoading } = useCollection(salesQuery);

  if (!isMounted || isAuthLoading || profileLoading) return <div className="flex items-center justify-center min-h-screen bg-[#0a0a0f]"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>

  const handleCopy = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Enlace Copiado", description: "Enlace listo para su uso comercial." });
  };

  return (
    <DashboardShell role="affiliate">
      <div className="space-y-10 pb-20">
        {activeLive && activeLive.status === 'Active' && (
          <Card className="border-none bg-red-500/10 backdrop-blur-md shadow-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 rounded-[2.5rem] ring-1 ring-red-500/20 animate-pulse">
             <div className="flex items-center gap-6">
                <div className="h-16 w-16 bg-red-600 text-white rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.5)]">
                   <Video className="h-8 w-8" />
                </div>
                <div>
                   <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">Sesión Estratégica en Vivo</h3>
                   <p className="text-[10px] text-red-400 font-bold uppercase tracking-[0.3em] mt-1">Conexión prioritaria detectada</p>
                </div>
             </div>
             <Button asChild className="h-14 px-10 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl shadow-xl transition-all hover:scale-105 active:scale-95">
                <Link href="/dashboard/affiliate/academy/live">UNIRSE AHORA <ArrowUpRight className="ml-2 h-4 w-4" /></Link>
             </Button>
          </Card>
        )}

        {/* COMAND CENTER HEADER */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-stretch">
           {/* GREETING & PROFILE NODE */}
           <div className="xl:col-span-4 bg-white/5 backdrop-blur-2xl border border-white/10 p-10 md:p-12 rounded-[3.5rem] shadow-3xl relative overflow-hidden flex flex-col items-center justify-center gap-10">
              <div className="absolute top-0 right-0 p-10 opacity-5"><Cpu className="h-48 w-48 text-primary" /></div>
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                <div className="h-32 w-32 border-4 border-white/10 rounded-[2.5rem] bg-slate-900/90 flex items-center justify-center text-primary shadow-2xl relative overflow-hidden">
                  {profile?.photoUrl ? (
                    <Image 
                      src={getGoogleDriveDirectLink(profile.photoUrl)} 
                      alt="Profile" 
                      fill 
                      className="object-cover" 
                      unoptimized 
                    />
                  ) : (
                    <UserCircle className="h-18 w-18 opacity-80" />
                  )}
                </div>
              </div>
           </div>

           {/* FINANCIAL VAULT (LIQUIDACION) */}
           <div className="xl:col-span-8 bg-slate-900 border border-white/5 rounded-[3.5rem] overflow-hidden shadow-2xl relative flex flex-col justify-center p-12 group transition-all duration-500 hover:border-primary/20">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:rotate-12 transition-transform duration-1000"><Landmark className="h-56 w-56 text-primary" /></div>
              
              <div className="space-y-8 relative z-10">
                <div className="flex justify-between items-center">
                   <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Balance Liquidable</p>
                      <div className="flex items-center gap-2">
                         <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                         <span className="text-[9px] font-black text-green-500/60 uppercase tracking-widest">Sincronizado</span>
                      </div>
                   </div>
                   <div className="h-12 w-12 bg-white/5 rounded-2xl flex items-center justify-center text-slate-500 border border-white/5">
                      <Wallet className="h-6 w-6" />
                   </div>
                </div>

                <div className="space-y-2">
                  <h2 className="text-6xl md:text-7xl font-black text-white tracking-tighter italic drop-shadow-[0_10px_30px_rgba(255,153,0,0.1)]">
                    ${profile?.currentBalance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </h2>
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Moneda base: USD (Dólares Americanos)</p>
                </div>

                <div className="pt-8 border-t border-white/5 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-primary/10 rounded-xl flex items-center justify-center text-primary shadow-inner">
                         <ShieldCheck className="h-4 w-4" />
                      </div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Protocolo Sync Safe</span>
                   </div>
                   <Button variant="ghost" className="h-10 px-6 rounded-xl font-black text-[9px] uppercase tracking-widest text-primary hover:bg-primary/5 transition-all">
                      GESTIONAR PAGOS
                   </Button>
                </div>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
           {[
             { title: "Ventas Totales", value: sales?.length.toString() || '0', icon: ShoppingBag, color: "text-orange-500" },
             { title: "Métricas Live", value: "8.4k", icon: TrendingUp, color: "text-blue-500" },
             { title: "Conversión", value: "14.2%", icon: PieChart, color: "text-purple-500" },
             { title: "Cartera Pro", value: "128", icon: Target, color: "text-green-500" },
           ].map((s, i) => (
             <Card key={i} className="border-none bg-white/5 hover:bg-white/10 transition-all duration-500 p-8 space-y-10 rounded-[2.5rem] shadow-xl ring-1 ring-white/5">
                <div className="flex justify-between items-start">
                   <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center shadow-inner bg-slate-900/50", s.color)}>
                      <s.icon className="h-7 w-7" />
                   </div>
                   <ArrowUpRight className="h-5 w-5 text-slate-700" />
                </div>
                <div className="space-y-1">
                   <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{s.title}</p>
                   <h3 className="text-4xl font-black text-white tracking-tight italic">{s.value}</h3>
                </div>
             </Card>
           ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
           <div className="lg:col-span-8">
              <Card className="border-none bg-white/5 backdrop-blur-xl shadow-3xl rounded-[3.5rem] overflow-hidden ring-1 ring-white/10">
                 <CardHeader className="bg-white/5 border-b border-white/5 p-10 flex flex-row items-center justify-between">
                    <div>
                       <CardTitle className="text-2xl font-headline font-black text-white uppercase italic tracking-tight">Registro de Actividad</CardTitle>
                       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Últimas transacciones del nodo</p>
                    </div>
                    <Button asChild variant="outline" className="h-12 px-8 rounded-2xl border-white/10 bg-white/5 text-white hover:bg-primary hover:text-slate-950 font-black text-[10px] uppercase tracking-widest transition-all">
                       <Link href="/dashboard/affiliate/products">ABRIR CATÁLOGO</Link>
                    </Button>
                 </CardHeader>
                 <CardContent className="p-0">
                    {salesLoading ? (
                      <div className="flex justify-center py-32"><Loader2 className="animate-spin text-primary opacity-30" /></div>
                    ) : !sales || sales.length === 0 ? (
                      <div className="text-center py-32 opacity-20 space-y-6">
                         <ShoppingBag className="h-16 w-16 mx-auto" />
                         <p className="text-xs font-black uppercase tracking-widest">Sin registros recientes</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                           <TableHeader>
                              <TableRow className="bg-black/20 border-white/5 h-20">
                                 <TableHead className="px-10 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Activo Comercial</TableHead>
                                 <TableHead className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Estatus</TableHead>
                                 <TableHead className="px-10 text-right text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Comisión</TableHead>
                              </TableRow>
                           </TableHeader>
                           <TableBody>
                              {sales.map((sale) => (
                                <TableRow key={sale.id} className="h-24 hover:bg-white/5 border-white/5 transition-colors group">
                                   <TableCell className="px-10">
                                      <div className="space-y-1">
                                         <p className="text-sm font-black text-white uppercase truncate max-w-[250px] group-hover:text-primary transition-colors">{sale.productName}</p>
                                         <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">REF: {sale.voucherReference?.substring(0,12).toUpperCase() || 'SYSTEM'}</p>
                                      </div>
                                   </TableCell>
                                   <TableCell>
                                      <Badge className={cn(
                                        "text-[9px] font-black px-4 py-2 rounded-full uppercase border-none shadow-lg",
                                        sale.status === 'Completed' ? "bg-green-500/10 text-green-500 ring-1 ring-green-500/20" : "bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20"
                                      )}>
                                         {sale.status === 'Completed' ? 'LIQUIDADA ✓' : 'EN PROCESO'}
                                      </Badge>
                                   </TableCell>
                                   <TableCell className="px-10 text-right">
                                      <div className="space-y-1">
                                         <p className="text-2xl font-black text-green-500 italic tracking-tighter">+${sale.commissionEarned?.toFixed(2)}</p>
                                         <p className="text-[9px] font-bold text-slate-700 uppercase">{new Date(sale.saleDate).toLocaleDateString()}</p>
                                      </div>
                                   </TableCell>
                                </TableRow>
                              ))}
                           </TableBody>
                        </Table>
                      </div>
                    )}
                 </CardContent>
              </Card>
           </div>

           <div className="lg:col-span-4 space-y-10">
              <Card className="border-none bg-slate-900 shadow-3xl rounded-[3rem] overflow-hidden ring-1 ring-white/10">
                 <CardHeader className="bg-primary p-8 text-slate-950">
                    <div className="flex items-center gap-4">
                       <Bell className="h-6 w-6" />
                       <CardTitle className="text-lg font-black uppercase tracking-tight italic">Centro de Alertas</CardTitle>
                    </div>
                 </CardHeader>
                 <CardContent className="p-8 space-y-6">
                    {!notifications || notifications.length === 0 ? (
                      <p className="text-center text-xs font-bold text-slate-600 uppercase py-10 italic">Red silenciada. Sin comunicados.</p>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className="p-6 bg-white/5 border border-white/5 rounded-3xl space-y-3 hover:bg-white/10 transition-colors">
                           <div className="flex justify-between items-center">
                              <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">{n.title}</span>
                              <span className="text-[8px] text-slate-600 font-bold uppercase">{new Date(n.createdAt).toLocaleDateString()}</span>
                           </div>
                           <p className="text-xs text-slate-400 font-medium leading-relaxed italic">"{n.message}"</p>
                        </div>
                      ))
                    )}
                 </CardContent>
              </Card>

              <Card className="bg-primary/90 p-10 border-none rounded-[3.5rem] shadow-[0_30px_100px_-10px_rgba(255,153,0,0.3)] flex flex-col gap-8 relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:rotate-45 transition-transform duration-1000"><Zap className="h-40 w-48 text-slate-950" /></div>
                 <div className="space-y-3 relative z-10">
                    <h3 className="text-3xl font-headline font-black text-slate-950 uppercase tracking-tighter italic leading-none">Expansión de Red</h3>
                    <p className="text-slate-900/70 text-sm font-bold uppercase tracking-widest">Incentivo: $1.00 por Nodo Directo</p>
                 </div>
                 <div className="space-y-4 relative z-10">
                    <div className="p-5 bg-black/10 border border-black/5 rounded-2xl font-mono text-[9px] text-slate-900 break-all shadow-inner text-center font-bold">
                       {inviteAffiliateLink}
                    </div>
                    <Button onClick={() => handleCopy(inviteAffiliateLink, setCopiedAffiliate)} className="h-16 w-full bg-slate-950 hover:bg-slate-800 text-white rounded-2xl flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest shadow-2xl active:scale-95 transition-all">
                       {copiedAffiliate ? <CheckCircle2 className="h-5 w-5" /> : <Copy className="h-5 w-5 text-primary" />}
                       COPIAR LINK DE SOCIO
                    </Button>
                 </div>
              </Card>
           </div>
        </div>
      </div>

    </DashboardShell>
  )
}
