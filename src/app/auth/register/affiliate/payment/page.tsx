
"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  ShieldCheck, 
  Clock, 
  ArrowLeft, 
  CheckCircle2,
  Lock,
  Building2
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useFirestore, useMemoFirebase, useDoc } from '@/firebase'
import { doc } from 'firebase/firestore'
import { getGoogleDriveDirectLink } from '@/lib/utils'
import placeholderData from '@/app/lib/placeholder-images.json'

export default function AffiliatePendingPage() {
  const db = useFirestore()

  const logoConfigRef = useMemoFirebase(() => db ? doc(db, 'site_config', 'site-logo') : null, [db]);
  const { data: logoOverride } = useDoc(logoConfigRef);
  const defaultLogo = placeholderData.placeholderImages.find(img => img.id === 'site-logo');
  const displayLogoUrl = getGoogleDriveDirectLink(logoOverride?.imageUrl || defaultLogo?.imageUrl || "");

  return (
    <div className="min-h-screen bg-[#F7F9FA] flex flex-col items-center justify-center p-6 py-20">
      <div className="mb-14">
        <Link href="/">
          <div className="relative h-10 w-40 flex items-center justify-center">
            {displayLogoUrl ? (
              <Image src={displayLogoUrl} alt="Logo" fill className="object-contain" unoptimized />
            ) : (
              <span className="text-[#131921] font-black text-2xl italic tracking-tighter uppercase">Sync<span className="text-[#ff9900]">.Connect</span></span>
            )}
          </div>
        </Link>
      </div>

      <Card className="w-full max-w-[550px] border border-[#ddd] shadow-none rounded-[4px] bg-white overflow-hidden">
        <div className="bg-[#131921] p-10 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-5 rotate-12"><Building2 className="h-48 w-48 text-white" /></div>
          
          <div className="relative z-10 space-y-6">
            <div className="h-20 w-20 bg-white/10 rounded-full flex items-center justify-center text-[#ff9900] mx-auto shadow-2xl border border-white/20">
              <Clock className="h-10 w-10" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-black uppercase tracking-tight leading-none italic">
                Cuenta en <span className="text-[#ff9900]">Supervisión</span>
              </CardTitle>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.4em]">Protocolo de Validación de Identidad</p>
            </div>
          </div>
        </div>

        <CardContent className="p-10 md:p-12 space-y-8">
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5 text-slate-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-[#131921] uppercase">Solicitud Recibida Correctamente</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Tu perfil de Socio Comercial ha sido ingresado en nuestra infraestructura. Para garantizar la integridad de la red, todas las cuentas nuevas pasan por un proceso de supervisión técnica manual.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-lg bg-slate-50 border border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400">Estado de Proceso:</span>
                <span className="text-[10px] font-black uppercase text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100 animate-pulse">Pendiente de Activación</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                <span className="text-[10px] font-black uppercase text-slate-400">Tiempo de Respuesta:</span>
                <span className="text-[11px] font-bold text-slate-700">12 a 24 horas hábiles</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-lg">
               <Lock className="h-4 w-4 text-blue-600" />
               <p className="text-[11px] text-blue-800 font-bold leading-tight">
                 Una vez que el administrador valide tu información, recibirás una notificación de acceso en tu correo electrónico.
               </p>
            </div>
            
            <Button 
              asChild
              variant="outline"
              className="w-full h-12 rounded-[4px] border-[#888c8c] text-[#111] font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
            >
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" /> VOLVER AL INICIO
              </Link>
            </Button>
          </div>

          <div className="pt-8 border-t flex items-center justify-center gap-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Infraestructura de Gestión Sync Connect Nicaragua
          </div>
        </CardContent>
      </Card>
      
      <p className="mt-12 text-[10px] font-bold text-slate-300 uppercase tracking-[0.4em] flex items-center gap-2">
        <Building2 className="h-3 w-3" /> Managed Business Environment • Secure Node
      </p>
    </div>
  )
}
