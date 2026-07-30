"use client"

import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Smartphone, 
  Download, 
  ShieldCheck, 
  Zap,
  Globe,
  Monitor,
  Loader2
} from 'lucide-react'
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase'
import { collection } from 'firebase/firestore'
import { Badge } from '@/components/ui/badge'

export default function AffiliateDownloadsPage() {
  const db = useFirestore()
  const releasesQuery = useMemoFirebase(() => collection(db, 'app_releases'), [db]);
  const { data: releases, isLoading } = useCollection(releasesQuery);

  return (
    <DashboardShell role="affiliate">
      <div className="space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
                <Smartphone className="h-6 w-6" />
              </div>
              <span className="text-[10px] font-black uppercase text-primary tracking-[0.4em]">Flutter Native Experience</span>
            </div>
            <h1 className="text-5xl font-headline font-black text-slate-900 leading-tight tracking-tight uppercase italic">Sync <span className="text-primary">Native App</span></h1>
            <p className="text-lg text-slate-500 font-medium max-w-2xl">Lleva tu negocio en el bolsillo con nuestra aplicación construida con Flutter SDK.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <Card className="border-none shadow-2xl rounded-[3.5rem] bg-slate-900 text-white overflow-hidden group">
             <div className="p-10 space-y-8 relative">
               <div className="absolute top-0 right-0 p-8 opacity-5"><Smartphone className="h-48 w-48 text-primary" /></div>
               <div className="space-y-4 relative z-10">
                 <div className="h-14 w-14 bg-primary/20 rounded-2xl flex items-center justify-center text-primary shadow-2xl">
                   <Smartphone className="h-7 w-7" />
                 </div>
                 <h3 className="text-3xl font-headline font-black uppercase tracking-tight">Android <span className="text-primary">App</span></h3>
                 <p className="text-slate-400 text-sm font-medium leading-relaxed">Versión nativa optimizada para Android. Notificaciones push de ventas instantáneas.</p>
               </div>
               
               <div className="pt-8 border-t border-white/10 space-y-4">
                  {releases?.filter(r => r.type === 'apk').slice(0, 1).map(rel => (
                    <Button key={rel.id} asChild className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase shadow-2xl">
                      <a href={rel.downloadUrl} target="_blank">
                        <Download className="mr-2 h-5 w-5" /> DESCARGAR APK (v{rel.version})
                      </a>
                    </Button>
                  )) || <p className="text-[10px] font-black text-slate-600 uppercase">Binario en preparación</p>}
               </div>
             </div>
           </Card>

           <Card className="border-none shadow-2xl rounded-[3.5rem] bg-white overflow-hidden ring-1 ring-slate-100">
             <div className="p-10 space-y-8 relative">
               <div className="absolute top-0 right-0 p-8 opacity-5"><Monitor className="h-48 w-48 text-slate-900" /></div>
               <div className="space-y-4 relative z-10">
                 <div className="h-14 w-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400">
                   <Monitor className="h-7 w-7" />
                 </div>
                 <h3 className="text-3xl font-headline font-black uppercase tracking-tight">Desktop <span className="text-primary">Sync</span></h3>
                 <p className="text-slate-500 text-sm font-medium leading-relaxed">Software nativo para Windows compilado con Flutter. Gestión masiva de prospectos.</p>
               </div>
               
               <div className="pt-8 border-t space-y-4">
                  {releases?.filter(r => r.type === 'exe').slice(0, 1).map(rel => (
                    <Button key={rel.id} asChild className="w-full h-16 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase shadow-2xl">
                      <a href={rel.downloadUrl} target="_blank">
                        <Download className="mr-2 h-5 w-5 text-primary" /> INSTALAR PARA WINDOWS
                      </a>
                    </Button>
                  )) || <p className="text-[10px] font-black text-slate-300 uppercase">Próximamente disponible</p>}
               </div>
             </div>
           </Card>

           <Card className="border-none shadow-2xl rounded-[3.5rem] bg-primary/5 border border-primary/10 overflow-hidden">
             <div className="p-10 space-y-8 relative">
               <div className="space-y-4">
                 <div className="h-14 w-14 bg-primary text-white rounded-2xl flex items-center justify-center shadow-xl">
                   <Globe className="h-7 w-7" />
                 </div>
                 <h3 className="text-3xl font-headline font-black text-slate-900 uppercase tracking-tight">Web <span className="text-primary">Cloud</span></h3>
                 <p className="text-slate-500 text-sm font-medium leading-relaxed">Versión corporativa en la nube. Sin descargas, acceso instantáneo desde cualquier lugar.</p>
               </div>
               
               <div className="pt-8 border-t border-primary/10">
                  <Button variant="outline" className="w-full h-16 rounded-2xl border-primary text-primary font-black text-xs uppercase">
                    MODO CLOUD ACTIVO
                  </Button>
               </div>
             </div>
           </Card>
        </div>

        <div className="p-12 bg-slate-50 rounded-[4rem] border-2 border-dashed border-slate-200 flex flex-col md:flex-row items-center justify-between gap-10">
           <div className="flex items-center gap-6">
             <div className="h-20 w-20 bg-white rounded-3xl flex items-center justify-center shadow-xl ring-1 ring-slate-100">
               <ShieldCheck className="h-10 w-10 text-green-500" />
             </div>
             <div>
               <h4 className="text-2xl font-headline font-black text-slate-900 uppercase">Seguridad Certificada</h4>
               <p className="text-slate-500 font-medium">Todos los binarios Flutter están firmados y verificados por el motor de seguridad Sync Connect.</p>
             </div>
           </div>
        </div>
      </div>
    </DashboardShell>
  )
}
