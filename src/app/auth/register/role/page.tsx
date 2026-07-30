"use client"

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Store, Users, ChevronRight, Zap, ShieldCheck, GraduationCap, Globe, ArrowLeft, Home, Sparkles } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useFirestore, useMemoFirebase, useDoc } from '@/firebase'
import { doc } from 'firebase/firestore'
import { getGoogleDriveDirectLink } from '@/lib/utils'
import { getFreeSpotsInfo, FreeSpotInfo } from '@/lib/free-spots'
import placeholderData from '@/app/lib/placeholder-images.json'

export default function RoleSelectionPage() {
  const db = useFirestore()
  const logoConfigRef = useMemoFirebase(() => db ? doc(db, 'site_config', 'site-logo') : null, [db]);
  const { data: logoOverride } = useDoc(logoConfigRef);
  const defaultLogo = placeholderData.placeholderImages.find(img => img.id === 'site-logo');
  const displayLogoUrl = getGoogleDriveDirectLink(logoOverride?.imageUrl || defaultLogo?.imageUrl || "");

  const [freeSpots, setFreeSpots] = useState<FreeSpotInfo>({
    totalFreeSpots: 6,
    usedFreeSpots: 0,
    remainingFreeSpots: 6,
    isFreeEligible: true
  });

  useEffect(() => {
    getFreeSpotsInfo(db).then(setFreeSpots);
  }, [db]);

  return (
    <div className="min-h-screen bg-[#F7F9FA] flex flex-col items-center justify-center p-6 py-20 relative">
      {/* Top Left Navigation - Volver a Inicio */}
      <div className="absolute left-4 top-4 md:left-8 md:top-8">
        <Button asChild variant="ghost" className="text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-white border border-slate-200 hover:bg-slate-50 shadow-sm h-8 px-3 rounded-lg">
          <Link href="/">
            <ArrowLeft className="h-3.5 w-3.5 text-[#ff9900]" />
            <span>Volver a Inicio</span>
          </Link>
        </Button>
      </div>

      <div className="mb-10">
        <Link href="/">
          <div className="h-10 w-40 relative">
            {displayLogoUrl ? (
              <Image src={displayLogoUrl} alt="Logo" fill className="object-contain" unoptimized />
            ) : (
              <span className="text-[#131921] font-black text-2xl italic tracking-tighter uppercase">Six<span className="text-[#ff9900]">Figure</span></span>
            )}
          </div>
        </Link>
      </div>

      <div className="max-w-4xl w-full text-center space-y-4 mb-12">
        {/* Prominent Info Banner */}
        {freeSpots.isFreeEligible ? (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-black uppercase tracking-wider shadow-sm animate-bounce">
            <Sparkles className="h-4 w-4 text-emerald-600 animate-pulse" />
            <span>
              🎁 ¡REGISTRO GRATUITO HABILITADO! Quedan {freeSpots.remainingFreeSpots} de {freeSpots.totalFreeSpots} cupos ($0 USD)
            </span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 border border-slate-300 text-slate-800 text-xs font-black uppercase tracking-wider shadow-sm">
            <Sparkles className="h-4 w-4 text-[#ff9900]" />
            <span>
              Activación única • Afiliados ${freeSpots.affiliatePrice || 6} USD | Vendedores ${freeSpots.sellerPrice || 7} USD
            </span>
          </div>
        )}

        <h1 className="text-3xl md:text-5xl font-headline font-black text-[#131921] uppercase tracking-tighter">
          Elija su perfil de <span className="text-[#ff9900]">acceso</span>
        </h1>
        <p className="text-slate-500 text-base font-medium max-w-2xl mx-auto">
          Seleccione cómo desea interactuar con nuestra infraestructura de negocios digitales.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl">
        {/* Card 1: Socio Afiliado */}
        <Link href="/auth/register/affiliate" className="group">
          <Card className="p-6 h-full border border-slate-200 shadow-sm hover:shadow-md transition-all rounded-2xl bg-white flex flex-col justify-between relative overflow-hidden">
            {freeSpots.isFreeEligible && (
              <div className="absolute top-0 right-0 bg-emerald-500 text-white font-black text-[9px] uppercase px-3 py-1 rounded-bl-xl shadow-md">
                🎁 100% GRATIS ($0)
              </div>
            )}
            <div className="space-y-5">
              <div className="h-12 w-12 bg-[#131921] rounded-xl flex items-center justify-center text-white shadow-lg">
                <Users className="h-6 w-6 text-[#ff9900]" />
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-[#131921] uppercase tracking-tight">Socio Afiliado</h3>
                  {freeSpots.isFreeEligible ? (
                    <Badge className="bg-emerald-500 text-white font-black text-[10px]">100% GRATIS</Badge>
                  ) : (
                    <Badge variant="outline" className="border-emerald-500/40 bg-emerald-50 text-emerald-700 font-bold text-[10px]">${freeSpots.affiliatePrice || 6} USD</Badge>
                  )}
                </div>
                <p className="text-slate-500 text-xs font-medium leading-relaxed">
                  Promociona productos digitales con tus enlaces Cycling, utiliza el Copiloto de IA 24/7 y gestiona comisiones.
                </p>
                <div className="pt-2 space-y-1.5">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600 uppercase tracking-wide"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> Atribución Directa</div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600 uppercase tracking-wide"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> Asistente de IA de Ventas</div>
                </div>
              </div>
            </div>
            <div className="pt-6 flex items-center gap-1.5 text-[#ff9900] font-black text-xs uppercase tracking-wider group-hover:translate-x-1.5 transition-transform">
              ACCEDER COMO SOCIO <ChevronRight className="h-4 w-4" />
            </div>
          </Card>
        </Link>

        {/* Card 2: Vendedor / Productor */}
        <Link href="/auth/register/seller" className="group">
          <Card className="p-6 h-full border border-slate-200 shadow-sm hover:shadow-md transition-all rounded-2xl bg-white flex flex-col justify-between relative overflow-hidden border-t-4 border-t-[#ff9900]">
            <div className="space-y-5">
              <div className="h-12 w-12 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg">
                <Store className="h-6 w-6 text-[#ff9900]" />
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-[#131921] uppercase tracking-tight">Vendedor / Productor</h3>
                  <Badge variant="outline" className="border-slate-300 text-slate-700 font-bold text-[10px]">${freeSpots.sellerPrice || 7} USD</Badge>
                </div>
                <p className="text-slate-500 text-xs font-medium leading-relaxed">
                  Publica e integra tus productos o infoproductos digitales en el catálogo global de SyncConnect para que la red los promocione.
                </p>
                <div className="pt-2 space-y-1.5">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600 uppercase tracking-wide"><ShieldCheck className="h-3.5 w-3.5 text-[#ff9900] shrink-0" /> Publicación en Catálogo</div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600 uppercase tracking-wide"><ShieldCheck className="h-3.5 w-3.5 text-[#ff9900] shrink-0" /> Cobro Directo de Ventas</div>
                </div>
              </div>
            </div>
            <div className="pt-6 flex items-center gap-1.5 text-slate-900 font-black text-xs uppercase tracking-wider group-hover:translate-x-1.5 transition-transform">
              REGISTRAR MI TIENDA <ChevronRight className="h-4 w-4 text-[#ff9900]" />
            </div>
          </Card>
        </Link>

        {/* Card 3: Cliente / Alumno */}
        <Link href="/auth/register/buyer" className="group">
          <Card className="p-6 h-full border border-slate-200 shadow-sm hover:shadow-md transition-all rounded-2xl bg-white flex flex-col justify-between">
            <div className="space-y-5">
              <div className="h-12 w-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-700 shadow-inner">
                <GraduationCap className="h-6 w-6 text-blue-600" />
              </div>
              <div className="space-y-2.5">
                <h3 className="text-xl font-black text-[#131921] uppercase tracking-tight">Cliente / Alumno</h3>
                <p className="text-slate-500 text-xs font-medium leading-relaxed">
                  Acceda a capacitaciones, adquiera productos digitales con entrega garantizada y consulte el Campus Virtual.
                </p>
                <div className="pt-2 space-y-1.5">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600 uppercase tracking-wide"><ShieldCheck className="h-3.5 w-3.5 text-blue-600 shrink-0" /> Acceso a Contenidos HD</div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600 uppercase tracking-wide"><ShieldCheck className="h-3.5 w-3.5 text-blue-600 shrink-0" /> Certificaciones Oficiales</div>
                </div>
              </div>
            </div>
            <div className="pt-6 flex items-center gap-1.5 text-slate-500 font-black text-xs uppercase tracking-wider group-hover:translate-x-1.5 transition-transform">
              CONTINUAR COMPRADOR <ChevronRight className="h-4 w-4" />
            </div>
          </Card>
        </Link>
      </div>

      <div className="mt-10 flex justify-center animate-in fade-in duration-500">
        <Button asChild variant="outline" className="h-9 px-5 rounded-lg border-slate-300 text-slate-700 hover:text-[#131921] font-bold text-xs uppercase tracking-wider transition-all gap-2 bg-white shadow-sm hover:shadow-md">
          <Link href="/">
            <Home className="h-3.5 w-3.5 text-[#ff9900]" />
            <span>Volver a la Página Principal</span>
          </Link>
        </Button>
      </div>

      <footer className="mt-16 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-emerald-600" /> SixFigure / SyncConnect Global • Entorno Seguro & Activación Automatizada
      </footer>
    </div>
  )
}